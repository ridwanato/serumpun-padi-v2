import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Pane } from 'react-leaflet';
import './App.css';
import { useKMZLoader } from './hooks/useKMZLoader';
import { STATUS_CONFIG, VARIETAS_CONFIG } from './config/komoditas';
import { hitungStatusOtomatis } from './utils/agronomi';
import {
  MapView,
  KecamatanLayer, KelurahanLayer, SawahLayer,
  HortiPins, PalawijaPins, PoktanPins, WarningPins,
  KolamPins, NelayanPins, KolamDBPins,
  NelayanDBPins, PoktanDBPins, HortiDBPins, PalawijaDBPins, WarningDBPins,
} from './components/map';
import {
  DrawToolbar, PanelHeader,
  GambarPoligon, SawahDetail, StatusSawah,
  RekapLuas, RekapProduksi, Dashboard,
  Hortikultura, Palawija, WarningOPT, PoktanKWT,
  PerikananBudidaya, PerikananTangkap, IKPGAdmin,
  Peternakan, LaporanGrafik, ProduksiPangan,
  PanduanModal, PengaturanModal, UnduhDataModal,
} from './components/panels';
import LeftIconRail from './components/layout/LeftIconRail';
import SidebarMenu from './components/layout/SidebarMenu';
import TopNavbar from './components/layout/TopNavbar';
import Auth from './Auth';
import { ALL_KEC, ALL_KEL, KEL_TO_KEC } from './config/wilayah';
import { supabase } from './supabase';
import * as turf from '@turf/turf';
import L from 'leaflet';

function App() {
  const mapRef = useRef();
  const featureGroupRef = useRef();
  const drawnLayersRef = useRef({});

  /* ── KMZ loader hook ── */
  const {
    layers, kolamBudidaya, nelayanTangkap,
    hortiKMZ, palawijaKMZ, poktanKMZ, warningKMZ,
    sawahStatus, setSawahStatus,
    loading: kmzLoading,
    loadFromURL, loadFromFile,
  } = useKMZLoader(mapRef);

  /* ── UI state ── */
  const [mapZoom, setMapZoom] = useState(12.5);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 768);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Detect mobile screen and auto-collapse sidebar
  useEffect(() => {
    const handleCheckMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarOpen(false);
        setIsMobileSidebarOpen(false);
      }
    };
    handleCheckMobile();
    window.addEventListener('resize', handleCheckMobile);
    return () => window.removeEventListener('resize', handleCheckMobile);
  }, []);
  const [isDashboardPanelOpen, setIsDashboardPanelOpen] = useState(true);
  const [activeView, setActiveView] = useState('dashboard');
  const [activeModal, setActiveModal] = useState(null); // 'panduan' | 'pengaturan' | 'unduh_data' | 'pilih_pin'
  const [showDrawBar, setShowDrawBar] = useState(false);
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState('login');
  const [activeSawahId, setActiveSawahId] = useState(null);
  const [drawMode, setDrawMode] = useState(null);
  const [drawnPolygons, setDrawnPolygons] = useState([]);
  const [fillOpacity, setFillOpacity] = useState(0.55);
  const [isPicking, setIsPicking] = useState(false); // overlay picking mode


  // Auto-collapse sidebar & panel when entering dedicated Produksi Pangan page
  useEffect(() => {
    if (activeView === 'produksi_pangan') {
      setIsSidebarOpen(false);
      setIsMobileSidebarOpen(false);
      setIsDashboardPanelOpen(false);
    }
  }, [activeView]);

  /* ── Layer toggles ── */
  const [showSawah, setShowSawah] = useState(true);
  const [showKolam, setShowKolam] = useState(true);
  const [showNelayan, setShowNelayan] = useState(true);
  const [showHortiPin, setShowHortiPin] = useState(true);
  const [showPalawijaPin, setShowPalawijaPin] = useState(true);
  const [showPoktanPin, setShowPoktanPin] = useState(true);
  const [showKWTPin, setShowKWTPin] = useState(true);
  const [showGapoktanPin, setShowGapoktanPin] = useState(true);
  const [showWarningPin, setShowWarningPin] = useState(true);
  const [showKelNama, setShowKelNama] = useState(true);
  const [showPeternakan, setShowPeternakan] = useState(true);

  /* ── IKPG (Ketahanan Pangan Layer Opacity 30%) ── */
  const [activeIKPGLayer, setActiveIKPGLayer] = useState(null);
  const [ikpgOpacity, setIkpgOpacity] = useState(0.30);

  /* ── Wilayah filter ── */
  const [selectedKec, setSelectedKec] = useState(() => {
    const i = {}; ALL_KEC.forEach(k => i[k] = true); return i;
  });
  const [selectedKel, setSelectedKel] = useState(() => {
    const i = {}; ALL_KEL.forEach(k => i[k] = true); return i;
  });
  const [expandKec, setExpandKec] = useState(false);
  const [expandKel, setExpandKel] = useState(false);

  /* ── Supabase data for panels ── */
  const [budidayaList, setBudidayaList] = useState([]);
  const [tangkapList, setTangkapList] = useState([]);
  const [fsvaData, setFsvaData] = useState([]);
  const [skpgData, setSkpgData] = useState([]);
  const [ikpgUploadStatus, setIkpgUploadStatus] = useState({ fsva: '', skpg: '' });
  const [poktanList, setPoktanList] = useState([]);
  const [hortiList, setHortiList] = useState([]);
  const [palawijaList, setPalawijaList] = useState([]);
  const [warningList, setWarningList] = useState([]);
  const [peternakanList, setPeternakanList] = useState([]);

  /* ── Auto-load on mount ── */
  useEffect(() => { loadFromURL(); }, []); // eslint-disable-line

  /* ── Supabase listeners & Password Recovery ── */
  useEffect(() => {
    // Restore cached session immediately from localStorage on startup
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === 'PASSWORD_RECOVERY') {
        setAuthInitialMode('reset_password');
        setShowAuth(true);
      }
    });

    const checkRecoveryURL = () => {
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      const href = window.location.href || '';
      if (
        hash.includes('type=recovery') ||
        hash.includes('access_token') ||
        search.includes('type=recovery') ||
        search.includes('code=') ||
        href.includes('recovery')
      ) {
        setAuthInitialMode('reset_password');
        setShowAuth(true);
      }
    };
    checkRecoveryURL();

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    Promise.all([
      supabase.from('kolam_budidaya').select('*'),
      supabase.from('nelayan_tangkap').select('*'),
      supabase.from('fsva_kelurahan').select('*'),
      supabase.from('skpg_kelurahan').select('*'),
      supabase.from('poktan_kwt').select('*'),
      supabase.from('komoditas_hortikultura').select('*'),
      supabase.from('sawah_status').select('*'),
      supabase.from('warning_opt').select('*'),
      supabase.from('komoditas_palawija').select('*'),
      supabase.from('peternakan').select('*'),
    ]).then(([bd, nl, fv, sk, pk, ht, sw, wo, pl, pt]) => {
      if (!bd.error) setBudidayaList(bd.data || []);
      if (!nl.error) setTangkapList(nl.data || []);
      if (!fv.error) setFsvaData(fv.data || []);
      if (!sk.error) setSkpgData(sk.data || []);
      if (!pk.error) setPoktanList(pk.data || []);
      if (!ht.error) setHortiList(ht.data || []);
      if (!wo.error) setWarningList(wo.data || []);
      if (!pl.error) setPalawijaList(pl.data || []);
      if (!pt.error) setPeternakanList(pt.data || []);
      if (!sw.error && sw.data?.length) {
        const map = {};
        sw.data.forEach(r => {
          map[r.sawah_id] = {
            status: r.status,
            varietas: r.varietas,
            tanggalTanam: r.tanggal_tanam,
            hasilUbinan: r.hasil_ubinan,
          };
        });
        setSawahStatus(map);
      }
    });
  }, []); // eslint-disable-line

  /* ── Computed ── */
  const activeKecNames = Object.keys(selectedKec).filter(k => selectedKec[k]);
  const activeKelNames = Object.keys(selectedKel).filter(k => selectedKel[k]);
  const visibleKelList = ALL_KEL.filter(k => activeKecNames.includes(KEL_TO_KEC[k]));
  const allKecChecked = ALL_KEC.every(n => selectedKec[n]);
  const allKelChecked = visibleKelList.length > 0 && visibleKelList.every(n => selectedKel[n]);

  const filteredKec = layers.kecamatan.filter(f => activeKecNames.includes(f.properties?.name || ''));
  const filteredKel = layers.kelurahan.filter(f => {
    const n = f.properties?.name || '';
    return activeKecNames.includes(KEL_TO_KEC[n] || '') && activeKelNames.includes(n);
  });
  const filteredSawah = layers.sawah.filter(f => {
    const kec = f.properties?.kecamatan || '-';
    const kel = f.properties?.kelurahan || '-';
    if (kec === '-' || kel === '-') return true;
    return activeKecNames.includes(kec) && activeKelNames.includes(kel);
  });
  const activeSawah = activeSawahId ? layers.sawah.find(f => f._id === activeSawahId) : null;

  /* ── Navigation & View selection ── */
  const handleSelectView = useCallback((view) => {
    setActiveView(view);
    setShowDrawBar(view === 'gambar_poligon');
  }, []);

  const goBackToDashboard = useCallback(() => {
    setActiveView('dashboard');
    setShowDrawBar(false);
    setActiveSawahId(null);
  }, []);

  // Mobile: toggle sidebar open/closed; sidebar and dashboard are mutually exclusive
  const handleMobileSidebarToggle = useCallback(() => {
    setIsMobileSidebarOpen(prev => {
      const opening = !prev;
      if (opening) setIsDashboardPanelOpen(false);
      return opening;
    });
  }, []);

  /* ── Toggle Layer Checkbox from Sidebar ── */
  const handleToggleLayer = useCallback((key, value) => {
    switch (key) {
      case 'showSawah': setShowSawah(value); break;
      case 'showKolam': setShowKolam(value); break;
      case 'showNelayan': setShowNelayan(value); break;
      case 'showHortiPin': setShowHortiPin(value); break;
      case 'showPalawijaPin': setShowPalawijaPin(value); break;
      case 'showPoktanPin': setShowPoktanPin(value); break;
      case 'showKWTPin': setShowKWTPin(value); break;
      case 'showGapoktanPin': setShowGapoktanPin(value); break;
      case 'showWarningPin': setShowWarningPin(value); break;
      case 'showKelNama': setShowKelNama(value); break;
      case 'showPeternakan': setShowPeternakan(value); break;
      case 'showIKPGLayer': setActiveIKPGLayer(value ? 'fsva' : null); break;
      default: break;
    }
  }, []);

  /* ── Wilayah toggles ── */
  const toggleKec = (n) => setSelectedKec(p => ({ ...p, [n]: !p[n] }));
  const toggleKel = (n) => setSelectedKel(p => ({ ...p, [n]: !p[n] }));
  const toggleAllKec = () => { const next = {}; ALL_KEC.forEach(n => next[n] = !allKecChecked); setSelectedKec(next); };
  const toggleAllKel = () => { const next = {}; visibleKelList.forEach(n => next[n] = !allKelChecked); setSelectedKel(next); };

  /* ── Pick Location Callback ── */
  const pickCallbackRef = useRef(null);
  const startPickLocation = useCallback((callback) => {
    setIsPicking(true);
    if (mapRef.current) {
      mapRef.current.getContainer().classList.add('is-picking-mode');
      const onMapClick = (e) => {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;

        // Validation: Check if selected GPS point is inside Kota Cilegon
        let isInsideCilegon = false;
        const kelBoundaries = layers?.kelurahan || [];
        const kecBoundaries = layers?.kecamatan || [];
        const boundaries = (kelBoundaries.length > 0) ? kelBoundaries : kecBoundaries;

        if (boundaries && Array.isArray(boundaries) && boundaries.length > 0) {
          try {
            const pt = turf.point([lng, lat]);
            for (const feat of boundaries) {
              if (
                feat &&
                feat.geometry &&
                Array.isArray(feat.geometry.coordinates) &&
                feat.geometry.coordinates.length > 0 &&
                (feat.geometry.type === 'Polygon' || feat.geometry.type === 'MultiPolygon')
              ) {
                try {
                  if (turf.booleanPointInPolygon(pt, feat)) {
                    isInsideCilegon = true;
                    break;
                  }
                } catch (err) {}
              }
            }
          } catch (err) {}
        } else {
          // Bounding box approximation for Kota Cilegon
          if (lat >= -6.08 && lat <= -5.88 && lng >= 105.95 && lng <= 106.12) {
            isInsideCilegon = true;
          }
        }

        if (!isInsideCilegon) {
          alert('⚠️ Lokasi yang dipilih bukan wilayah Kota Cilegon, silakan coba lagi');
          return; // Remain in picking mode until valid point inside Cilegon is clicked
        }

        if (pickCallbackRef.current && pickCallbackRef.current.cb) {
          pickCallbackRef.current.cb({ lat, lng });
        }
        setIsPicking(false);
        mapRef.current.getContainer().classList.remove('is-picking-mode');
        mapRef.current.off('click', pickCallbackRef.current.onMapClick);
        pickCallbackRef.current = null;
      };
      pickCallbackRef.current = { cb: callback, onMapClick };
      mapRef.current.on('click', onMapClick);
    }
  }, [layers]);

  const cancelPick = useCallback(() => {
    setIsPicking(false);
    if (mapRef.current && pickCallbackRef.current) {
      mapRef.current.getContainer().classList.remove('is-picking-mode');
      mapRef.current.off('click', pickCallbackRef.current.onMapClick);
    }
    pickCallbackRef.current = null;
  }, []);

  /* ── Draw mode ── */
  const drawHandlerRef = useRef(null);
  const triggerDraw = () => {
    if (drawMode === 'draw') {
      drawHandlerRef.current?.disable(); drawHandlerRef.current = null; setDrawMode(null);
    } else {
      setDrawMode('draw');
      if (mapRef.current) {
        drawHandlerRef.current = new L.Draw.Polygon(mapRef.current, {
          shapeOptions: { color: '#4ade80', weight: 2, fillColor: '#86efac', fillOpacity: 0.4 }
        });
        drawHandlerRef.current.enable();
      }
    }
  };
  const triggerEdit = () => {
    if (drawMode === 'edit') {
      drawHandlerRef.current?.disable(); drawHandlerRef.current = null; setDrawMode(null);
    } else {
      setDrawMode('edit');
      if (featureGroupRef.current) {
        drawHandlerRef.current = new L.EditToolbar.Edit(mapRef.current, { featureGroup: featureGroupRef.current });
        drawHandlerRef.current.enable();
      }
    }
  };
  const triggerDelete = () => {
    if (drawMode === 'delete') {
      drawHandlerRef.current?.disable(); drawHandlerRef.current = null; setDrawMode(null);
    } else {
      setDrawMode('delete');
      if (featureGroupRef.current) {
        drawHandlerRef.current = new L.EditToolbar.Delete(mapRef.current, { featureGroup: featureGroupRef.current });
        drawHandlerRef.current.enable();
      }
    }
  };
  const finishDrawMode = () => {
    drawHandlerRef.current?.save?.(); drawHandlerRef.current?.disable();
    drawHandlerRef.current = null; setDrawMode(null);
    document.querySelectorAll('.leaflet-draw-tooltip').forEach(el => el.remove());
  };
  const cancelDrawMode = () => {
    drawHandlerRef.current?.revertLayers?.(); drawHandlerRef.current?.disable();
    drawHandlerRef.current = null; setDrawMode(null);
    document.querySelectorAll('.leaflet-draw-tooltip').forEach(el => el.remove());
  };

  const handleFileImport = async (e) => {
    const file = e.target?.files?.[0] || e;
    if (!file) return;
    try {
      await loadFromFile(file);
      alert('✅ File spasial berhasil dimuat ke peta!');
    } catch (err) {
      alert('Gagal memuat file: ' + err.message);
    }
  };

  const deleteDrawnPolygon = (id) => {
    const layer = drawnLayersRef.current[id];
    if (layer && featureGroupRef.current) featureGroupRef.current.removeLayer(layer);
    delete drawnLayersRef.current[id];
    setDrawnPolygons(prev => prev.filter(p => p.id !== id));
  };
  const clearAllDrawn = () => {
    if (featureGroupRef.current) featureGroupRef.current.clearLayers();
    drawnLayersRef.current = {}; setDrawnPolygons([]);
  };

  const handleCreated = (e) => {
    const geojson = e.layer.toGeoJSON();
    const area = turf.area(geojson) * 0.99342;
    const perimeter = turf.length(geojson, { units: 'meters' });

    const areaHa = (area / 10000).toFixed(2);
    const perimM = perimeter.toFixed(2);

    e.layer.bindTooltip(
      `<div style="text-align:center;font-weight:bold;color:#166534;background:rgba(255,255,255,0.9);padding:2px 6px;border-radius:4px;border:1px solid #166534;box-shadow:0 2px 4px rgba(0,0,0,0.2);">
        <div style="font-size:12px;">${areaHa} Ha</div>
        <div style="font-size:10px;font-weight:normal;color:#333;">Keliling: ${perimM} m</div>
      </div>`,
      { permanent: true, direction: 'center', className: 'sp-custom-draw-tooltip' }
    );

    const id = Date.now().toString();
    drawnLayersRef.current[id] = e.layer;
    setDrawnPolygons(prev => [...prev, { id, name: `Poligon #${prev.length + 1}`, geojson, area }]);
  };

  const updateStatus = (id, field, value) => {
    setSawahStatus(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };
  const saveSawahStatus = useCallback(async (activeSawah, status) => {
    if (!activeSawah || !status) return;
    const props = activeSawah.properties || {};
    const { error } = await supabase.from('sawah_status').upsert(
      {
        sawah_id: activeSawah._id,
        nama: props.pemilik || props.nama || props.name || props.Name || `Sawah ${activeSawah._id}`,
        kecamatan: props.kecamatan || props.WADMKC || null,
        kelurahan: props.kelurahan || props.WADMKD || null,
        luas_m2: (!isNaN(parseFloat(props.Shape_Area)) ? parseFloat(props.Shape_Area) : (!isNaN(parseFloat(props.luas_ha)) ? parseFloat(props.luas_ha) * 10000 : 0)),
        status: status.status || null,
        varietas: status.varietas || null,
        tanggal_tanam: status.tanggalTanam || null,
        hasil_ubinan: (!status.hasilUbinan || isNaN(parseFloat(status.hasilUbinan))) ? null : parseFloat(status.hasilUbinan),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'sawah_id' }
    );
    if (error) alert('Gagal simpan: ' + error.message);
    else alert('✅ Status sawah tersimpan!');
  }, []);

  /* ── Map event handlers ── */
  const drawModeRef = useRef(null);
  useEffect(() => { drawModeRef.current = drawMode; }, [drawMode]);

  const getSawahStyle = (feature) => {
    const sd = sawahStatus[feature?._id] || {};
    const varCfg = VARIETAS_CONFIG[sd.varietas] || VARIETAS_CONFIG.lainnya;
    const status = sd.status === 'otomatis' && sd.tanggalTanam
      ? hitungStatusOtomatis(sd.tanggalTanam, varCfg.umur)
      : sd.status || 'belum';
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.belum;
    return { color: '#00ff00', weight: 2, fillOpacity, fillColor: cfg.fillColor || '#cccccc' };
  };

  const onEachSawah = (feature, layer) => {
    layer.on('click', (e) => {
      if (drawModeRef.current) return;
      L.DomEvent.stopPropagation(e);
      setActiveSawahId(feature._id);
      handleSelectView('sawah_detail');
    });
  };
  const onEachKecamatan = (f, l) => {
    l.bindPopup(`<b style="color:#c0392b">🏛️ ${f.properties?.name || ''}</b>`);
  };
  const onEachKelurahan = (f, l) => {
    const nama = f.properties?.name || '';
    const fs = Math.max(7, Math.min(13, (mapZoom - 8) * 1.5)).toFixed(1);
    l.bindTooltip(
      `<span style="font-size:${fs}px;font-weight:700;color:#fff;text-shadow:-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000,1px 1px 0 #000;white-space:nowrap">${nama}</span>`,
      { permanent: true, direction: 'center', className: 'ikpg-kel-label', interactive: false }
    );
    l.bindPopup(`<b style="color:#0d9488">🏘️ ${nama}</b>`);
  };

  const zoomToSawah = useCallback((feature) => {
    if (!mapRef.current || !feature) return;
    const bbox = turf.bbox(feature);
    setActiveSawahId(feature._id);
    mapRef.current.flyToBounds([[bbox[1], bbox[0]], [bbox[3], bbox[2]]], { padding: [60, 60], animate: true, duration: 1.2 });
    handleSelectView('sawah_detail');
  }, [handleSelectView]);

  const flyToLocation = useCallback((lat, lng) => {
    if (mapRef.current) {
      mapRef.current.flyTo([lat, lng], 17, { duration: 1 });
    }
  }, []);

  const refreshSupabase = useCallback(async () => {
    const [bd, nl, fv, sk, pk, ht, wo, pl, pt] = await Promise.all([
      supabase.from('kolam_budidaya').select('*'),
      supabase.from('nelayan_tangkap').select('*'),
      supabase.from('fsva_kelurahan').select('*'),
      supabase.from('skpg_kelurahan').select('*'),
      supabase.from('poktan_kwt').select('*'),
      supabase.from('komoditas_hortikultura').select('*'),
      supabase.from('warning_opt').select('*'),
      supabase.from('komoditas_palawija').select('*'),
      supabase.from('peternakan').select('*'),
    ]);
    if (!bd.error) setBudidayaList(bd.data || []);
    if (!nl.error) setTangkapList(nl.data || []);
    if (!fv.error) setFsvaData(fv.data || []);
    if (!sk.error) setSkpgData(sk.data || []);
    if (!pk.error) setPoktanList(pk.data || []);
    if (!ht.error) setHortiList(ht.data || []);
    if (!wo.error) setWarningList(wo.data || []);
    if (!pl.error) setPalawijaList(pl.data || []);
    if (!pt.error) setPeternakanList(pt.data || []);
  }, []);

  /* ── Panel router for Submodule views ── */
  const renderSubmoduleContent = () => {
    switch (activeView) {
      case 'gambar_poligon':
        return <GambarPoligon
          layers={layers} selectedKec={selectedKec} selectedKel={selectedKel}
          allKecChecked={allKecChecked} allKelChecked={allKelChecked}
          visibleKelList={visibleKelList} showSawah={showSawah} fillOpacity={fillOpacity}
          drawMode={drawMode} drawnPolygons={drawnPolygons}
          expandKec={expandKec} expandKel={expandKel}
          setExpandKec={setExpandKec} setExpandKel={setExpandKel}
          toggleKec={toggleKec} toggleKel={toggleKel}
          toggleAllKec={toggleAllKec} toggleAllKel={toggleAllKel}
          setShowSawah={setShowSawah} setFillOpacity={setFillOpacity}
          triggerDraw={triggerDraw} triggerEdit={triggerEdit} triggerDelete={triggerDelete}
          finishDrawMode={finishDrawMode} cancelDrawMode={cancelDrawMode}
          handleFileImport={handleFileImport}
          deleteDrawnPolygon={deleteDrawnPolygon} clearAllDrawn={clearAllDrawn} />;
      case 'sawah_detail':
        return <SawahDetail
          activeSawah={activeSawah} sawahStatus={sawahStatus} fillOpacity={fillOpacity}
          onFillOpacityChange={setFillOpacity} onUpdateStatus={updateStatus}
          onSave={(activeSawah, st) => saveSawahStatus(activeSawah, st)} />;
      case 'produksi_pangan':
        return <ProduksiPangan />;
      case 'status_sawah':
        return <StatusSawah
          filteredSawah={filteredSawah} sawahStatus={sawahStatus}
          selectedKec={selectedKec} onZoomToSawah={zoomToSawah} user={user} />;
      case 'rekap_luas':
        return <RekapLuas
          filteredSawah={filteredSawah} sawahStatus={sawahStatus}
          selectedKec={selectedKec} onZoomToSawah={zoomToSawah} user={user} />;
      case 'rekap_produksi':
        return <RekapProduksi filteredSawah={filteredSawah} sawahStatus={sawahStatus} user={user} />;
      case 'hortikultura':
        return <Hortikultura
          hortiKMZ={hortiKMZ} hortis={hortiList} showHortiPin={showHortiPin}
          onToggleShow={setShowHortiPin} user={user} mapRef={mapRef}
          supabase={supabase} onRefresh={refreshSupabase}
          onPickLocation={startPickLocation} onFlyToLocation={flyToLocation} />;
      case 'palawija':
        return <Palawija
          palawijaKMZ={palawijaKMZ} palawijaList={palawijaList} showPin={showPalawijaPin}
          onToggleShow={setShowPalawijaPin} user={user} mapRef={mapRef}
          supabase={supabase} onRefresh={refreshSupabase}
          onPickLocation={startPickLocation} onFlyToLocation={flyToLocation} />;
      case 'poktan_kwt':
        return <PoktanKWT
          poktanKMZ={poktanKMZ} poktanList={poktanList}
          kelurahanBoundaries={layers.kelurahan}
          showPoktan={showPoktanPin} showKWT={showKWTPin} showGapoktan={showGapoktanPin}
          onTogglePoktan={setShowPoktanPin} onToggleKWT={setShowKWTPin} onToggleGapoktan={setShowGapoktanPin}
          user={user} mapRef={mapRef} supabase={supabase} onRefresh={refreshSupabase}
          onPickLocation={startPickLocation} onFlyToLocation={flyToLocation} />;
      case 'warning':
        return <WarningOPT
          warningKMZ={warningKMZ} warnings={warningList} showPin={showWarningPin}
          onToggleShow={setShowWarningPin} user={user}
          supabase={supabase} onRefresh={refreshSupabase}
          onPickLocation={startPickLocation} onFlyToLocation={flyToLocation} />;
      case 'perikanan_budidaya':
        return <PerikananBudidaya
          kolamBudidaya={kolamBudidaya} budidayaList={budidayaList}
          showKolam={showKolam} onToggleShow={setShowKolam}
          user={user} mapRef={mapRef} supabase={supabase} onRefresh={refreshSupabase}
          onPickLocation={startPickLocation} onFlyToLocation={flyToLocation} />;
      case 'perikanan_tangkap':
        return <PerikananTangkap
          nelayanTangkap={nelayanTangkap} tangkapList={tangkapList}
          showNelayan={showNelayan} onToggleShow={setShowNelayan}
          user={user} mapRef={mapRef} supabase={supabase} onRefresh={refreshSupabase}
          onPickLocation={startPickLocation} onFlyToLocation={flyToLocation} />;
      case 'ikpg_admin':
        return <IKPGAdmin
          user={user} supabase={supabase}
          fsvaData={fsvaData} skpgData={skpgData}
          ikpgUploadStatus={ikpgUploadStatus}
          setFsvaData={setFsvaData} setSkpgData={setSkpgData}
          setIkpgUploadStatus={setIkpgUploadStatus}
          onRefresh={refreshSupabase} />;
      case 'peternakan':
        return <Peternakan
          onOpenPanel={handleSelectView} user={user}
          supabase={supabase} peternakanList={peternakanList} onRefresh={refreshSupabase}
          onPickLocation={startPickLocation} onFlyToLocation={flyToLocation}
          kelurahanBoundaries={layers.kelurahan} kecamatanBoundaries={layers.kecamatan} />;
      case 'laporan_grafik':
        return <LaporanGrafik filteredSawah={filteredSawah} sawahStatus={sawahStatus} onOpenPanel={handleSelectView} />;
      default:
        return null;
    }
  };

  /* ── Loading Screen ── */
  if (kmzLoading && layers.sawah.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f0fdf4' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48 }}>🌾</div>
          <p style={{ color: '#166534', fontWeight: 700, marginTop: 8 }}>Memuat data peta spasial Cilegon...</p>
        </div>
      </div>
    );
  }

  const isSubmoduleOpen = activeView !== 'dashboard' && activeView !== 'produksi_pangan';

  return (
    <div
      className={`sp-app sp-view-${activeView} ${!isSidebarOpen ? 'is-sidebar-collapsed' : ''} ${isMobile && isMobileSidebarOpen ? 'is-mobile-sidebar-open' : ''} ${isPicking ? 'is-picking-location' : ''}`}
      data-drawmode={drawMode || ''}
    >
      {/* ── Auth Modal ── */}
      {showAuth && <Auth onLogin={() => setShowAuth(false)} initialMode={authInitialMode} />}

      {/* ── Pick Location Overlay ── */}
      {isPicking && (
        <div className="sp-pick-banner">
          <span>📍 Geser/Zoom peta, lalu klik untuk pin lokasi</span>
          <button onClick={cancelPick}>✕ Batal</button>
        </div>
      )}

      {/* ── MOBILE ONLY: Floating expand/collapse sidebar button (Capture 2 Mockup Icon) ── */}
      {isMobile && !isPicking && (
        <>
          <button
            className="sp-mobile-sidebar-toggle"
            onClick={handleMobileSidebarToggle}
            title={isMobileSidebarOpen ? 'Tutup sidebar' : 'Buka sidebar'}
            aria-label={isMobileSidebarOpen ? 'Tutup sidebar' : 'Buka sidebar'}
          >
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
              {/* Outer panel outline */}
              <rect x="2" y="2" width="28" height="28" rx="7" stroke="#22c55e" strokeWidth="2.5" fill="none" />
              {/* Vertical divider line separating left rail and main panel */}
              <line x1="20" y1="2" x2="20" y2="30" stroke="#22c55e" strokeWidth="2.5" />
              {/* Chevron arrow: points right when closed (>), points left when open (<) */}
              {isMobileSidebarOpen ? (
                <polyline points="14 10 9 16 14 22" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              ) : (
                <polyline points="9 10 14 16 9 22" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              )}
            </svg>
          </button>
          {/* Backdrop overlay: click outside to close mobile sidebar */}
          {isMobileSidebarOpen && (
            <div
              className="sp-mobile-sidebar-overlay"
              onClick={handleMobileSidebarToggle}
              aria-hidden="true"
            />
          )}
        </>
      )}

      {/* ── 1. LEFT ICON RAIL (on mobile, hidden by CSS; shown when .is-mobile-sidebar-open) ── */}
      <LeftIconRail
        activeView={activeView}
        onSelectView={(v) => {
          handleSelectView(v);
          if (isMobile) { setIsMobileSidebarOpen(false); setIsDashboardPanelOpen(false); }
        }}
        onToggleSidebar={() => isMobile ? handleMobileSidebarToggle() : setIsSidebarOpen(v => !v)}
        isSidebarOpen={isMobile ? isMobileSidebarOpen : isSidebarOpen}
        onOpenModal={setActiveModal}
      />

      {/* ── 2. COLLAPSIBLE LEFT SIDEBAR (DKPP.INFO) ── */}
      <SidebarMenu
        isOpen={isMobile ? isMobileSidebarOpen : isSidebarOpen}
        onToggleSidebar={() => isMobile ? handleMobileSidebarToggle() : setIsSidebarOpen(v => !v)}
        activeView={activeView}
        onSelectView={(v) => {
          handleSelectView(v);
          if (isMobile) { setIsMobileSidebarOpen(false); setIsDashboardPanelOpen(false); }
        }}
        layerStates={{
          showSawah,
          showKolam,
          showNelayan,
          showHortiPin,
          showPalawijaPin,
          showPoktanPin,
          showKWTPin,
          showGapoktanPin,
          showWarningPin,
          showKelNama,
          showPeternakan,
          showIKPGLayer: activeIKPGLayer,
        }}
        onToggleLayer={handleToggleLayer}
        onOpenModal={setActiveModal}
        onImportFile={handleFileImport}
      />

      {/* ── 3. MAIN WORKSPACE (MAP + TOPBAR + RIGHT DASHBOARD) ── */}
      <main className="sp-main-area">
        {/* Top Navbar */}
        <TopNavbar
          layers={layers}
          sawahStatus={sawahStatus}
          budidayaList={budidayaList}
          tangkapList={tangkapList}
          poktanList={poktanList}
          hortiList={hortiList}
          palawijaList={palawijaList}
          warningList={warningList}
          onSelectView={handleSelectView}
          onZoomToSawah={zoomToSawah}
          onFlyToLocation={flyToLocation}
          onOpenModal={setActiveModal}
          user={user}
          setUser={setUser}
          supabase={supabase}
          setShowAuth={setShowAuth}
          isSidebarOpen={isSidebarOpen}
          onToggleDashboardPanel={() => { setIsDashboardPanelOpen(v => !v); if (isMobile) setIsMobileSidebarOpen(false); }}
        />

        {/* ── Right Dashboard Cards (Active on Dashboard & Produksi Pangan View as shown in Mockup) ── */}
        {(activeView === 'dashboard' || activeView === 'produksi_pangan') && (
          <>
            {isDashboardPanelOpen ? (
              <aside className="sp-right-dashboard" aria-label="Dashboard Metrik">
                <Dashboard
                  filteredSawah={filteredSawah}
                  sawahStatus={sawahStatus}
                  kolamBudidaya={kolamBudidaya}
                  budidayaList={budidayaList}
                  nelayanTangkap={nelayanTangkap}
                  tangkapList={tangkapList}
                  poktanKMZ={poktanKMZ}
                  poktanList={poktanList}
                  peternakanList={peternakanList}
                  onOpenPanel={handleSelectView}
                  onClosePanel={goBackToDashboard}
                  onOpenModal={setActiveModal}
                  onCollapseDashboard={() => setIsDashboardPanelOpen(false)}
                />
              </aside>
            ) : (
              activeView === 'dashboard' && (
                <button
                  className="sp-dash-expand-trigger"
                  onClick={() => { setIsDashboardPanelOpen(true); if (isMobile) setIsMobileSidebarOpen(false); }}
                  title="Buka Panel Ringkasan Metrik"
                  aria-label="Buka Panel Ringkasan Metrik"
                >
                  <span className="sp-dash-expand-trigger__icon">🌾</span>
                  <span className="sp-dash-expand-trigger__text">Ringkasan Metrik</span>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
              )
            )}
          </>
        )}

        
        {/* ── DEDICATED FULL-PAGE VIEW: PRODUKSI PANGAN 2014-2025 ── */}
        {activeView === 'produksi_pangan' && (
          <div className="sp-full-page-view">
            <div className="sp-full-page-view__header">
              <button className="sp-btn" onClick={goBackToDashboard} style={{ background: '#ffffff', color: '#166534', fontWeight: 800, border: '1px solid #bbf7d0', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
                ⬅️ Kembali ke Dashboard Utama
              </button>
            </div>
            <div className="sp-full-page-view__content">
              <ProduksiPangan />
            </div>
          </div>
        )}

        {/* ── Submodule Slide Panel (Opens when clicking submenus/details) ── */}
        {isSubmoduleOpen && (
          <>
            {!isPicking && <div className="sp-overlay" onClick={goBackToDashboard} />}
            <div className="sp-panel is-open">
              <PanelHeader
                panelView={activeView}
                onClose={goBackToDashboard}
                onBack={goBackToDashboard}
                user={user}
                setUser={setUser}
                supabase={supabase}
                setShowAuth={setShowAuth}
              />
              <div className="sp-panel__body">{renderSubmoduleContent()}</div>
            </div>
          </>
        )}

        {/* ── Draw Toolbar ── */}
        {showDrawBar && (
          <DrawToolbar
            drawMode={drawMode}
            triggerDraw={triggerDraw}
            triggerEdit={triggerEdit}
            triggerDelete={triggerDelete}
            finishDrawMode={finishDrawMode}
            cancelDrawMode={cancelDrawMode}
            onClose={() => setShowDrawBar(false)}
          />
        )}

        {/* ── Leaflet Interactive Map ── */}
        <div
          style={{
            height: '100%',
            width: '100%',
            '--pin-scale': Math.max(0.4, Math.min(1.5, (mapZoom - 11) * 0.16 + 0.6))
          }}
          className={!showKelNama ? 'sp-hide-kel-names' : ''}
        >
          <MapView
            mapRef={mapRef}
            featureGroupRef={featureGroupRef}
            mapZoom={mapZoom}
            setMapZoom={setMapZoom}
            showDrawBar={showDrawBar}
            onCreated={handleCreated}
          >
            {/* Admin boundaries */}
            <Pane name="admin-pane" style={{ zIndex: 400 }}>
              <KecamatanLayer data={filteredKec} onEachFeature={onEachKecamatan} />
              <KelurahanLayer
                data={filteredKel}
                onEachFeature={onEachKelurahan}
                activeIKPGLayer={activeIKPGLayer}
                ikpgOpacity={ikpgOpacity}
                fsvaData={fsvaData}
                skpgData={skpgData}
                activeKelNames={activeKelNames}
              />
            </Pane>

            {/* Sawah polygons */}
            <Pane name="sawah-pane" style={{ zIndex: 450 }}>
              <SawahLayer
                data={filteredSawah}
                showSawah={showSawah}
                getStyle={getSawahStyle}
                onEachFeature={onEachSawah}
                sawahStatus={sawahStatus}
                fillOpacity={fillOpacity}
              />
            </Pane>

            {/* KMZ Pins */}
            <HortiPins data={hortiKMZ} show={showHortiPin} />
            <PalawijaPins data={palawijaKMZ} show={showPalawijaPin} />
            <PoktanPins data={poktanKMZ} showPoktan={showPoktanPin} showKWT={showKWTPin} showGapoktan={showGapoktanPin} />
            <WarningPins data={warningKMZ} show={showWarningPin} />
            <KolamPins data={kolamBudidaya} show={showKolam} />
            <NelayanPins data={nelayanTangkap} show={showNelayan} />

            {/* DB Pins */}
            <KolamDBPins data={budidayaList} show={showKolam} />
            <NelayanDBPins data={tangkapList} show={showNelayan} />
            <PoktanDBPins data={poktanList} showPoktan={showPoktanPin} showKWT={showKWTPin} showGapoktan={showGapoktanPin} />
            <HortiDBPins data={hortiList} show={showHortiPin} />
            <PalawijaDBPins data={palawijaList} show={showPalawijaPin} />
            <WarningDBPins data={warningList} show={showWarningPin} />
          </MapView>
        </div>
      </main>

      {/* ── MODALS (Panduan, Pengaturan, Unduh Data) ── */}
      <PanduanModal
        isOpen={activeModal === 'panduan'}
        onClose={() => setActiveModal(null)}
      />

      <PengaturanModal
        isOpen={activeModal === 'pengaturan'}
        onClose={() => setActiveModal(null)}
        fillOpacity={fillOpacity}
        setFillOpacity={setFillOpacity}
        ikpgOpacity={ikpgOpacity}
        setIkpgOpacity={setIkpgOpacity}
        showKelNama={showKelNama}
        setShowKelNama={setShowKelNama}
      />

      <UnduhDataModal
        isOpen={activeModal === 'unduh_data'}
        onClose={() => setActiveModal(null)}
        filteredSawah={filteredSawah}
        budidayaList={budidayaList}
        tangkapList={tangkapList}
        poktanList={poktanList}
      />
    </div>
  );
}

export default App;
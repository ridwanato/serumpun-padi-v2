import React, { useEffect, useRef, useState, useCallback } from 'react';
import './App.css';
import { useKMZLoader } from './hooks/useKMZLoader';
import { STATUS_CONFIG, VARIETAS_CONFIG } from './config/komoditas';
import { hitungHariTanam, hitungStatusOtomatis } from './utils/agronomi';
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
} from './components/panels';
import FSVASelector from './components/common/FSVASelector';
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
  const [mapZoom, setMapZoom]               = useState(13);
  const [showDrawBar, setShowDrawBar]       = useState(false);
  const [isPanelOpen, setIsPanelOpen]       = useState(false);
  const [panelView, setPanelView]           = useState('dashboard');
  const [user, setUser]                     = useState(null);
  const [showAuth, setShowAuth]             = useState(false);
  const [activeSawahId, setActiveSawahId]   = useState(null);
  const [drawMode, setDrawMode]             = useState(null);
  const [drawnPolygons, setDrawnPolygons]   = useState([]);
  const [fillOpacity, setFillOpacity]       = useState(0.5);
  const [isPicking, setIsPicking]           = useState(false); // overlay picking mode

  /* ── Layer toggles ── */
  const [showSawah, setShowSawah]           = useState(true);
  const [showKolam, setShowKolam]           = useState(true);
  const [showNelayan, setShowNelayan]       = useState(true);
  const [showHortiPin, setShowHortiPin]     = useState(true);
  const [showPalawijaPin, setShowPalawijaPin] = useState(true);
  const [showPoktanPin, setShowPoktanPin]   = useState(true);
  const [showKWTPin, setShowKWTPin]         = useState(true);
  const [showGapoktanPin, setShowGapoktanPin] = useState(true);
  const [showWarningPin, setShowWarningPin] = useState(true);
  const [showKelNama, setShowKelNama]       = useState(true);

  /* ── Dropdown toggles ── */
  const [showLayerDropdown, setShowLayerDropdown] = useState(false);
  const [showIKPGPanel, setShowIKPGPanel]   = useState(false);

  /* ── IKPG ── */
  const [activeIKPGLayer, setActiveIKPGLayer] = useState(null);
  const [ikpgOpacity, setIkpgOpacity]       = useState(0.55);

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
  const [budidayaList, setBudidayaList]     = useState([]);
  const [tangkapList, setTangkapList]       = useState([]);
  const [fsvaData, setFsvaData]             = useState([]);
  const [skpgData, setSkpgData]             = useState([]);
  const [ikpgUploadStatus, setIkpgUploadStatus] = useState({ fsva: '', skpg: '' });
  const [poktanList, setPoktanList]         = useState([]);
  const [hortiList, setHortiList]           = useState([]);
  const [palawijaList, setPalawijaList]     = useState([]);
  const [warningList, setWarningList]       = useState([]);

  /* ── Auto-load on mount ── */
  useEffect(() => { loadFromURL(); }, []); // eslint-disable-line

  /* ── Supabase listeners ── */
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data?.user) setUser(data.user); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
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
    ]).then(([bd, nl, fv, sk, pk, ht, sw, wo, pl]) => {
      if (!bd.error) setBudidayaList(bd.data || []);
      if (!nl.error) setTangkapList(nl.data || []);
      if (!fv.error) setFsvaData(fv.data || []);
      if (!sk.error) setSkpgData(sk.data || []);
      if (!pk.error) setPoktanList(pk.data || []);
      if (!ht.error) setHortiList(ht.data || []);
      if (!wo.error) setWarningList(wo.data || []);
      if (!pl.error) setPalawijaList(pl.data || []);
      // Hydrate sawahStatus dari cloud — pakai kolom sawah_id sesuai skema v1
      if (!sw.error && sw.data?.length) {
        const map = {};
        sw.data.forEach(r => {
          map[r.sawah_id] = {
            status:       r.status,
            varietas:     r.varietas,
            tanggalTanam: r.tanggal_tanam,
            hasilUbinan:  r.hasil_ubinan,
          };
        });
        setSawahStatus(map);
      }
    });
  }, []); // eslint-disable-line

  /* ── Computed ── */
  const activeKecNames  = Object.keys(selectedKec).filter(k => selectedKec[k]);
  const activeKelNames  = Object.keys(selectedKel).filter(k => selectedKel[k]);
  const visibleKelList  = ALL_KEL.filter(k => activeKecNames.includes(KEL_TO_KEC[k]));
  const allKecChecked   = ALL_KEC.every(n => selectedKec[n]);
  const allKelChecked   = visibleKelList.length > 0 && visibleKelList.every(n => selectedKel[n]);

  const filteredKec  = layers.kecamatan.filter(f => activeKecNames.includes(f.properties?.name || ''));
  const filteredKel  = layers.kelurahan.filter(f => {
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

  /* ── Panel navigation ── */
  const openPanel  = useCallback((view = 'dashboard') => {
    setPanelView(view); setIsPanelOpen(true); setShowDrawBar(view === 'gambar_poligon');
  }, []);
  const closePanel = useCallback(() => setIsPanelOpen(false), []);
  const goBack     = useCallback(() => {
    setPanelView('dashboard'); setShowDrawBar(false); setActiveSawahId(null);
  }, []);

  /* ── Wilayah toggles ── */
  const toggleKec    = (n) => setSelectedKec(p => ({ ...p, [n]: !p[n] }));
  const toggleKel    = (n) => setSelectedKel(p => ({ ...p, [n]: !p[n] }));
  const toggleAllKec = () => { const next = {}; ALL_KEC.forEach(n => next[n] = !allKecChecked); setSelectedKec(next); };
  const toggleAllKel = () => { const next = {}; visibleKelList.forEach(n => next[n] = !allKelChecked); setSelectedKel(next); };

  /* ── Pick Location — Leaflet Map Click approach ── */
  const pickCallbackRef = useRef(null);
  const startPickLocation = useCallback((callback) => {
    setIsPanelOpen(false);
    setIsPicking(true);
    if (mapRef.current) {
      mapRef.current.getContainer().classList.add('is-picking-mode');
      const onMapClick = (e) => {
        if (pickCallbackRef.current && pickCallbackRef.current.cb) {
          pickCallbackRef.current.cb({ lat: e.latlng.lat, lng: e.latlng.lng });
        }
        setIsPicking(false);
        setIsPanelOpen(true);
        mapRef.current.getContainer().classList.remove('is-picking-mode');
        mapRef.current.off('click', pickCallbackRef.current.onMapClick);
        pickCallbackRef.current = null;
      };
      pickCallbackRef.current = { cb: callback, onMapClick };
      mapRef.current.on('click', onMapClick);
    }
  }, []);
  const cancelPick = useCallback(() => {
    setIsPicking(false);
    setIsPanelOpen(true);
    if (mapRef.current && pickCallbackRef.current) {
      mapRef.current.getContainer().classList.remove('is-picking-mode');
      mapRef.current.off('click', pickCallbackRef.current.onMapClick);
    }
    pickCallbackRef.current = null;
  }, []);

  /* ── Draw mode — programmatically trigger Leaflet Draw ── */
  const drawHandlerRef = useRef(null);
  const triggerDraw = () => {
    if (drawMode === 'draw') {
      drawHandlerRef.current?.disable(); drawHandlerRef.current = null; setDrawMode(null);
    } else {
      setDrawMode('draw');
      if (mapRef.current) {
        drawHandlerRef.current = new L.Draw.Polygon(mapRef.current, {
          shapeOptions: { color:'#4ade80', weight:2, fillColor:'#86efac', fillOpacity:0.4 }
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
  };
  const cancelDrawMode = () => {
    drawHandlerRef.current?.revertLayers?.(); drawHandlerRef.current?.disable();
    drawHandlerRef.current = null; setDrawMode(null);
  };

  const handleFileImport = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try { await loadFromFile(file); } catch (err) { alert(err.message); }
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
    const area = turf.area(geojson);
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
        sawah_id:      activeSawah._id,
        nama:          props.pemilik || props.nama || props.name || props.Name || `Sawah ${activeSawah._id}`,
        kecamatan:     props.kecamatan || props.WADMKC || null,
        kelurahan:     props.kelurahan || props.WADMKD || null,
        luas_m2:       (!isNaN(parseFloat(props.Shape_Area)) ? parseFloat(props.Shape_Area) : (!isNaN(parseFloat(props.luas_ha)) ? parseFloat(props.luas_ha) * 10000 : 0)),
        status:        status.status      || null,
        varietas:      status.varietas    || null,
        tanggal_tanam: status.tanggalTanam|| null,
        hasil_ubinan:  (!status.hasilUbinan || isNaN(parseFloat(status.hasilUbinan))) ? null : parseFloat(status.hasilUbinan),
        updated_at:    new Date().toISOString(),
      },
      { onConflict: 'sawah_id' }
    );
    if (error) alert('Gagal simpan: ' + error.message);
    else alert('✅ Status sawah tersimpan!');
  }, []);

  /* ── Map event handlers ── */
  // Ref agar onEachSawah tahu kapan sedang draw mode — tidak butuh closure baru
  const drawModeRef = useRef(null);
  useEffect(() => { drawModeRef.current = drawMode; }, [drawMode]);

  const getSawahStyle = (feature) => {
    const sd = sawahStatus[feature?._id] || {};
    const varCfg = VARIETAS_CONFIG[sd.varietas] || VARIETAS_CONFIG.lainnya;
    const hari = hitungHariTanam(sd.tanggalTanam);
    const status = sd.status === 'otomatis' && sd.tanggalTanam
      ? hitungStatusOtomatis(sd.tanggalTanam, varCfg.umur)
      : sd.status || 'belum';
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.belum;
    return { color: '#00ff00', weight: 2, fillOpacity, fillColor: cfg.fillColor || '#cccccc' };
  };
  const onEachSawah    = (feature, layer) => {
    layer.on('click', (e) => {
      if (drawModeRef.current) return; // biarkan L.Draw menangani klik saat draw aktif
      L.DomEvent.stopPropagation(e);
      setActiveSawahId(feature._id); openPanel('sawah_detail');
    });
  };
  const onEachKecamatan = (f, l) => l.bindPopup(`<b style="color:#c0392b">🏛️ ${f.properties?.name || ''}</b>`);
  const onEachKelurahan = (f, l) => {
    const nama = f.properties?.name || '';
    // Selalu bind tooltip — visibility dikontrol oleh CSS class di map container
    const fs = Math.max(7, Math.min(13, (mapZoom - 8) * 1.5)).toFixed(1);
    l.bindTooltip(
      `<span style="font-size:${fs}px;font-weight:700;color:#fff;text-shadow:-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000,1px 1px 0 #000;white-space:nowrap">${nama}</span>`,
      { permanent: true, direction: 'center', className: 'ikpg-kel-label', interactive: false }
    );
    l.bindPopup(`<b style="color:#0d9488">🏘️ ${nama}</b>`);
  };

  /* ── Misc ── */
  const handleHamburger = () => { isPanelOpen ? closePanel() : openPanel('dashboard'); };
  const zoomToSawah = (feature) => {
    if (!mapRef.current) return;
    const bbox = turf.bbox(feature);
    setActiveSawahId(feature._id); closePanel();
    mapRef.current.flyToBounds([[bbox[1], bbox[0]], [bbox[3], bbox[2]]], { padding: [60, 60], animate: true, duration: 1.2 });
    setTimeout(() => openPanel('sawah_detail'), 1300);
  };
  const refreshSupabase = useCallback(async () => {
    const [bd, nl, fv, sk, pk, ht, wo, pl] = await Promise.all([
      supabase.from('kolam_budidaya').select('*'),
      supabase.from('nelayan_tangkap').select('*'),
      supabase.from('fsva_kelurahan').select('*'),
      supabase.from('skpg_kelurahan').select('*'),
      supabase.from('poktan_kwt').select('*'),
      supabase.from('komoditas_hortikultura').select('*'),
      supabase.from('warning_opt').select('*'),
      supabase.from('komoditas_palawija').select('*'),
    ]);
    if (!bd.error) setBudidayaList(bd.data || []);
    if (!nl.error) setTangkapList(nl.data || []);
    if (!fv.error) setFsvaData(fv.data || []);
    if (!sk.error) setSkpgData(sk.data || []);
    if (!pk.error) setPoktanList(pk.data || []);
    if (!ht.error) setHortiList(ht.data || []);
    if (!wo.error) setWarningList(wo.data || []);
    if (!pl.error) setPalawijaList(pl.data || []);
  }, []);

  /* ── Panel content ── */
  const renderPanelContent = () => {
    switch (panelView) {
      case 'dashboard':
        return <Dashboard
          filteredSawah={filteredSawah} sawahStatus={sawahStatus}
          kolamBudidaya={kolamBudidaya} budidayaList={budidayaList}
          nelayanTangkap={nelayanTangkap} tangkapList={tangkapList}
          onOpenPanel={openPanel} onClosePanel={closePanel} />;
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
          onPickLocation={startPickLocation} />;
      case 'palawija':
        return <Palawija
          palawijaKMZ={palawijaKMZ} palawijaList={palawijaList} showPin={showPalawijaPin}
          onToggleShow={setShowPalawijaPin} user={user} mapRef={mapRef}
          supabase={supabase} onRefresh={refreshSupabase}
          onPickLocation={startPickLocation} />;
      case 'poktan_kwt':
        return <PoktanKWT
          poktanKMZ={poktanKMZ} poktanList={poktanList}
          showPoktan={showPoktanPin} showKWT={showKWTPin} showGapoktan={showGapoktanPin}
          onTogglePoktan={setShowPoktanPin} onToggleKWT={setShowKWTPin} onToggleGapoktan={setShowGapoktanPin}
          user={user} mapRef={mapRef} supabase={supabase} onRefresh={refreshSupabase}
          onPickLocation={startPickLocation} />;
      case 'warning':
        return <WarningOPT
          warningKMZ={warningKMZ} warnings={warningList} showPin={showWarningPin}
          onToggleShow={setShowWarningPin} user={user}
          supabase={supabase} onRefresh={refreshSupabase}
          onPickLocation={startPickLocation} />;
      case 'perikanan_budidaya':
        return <PerikananBudidaya
          kolamBudidaya={kolamBudidaya} budidayaList={budidayaList}
          showKolam={showKolam} onToggleShow={setShowKolam}
          user={user} mapRef={mapRef} supabase={supabase} onRefresh={refreshSupabase}
          onPickLocation={startPickLocation} />;
      case 'perikanan_tangkap':
        return <PerikananTangkap
          nelayanTangkap={nelayanTangkap} tangkapList={tangkapList}
          showNelayan={showNelayan} onToggleShow={setShowNelayan}
          user={user} mapRef={mapRef} supabase={supabase} onRefresh={refreshSupabase}
          onPickLocation={startPickLocation} />;
      case 'ikpg_admin':
        return <IKPGAdmin
          user={user} supabase={supabase}
          fsvaData={fsvaData} skpgData={skpgData}
          ikpgUploadStatus={ikpgUploadStatus}
          setFsvaData={setFsvaData} setSkpgData={setSkpgData}
          setIkpgUploadStatus={setIkpgUploadStatus}
          onRefresh={refreshSupabase} />;
      default:
        return <p style={{ padding: 16, color: '#999' }}>Panel belum tersedia</p>;
    }
  };

  /* ── Loading screen ── */
  if (kmzLoading && layers.sawah.length === 0) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#f0fdf4' }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:48 }}>🌾</div>
          <p style={{ color:'#166534', fontWeight:700 }}>Memuat data peta...</p>
        </div>
      </div>
    );
  }

  /* ── Pilih Pin dropdown items ── */
  const pinItems = [
    { icon:'🌾', label:'Padi Sawah (poligon)', checked:showSawah,       set:setShowSawah },
    { icon:'🐟', label:'Budidaya Ikan',        checked:showKolam,       set:setShowKolam },
    { icon:'⛵', label:'Pangkalan Nelayan',     checked:showNelayan,     set:setShowNelayan },
    { icon:'🌶️', label:'Hortikultura',          checked:showHortiPin,    set:setShowHortiPin },
    { icon:'🌿', label:'Palawija',              checked:showPalawijaPin, set:setShowPalawijaPin },
    { icon:'👨‍🌾', label:'Poktan',             checked:showPoktanPin,   set:setShowPoktanPin },
    { icon:'👩‍🌾', label:'KWT',               checked:showKWTPin,      set:setShowKWTPin },
    { icon:'🤝', label:'Gapoktan',             checked:showGapoktanPin, set:setShowGapoktanPin },
    { icon:'⚠️', label:'Warning OPT',           checked:showWarningPin,  set:setShowWarningPin },
    { icon:'🏘️', label:'Nama Kelurahan',        checked:showKelNama,     set:setShowKelNama },
  ];

  return (
    <div className="sp-app" data-drawmode={drawMode || ''}>
      {showAuth && <Auth onLogin={() => setShowAuth(false)} />}

      {/* ── Pick Location Overlay — di atas semua layer termasuk poligon ── */}
      {isPicking && (
        <>
          {/* Banner instruksi */}
          <div className="sp-pick-banner">
            <span>📍 Geser/Zoom peta, lalu klik untuk pin lokasi</span>
            <button onClick={cancelPick}>✕ Batal</button>
          </div>
        </>
      )}

      {/* ── Header group: SERUMPUN PADI + Pilih Pin + FSVA/SKPG ── */}
      <div className={`sp-header-group${isPanelOpen ? ' sp-header-group--hidden' : ''}`}>
        <div className="sp-header">
          <span className="sp-header__icon">🌾</span>
          <span className="sp-header__title">SERUMPUN PADI</span>
        </div>
        <div className="sp-header-btn-row">
          {/* Pilih Pin */}
          <div className="sp-layer-wrap">
            <button className="sp-layer-btn"
              onClick={() => { setShowLayerDropdown(v => !v); setShowIKPGPanel(false); }}>
              🗺️ Pilih Pin {showLayerDropdown ? '▲' : '▼'}
            </button>
            {showLayerDropdown && (
              <div className="sp-layer-panel">
                {pinItems.map((item, i) => (
                  <label key={i} className="sp-layer-row">
                    <span className="sp-layer-row__icon">{item.icon}</span>
                    <span className="sp-layer-row__label">{item.label}</span>
                    <input type="checkbox" className="sp-layer-row__check"
                      checked={item.checked} onChange={e => item.set(e.target.checked)} />
                  </label>
                ))}
              </div>
            )}
          </div>
          {/* FSVA/SKPG */}
          <div className="sp-ikpg-wrap">
            <button className={`sp-ikpg-btn${activeIKPGLayer ? ' active' : ''}`}
              onClick={() => { setShowIKPGPanel(v => !v); setShowLayerDropdown(false); }}>
              FSVA/SKPG {showIKPGPanel ? '▲' : '▼'}
            </button>
            {showIKPGPanel && (
              <div className="sp-ikpg-panel">
                <FSVASelector
                  activeLayer={activeIKPGLayer}
                  onLayerChange={setActiveIKPGLayer}
                  ikpgOpacity={ikpgOpacity}
                  onOpacityChange={setIkpgOpacity} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Top Right Controls: Hamburger + User ── */}
      <div className="sp-top-right" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
        <button className={`sp-btn-menu${isPanelOpen ? ' is-open' : ''}`} onClick={handleHamburger}>
          <span className="sp-btn-menu__bar" /><span className="sp-btn-menu__bar" /><span className="sp-btn-menu__bar" />
        </button>
        {user ? (
          <button className="sp-panel__user-btn" onClick={async () => { await supabase.auth.signOut(); setUser(null); }} title="Keluar"
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(27, 67, 50, 0.95)', backdropFilter: 'blur(8px)', border: 'none', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', padding: '6px 10px', cursor: 'pointer', color: '#fff' }}>
            <span className="sp-panel__user-name"
              style={{ maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 10 }}>
              {user.email?.split('@')[0]}
            </span>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        ) : (
          <button className="sp-panel__user-btn sp-panel__user-btn--login" onClick={() => setShowAuth(true)}
            style={{ background: 'rgba(27, 67, 50, 0.95)', backdropFilter: 'blur(8px)', border: 'none', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', color: '#fff', padding: '6px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
            🔐 Login
          </button>
        )}
      </div>

      {/* ── Overlay + Panel ── */}
      {isPanelOpen && <div className="sp-overlay" onClick={closePanel} />}
      <div className={`sp-panel${isPanelOpen ? ' is-open' : ''}`}>
        <PanelHeader
          panelView={panelView} onClose={closePanel} onBack={goBack} />
        <div className="sp-panel__body">{renderPanelContent()}</div>
      </div>

      {/* ── Draw Toolbar ── */}
      {showDrawBar && (
        <DrawToolbar
          drawMode={drawMode}
          triggerDraw={triggerDraw} triggerEdit={triggerEdit} triggerDelete={triggerDelete}
          finishDrawMode={finishDrawMode} cancelDrawMode={cancelDrawMode} />
      )}

      {/* ── Peta ── */}
      <div 
        style={{ 
          height: '100vh', width: '100vw', 
          '--pin-scale': Math.max(0.4, Math.min(1.5, (mapZoom - 11) * 0.16 + 0.6))
        }} 
        className={!showKelNama ? 'sp-hide-kel-names' : ''}>
        <MapView
          mapRef={mapRef} featureGroupRef={featureGroupRef}
          mapZoom={mapZoom} setMapZoom={setMapZoom}
          showDrawBar={showDrawBar} onCreated={handleCreated}>

          {/* Admin boundaries */}
          <KecamatanLayer data={filteredKec} onEachFeature={onEachKecamatan} />
          <KelurahanLayer
            data={filteredKel}
            onEachFeature={onEachKelurahan}
            activeIKPGLayer={activeIKPGLayer}
            ikpgOpacity={ikpgOpacity}
            fsvaData={fsvaData}
            skpgData={skpgData}
            activeKelNames={activeKelNames} />

          {/* Sawah polygons */}
          <SawahLayer
            data={filteredSawah} showSawah={showSawah}
            getStyle={getSawahStyle} onEachFeature={onEachSawah}
            sawahStatus={sawahStatus} fillOpacity={fillOpacity} />

          {/* KMZ Pins */}
          <HortiPins  data={hortiKMZ}    show={showHortiPin} />
          <PalawijaPins data={palawijaKMZ} show={showPalawijaPin} />
          <PoktanPins data={poktanKMZ}   showPoktan={showPoktanPin} showKWT={showKWTPin} showGapoktan={showGapoktanPin} />
          <WarningPins data={warningKMZ}  show={showWarningPin} />
          <KolamPins  data={kolamBudidaya} show={showKolam} />
          <NelayanPins data={nelayanTangkap} show={showNelayan} />

          {/* DB Pins — dari Supabase */}
          <KolamDBPins    data={budidayaList}  show={showKolam} />
          <NelayanDBPins  data={tangkapList}   show={showNelayan} />
          <PoktanDBPins   data={poktanList}    showPoktan={showPoktanPin} showKWT={showKWTPin} showGapoktan={showGapoktanPin} />
          <HortiDBPins    data={hortiList}     show={showHortiPin} />
          <PalawijaDBPins data={palawijaList}  show={showPalawijaPin} />
          <WarningDBPins  data={warningList}   show={showWarningPin} />

        </MapView>
      </div>
    </div>
  );
}

export default App;
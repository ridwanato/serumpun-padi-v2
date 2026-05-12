import React, { useEffect, useRef, useState, useCallback } from 'react';
import './App.css';
import { useKMZLoader } from './hooks/useKMZLoader';
import {
  MapView,
  KecamatanLayer, KelurahanLayer, SawahLayer,
  HortiPins, PalawijaPins, PoktanPins, WarningPins,
  KolamPins, NelayanPins, KolamDBPins,
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
      supabase.from('budidaya_ikan').select('*'),
      supabase.from('nelayan_tangkap').select('*'),
      supabase.from('fsva_kelurahan').select('*'),
      supabase.from('skpg_kelurahan').select('*'),
    ]).then(([bd, nl, fv, sk]) => {
      if (!bd.error) setBudidayaList(bd.data || []);
      if (!nl.error) setTangkapList(nl.data || []);
      if (!fv.error) setFsvaData(fv.data || []);
      if (!sk.error) setSkpgData(sk.data || []);
    });
  }, []);

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

  /* ── Draw mode ── */
  const triggerDraw   = () => setDrawMode(p => p === 'draw'   ? null : 'draw');
  const triggerEdit   = () => setDrawMode(p => p === 'edit'   ? null : 'edit');
  const triggerDelete = () => setDrawMode(p => p === 'delete' ? null : 'delete');
  const finishDrawMode  = () => setDrawMode(null);
  const cancelDrawMode  = () => setDrawMode(null);

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
    setDrawnPolygons(prev => [...prev, { id, geojson, area }]);
  };

  const updateStatus = (id, field, value) => {
    setSawahStatus(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  /* ── Map event handlers ── */
  const getSawahStyle  = () => ({ color: '#4ade80', weight: 2, fillOpacity, fillColor: '#cccccc' });
  const onEachSawah    = (feature, layer) => {
    layer.on('click', (e) => {
      L.DomEvent.stopPropagation(e);
      setActiveSawahId(feature._id); openPanel('sawah_detail');
    });
  };
  const onEachKecamatan = (f, l) => l.bindPopup(`<b style="color:#c0392b">🏛️ ${f.properties?.name || ''}</b>`);
  const onEachKelurahan = (f, l) => {
    const nama = f.properties?.name || '';
    if (showKelNama) {
      const fs = Math.max(7, Math.min(13, (mapZoom - 8) * 1.5)).toFixed(1);
      l.bindTooltip(
        `<span style="font-size:${fs}px;font-weight:700;color:#fff;text-shadow:-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000,1px 1px 0 #000;white-space:nowrap">${nama}</span>`,
        { permanent: true, direction: 'center', className: 'ikpg-kel-label', interactive: false }
      );
    }
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
    const [bd, nl, fv, sk] = await Promise.all([
      supabase.from('budidaya_ikan').select('*'),
      supabase.from('nelayan_tangkap').select('*'),
      supabase.from('fsva_kelurahan').select('*'),
      supabase.from('skpg_kelurahan').select('*'),
    ]);
    if (!bd.error) setBudidayaList(bd.data || []);
    if (!nl.error) setTangkapList(nl.data || []);
    if (!fv.error) setFsvaData(fv.data || []);
    if (!sk.error) setSkpgData(sk.data || []);
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
          onFillOpacityChange={setFillOpacity} onUpdateStatus={updateStatus} />;
      case 'status_sawah':
        return <StatusSawah
          filteredSawah={filteredSawah} sawahStatus={sawahStatus}
          selectedKec={selectedKec} onZoomToSawah={zoomToSawah} />;
      case 'rekap_luas':
        return <RekapLuas
          filteredSawah={filteredSawah} sawahStatus={sawahStatus}
          selectedKec={selectedKec} onZoomToSawah={zoomToSawah} />;
      case 'rekap_produksi':
        return <RekapProduksi filteredSawah={filteredSawah} sawahStatus={sawahStatus} />;
      case 'hortikultura':
        return <Hortikultura
          hortiKMZ={hortiKMZ} hortis={[]} showHortiPin={showHortiPin}
          onToggleShow={setShowHortiPin} user={user} mapRef={mapRef}
          supabase={supabase} onRefresh={refreshSupabase} />;
      case 'palawija':
        return <Palawija
          palawijaKMZ={palawijaKMZ} palawijaList={[]} showPin={showPalawijaPin}
          onToggleShow={setShowPalawijaPin} user={user} mapRef={mapRef}
          supabase={supabase} onRefresh={refreshSupabase} />;
      case 'poktan_kwt':
        return <PoktanKWT
          poktanKMZ={poktanKMZ} poktanList={[]}
          showPoktan={showPoktanPin} showKWT={showKWTPin} showGapoktan={showGapoktanPin}
          onTogglePoktan={setShowPoktanPin} onToggleKWT={setShowKWTPin} onToggleGapoktan={setShowGapoktanPin}
          user={user} mapRef={mapRef} supabase={supabase} onRefresh={refreshSupabase} />;
      case 'warning':
        return <WarningOPT
          warningKMZ={warningKMZ} warnings={[]} showPin={showWarningPin}
          onToggleShow={setShowWarningPin} user={user}
          supabase={supabase} onRefresh={refreshSupabase} />;
      case 'perikanan_budidaya':
        return <PerikananBudidaya
          kolamBudidaya={kolamBudidaya} budidayaList={budidayaList}
          showKolam={showKolam} onToggleShow={setShowKolam}
          user={user} mapRef={mapRef} supabase={supabase} onRefresh={refreshSupabase} />;
      case 'perikanan_tangkap':
        return <PerikananTangkap
          nelayanTangkap={nelayanTangkap} tangkapList={tangkapList}
          showNelayan={showNelayan} onToggleShow={setShowNelayan}
          user={user} mapRef={mapRef} supabase={supabase} onRefresh={refreshSupabase} />;
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

      {/* ── Hamburger ── */}
      <div className="sp-top-right">
        <button className={`sp-btn-menu${isPanelOpen ? ' is-open' : ''}`} onClick={handleHamburger}>
          <span className="sp-btn-menu__bar" /><span className="sp-btn-menu__bar" /><span className="sp-btn-menu__bar" />
        </button>
      </div>

      {/* ── Overlay + Panel ── */}
      {isPanelOpen && <div className="sp-overlay" onClick={closePanel} />}
      <div className={`sp-panel${isPanelOpen ? ' is-open' : ''}`}>
        <PanelHeader
          panelView={panelView} onClose={closePanel} onBack={goBack}
          user={user} onLogin={() => setShowAuth(true)} onLogout={() => setUser(null)} />
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
      <div style={{ height: '100vh', width: '100vw' }}>
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
          <KolamDBPins data={budidayaList} show={showKolam} />

        </MapView>
      </div>
    </div>
  );
}

export default App;
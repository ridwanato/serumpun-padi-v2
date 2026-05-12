import React, { useEffect, useRef, useState, useCallback } from 'react';
import './App.css';
import { useKMZLoader } from './hooks/useKMZLoader';
import { MapView, KecamatanLayer, KelurahanLayer, SawahLayer } from './components/map';
import { DrawToolbar, PanelHeader, GambarPoligon, SawahDetail, StatusSawah, RekapLuas, RekapProduksi, Dashboard, Hortikultura, Palawija, WarningOPT, PoktanKWT, PerikananBudidaya, PerikananTangkap, IKPGAdmin } from './components/panels';
import FSVASelector from './components/common/FSVASelector';
import { ALL_KEC, ALL_KEL, KEL_TO_KEC } from './config/wilayah';
import { supabase } from './supabase';
import * as turf from '@turf/turf';

function App() {
  const mapRef = useRef();
  const featureGroupRef = useRef();
  const drawnLayersRef = useRef({});

  const [mapZoom, setMapZoom] = useState(13);
  const [showSawah, setShowSawah] = useState(true);
  const [fillOpacity, setFillOpacity] = useState(0.5);
  const [drawMode, setDrawMode] = useState(null);
  const [drawnPolygons, setDrawnPolygons] = useState([]);
  const [showDrawBar, setShowDrawBar] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [panelView, setPanelView] = useState('dashboard');
  const [user, setUser] = useState(null);
  const [activeSawahId, setActiveSawahId] = useState(null);
  const [activeIKPGLayer, setActiveIKPGLayer] = useState(null);
  const [ikpgOpacity, setIkpgOpacity] = useState(0.55);
  const [showIKPGPanel, setShowIKPGPanel] = useState(true);
  
  const [selectedKec, setSelectedKec] = useState(() => { const i = {}; ALL_KEC.forEach(k => i[k] = true); return i; });
  const [selectedKel, setSelectedKel] = useState(() => { const i = {}; ALL_KEL.forEach(k => i[k] = true); return i; });
  const [expandKec, setExpandKec] = useState(false);
  const [expandKel, setExpandKel] = useState(false);

  useEffect(() => { loadFromURL(); }, []); // eslint-disable-line

  const activeKecNames = Object.keys(selectedKec).filter(k => selectedKec[k]);
  const activeKelNames = Object.keys(selectedKel).filter(k => selectedKel[k]);
  const visibleKelList = ALL_KEL.filter(k => activeKecNames.includes(KEL_TO_KEC[k]));
  const allKecChecked = ALL_KEC.every(n => selectedKec[n]);
  const allKelChecked = visibleKelList.length > 0 && visibleKelList.every(n => selectedKel[n]);

  const filteredKec = layers.kecamatan.filter(f => activeKecNames.includes(f.properties?.name || ''));
  const filteredKel = layers.kelurahan.filter(f => { const n = f.properties?.name || ''; return activeKecNames.includes(KEL_TO_KEC[n] || '') && activeKelNames.includes(n); });
  const filteredSawah = layers.sawah.filter(f => { const kec = f.properties?.kecamatan || '-'; const kel = f.properties?.kelurahan || '-'; if (kec === '-' || kel === '-') return true; return activeKecNames.includes(kec) && activeKelNames.includes(kel); });
  const activeSawah = activeSawahId ? layers.sawah.find(f => f._id === activeSawahId) : null;

  const openPanel = useCallback((view = 'dashboard') => { setPanelView(view); setIsPanelOpen(true); setShowDrawBar(view === 'gambar_poligon'); }, []);
  const closePanel = useCallback(() => setIsPanelOpen(false), []);
  const goBack = useCallback(() => { setPanelView('dashboard'); setShowDrawBar(false); setActiveSawahId(null); }, []);

  const toggleKec = (n) => setSelectedKec(p => ({ ...p, [n]: !p[n] }));
  const toggleKel = (n) => setSelectedKel(p => ({ ...p, [n]: !p[n] }));
  const toggleAllKec = () => { const next = {}; ALL_KEC.forEach(n => next[n] = !allKecChecked); setSelectedKec(next); };
  const toggleAllKel = () => { const next = {}; visibleKelList.forEach(n => next[n] = !allKelChecked); setSelectedKel(next); };

  const triggerDraw = () => setDrawMode(p => p === 'draw' ? null : 'draw');
  const triggerEdit = () => setDrawMode(p => p === 'edit' ? null : 'edit');
  const triggerDelete = () => setDrawMode(p => p === 'delete' ? null : 'delete');
  const finishDrawMode = () => setDrawMode(null);
  const cancelDrawMode = () => setDrawMode(null);

  const handleFileImport = async (e) => { const file = e.target.files[0]; if (!file) return; try { await loadFromFile(file); } catch (err) { alert(err.message); } };
  const deleteDrawnPolygon = (id) => { const layer = drawnLayersRef.current[id]; if (layer && featureGroupRef.current) featureGroupRef.current.removeLayer(layer); delete drawnLayersRef.current[id]; setDrawnPolygons(prev => prev.filter(p => p.id !== id)); };
  const clearAllDrawn = () => { if (featureGroupRef.current) featureGroupRef.current.clearLayers(); drawnLayersRef.current = {}; setDrawnPolygons([]); };
  const updateStatus = (id, field, value) => { setSawahStatus(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } })); };

  const getSawahStyle = () => ({ color: '#4ade80', weight: 2, fillOpacity, fillColor: '#cccccc' });
  const onEachSawah = (feature, layer) => { layer.on('click', () => { setActiveSawahId(feature._id); openPanel('sawah_detail'); }); layer.bindPopup(`<b>${feature.properties?.name || 'Sawah'}</b>`); };
  const onEachKecamatan = (f, l) => l.bindPopup(`<b style="color:#c0392b">🏛️ ${f.properties?.name || ''}</b>`);
  const onEachKelurahan = (f, l) => l.bindPopup(`<b style="color:#0d9488">🏘️ ${f.properties?.name || ''}</b>`);

  const handleHamburger = () => { isPanelOpen ? closePanel() : openPanel('dashboard'); };
  const zoomToSawah = (feature) => { if (!mapRef.current) return; const bbox = turf.bbox(feature); setActiveSawahId(feature._id); closePanel(); mapRef.current.flyToBounds([[bbox[1], bbox[0]], [bbox[3], bbox[2]]], { padding: [60, 60], animate: true, duration: 1.2 }); setTimeout(() => openPanel('sawah_detail'), 1300); };

  const renderPanelContent = () => {
    switch (panelView) {
      case 'dashboard': return <Dashboard filteredSawah={filteredSawah} sawahStatus={sawahStatus} kolamBudidaya={[]} budidayaList={[]} nelayanTangkap={[]} tangkapList={[]} onOpenPanel={openPanel} onClosePanel={closePanel} />;
      case 'gambar_poligon': return <GambarPoligon layers={layers} selectedKec={selectedKec} selectedKel={selectedKel} allKecChecked={allKecChecked} allKelChecked={allKelChecked} visibleKelList={visibleKelList} showSawah={showSawah} fillOpacity={fillOpacity} drawMode={drawMode} drawnPolygons={drawnPolygons} expandKec={expandKec} expandKel={expandKel} setExpandKec={setExpandKec} setExpandKel={setExpandKel} toggleKec={toggleKec} toggleKel={toggleKel} toggleAllKec={toggleAllKec} toggleAllKel={toggleAllKel} setShowSawah={setShowSawah} setFillOpacity={setFillOpacity} triggerDraw={triggerDraw} triggerEdit={triggerEdit} triggerDelete={triggerDelete} finishDrawMode={finishDrawMode} cancelDrawMode={cancelDrawMode} handleFileImport={handleFileImport} deleteDrawnPolygon={deleteDrawnPolygon} clearAllDrawn={clearAllDrawn} />;
      case 'sawah_detail': return <SawahDetail activeSawah={activeSawah} sawahStatus={sawahStatus} fillOpacity={fillOpacity} onFillOpacityChange={setFillOpacity} onUpdateStatus={updateStatus} />;
      case 'status_sawah': return <StatusSawah filteredSawah={filteredSawah} sawahStatus={sawahStatus} selectedKec={selectedKec} onZoomToSawah={zoomToSawah} />;
      case 'rekap_luas': return <RekapLuas filteredSawah={filteredSawah} sawahStatus={sawahStatus} selectedKec={selectedKec} onZoomToSawah={zoomToSawah} />;
      case 'rekap_produksi': return <RekapProduksi filteredSawah={filteredSawah} sawahStatus={sawahStatus} />;
      case 'hortikultura': return <Hortikultura hortiKMZ={[]} hortis={[]} showHortiPin={true} onToggleShow={() => {}} user={user} mapRef={mapRef} supabase={supabase} onRefresh={() => {}} />;
      case 'palawija': return <Palawija palawijaKMZ={[]} palawijaList={[]} showPin={true} onToggleShow={() => {}} user={user} mapRef={mapRef} supabase={supabase} onRefresh={() => {}} />;
      case 'poktan_kwt': return <PoktanKWT poktanKMZ={[]} poktanList={[]} showPoktan={true} showKWT={true} showGapoktan={true} onTogglePoktan={() => {}} onToggleKWT={() => {}} onToggleGapoktan={() => {}} user={user} mapRef={mapRef} supabase={supabase} onRefresh={() => {}} />;
      case 'warning': return <WarningOPT warningKMZ={[]} warnings={[]} showPin={true} onToggleShow={() => {}} user={user} supabase={supabase} onRefresh={() => {}} />;
      case 'perikanan_budidaya': return <PerikananBudidaya kolamBudidaya={[]} budidayaList={[]} showKolam={true} onToggleShow={() => {}} user={user} mapRef={mapRef} supabase={supabase} onRefresh={() => {}} />;
      case 'perikanan_tangkap': return <PerikananTangkap nelayanTangkap={[]} tangkapList={[]} showNelayan={true} onToggleShow={() => {}} user={user} mapRef={mapRef} supabase={supabase} onRefresh={() => {}} />;
      case 'ikpg_admin': return <IKPGAdmin user={user} supabase={supabase} fsvaData={[]} skpgData={[]} onRefresh={() => {}} />;
      default: return <p style={{ padding: 16, color: '#999' }}>Panel belum tersedia</p>;
    }
  };

  if (kmzLoading && layers.sawah.length === 0) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f0fdf4' }}><div style={{ textAlign: 'center' }}><h1>🌾</h1><p>Memuat data peta...</p></div></div>;
  }

  return (
    <div className="sp-app" data-drawmode={drawMode || ''}>
      {/* Header group */}
      <div className={`sp-header-group${isPanelOpen ? ' sp-header-group--hidden' : ''}`}>
        <div className="sp-header">
          <span className="sp-header__icon">🌾</span>
          <span className="sp-header__title">SERUMPUN PADI</span>
        </div>
        <div className="sp-header-btn-row">
          <div className="sp-ikpg-wrap">
            <button className={`sp-ikpg-btn${activeIKPGLayer ? ' active' : ''}`} onClick={() => { setShowIKPGPanel(v => !v); setShowLayerDropdown(false); }}>
              FSVA/SKPG {showIKPGPanel ? '▲' : '▼'}
            </button>
          </div>
        </div>
      </div>

      {/* FSVA/SKPG Dropdown */}
      {showIKPGPanel && (
        <div style={{ position: 'fixed', top: 56, right: 12, zIndex: 1001 }}>
          <FSVASelector activeLayer={activeIKPGLayer} onLayerChange={setActiveIKPGLayer} ikpgOpacity={ikpgOpacity} onOpacityChange={setIkpgOpacity} />
        </div>
      )}

      {/* Hamburger */}
      <div className="sp-top-right">
        <button className={`sp-btn-menu${isPanelOpen ? ' is-open' : ''}`} onClick={handleHamburger}>
          <span className="sp-btn-menu__bar" /><span className="sp-btn-menu__bar" /><span className="sp-btn-menu__bar" />
        </button>
      </div>

      {/* Overlay + Panel */}
      {isPanelOpen && <div className="sp-overlay" onClick={closePanel} />}
      <div className={`sp-panel${isPanelOpen ? ' is-open' : ''}`}>
        <PanelHeader panelView={panelView} onClose={closePanel} onBack={goBack} user={user} onLogin={() => setShowAuth(true)} onLogout={() => setUser(null)} />
        <div className="sp-panel__body">{renderPanelContent()}</div>
      </div>

      {/* Draw Toolbar */}
      {showDrawBar && <DrawToolbar drawMode={drawMode} triggerDraw={triggerDraw} triggerEdit={triggerEdit} triggerDelete={triggerDelete} finishDrawMode={finishDrawMode} cancelDrawMode={cancelDrawMode} />}

      {/* Peta */}
      <div style={{ height: '100vh', width: '100vw' }}>
        <MapView mapRef={mapRef} featureGroupRef={featureGroupRef} mapZoom={mapZoom} setMapZoom={setMapZoom} showDrawBar={showDrawBar}>
          <KecamatanLayer data={filteredKec} onEachFeature={onEachKecamatan} />
          <KelurahanLayer data={filteredKel} onEachFeature={onEachKelurahan} />
          <SawahLayer data={filteredSawah} showSawah={showSawah} getStyle={getSawahStyle} onEachFeature={onEachSawah} />
        </MapView>
      </div>
    </div>
  );
}

export default App;
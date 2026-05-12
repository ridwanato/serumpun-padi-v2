import React from 'react';
import { ALL_KEC, KEL_TO_KEC } from '../../config/wilayah';

function GambarPoligon({
  layers,
  selectedKec,
  selectedKel,
  allKecChecked,
  allKelChecked,
  visibleKelList,
  showSawah,
  fillOpacity,
  drawMode,
  drawnPolygons,
  expandKec,
  expandKel,
  setExpandKec,
  setExpandKel,
  toggleKec,
  toggleKel,
  toggleAllKec,
  toggleAllKel,
  setShowSawah,
  setFillOpacity,
  triggerDraw,
  triggerEdit,
  triggerDelete,
  finishDrawMode,
  cancelDrawMode,
  handleFileImport,
  deleteDrawnPolygon,
  clearAllDrawn,
}) {
  return (
    <div className="sp-section">
      {/* Import */}
      <div className="sp-info-box">
        <div className="sp-info-box__title">Import file KML/KMZ</div>
        <label className="sp-btn sp-btn-primary" style={{ display: 'block', textAlign: 'center', cursor: 'pointer' }}>
          📂 Pilih File KML/KMZ
          <input type="file" accept=".kml,.kmz" style={{ display: 'none' }} onChange={handleFileImport} />
        </label>
        <p style={{ fontSize: '10px', color: 'var(--sp-muted)', marginTop: 6 }}>
          {layers.kecamatan.length} Kecamatan · {layers.kelurahan.length} Kelurahan · {layers.sawah.length} Petak Sawah
        </p>
      </div>

      {/* Filter Kecamatan */}
      <div className="sp-info-box">
        <div
          className="sp-info-box__title"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
          onClick={() => setExpandKec(v => !v)}
        >
          <span>Tampilkan kecamatan</span>
          <span style={{ fontSize: '10px' }}>{expandKec ? '▲' : '▼'}</span>
        </div>
        {expandKec && (
          <>
            <label className="sp-check-row">
              <input type="checkbox" checked={allKecChecked} onChange={toggleAllKec} /> <b>Semua Kecamatan</b>
            </label>
            {ALL_KEC.map(n => (
              <label key={n} className="sp-check-row">
                <input type="checkbox" checked={!!selectedKec[n]} onChange={() => toggleKec(n)} /> {n}
              </label>
            ))}
          </>
        )}
      </div>

      {/* Filter Kelurahan */}
      <div className="sp-info-box">
        <div
          className="sp-info-box__title"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
          onClick={() => setExpandKel(v => !v)}
        >
          <span>Tampilkan kelurahan</span>
          <span style={{ fontSize: '10px' }}>{expandKel ? '▲' : '▼'}</span>
        </div>
        {expandKel && (
          <>
            <label className="sp-check-row">
              <input type="checkbox" checked={allKelChecked} onChange={toggleAllKel} /> <b>Semua Kelurahan</b>
            </label>
            {visibleKelList.map(n => (
              <label key={n} className="sp-check-row">
                <input type="checkbox" checked={!!selectedKel[n]} onChange={() => toggleKel(n)} /> {n}
                <span style={{ color: 'var(--sp-muted)', fontSize: '10px', marginLeft: 4 }}>({KEL_TO_KEC[n]})</span>
              </label>
            ))}
          </>
        )}
      </div>

      {/* Petak Sawah + Opacity */}
      <div className="sp-info-box">
        <label className="sp-check-row">
          <input type="checkbox" checked={showSawah} onChange={e => setShowSawah(e.target.checked)} /> <b>Tampilkan petak sawah</b>
        </label>
        <div style={{ marginTop: 8 }}>
          <label style={{ fontSize: '10px', color: 'var(--sp-muted)' }}>Opacity sawah: {Math.round(fillOpacity * 100)}%</label>
          <input
            type="range" className="sp-slider" min={0} max={1} step={0.05}
            value={fillOpacity} onChange={e => setFillOpacity(parseFloat(e.target.value))}
          />
        </div>
      </div>

      {/* Alat Gambar */}
      <div className="sp-info-box">
        <div className="sp-info-box__title">Alat gambar</div>
        <div className="sp-draw-actions">
          <button className={`sp-draw-btn${drawMode === 'draw' ? ' is-active' : ''}`} onClick={triggerDraw}>
            <div className="sp-draw-btn__icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="3 11 22 2 13 21 11 13 3 11"/>
              </svg>
            </div>
            <span className="sp-draw-btn__label">Gambar poligon</span>
          </button>
          <button className={`sp-draw-btn${drawMode === 'edit' ? ' is-active' : ''}`} onClick={triggerEdit}>
            <div className="sp-draw-btn__icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </div>
            <span className="sp-draw-btn__label">Edit poligon</span>
          </button>
          <button className={`sp-draw-btn${drawMode === 'delete' ? ' is-active' : ''}`} onClick={triggerDelete}>
            <div className="sp-draw-btn__icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14H6L5 6"/>
                <path d="M10 11v6M14 11v6"/>
              </svg>
            </div>
            <span className="sp-draw-btn__label">Hapus poligon</span>
          </button>
        </div>
        {drawMode && (
          <div style={{ marginTop: 8, background: 'var(--sp-green-50, #f0fdf4)', borderRadius: 8, padding: '8px 10px', border: '1px solid var(--sp-green-200, #bbf7d0)' }}>
            <div style={{ fontSize: '10px', color: 'var(--sp-green-800, #166534)', fontWeight: 600, marginBottom: 6 }}>
              {drawMode === 'draw' && '✏️ Mode menggambar — klik peta untuk menambahkan titik, klik ganda untuk selesai'}
              {drawMode === 'edit' && '📍 Mode edit — drag titik sudut poligon untuk mengubah bentuk'}
              {drawMode === 'delete' && '🗑️ Mode hapus — klik poligon di peta yang ingin dihapus'}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={finishDrawMode} style={{
                flex: 1, background: 'var(--sp-green-600, #16a34a)', color: '#fff', border: 'none',
                borderRadius: 6, padding: '5px 0', fontSize: '10px', fontWeight: 700, cursor: 'pointer'
              }}>
                {drawMode === 'edit' ? '💾 Simpan Perubahan' : '✅ Selesai'}
              </button>
              <button onClick={cancelDrawMode} style={{
                flex: 1, background: '#fff', color: '#c0392b', border: '1px solid #fdc',
                borderRadius: 6, padding: '5px 0', fontSize: '10px', fontWeight: 700, cursor: 'pointer'
              }}>
                ✕ Batal
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Poligon yang Digambar */}
      <div className="sp-info-box">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: drawnPolygons.length > 0 ? 8 : 0 }}>
          <div className="sp-info-box__title" style={{ margin: 0 }}>
            🖊️ Poligon digambar ({drawnPolygons.length})
          </div>
          {drawnPolygons.length > 0 && (
            <button onClick={clearAllDrawn} style={{
              background: '#fde8e8', border: 'none', borderRadius: 6, padding: '3px 8px',
              fontSize: '10px', color: '#c0392b', cursor: 'pointer', fontWeight: 600,
            }}>Hapus semua</button>
          )}
        </div>
        {drawnPolygons.length === 0 ? (
          <p style={{ fontSize: '10px', color: 'var(--sp-muted)', textAlign: 'center', padding: '8px 0' }}>
            Klik tombol 🖊️ di peta untuk menggambar poligon baru
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {drawnPolygons.map((p) => (
              <div key={p.id} className="sp-drawn-item">
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--sp-green-800)' }}>
                    🔷 {p.name || `Poligon #${p.id}`}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--sp-muted)' }}>
                    {((p.area||0) / 10000).toFixed(4)} Ha · {(p.area||0).toFixed(0)} m²
                  </div>
                </div>
                <button onClick={() => deleteDrawnPolygon(p.id)} style={{
                  background: '#fde8e8', border: 'none', borderRadius: 6, padding: '4px 8px',
                  fontSize: '11px', color: '#c0392b', cursor: 'pointer', flexShrink: 0,
                }}>🗑️</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default GambarPoligon;
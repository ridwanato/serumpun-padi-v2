import React from 'react';

function PengaturanModal({
  isOpen,
  onClose,
  fillOpacity,
  setFillOpacity,
  ikpgOpacity,
  setIkpgOpacity,
  showKelNama,
  setShowKelNama,
}) {
  if (!isOpen) return null;

  return (
    <div className="sp-modal-overlay" onClick={onClose}>
      <div className="sp-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="sp-modal-card__header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>⚙️</span>
            <h3 style={{ margin: 0, fontSize: 16, color: '#14532d', fontWeight: 800 }}>
              Pengaturan Tampilan & Peta
            </h3>
          </div>
          <button className="sp-modal-card__close" onClick={onClose}>✕</button>
        </div>

        <div className="sp-modal-card__body">
          {/* Opacity Poligon Sawah */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12, fontWeight: 600 }}>
              <span>Transparansi Warna Poligon Sawah:</span>
              <span style={{ color: '#166534' }}>{Math.round(fillOpacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={fillOpacity}
              onChange={(e) => setFillOpacity(parseFloat(e.target.value))}
              className="sp-slider"
              style={{ width: '100%' }}
            />
          </div>

          {/* Opacity FSVA / SKPG */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12, fontWeight: 600 }}>
              <span>Transparansi Layer FSVA / SKPG:</span>
              <span style={{ color: '#0d9488' }}>{Math.round(ikpgOpacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={ikpgOpacity}
              onChange={(e) => setIkpgOpacity(parseFloat(e.target.value))}
              className="sp-slider"
              style={{ width: '100%' }}
            />
          </div>

          {/* Toggle Nama Kelurahan */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={showKelNama}
                onChange={(e) => setShowKelNama(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: '#166534' }}
              />
              <span>Tampilkan Label Teks Nama Kelurahan di Peta</span>
            </label>
          </div>

          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 10, fontSize: 11, color: '#166534' }}>
            💡 Pengaturan transparansi dan label tersimpan secara real-time pada tampilan aplikasi.
          </div>
        </div>

        <div className="sp-modal-card__footer">
          <button className="sp-btn sp-btn-primary" onClick={onClose}>
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
}

export default PengaturanModal;

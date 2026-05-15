import React from 'react';

function DrawToolbar({
  drawMode,
  triggerDraw,
  triggerEdit,
  triggerDelete,
  finishDrawMode,
  cancelDrawMode,
  onClose,
}) {
  if (!drawMode && !triggerDraw) return null; // Tidak aktif kalau tidak perlu

  return (
    <div className="sp-draw-toolbar" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Tombol Gambar */}
          <button
            className={`sp-draw-toolbar__btn${drawMode === 'draw' ? ' is-active' : ''}`}
            title="Gambar Poligon"
            onClick={triggerDraw}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 19 22 19" />
            </svg>
            <span>Gambar</span>
          </button>

          <div className="sp-draw-toolbar__sep" />

          {/* Tombol Edit */}
          <button
            className={`sp-draw-toolbar__btn${drawMode === 'edit' ? ' is-active' : ''}`}
            title="Edit Poligon"
            onClick={triggerEdit}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            <span>Edit</span>
          </button>

          <div className="sp-draw-toolbar__sep" />

          {/* Tombol Hapus */}
          <button
            className={`sp-draw-toolbar__btn${drawMode === 'delete' ? ' is-active' : ''}`}
            title="Hapus Poligon"
            onClick={triggerDelete}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14H6L5 6"/>
              <path d="M10 11v6M14 11v6"/>
            </svg>
            <span>Hapus</span>
          </button>
        </div>

        {/* Tombol Close (X) */}
        {!drawMode && (
          <button 
            onClick={onClose} 
            title="Tutup Toolbar Gambar"
            style={{ 
              background: 'none', border: 'none', cursor: 'pointer', padding: '4px', 
              marginLeft: '8px', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center' 
            }}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>

      {/* Info mode */}
      {drawMode && (
        <div style={{ 
          marginTop: 8, 
          background: 'var(--sp-green-50, #f0fdf4)', 
          borderRadius: 8, 
          padding: '6px 8px', 
          border: '1px solid var(--sp-green-200, #bbf7d0)' 
        }}>
          <div style={{ fontSize: '10px', color: 'var(--sp-green-800, #166534)', fontWeight: 600, marginBottom: 6, lineHeight: 1.3 }}>
            {drawMode === 'draw' && '✏️ Mode menggambar — klik peta untuk tambah titik, klik ganda untuk selesai'}
            {drawMode === 'edit' && '📍 Mode edit — drag titik sudut poligon untuk mengubah bentuk'}
            {drawMode === 'delete' && '🗑️ Mode hapus — klik poligon di peta yang ingin dihapus'}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button 
              onClick={finishDrawMode}
              style={{
                flex: 1, 
                background: 'var(--sp-green-600, #16a34a)', 
                color: '#fff', 
                border: 'none',
                borderRadius: 6, 
                padding: '5px 0', 
                fontSize: '10px', 
                fontWeight: 700, 
                cursor: 'pointer'
              }}
            >
              {drawMode === 'edit' ? '💾 Simpan' : '✅ Selesai'}
            </button>
            <button 
              onClick={cancelDrawMode}
              style={{
                flex: 1, 
                background: '#fff', 
                color: '#c0392b', 
                border: '1px solid #fdc',
                borderRadius: 6, 
                padding: '5px 0', 
                fontSize: '10px', 
                fontWeight: 700, 
                cursor: 'pointer'
              }}
            >
              ✕ Batal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DrawToolbar;
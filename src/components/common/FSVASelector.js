import React from 'react';

function FSVASelector({ activeLayer, onLayerChange, ikpgOpacity, onOpacityChange }) {
  const layers = [
    { key: 'fsva', main: 'FSVA', sub: 'Indeks Ketahanan Pangan' },
    { key: 'skpg', main: 'SKPG', sub: 'Gizi Balita' },
    { key: 'borda', main: 'Prioritas', sub: '(Borda Count Desil)' },
  ];

  return (
    <div style={{
      background: '#fff', borderRadius: 14, padding: '14px 16px',
      boxShadow: '0 6px 24px rgba(0,0,0,0.18)',
      width: '100%', boxSizing: 'border-box',
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#166534', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        LAYER KETAHANAN PANGAN
      </div>

      {layers.map(({ key, main, sub }) => (
        <div key={key} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '10px 0', borderBottom: '1px solid #f0f0f0',
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>{main}</div>
            <div style={{ fontSize: 10, color: '#999' }}>{sub}</div>
          </div>
          <label style={{
            width: 42, height: 24, borderRadius: 12, cursor: 'pointer',
            background: activeLayer === key ? '#166534' : '#d1d5db',
            position: 'relative', display: 'inline-block',
          }}>
            <input
              type="checkbox"
              checked={activeLayer === key}
              onChange={() => onLayerChange(activeLayer === key ? null : key)}
              style={{ opacity: 0, position: 'absolute', width: 0, height: 0 }}
            />
            <span style={{
              position: 'absolute', top: 2, left: activeLayer === key ? 20 : 2,
              width: 20, height: 20, borderRadius: '50%', background: '#fff',
              transition: 'left 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            }} />
          </label>
        </div>
      ))}

      {/* Transparansi */}
      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 10, color: '#888', marginBottom: 6 }}>
          Transparansi peta: {Math.round((1 - ikpgOpacity) * 100)}%
        </div>
        <input
          type="range" min="0.1" max="1" step="0.05"
          value={ikpgOpacity}
          onChange={e => onOpacityChange(parseFloat(e.target.value))}
          style={{ width: '100%', accentColor: '#166534', display: 'block', boxSizing: 'border-box' }}
        />
      </div>

      {/* Legend sederhana */}
      {activeLayer && (
        <div style={{ marginTop: 12, padding: '8px 10px', background: '#f9fafb', borderRadius: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#666', marginBottom: 6 }}>
            {activeLayer === 'fsva' ? 'FSVA - Indeks Ketahanan Pangan' :
             activeLayer === 'skpg' ? 'SKPG - Status Gizi Balita' :
             'BORDA COUNT - Prioritas Intervensi (Desil)'}
          </div>
          {activeLayer === 'fsva' && ['P1 Sangat Rentan','P2 Rentan','P3 Agak Rentan','P4 Agak Tahan','P5 Tahan','P6 Sangat Tahan'].map(l => (
            <div key={l} style={{ fontSize: 10, color: '#555', padding: '2px 0' }}>• {l}</div>
          ))}
          {activeLayer === 'skpg' && ['Rentan (>15%)','Waspada (10-15%)','Aman (<10%)'].map(l => (
            <div key={l} style={{ fontSize: 10, color: '#555', padding: '2px 0' }}>• {l}</div>
          ))}
          {activeLayer === 'borda' && ['D1-D5: Prioritas (Merah)','D6-D10: Tahan (Hijau)'].map(l => (
            <div key={l} style={{ fontSize: 10, color: '#555', padding: '2px 0' }}>• {l}</div>
          ))}
        </div>
      )}
    </div>
  );
}

export default FSVASelector;
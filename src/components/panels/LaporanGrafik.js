import React from 'react';
import { ALL_KEC } from '../../config/wilayah';

function LaporanGrafik({ filteredSawah, sawahStatus, onOpenPanel }) {
  // Hitung luas per kecamatan
  const kecStats = {};
  ALL_KEC.forEach((k) => { kecStats[k] = 0; });

  (filteredSawah || []).forEach((f) => {
    const props = f.properties || {};
    const kec = props.kecamatan || props.WADMKC;
    const areaM2 = props.Shape_Area ? parseFloat(props.Shape_Area) : 0;
    if (kec && kecStats[kec] !== undefined) {
      kecStats[kec] += areaM2 / 10000;
    }
  });

  const maxVal = Math.max(...Object.values(kecStats), 1);

  return (
    <div style={{ padding: 16 }}>
      <div style={{
        background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)',
        color: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
      }}>
        <div style={{ fontSize: 11, opacity: 0.85, textTransform: 'uppercase', letterSpacing: 1 }}>
          📊 Analisis & Grafik Visual
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>
          Sebaran Lahan Pertanian Kota Cilegon
        </div>
        <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>
          Visualisasi proporsi luasan sawah dan komoditas per kecamatan
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 14, marginBottom: 16 }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: 12, color: '#374151', textTransform: 'uppercase' }}>
          Grafik Batang Luas Sawah per Kecamatan (Hektar)
        </h4>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {ALL_KEC.map((kec) => {
            const ha = kecStats[kec] || 0;
            const pct = Math.min(100, Math.round((ha / maxVal) * 100));
            return (
              <div key={kec}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
                  <span style={{ fontWeight: 600, color: '#1f2937' }}>{kec}</span>
                  <span style={{ fontWeight: 700, color: '#166534' }}>{ha.toFixed(2)} Ha</span>
                </div>
                <div style={{ background: '#f3f4f6', height: 10, borderRadius: 5, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${pct}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #22c55e, #166534)',
                      borderRadius: 5,
                      transition: 'width 0.5s ease',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <button
          onClick={() => onOpenPanel('rekap_luas')}
          className="sp-btn sp-btn-secondary"
          style={{ width: '100%', padding: '10px 8px', fontSize: 11 }}
        >
          📋 Lihat Rekap Tanam
        </button>
        <button
          onClick={() => onOpenPanel('rekap_produksi')}
          className="sp-btn sp-btn-primary"
          style={{ width: '100%', padding: '10px 8px', fontSize: 11 }}
        >
          🏢 Lihat Rekap Produksi
        </button>
      </div>
    </div>
  );
}

export default LaporanGrafik;

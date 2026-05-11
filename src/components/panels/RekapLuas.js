import React, { useState } from 'react';
import * as turf from '@turf/turf';
import { STATUS_CONFIG } from '../../config/komoditas';
import { hitungStatusOtomatis } from '../../utils/agronomi';

function RekapLuas({
  filteredSawah,
  sawahStatus,
  selectedKec,
  onZoomToSawah,
}) {
  const [drillFilter, setDrillFilter] = useState(null);

  // Hitung total luas
  const totalM2 = filteredSawah.reduce((s, f) => s + turf.area(f), 0);
  const totalHa = totalM2 / 10000;

  // Hitung breakdown per status
  const breakdown = {};
  filteredSawah.forEach(f => {
    const sd = sawahStatus[f._id] || {};
    let sk = 'belum';
    if (sd.status === 'otomatis' && sd.tanggalTanam) {
      sk = hitungStatusOtomatis(sd.tanggalTanam);
    } else if (sd.status && sd.status !== 'otomatis') {
      sk = sd.status;
    }
    const luas = turf.area(f);
    breakdown[sk] = (breakdown[sk] || 0) + luas;
  });

  const getStatus = (f) => {
    const sd = sawahStatus[f._id] || {};
    let sk = 'belum';
    if (sd.status === 'otomatis' && sd.tanggalTanam) {
      sk = hitungStatusOtomatis(sd.tanggalTanam);
    } else if (sd.status && sd.status !== 'otomatis') {
      sk = sd.status;
    }
    return sk;
  };

  // Drill-down: tampilkan daftar sawah
  if (drillFilter) {
    let sawahList = [];
    if (drillFilter.type === 'status') {
      sawahList = filteredSawah.filter(f => getStatus(f) === drillFilter.value);
    } else if (drillFilter.type === 'kec') {
      sawahList = filteredSawah.filter(f => f.properties?.kecamatan === drillFilter.value);
    } else if (drillFilter.type === 'kel') {
      sawahList = filteredSawah.filter(f => f.properties?.kelurahan === drillFilter.value);
    }

    return (
      <div style={{ padding: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <button
            onClick={() => setDrillFilter(null)}
            style={{
              background: '#dcfce7', border: 'none', borderRadius: 6,
              padding: '4px 10px', fontSize: 11, cursor: 'pointer',
              color: '#166534', fontWeight: 600,
            }}
          >
            ← Kembali
          </button>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#14532d' }}>
            {drillFilter.label}
          </span>
        </div>

        {sawahList.length === 0 ? (
          <p style={{ color: '#999', fontSize: 11, textAlign: 'center' }}>Tidak ada petak sawah.</p>
        ) : (
          sawahList.map(f => {
            const nama = f.properties?.name || f.properties?.Name || 'Tanpa Nama';
            const luas = turf.area(f) / 10000;
            const sk = getStatus(f);
            const cfg = STATUS_CONFIG[sk] || STATUS_CONFIG.belum;
            return (
              <div
                key={f._id}
                onClick={() => onZoomToSawah(f)}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '6px 8px', marginBottom: 3, background: '#fff',
                  border: '1px solid #f0f0f0', borderLeft: `3px solid ${cfg.color}`,
                  borderRadius: 4, cursor: 'pointer', fontSize: 11,
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: 2,
                    background: cfg.fillColor, border: `1px solid ${cfg.color}`,
                    display: 'inline-block', flexShrink: 0,
                  }} />
                  {nama}
                  <span style={{ color: '#999', fontSize: 10 }}>
                    · {f.properties?.kelurahan || '-'}
                  </span>
                </span>
                <span style={{ fontWeight: 600, color: '#166534', fontSize: 11, whiteSpace: 'nowrap' }}>
                  {luas.toFixed(2)} Ha 🔍
                </span>
              </div>
            );
          })
        )}
      </div>
    );
  }

  // Tabel utama
  return (
    <div style={{ padding: 12 }}>
      {/* Tabel per status */}
      <div className="sp-info-box">
        <div className="sp-info-box__title">📊 Rekap luas sawah per status</div>
        <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
              <th style={{ textAlign: 'left', padding: '6px 4px' }}>Status</th>
              <th style={{ textAlign: 'right', padding: '6px 4px' }}>Luas (Ha)</th>
              <th style={{ textAlign: 'right', padding: '6px 4px' }}>Petak</th>
              <th style={{ textAlign: 'right', padding: '6px 4px' }}>%</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(STATUS_CONFIG).map(([k, cfg]) => {
              const m2 = breakdown[k] || 0;
              const ha = m2 / 10000;
              const pct = totalM2 > 0 ? (m2 / totalM2 * 100) : 0;
              const petak = filteredSawah.filter(f => getStatus(f) === k).length;
              const isActive = ha > 0;
              return (
                <tr
                  key={k}
                  onClick={() => isActive && setDrillFilter({ type: 'status', value: k, label: `${cfg.label} — daftar sawah` })}
                  style={{
                    opacity: isActive ? 1 : 0.45,
                    cursor: isActive ? 'pointer' : 'default',
                    borderBottom: '1px solid #f0f0f0',
                  }}
                >
                  <td style={{ padding: '6px 4px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        width: 9, height: 9, borderRadius: '50%',
                        background: cfg.fillColor, border: `1.5px solid ${cfg.color}`,
                        display: 'inline-block', flexShrink: 0,
                      }} />
                      <span style={{ color: '#333' }}>{cfg.label}</span>
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', padding: '6px 4px', fontWeight: isActive ? 700 : 400, color: isActive ? cfg.color : '#999' }}>
                    {ha.toFixed(2)}
                  </td>
                  <td style={{ textAlign: 'right', padding: '6px 4px', color: '#888' }}>{petak}</td>
                  <td style={{ textAlign: 'right', padding: '6px 4px', color: '#888' }}>{pct.toFixed(1)}%</td>
                </tr>
              );
            })}
            <tr style={{ borderTop: '2px solid #e5e7eb', fontWeight: 700 }}>
              <td style={{ padding: '6px 4px' }}>Total</td>
              <td style={{ textAlign: 'right', padding: '6px 4px' }}>{totalHa.toFixed(2)}</td>
              <td style={{ textAlign: 'right', padding: '6px 4px' }}>{filteredSawah.length}</td>
              <td style={{ textAlign: 'right', padding: '6px 4px' }}>100%</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Tabel per kecamatan */}
      <div className="sp-info-box" style={{ marginTop: 12 }}>
        <div className="sp-info-box__title">🏛️ Rekap per kecamatan</div>
        <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
              <th style={{ textAlign: 'left', padding: '6px 4px' }}>Kecamatan</th>
              <th style={{ textAlign: 'right', padding: '6px 4px' }}>Ha</th>
              <th style={{ textAlign: 'right', padding: '6px 4px' }}>Petak</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(selectedKec).filter(k => selectedKec[k]).map(kec => {
              const sawahKec = filteredSawah.filter(f => f.properties?.kecamatan === kec);
              if (sawahKec.length === 0) return null;
              const ha = sawahKec.reduce((s, f) => s + turf.area(f), 0) / 10000;
              const kels = [...new Set(sawahKec.map(f => f.properties?.kelurahan).filter(Boolean))].sort();
              return [
                <tr
                  key={kec}
                  onClick={() => setDrillFilter({ type: 'kec', value: kec, label: `Kec. ${kec}` })}
                  style={{ cursor: 'pointer', borderBottom: '1px solid #f0f0f0' }}
                >
                  <td style={{ padding: '6px 4px', fontWeight: 600 }}>🏛️ {kec}</td>
                  <td style={{ textAlign: 'right', padding: '6px 4px', fontWeight: 700, color: '#166534' }}>{ha.toFixed(2)}</td>
                  <td style={{ textAlign: 'right', padding: '6px 4px', color: '#888' }}>{sawahKec.length}</td>
                </tr>,
                ...kels.map(kel => {
                  const sawahKel = sawahKec.filter(f => f.properties?.kelurahan === kel);
                  const haKel = sawahKel.reduce((s, f) => s + turf.area(f), 0) / 10000;
                  return (
                    <tr
                      key={`${kec}-${kel}`}
                      onClick={() => setDrillFilter({ type: 'kel', value: kel, label: `Kel. ${kel}` })}
                      style={{ cursor: 'pointer', borderBottom: '1px solid #f0f0f0' }}
                    >
                      <td style={{ padding: '6px 4px', paddingLeft: 18, color: '#555', fontSize: 10 }}>🏘️ {kel}</td>
                      <td style={{ textAlign: 'right', padding: '6px 4px', color: '#16a34a', fontSize: 10 }}>{haKel.toFixed(2)}</td>
                      <td style={{ textAlign: 'right', padding: '6px 4px', color: '#888', fontSize: 10 }}>{sawahKel.length}</td>
                    </tr>
                  );
                }),
              ];
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default RekapLuas;
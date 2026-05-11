import React, { useState } from 'react';
import * as turf from '@turf/turf';
import { STATUS_CONFIG } from '../../config/komoditas';
import { hitungStatusOtomatis, fmtHa } from '../../utils/agronomi';

function StatusSawah({
  filteredSawah,
  sawahStatus,
  selectedKec,
  onZoomToSawah,
}) {
  const [openAccKec, setOpenAccKec] = useState(null);
  const [openAccKel, setOpenAccKel] = useState(null);

  // Dapatkan daftar kecamatan yang aktif
  const kecList = Object.keys(selectedKec).filter(k => selectedKec[k]);

  if (kecList.length === 0) {
    return (
      <div style={{ padding: 16, color: '#999', textAlign: 'center' }}>
        <p>Tidak ada kecamatan dipilih.</p>
        <p style={{ fontSize: 11 }}>Buka Gambar Poligon untuk mengaktifkan filter.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 12 }}>
      <div className="sp-info-box__title" style={{ marginBottom: 12 }}>
        🌾 Status sawah per kecamatan & kelurahan
      </div>

      {kecList.map(kec => {
        const sawahKec = filteredSawah.filter(f => f.properties?.kecamatan === kec);
        if (sawahKec.length === 0) return null;

        const luasKec = sawahKec.reduce((s, f) => s + turf.area(f), 0) / 10000;
        const isKecOpen = openAccKec === kec;
        const kels = [...new Set(sawahKec.map(f => f.properties?.kelurahan).filter(Boolean))].sort();

        return (
          <div key={kec} style={{ marginBottom: 6 }}>
            {/* Header Kecamatan */}
            <div
              onClick={() => setOpenAccKec(isKecOpen ? null : kec)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 12px',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: 13,
                color: '#166534',
              }}
            >
              <span>
                🏛️ {kec}{' '}
                <span style={{ fontWeight: 400, color: '#16a34a', fontSize: 11 }}>
                  ({sawahKec.length} petak · {luasKec.toFixed(2)} Ha)
                </span>
              </span>
              <span style={{ fontSize: 10 }}>{isKecOpen ? '▲' : '▼'}</span>
            </div>

            {/* Daftar Kelurahan */}
            {isKecOpen && (
              <div style={{ marginTop: 4, paddingLeft: 8 }}>
                {kels.map(kel => {
                  const sawahKel = sawahKec.filter(f => f.properties?.kelurahan === kel);
                  const luasKel = sawahKel.reduce((s, f) => s + turf.area(f), 0) / 10000;
                  const isKelOpen = openAccKel === `${kec}-${kel}`;

                  return (
                    <div key={kel} style={{ marginBottom: 4 }}>
                      {/* Header Kelurahan */}
                      <div
                        onClick={() => setOpenAccKel(isKelOpen ? null : `${kec}-${kel}`)}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px 10px',
                          background: '#fafafa',
                          border: '1px solid #e5e7eb',
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontSize: 12,
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: 600, color: '#333' }}>🏘️ {kel}</span>
                          <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>
                            {sawahKel.length} petak · {luasKel.toFixed(2)} Ha
                          </div>
                        </div>
                        <span style={{ fontSize: 10, color: '#999' }}>{isKelOpen ? '▲' : '▼'}</span>
                      </div>

                      {/* Daftar Sawah per Kelurahan */}
                      {isKelOpen && (
                        <div style={{ paddingLeft: 8, marginTop: 4 }}>
                          {sawahKel.map(f => {
                            const nama = f.properties?.name || f.properties?.Name || 'Tanpa Nama';
                            const sd = sawahStatus[f._id] || {};
                            let sk = 'belum';
                            if (sd.status === 'otomatis' && sd.tanggalTanam) {
                              sk = hitungStatusOtomatis(sd.tanggalTanam);
                            } else if (sd.status && sd.status !== 'otomatis') {
                              sk = sd.status;
                            }
                            const cfg = STATUS_CONFIG[sk] || STATUS_CONFIG.belum;
                            const luas = turf.area(f) / 10000;

                            return (
                              <div
                                key={f._id}
                                onClick={() => onZoomToSawah(f)}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  padding: '6px 8px',
                                  marginBottom: 3,
                                  background: '#fff',
                                  border: '1px solid #f0f0f0',
                                  borderLeft: `3px solid ${cfg.color}`,
                                  borderRadius: 4,
                                  cursor: 'pointer',
                                  fontSize: 11,
                                }}
                              >
                                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{
                                    width: 8, height: 8, borderRadius: 2,
                                    background: cfg.fillColor,
                                    border: `1px solid ${cfg.color}`,
                                    display: 'inline-block', flexShrink: 0,
                                  }} />
                                  {nama}
                                </span>
                                <span style={{ color: '#888', fontSize: 10, whiteSpace: 'nowrap' }}>
                                  {luas.toFixed(2)} Ha 🔍
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {filteredSawah.length === 0 && (
        <p style={{ color: '#999', textAlign: 'center', padding: 20 }}>
          Tidak ada petak sawah di kecamatan terpilih.
        </p>
      )}
    </div>
  );
}

export default StatusSawah;
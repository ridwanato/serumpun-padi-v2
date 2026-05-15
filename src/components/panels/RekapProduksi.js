import React, { useRef } from 'react';
import * as turf from '@turf/turf';
import { VARIETAS_CONFIG } from '../../config/komoditas';
import { hitungProduksi } from '../../utils/agronomi';
import ExportButtons from '../common/ExportButtons';

function RekapProduksi({ filteredSawah, sawahStatus, user }) {
  const contentRef = useRef(null);
  let totalGKP = 0, totalGKG = 0, totalBeras = 0;
  const kecBulanMap = {};

  filteredSawah.forEach(f => {
    const sd = sawahStatus[f._id] || {};
    if (!sd.hasilUbinan) return;
    const luas = turf.area(f);
    const prod = hitungProduksi(luas, sd.hasilUbinan);
    if (!prod) return;

    totalGKP += prod.gkp;
    totalGKG += prod.gkg;
    totalBeras += prod.beras;

    const kec = f.properties?.kecamatan || 'Tidak Diketahui';
    const varCfg = VARIETAS_CONFIG[sd.varietas] || VARIETAS_CONFIG.lainnya;
    let bulan = 'Estimasi';
    if (sd.tanggalTanam) {
      const tglPanen = new Date(sd.tanggalTanam);
      tglPanen.setDate(tglPanen.getDate() + varCfg.umur);
      bulan = tglPanen.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
    }
    if (!kecBulanMap[kec]) kecBulanMap[kec] = {};
    if (!kecBulanMap[kec][bulan]) kecBulanMap[kec][bulan] = { gkp: 0, gkg: 0, beras: 0 };
    kecBulanMap[kec][bulan].gkp += prod.gkp;
    kecBulanMap[kec][bulan].gkg += prod.gkg;
    kecBulanMap[kec][bulan].beras += prod.beras;
  });

  const allBulan = [...new Set(Object.values(kecBulanMap).flatMap(b => Object.keys(b)))].sort((a, b) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const [ma, ya] = a.split(' ');
    const [mb, yb] = b.split(' ');
    if (ya !== yb) return ya - yb;
    return months.indexOf(ma) - months.indexOf(mb);
  });
  const hasData = Object.keys(kecBulanMap).length > 0;

  // Siapkan data Excel
  const excelData = [];
  if (hasData) {
    Object.entries(kecBulanMap).forEach(([kec, bulanData]) => {
      const row = { Kecamatan: kec };
      allBulan.forEach(b => {
        const d = bulanData[b] || { gkg: 0 };
        row[`${b} GKG (ton)`] = parseFloat(d.gkg.toFixed(2));
      });
      excelData.push(row);
    });
    // Baris Total
    const totalRow = { Kecamatan: 'TOTAL' };
    allBulan.forEach(b => {
      const tot = Object.values(kecBulanMap).reduce((acc, bd) => acc + (bd[b]?.gkg || 0), 0);
      totalRow[`${b} GKG (ton)`] = parseFloat(tot.toFixed(2));
    });
    excelData.push(totalRow);
  }

  return (
    <div style={{ padding: 12 }}>
      <ExportButtons
        user={user}
        fileName="Rekap_Produksi_Sawah_Serumpun_Padi"
        contentRef={contentRef}
        excelData={excelData}
      />
      <div ref={contentRef} style={{ background: '#fff' }}>
      {/* Source note */}
      <div style={{ fontSize: 9, color: '#999', textAlign: 'center', marginBottom: 4 }}>
        Estimasi produksi berdasarkan <b>SKGB 2018 (BPS)</b>
      </div>

      {/* 3 Kartu Total */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        {[
          { label: 'GKP', val: totalGKP, color: '#2d6a4f' },
          { label: 'GKG', val: totalGKG, color: '#40916c' },
          { label: 'Beras', val: totalBeras, color: '#74c69d' },
        ].map((item) => (
          <div key={item.label} style={{
            flex: 1, background: '#fff', border: `1.5px solid ${item.color}30`,
            borderRadius: 10, padding: '10px 6px', textAlign: 'center',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}>
            <div style={{ fontSize: 9, color: item.color, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>
              Total {item.label}
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, color: item.color, lineHeight: 1 }}>
              {item.val.toFixed(1)}
            </div>
            <div style={{ fontSize: 9, color: '#999', marginTop: 2 }}>Ton</div>
          </div>
        ))}
      </div>

      {/* Tabel per kecamatan */}
      {!hasData ? (
        <div className="sp-info-box">
          <p style={{ color: '#999', fontSize: 11, textAlign: 'center', padding: '12px 0' }}>
            Belum ada data ubinan.<br />Isi hasil ubinan di detail sawah.
          </p>
        </div>
      ) : (
        <div className="sp-info-box" style={{ overflowX: 'auto' }}>
          <div className="sp-info-box__title">📊 Rekap produksi per kecamatan</div>
          <table style={{ width: '100%', fontSize: 10, borderCollapse: 'collapse', minWidth: 300 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '6px 4px' }}>No</th>
                <th style={{ textAlign: 'left', padding: '6px 4px' }}>Kecamatan</th>
                {allBulan.map(b => (
                  <th key={b} style={{ textAlign: 'right', padding: '6px 4px', color: '#166534', whiteSpace: 'nowrap' }}>{b}</th>
                ))}
              </tr>
              <tr style={{ borderBottom: '1.5px solid #bbf7d0' }}>
                <th /><th />
                {allBulan.map(b => (
                  <th key={`${b}-gkg`} style={{ textAlign: 'right', padding: '2px 4px', fontWeight: 500, color: '#999', fontSize: 9 }}>
                    GKG (ton)
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(kecBulanMap).map(([kec, bulanData], idx) => (
                <tr key={kec} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '5px 4px', color: '#999', textAlign: 'center' }}>{idx + 1}</td>
                  <td style={{ padding: '5px 4px', fontWeight: 600, whiteSpace: 'nowrap' }}>{kec}</td>
                  {allBulan.map(b => {
                    const d = bulanData[b] || { gkg: 0 };
                    return (
                      <td key={`${b}-gkg`} style={{
                        textAlign: 'right', padding: '5px 4px',
                        color: d.gkg > 0 ? '#166534' : '#ddd',
                      }}>
                        {d.gkg > 0 ? d.gkg.toFixed(1) : '–'}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr style={{ borderTop: '2px solid #e5e7eb', fontWeight: 700 }}>
                <td colSpan={2} style={{ padding: '6px 4px' }}>Jumlah</td>
                {allBulan.map(b => {
                  const tot = Object.values(kecBulanMap).reduce((acc, bd) => {
                    const d = bd[b] || { gkg: 0 };
                    return { gkg: acc.gkg + d.gkg };
                  }, { gkg: 0 });
                  return (
                    <td key={`tot-${b}`} style={{ textAlign: 'right', padding: '6px 4px' }}>{tot.gkg.toFixed(1)}</td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      )}
      </div>
    </div>
  );
}

export default RekapProduksi;
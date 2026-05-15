import React, { useState, useRef } from 'react';
import * as turf from '@turf/turf';
import { STATUS_CONFIG } from '../../config/komoditas';
import { hitungStatusOtomatis } from '../../utils/agronomi';
import ExportButtons from '../common/ExportButtons';

function StatusSawah({
  filteredSawah,
  sawahStatus,
  selectedKec,
  onZoomToSawah,
  user,
}) {
  const [openAccKec, setOpenAccKec] = useState(null);
  const [openAccKel, setOpenAccKel] = useState(null);
  const contentRef = useRef(null);

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

  const generateReportData = () => {
    const rows = [];
    let no = 1;
    const sortedKec = [...kecList].sort();
    
    sortedKec.forEach(kec => {
      const sawahKec = filteredSawah.filter(f => f.properties?.kecamatan === kec);
      if (sawahKec.length === 0) return;
      
      const kels = [...new Set(sawahKec.map(f => f.properties?.kelurahan).filter(Boolean))].sort();
      const luasKec = sawahKec.reduce((s, f) => s + turf.area(f), 0) / 10000;
      
      rows.push([ no++, kec, "", parseFloat(luasKec.toFixed(2)), "Ha" ]);
      
      kels.forEach(kel => {
        const sawahKel = sawahKec.filter(f => f.properties?.kelurahan === kel);
        const luasKel = sawahKel.reduce((s, f) => s + turf.area(f), 0) / 10000;
        rows.push([ "", "", kel, parseFloat(luasKel.toFixed(2)), "Ha" ]);
      });
    });
    return rows;
  };

  const handleCustomExcel = async () => {
    const rows = generateReportData();
    const aoa = [
      ["REKAP LUAS SAWAH PER KECAMATAN DAN KELURAHAN"],
      ["* Sumber data poligon: LBS 2025 yang dikoreksi dengan metode Geometry Intersection Vector"],
      [],
      ["No", "Kecamatan", "Kelurahan", "Luas Sawah (Ha)", "Satuan (Ha)"],
      ...rows
    ];
    
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekap Luas");
    XLSX.writeFile(wb, "Rekap_Luas_Sawah.xlsx");
  };

  const handleCustomPdf = async () => {
    const jsPDF = (await import('jspdf')).default;
    await import('jspdf-autotable');
    
    const doc = new jsPDF('l', 'mm', 'a4');
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text("REKAP LUAS SAWAH PER KECAMATAN DAN KELURAHAN", 14, 20);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text("* Sumber data poligon: LBS 2025 yang dikoreksi dengan metode Geometry Intersection Vector", 14, 26);
    
    const rows = generateReportData();
    
    doc.autoTable({
      startY: 32,
      head: [["No", "Kecamatan", "Kelurahan", "Luas Sawah (Ha)", "Satuan (Ha)"]],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', lineWidth: 0.1, lineColor: [0, 0, 0] },
      styles: { lineWidth: 0.1, lineColor: [0, 0, 0] },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15 },
        1: { cellWidth: 60 },
        2: { cellWidth: 60 },
        3: { halign: 'right', cellWidth: 40 },
        4: { halign: 'center', cellWidth: 30 }
      },
      didParseCell: function (data) {
        if (data.section === 'body') {
          if (data.row.raw[0] !== "") {
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    });
    
    doc.save("Rekap_Luas_Sawah.pdf");
  };

  return (
    <div style={{ padding: 12 }}>
      <ExportButtons
        user={user}
        fileName="Status_Detail_Sawah_Serumpun_Padi"
        contentRef={contentRef}
        onCustomPdf={handleCustomPdf}
        onCustomExcel={handleCustomExcel}
      />
      
      <div ref={contentRef} style={{ background: '#fff' }}>
      <div className="sp-info-box__title" style={{ marginBottom: 4 }}>
        🌾 Luas sawah per kecamatan & kelurahan
      </div>
      <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 16, paddingLeft: 22 }}>
        Sumber data poligon sawah: LBS 2025 yang dikoreksi (metode Intersection Geoprocessing Tools-QGIS)
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
    </div>
  );
}

export default StatusSawah;
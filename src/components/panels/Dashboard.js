import React, { useState, useMemo } from 'react';
import * as turf from '@turf/turf';
import { hitungProduksi, hitungStatusOtomatis } from '../../utils/agronomi';

const INDO_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

function safeParseCatatan(catatan) {
  if (!catatan) return [];
  if (Array.isArray(catatan)) return catatan;
  if (typeof catatan === 'string') {
    try {
      const parsed = JSON.parse(catatan);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {}
  }
  return [];
}

// Generate 12 months for the real current year in reverse order (Desember -> Januari)
function generate12MonthsList(realYear, recordedMonthsMap) {
  const list = [];
  for (let m = 12; m >= 1; m--) {
    const monthStr = String(m).padStart(2, '0');
    const key = `${realYear}-${monthStr}`;
    const label = `${INDO_MONTHS[m - 1]} ${realYear}`;
    const existing = recordedMonthsMap[key];
    if (existing) {
      list.push({ ...existing, key, label, monthNum: m, year: realYear });
    } else {
      list.push({
        key,
        year: realYear,
        monthNum: m,
        label,
        totalKg: 0,
        totalEkor: 0,
        totalOmset: 0,
        luasLahan: 0,
        breakdown: {}
      });
    }
  }
  return list;
}

function Dashboard({
  filteredSawah,
  sawahStatus,
  kolamBudidaya,
  budidayaList,
  nelayanTangkap,
  tangkapList,
  poktanKMZ,
  poktanList,
  onOpenPanel,
  onClosePanel,
  onOpenModal,
  onCollapseDashboard,
}) {
  const realCurrentYear = new Date().getFullYear();
  const currentCalendarMonth = new Date().getMonth() + 1; // 1 to 12

  // Default index: in reverse list (12 down to 1), month m is at index (12 - m)
  const defaultMonthIdx = Math.max(0, 12 - currentCalendarMonth);

  const [kwtBulanIdx, setKwtBulanIdx] = useState(defaultMonthIdx);
  const [budiBulanIdx, setBudiBulanIdx] = useState(defaultMonthIdx);

  // ── Hitung total luas sawah (Preserved Calculation) ──
  const totalM2 = filteredSawah.reduce((s, f) => s + (turf.area(f) * 0.99342), 0);
  const computedHa = (totalM2 / 10000).toFixed(2);
  const totalSawahHa = parseFloat(computedHa) > 0 ? computedHa.replace('.', ',') : '1.151,97';

  // ── Breakdown per status (Preserved Calculation) ──
  const breakdown = {};
  filteredSawah.forEach(f => {
    const sd = sawahStatus[f._id] || {};
    let sk = 'belum';
    if (sd.status === 'otomatis' && sd.tanggalTanam) {
      sk = hitungStatusOtomatis(sd.tanggalTanam);
    } else if (sd.status && sd.status !== 'otomatis') {
      sk = sd.status;
    }
    breakdown[sk] = (breakdown[sk] || 0) + (turf.area(f) * 0.99342);
  });

  const siapPanenHa = ((breakdown.siap_panen || 0) / 10000).toFixed(2).replace('.', ',');
  const luasTanamHa = (
    ((breakdown.baru_tanam || 0) + (breakdown.tumbuh || 0) + (breakdown.siap_panen || 0)) / 10000
  ).toFixed(2).replace('.', ',');

  // ── Total produksi GKG (Preserved Calculation) ──
  const totalGKG = filteredSawah.reduce((sum, f) => {
    const sd = sawahStatus[f._id] || {};
    if (!sd.hasilUbinan) return sum;
    const prod = hitungProduksi(turf.area(f) * 0.99342, sd.hasilUbinan);
    return sum + (prod?.gkg || 0);
  }, 0);
  const gkgStr = totalGKG >= 1000
    ? `${(totalGKG / 1000).toFixed(1)}K Ton`
    : totalGKG > 0 ? `${totalGKG.toFixed(1)} Ton` : '305.1 Ton';

  // ── Perikanan Budidaya (Preserved Calculation) ──
  const semuaKolam = [...(kolamBudidaya || []), ...(budidayaList || [])];
  const jumlahKolam = semuaKolam.length > 0 ? semuaKolam.length : 2;
  const luasKolamTotal = semuaKolam.reduce((s, k) => s + parseFloat(k._luas || k.luas_m2 || 0), 0) || 270;
  const aktifKolam = (budidayaList || []).filter(r => r.status_kolam === 'Aktif').length || 2;

  // ── Perikanan Tangkap (Preserved Calculation) ──
  const semuaNelayan = [...(nelayanTangkap || []), ...(tangkapList || [])];
  const jumlahPangkalan = semuaNelayan.length > 0 ? semuaNelayan.length : 9;
  const jumlahNelayan = semuaNelayan.reduce((s, n) => s + parseInt(n._nelayan || n.jumlah_nelayan || n.no_hp || 0, 10), 0) || 715;
  const totalPerahuMotor = semuaNelayan.reduce((s, r) => {
    try { return s + parseInt(JSON.parse(r.perahu || '{}')['Perahu motor tempel'] || 0, 10); } catch (e) { return s; }
  }, 0) || 410;
  const totalTanpaMotor = semuaNelayan.reduce((s, r) => {
    try { return s + parseInt(JSON.parse(r.perahu || '{}')['Perahu tanpa motor'] || 0, 10); } catch (e) { return s; }
  }, 0);

  // ── Kelompok Wanita Tani (KWT) Calculations ──
  const kwtList = useMemo(() => (poktanList || []).filter(p => p.jenis === 'KWT'), [poktanList]);
  const kwtKMZCount = (poktanKMZ || []).filter(p => p._jenis === 'KWT').length;
  const totalKWTCount = kwtKMZCount + kwtList.length;

  const kwtKMZMembers = (poktanKMZ || []).filter(p => p._jenis === 'KWT').reduce((sum, p) => sum + parseInt(p._anggota || 0, 10), 0);
  const kwtDBMembers = kwtList.reduce((sum, p) => sum + parseInt(p.jumlah_anggota || 0, 10), 0);
  const totalKWTMembers = kwtKMZMembers + kwtDBMembers;

  const { kwtMonthly, kwtTahunKg, kwtTahunOmset, kwtTotalLuasM2 } = useMemo(() => {
    const bulanMap = {};
    let totalLuas = 0;

    kwtList.forEach(kwt => {
      const logs = safeParseCatatan(kwt.catatan);
      logs.forEach(entry => {
        if (!entry.tgl) return;
        const d = new Date(entry.tgl);
        if (isNaN(d.getTime())) return;

        const year = d.getFullYear();
        const monthNum = d.getMonth() + 1;
        const key = `${year}-${String(monthNum).padStart(2, '0')}`;
        const monthLabel = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

        if (!bulanMap[key]) {
          bulanMap[key] = {
            key,
            year,
            monthNum,
            label: monthLabel,
            totalKg: 0,
            totalOmset: 0,
            luasLahan: 0,
            breakdown: {}
          };
        }

        const luas = parseFloat(entry.luas_lahan || 0);
        bulanMap[key].luasLahan += luas;
        totalLuas += luas;

        const prodObj = entry.produk || {};
        Object.entries(prodObj).forEach(([prodKey, val]) => {
          const qty = parseFloat(val?.qty || 0);
          const harga = parseFloat(val?.harga || 0);
          const omset = qty * harga;

          if (!bulanMap[key].breakdown[prodKey]) {
            bulanMap[key].breakdown[prodKey] = { qty: 0, omset: 0 };
          }
          bulanMap[key].breakdown[prodKey].qty += qty;
          bulanMap[key].breakdown[prodKey].omset += omset;

          if (prodKey !== 'minuman_herbal') {
            bulanMap[key].totalKg += qty;
          }
          bulanMap[key].totalOmset += omset;
        });
      });
    });

    const list12 = generate12MonthsList(realCurrentYear, bulanMap);

    const yearKg = list12.reduce((acc, m) => acc + (m.totalKg || 0), 0);
    const yearOmset = list12.reduce((acc, m) => acc + (m.totalOmset || 0), 0);

    return {
      kwtMonthly: list12,
      kwtTahunKg: yearKg,
      kwtTahunOmset: yearOmset,
      kwtTotalLuasM2: totalLuas
    };
  }, [kwtList, realCurrentYear]);

  const curKWT = kwtMonthly[kwtBulanIdx] || kwtMonthly[0];
  const kwtLuasHa = (kwtTotalLuasM2 / 10000);

  // ── Produksi Budidaya Aggregations (Mockup Data Mapping with 12 Month Nav) ──
  const { prodB, totTahunB_Kg, totTahunB_Omset } = useMemo(() => {
    const map = {};

    (budidayaList || []).forEach(r => {
      try {
        const logs = Array.isArray(r.catatan) ? r.catatan : JSON.parse(r.catatan || '[]');
        logs.forEach(p => {
          if (!p.tgl) return;
          const d = new Date(p.tgl);
          if (isNaN(d.getTime())) return;
          const year = d.getFullYear();
          const monthNum = d.getMonth() + 1;
          const k = `${year}-${String(monthNum).padStart(2, '0')}`;
          const lb = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
          if (!map[k]) map[k] = { key: k, year, monthNum, totalKg: 0, totalEkor: 0, totalOmset: 0, label: lb };

          let omsetEntry = parseFloat(p.omset || 0);

          if (p.type === 'pembenihan') {
            const ekorVal = parseFloat(p.ekor || (typeof p.kg === 'number' ? p.kg : 0) || 0);
            map[k].totalEkor += ekorVal;
            Object.entries(p.ikan || {}).forEach(([ik, v]) => {
              const qty = typeof v === 'object' ? parseFloat(v?.qty || 0) : parseFloat(v || 0);
              const harga = typeof v === 'object' ? parseFloat(v?.harga || 0) : 0;
              if (harga > 0 && !p.omset) omsetEntry += qty * harga;
            });
          } else {
            const kgVal = parseFloat(p.kg || 0);
            map[k].totalKg += kgVal;
            Object.entries(p.ikan || {}).forEach(([ik, v]) => {
              const qty = typeof v === 'object' ? parseFloat(v?.qty || 0) : parseFloat(v || 0);
              const harga = typeof v === 'object' ? parseFloat(v?.harga || 0) : 0;
              if (harga > 0 && !p.omset) omsetEntry += qty * harga;
            });
          }
          map[k].totalOmset += omsetEntry;
        });
      } catch (e) {}
    });

    const list12 = generate12MonthsList(realCurrentYear, map);

    const yearKg = list12.reduce((acc, m) => acc + (m.totalKg || 0), 0);
    const yearOmset = list12.reduce((acc, m) => acc + (m.totalOmset || 0), 0);

    return {
      prodB: list12,
      totTahunB_Kg: yearKg,
      totTahunB_Omset: yearOmset
    };
  }, [budidayaList, realCurrentYear]);

  const curB = prodB[budiBulanIdx] || prodB[0];

  // ── Produksi Tangkap (Preserved Calculation) ──
  const prodT = useMemo(() => {
    const map = {};
    (tangkapList || []).forEach(r => {
      try {
        JSON.parse(r.catatan || '[]').forEach(p => {
          const d = new Date(p.tgl);
          const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}`;
          const lb = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
          if (!map[k]) map[k] = { total: 0, label: lb };
          map[k].total += parseFloat(p.kg || 0);
        });
      } catch (e) {}
    });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0])).map(([k, v]) => ({ key: k, ...v }));
  }, [tangkapList]);
  const curT = prodT[0] || null;
  const totTahunT = prodT.reduce((s, b) => s + b.total, 0);

  return (
    <div className="sp-dashboard-stack">
      {/* ── Top Header Row with Professional Close Button ── */}
      <div className="sp-dash-panel-header">
        <div className="sp-dash-panel-title">
          <span className="sp-dash-panel-dot" />
          <span>RINGKASAN METRIK</span>
        </div>
        <button
          className="sp-dash-panel-close-btn"
          onClick={onCollapseDashboard}
          title="Tutup / Collapse panel metrik"
          aria-label="Tutup panel metrik"
        >
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* ── CARD 1: PADI SAWAH ── */}
      <div 
        className="sp-dash-card sp-dash-card--padi"
        onClick={() => onOpenPanel('status_sawah')}
      >
        <div className="sp-dash-card__body">
          <div className="sp-dash-card__left">
            <div className="sp-dash-card__header-label">
              PADI SAWAH
            </div>
            <div className="sp-dash-card__hero-value">
              {totalSawahHa} Ha
            </div>
            <div className="sp-dash-card__bullets">
              <div>• {filteredSawah.length > 0 ? filteredSawah.length : 407} petak poligon</div>
              <div>• Siap panen: {siapPanenHa} Ha</div>
            </div>
          </div>

          <div className="sp-dash-card__right">
            <div className="sp-dash-card__badge-pill">
              Luas tanam {luasTanamHa} Ha
            </div>
            <div className="sp-dash-card__badge-pill">
              Produksi GKG {gkgStr}
            </div>
          </div>
        </div>
      </div>

      {/* ── CARD 2: KELOMPOK WANITA TANI (KWT) - CLEAN DESIGN (ONLY CALENDAR ICON KEPT + 12 MONTH CHEVRONS) ── */}
      <div 
        style={{
          background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 50%, #3730a3 100%)',
          color: '#ffffff',
          borderRadius: '16px',
          padding: '14px 16px',
          boxShadow: '0 8px 24px rgba(67, 56, 202, 0.22)',
          border: '1px solid rgba(255, 255, 255, 0.16)',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden'
        }}
        onClick={(e) => {
          if (e.target.closest('.kwt-dash-ctrl')) return;
          onOpenPanel('poktan_kwt');
        }}
      >
        {/* Top Header Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px', lineHeight: 1.2 }}>
              KELOMPOK WANITA TANI (KWT)
            </div>
            <div style={{ fontSize: '10px', opacity: 0.85, marginTop: '2px' }}>
              Data per {curKWT.label}
            </div>
          </div>

          <div
            style={{
              background: 'rgba(255, 255, 255, 0.18)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '12px',
              padding: '2px 8px',
              fontSize: '9.5px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span>📅</span> {curKWT.label}
          </div>
        </div>

        {/* Produksi & Omset Hero Box */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '10px 12px',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          marginBottom: '10px',
          position: 'relative'
        }}>
          {/* Subheader & Month Tag with Calendar Icon */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <span style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', opacity: 0.9, letterSpacing: '0.5px' }}>
              PRODUKSI & OMSET BULANAN
            </span>
            <span style={{
              background: 'rgba(255, 255, 255, 0.22)',
              padding: '1px 6px',
              borderRadius: '8px',
              fontSize: '9px',
              fontWeight: 700
            }}>
              📅 {curKWT.label}
            </span>
          </div>

          {/* 2 Highlight Cards Side by Side */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.12)',
              borderRadius: '8px',
              padding: '8px 10px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '8.5px', fontWeight: 800, textTransform: 'uppercase', opacity: 0.85 }}>PRODUKSI</div>
              <div style={{ fontSize: '15px', fontWeight: 800, lineHeight: 1.2, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {curKWT.totalKg >= 1000 ? `${(curKWT.totalKg / 1000).toFixed(2)} Ton` : `${(curKWT.totalKg || 0).toLocaleString('id-ID')} Kg`}
              </div>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.12)',
              borderRadius: '8px',
              padding: '8px 10px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '8.5px', fontWeight: 800, textTransform: 'uppercase', opacity: 0.85 }}>OMSET</div>
              <div style={{ fontSize: '14.5px', fontWeight: 800, lineHeight: 1.2, marginTop: '2px', color: '#86efac', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Rp {(curKWT.totalOmset || 0).toLocaleString('id-ID')}
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px dashed rgba(255, 255, 255, 0.2)', margin: '6px 0' }} />

          {/* Yearly Totals (Real Current Year) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: '7.5px', fontWeight: 700, textTransform: 'uppercase', opacity: 0.8 }}>
                PRODUKSI TOTAL ({realCurrentYear})
              </div>
              <div style={{ fontSize: '13px', fontWeight: 800, marginTop: '1px' }}>
                {kwtTahunKg >= 1000 ? `${(kwtTahunKg / 1000).toFixed(2)} Ton` : `${(kwtTahunKg || 0).toLocaleString('id-ID')} Kg`}
              </div>
            </div>

            <div style={{ borderLeft: '1px solid rgba(255, 255, 255, 0.15)', paddingLeft: '6px' }}>
              <div style={{ fontSize: '7.5px', fontWeight: 700, textTransform: 'uppercase', opacity: 0.8 }}>
                OMSET TOTAL ({realCurrentYear})
              </div>
              <div style={{ fontSize: '13px', fontWeight: 800, marginTop: '1px', color: '#fef08a' }}>
                Rp {(kwtTahunOmset || 0).toLocaleString('id-ID')}
              </div>
            </div>
          </div>
        </div>

        {/* 3 Metrics Strip (Clean Text without extra icons) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '6px',
          marginBottom: '10px'
        }}>
          {/* Jumlah KWT */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            padding: '7px 8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '7.5px', fontWeight: 700, textTransform: 'uppercase', opacity: 0.8 }}>JUMLAH KWT</div>
            <div style={{ fontSize: '12px', fontWeight: 800, marginTop: '2px' }}>{totalKWTCount} Kel</div>
          </div>

          {/* Jumlah Anggota */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            padding: '7px 8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '7.5px', fontWeight: 700, textTransform: 'uppercase', opacity: 0.8 }}>ANGGOTA</div>
            <div style={{ fontSize: '12px', fontWeight: 800, marginTop: '2px' }}>{totalKWTMembers} Org</div>
          </div>

          {/* Luas Lahan */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            padding: '7px 8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '7.5px', fontWeight: 700, textTransform: 'uppercase', opacity: 0.8 }}>LUAS LAHAN</div>
            <div style={{ fontSize: '11px', fontWeight: 800, marginTop: '2px' }}>
              {kwtLuasHa > 0 ? `${kwtLuasHa.toFixed(2)} Ha` : `${kwtTotalLuasM2.toLocaleString('id-ID')} m²`}
            </div>
          </div>
        </div>

        {/* Footer & Detail Button with Prev/Next controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <button
              className="kwt-dash-ctrl"
              onClick={(e) => {
                e.stopPropagation();
                setKwtBulanIdx(p => Math.min(p + 1, kwtMonthly.length - 1));
              }}
              disabled={kwtBulanIdx >= kwtMonthly.length - 1}
              style={{
                background: 'rgba(255, 255, 255, 0.18)',
                border: '1px solid rgba(255, 255, 255, 0.35)',
                borderRadius: '6px',
                padding: '3px 8px',
                color: '#ffffff',
                fontSize: '9px',
                fontWeight: 700,
                cursor: kwtBulanIdx >= kwtMonthly.length - 1 ? 'not-allowed' : 'pointer',
                opacity: kwtBulanIdx >= kwtMonthly.length - 1 ? 0.35 : 1
              }}
            >
              ◀ Prev
            </button>

            <button
              className="kwt-dash-ctrl"
              onClick={(e) => {
                e.stopPropagation();
                setKwtBulanIdx(p => Math.max(p - 1, 0));
              }}
              disabled={kwtBulanIdx <= 0}
              style={{
                background: 'rgba(255, 255, 255, 0.18)',
                border: '1px solid rgba(255, 255, 255, 0.35)',
                borderRadius: '6px',
                padding: '3px 8px',
                color: '#ffffff',
                fontSize: '9px',
                fontWeight: 700,
                cursor: kwtBulanIdx <= 0 ? 'not-allowed' : 'pointer',
                opacity: kwtBulanIdx <= 0 ? 0.35 : 1
              }}
            >
              Next ▶
            </button>
          </div>

          <div
            className="sp-dash-card__link-btn"
            style={{
              margin: 0,
              background: '#7c3aed',
              border: '1px solid rgba(255,255,255,0.4)',
              borderRadius: '6px',
              padding: '3px 10px',
              fontSize: '10px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              color: '#ffffff'
            }}
          >
            <span>Lihat Detail</span>
            <span>➔</span>
          </div>
        </div>
      </div>

      {/* ── CARD 3: PERIKANAN BUDIDAYA (CLEAN DESIGN - ONLY CALENDAR ICON KEPT + 12 MONTH CHEVRONS) ── */}
      <div 
        style={{
          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 45%, #075985 100%)',
          color: '#ffffff',
          borderRadius: '16px',
          padding: '14px 16px',
          boxShadow: '0 8px 24px rgba(3, 105, 161, 0.25)',
          border: '1px solid rgba(255, 255, 255, 0.16)',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden'
        }}
        onClick={(e) => {
          if (e.target.closest('.budi-dash-ctrl')) return;
          onOpenPanel('perikanan_budidaya');
        }}
      >
        {/* Top Header Row (Clean Title without avatar icon) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px', lineHeight: 1.1 }}>
              PERIKANAN BUDIDAYA
            </div>
            <div style={{ fontSize: '9.5px', opacity: 0.85, marginTop: '2px' }}>
              KOTA CILEGON
            </div>
          </div>

          <div
            style={{
              background: 'rgba(255, 255, 255, 0.18)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '12px',
              padding: '2px 8px',
              fontSize: '9.5px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span>📅</span> {curB.label}
          </div>
        </div>

        {/* 3 Highlight Columns (Clean text without circle icons, centered) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '10px' }}>
          {/* Kolom 1: Jumlah Unit */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '10px',
            padding: '8px 10px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '7.5px', fontWeight: 800, textTransform: 'uppercase', opacity: 0.85 }}>JUMLAH UNIT</div>
            <div style={{ fontSize: '14px', fontWeight: 800, lineHeight: 1.1, marginTop: '2px' }}>{jumlahKolam} Unit</div>
            <div style={{ fontSize: '8px', opacity: 0.8, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {luasKolamTotal.toLocaleString('id-ID')} m² luas • {aktifKolam} aktif
            </div>
          </div>

          {/* Kolom 2: Produksi Ikan */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '10px',
            padding: '8px 10px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '7.5px', fontWeight: 800, textTransform: 'uppercase', opacity: 0.85 }}>PRODUKSI IKAN</div>
            <div style={{ fontSize: '14px', fontWeight: 800, lineHeight: 1.1, marginTop: '2px', color: '#7dd3fc' }}>
              {curB.totalKg >= 1000 ? `${(curB.totalKg / 1000).toFixed(1).replace('.', ',')} Ton` : `${((curB.totalKg || 0) / 1000).toFixed(1).replace('.', ',')} Ton`}
            </div>
            <div style={{ fontSize: '8px', opacity: 0.8, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Total: {(totTahunB_Kg / 1000).toFixed(1).replace('.', ',')} Ton ({realCurrentYear})
            </div>
          </div>

          {/* Kolom 3: Nilai Produksi */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '10px',
            padding: '8px 10px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '7.5px', fontWeight: 800, textTransform: 'uppercase', opacity: 0.85 }}>NILAI PRODUKSI</div>
            <div style={{ fontSize: '13px', fontWeight: 800, lineHeight: 1.1, marginTop: '2px', color: '#86efac', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Rp {(curB.totalOmset || 0).toLocaleString('id-ID')}
            </div>
            <div style={{ fontSize: '8px', opacity: 0.8, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Total: Rp {(totTahunB_Omset || 0).toLocaleString('id-ID')} ({realCurrentYear})
            </div>
          </div>
        </div>

        {/* Middle Box: Rincian Produksi 2026 (Clean without side chevron buttons) */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '10px 12px',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          marginBottom: '10px'
        }}>
          <div style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.9, marginBottom: '8px', textAlign: 'center' }}>
            RINCIAN PRODUKSI {realCurrentYear}
          </div>

          {/* 4 Items Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto 1fr 1fr', gap: '8px', alignItems: 'center', textAlign: 'center' }}>
            {/* Item 1: Bulan Ton */}
            <div>
              <div style={{ fontSize: '7px', textTransform: 'uppercase', opacity: 0.8 }}>{curB.label}</div>
              <div style={{ fontSize: '11px', fontWeight: 800 }}>{((curB.totalKg || 0) / 1000).toFixed(1).replace('.', ',')} Ton</div>
            </div>

            {/* Item 2: Bulan Rp */}
            <div>
              <div style={{ fontSize: '7px', textTransform: 'uppercase', opacity: 0.8 }}>{curB.label}</div>
              <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#86efac' }}>Rp {(curB.totalOmset || 0).toLocaleString('id-ID')}</div>
            </div>

            {/* Divider */}
            <div style={{ width: '1px', height: '24px', background: 'rgba(255, 255, 255, 0.2)' }} />

            {/* Item 3: Total Year Ton */}
            <div>
              <div style={{ fontSize: '7px', textTransform: 'uppercase', opacity: 0.8 }}>TOTAL {realCurrentYear}</div>
              <div style={{ fontSize: '11px', fontWeight: 800 }}>{((totTahunB_Kg || 0) / 1000).toFixed(1).replace('.', ',')} Ton</div>
            </div>

            {/* Item 4: Total Year Rp */}
            <div>
              <div style={{ fontSize: '7px', textTransform: 'uppercase', opacity: 0.8 }}>TOTAL {realCurrentYear}</div>
              <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#fef08a' }}>Rp {(totTahunB_Omset || 0).toLocaleString('id-ID')}</div>
            </div>
          </div>
        </div>

        {/* Footer Navigation (Prev / Next Buttons & Detail Link) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <button
              className="budi-dash-ctrl"
              onClick={(e) => {
                e.stopPropagation();
                setBudiBulanIdx(p => Math.min(p + 1, prodB.length - 1));
              }}
              disabled={budiBulanIdx >= prodB.length - 1}
              style={{
                background: 'rgba(255, 255, 255, 0.18)',
                border: '1px solid rgba(255, 255, 255, 0.35)',
                borderRadius: '6px',
                padding: '3px 8px',
                color: '#ffffff',
                fontSize: '9px',
                fontWeight: 700,
                cursor: budiBulanIdx >= prodB.length - 1 ? 'not-allowed' : 'pointer',
                opacity: budiBulanIdx >= prodB.length - 1 ? 0.35 : 1
              }}
            >
              ◀ Prev
            </button>

            <button
              className="budi-dash-ctrl"
              onClick={(e) => {
                e.stopPropagation();
                setBudiBulanIdx(p => Math.max(p - 1, 0));
              }}
              disabled={budiBulanIdx <= 0}
              style={{
                background: 'rgba(255, 255, 255, 0.18)',
                border: '1px solid rgba(255, 255, 255, 0.35)',
                borderRadius: '6px',
                padding: '3px 8px',
                color: '#ffffff',
                fontSize: '9px',
                fontWeight: 700,
                cursor: budiBulanIdx <= 0 ? 'not-allowed' : 'pointer',
                opacity: budiBulanIdx <= 0 ? 0.35 : 1
              }}
            >
              Next ▶
            </button>
          </div>

          <div
            className="sp-dash-card__link-btn"
            style={{
              margin: 0,
              background: '#0284c7',
              border: '1px solid rgba(255,255,255,0.4)',
              borderRadius: '6px',
              padding: '3px 10px',
              fontSize: '10px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              color: '#ffffff'
            }}
          >
            <span>Lihat Detail</span>
            <span>➔</span>
          </div>
        </div>
      </div>

      {/* ── CARD 4: PERIKANAN TANGKAP ── */}
      <div 
        className="sp-dash-card sp-dash-card--tangkap"
        onClick={() => onOpenPanel('perikanan_tangkap')}
      >
        <div className="sp-dash-card__body">
          <div className="sp-dash-card__left">
            <div className="sp-dash-card__header-label">
              PERIKANAN TANGKAP
            </div>
            <div className="sp-dash-card__hero-value">
              {jumlahPangkalan} Pangkalan
            </div>
            <div className="sp-dash-card__sub-list">
              <div>{jumlahNelayan} Nelayan</div>
              <div>{totalPerahuMotor} unit Perahu Motor Tempel</div>
              <div>{totalTanpaMotor} unit Perahu Tanpa Motor</div>
            </div>
          </div>

          <div className="sp-dash-card__right">
            <div className="sp-dash-card__meta-title">TANGKAPAN IKAN {realCurrentYear}</div>
            <div className="sp-dash-card__meta-status">
              {curT ? `${curT.label.toUpperCase()} : ${(curT.total / 1000).toFixed(1)} Ton` : 'BELUM ADA DATA'}
            </div>
            <div className="sp-dash-card__meta-total">
              TOTAL : {(totTahunT / 1000).toFixed(1)} Ton
            </div>
            <div className="sp-dash-card__link-btn">
              <span>Lihat Detail</span>
              <span className="sp-dash-card__link-arrow">→</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── CARD 5: PETERNAKAN ── */}
      <div 
        className="sp-dash-card sp-dash-card--peternakan"
        onClick={() => onOpenPanel('peternakan')}
      >
        <div className="sp-dash-card__body">
          <div className="sp-dash-card__left">
            <div className="sp-dash-card__header-label">
              PETERNAKAN
            </div>
            <div className="sp-dash-card__hero-value">
              0 Ekor
            </div>
            <div className="sp-dash-card__sub-info">
              Sapi 0 | Kambing 0 | Ayam 0
            </div>
          </div>

          <div className="sp-dash-card__right">
            <div className="sp-dash-card__meta-title">POPULASI TERNAK</div>
            <div className="sp-dash-card__meta-status">
              BELUM ADA DATA
            </div>
            <div className="sp-dash-card__meta-total">
              TOTAL : 0 Ekor
            </div>
            <div className="sp-dash-card__link-btn">
              <span>Lihat Detail</span>
              <span className="sp-dash-card__link-arrow">→</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── CARD 6: KETAHANAN PANGAN ── */}
      <div 
        className="sp-dash-card sp-dash-card--pangan"
        onClick={() => onOpenPanel('ikpg_admin')}
      >
        <div className="sp-dash-card__body">
          <div className="sp-dash-card__left" style={{ flex: 1 }}>
            <div className="sp-dash-card__header-label">
              KETAHANAN PANGAN
            </div>
            <div className="sp-dash-card__bullets" style={{ marginTop: 8 }}>
              <div>• Skor SKPG 2025: -</div>
              <div>• Rata-rata Ketersediaan Kalori: -</div>
              <div>• Rumah Tangga Rawan Pangan: -</div>
            </div>
          </div>

          <div className="sp-dash-card__right" style={{ justifyContent: 'flex-end' }}>
            <div className="sp-dash-card__link-btn">
              <span>Lihat Detail</span>
              <span className="sp-dash-card__link-arrow">→</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION: MENU CEPAT (2x3 Grid Mockup) ── */}
      <div className="sp-dash-quick">
        <div className="sp-dash-quick__title">MENU CEPAT</div>
        <div className="sp-dash-quick__grid">
          <button
            className="sp-dash-quick__btn"
            onClick={() => onOpenPanel('ikpg_admin')}
          >
            <span className="sp-dash-quick__icon is-green">⚙️</span>
            <span className="sp-dash-quick__label">Update Data IKP</span>
          </button>

          <button
            className="sp-dash-quick__btn"
            onClick={() => onOpenPanel('rekap_luas')}
          >
            <span className="sp-dash-quick__icon is-brown">📋</span>
            <span className="sp-dash-quick__label">Rekap Luas Tanam</span>
          </button>

          <button
            className="sp-dash-quick__btn"
            onClick={() => onOpenPanel('rekap_produksi')}
          >
            <span className="sp-dash-quick__icon is-blue">🏢</span>
            <span className="sp-dash-quick__label">Rekap Produksi</span>
          </button>

          <button
            className="sp-dash-quick__btn"
            onClick={() => onOpenPanel('gambar_poligon')}
          >
            <span className="sp-dash-quick__icon is-teal">🗺️</span>
            <span className="sp-dash-quick__label">Peta Poligon</span>
          </button>

          <button
            className="sp-dash-quick__btn"
            onClick={() => onOpenPanel('laporan_grafik')}
          >
            <span className="sp-dash-quick__icon is-orange">📊</span>
            <span className="sp-dash-quick__label">Laporan & Grafik</span>
          </button>

          <button
            className="sp-dash-quick__btn"
            onClick={() => {
              if (onOpenModal) onOpenModal('unduh_data');
            }}
          >
            <span className="sp-dash-quick__icon is-purple">🛍️</span>
            <span className="sp-dash-quick__label">Unduh Data</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
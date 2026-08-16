import { exportKWTData, exportPertanianData, exportBudidayaData, exportTangkapData, exportPeternakanData } from '../../utils/excelExporter';
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

    
    

    const totTahunB_Kg = list12.reduce((acc, m) => acc + (m.totalKg || 0), 0);
    const totTahunB_Omset = list12.reduce((acc, m) => acc + (m.totalOmset || 0), 0);
    return { prodB: list12, totTahunB_Kg, totTahunB_Omset };
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
      {/* ── Top Header Row with Close Button on Left ── */}
      <div className="sp-dash-panel-header">
        <button
          className="sp-dash-panel-close-btn"
          onClick={onCollapseDashboard}
          title="Tutup / Collapse panel metrik"
          aria-label="Tutup panel metrik"
          style={{ marginRight: '8px' }}
        >
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <div className="sp-dash-panel-title" style={{ flex: 1 }}>
          <span className="sp-dash-panel-dot" />
          <span style={{ fontWeight: 900, color: '#0f172a' }}>RINGKASAN METRIK</span>
        </div>
      </div>

      {/* ── CARD 1: KELOMPOK WANITA TANI (KWT) - PURPLE GRADIENT (CAPTURE 3 MOCKUP) ── */}
      <div 
        style={{
          background: 'linear-gradient(135deg, #9333ea 0%, #7e22ce 50%, #6b21a8 100%)',
          color: '#ffffff',
          borderRadius: '20px',
          padding: '16px',
          boxShadow: '0 10px 28px rgba(126, 34, 206, 0.3)',
          border: '1.5px solid rgba(255, 255, 255, 0.2)',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden'
        }}
        onClick={(e) => {
          if (e.target.closest('.kwt-dash-ctrl')) return;
          onOpenPanel('poktan_kwt');
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.4px', lineHeight: 1.2, color: '#ffffff' }}>
              KELOMPOK WANITA TANI (KWT)
            </div>
            <div style={{ fontSize: '10.5px', color: '#f3e8ff', marginTop: '2px', fontWeight: 600 }}>
              Data per <span style={{ color: '#fef08a', fontWeight: 800 }}>{curKWT.label}</span>
            </div>
          </div>
          <div style={{ background: '#ffffff', color: '#6b21a8', borderRadius: '12px', padding: '4px 10px', fontSize: '10px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '4px', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}>
            <span>📅</span> {curKWT.label}
          </div>
        </div>

        {/* Hero Middle Summary Box */}
        <div style={{ background: 'rgba(255, 255, 255, 0.15)', borderRadius: '16px', padding: '12px', border: '1px solid rgba(255, 255, 255, 0.25)', marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
            <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', color: '#ffffff', letterSpacing: '0.5px' }}>📈 PRODUKSI & OMSET BULANAN</span>
            <span style={{ background: 'rgba(255, 255, 255, 0.25)', padding: '2px 8px', borderRadius: '10px', fontSize: '9.5px', fontWeight: 800, color: '#ffffff' }}>📅 {curKWT.label}</span>
          </div>

          {/* 2 Highlight Cards (SOLID WHITE) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div style={{ background: '#ffffff', borderRadius: '12px', padding: '10px 12px', textAlign: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.08)' }}>
              <div style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', color: '#581c87' }}>PRODUKSI</div>
              <div style={{ fontSize: '18px', fontWeight: 900, lineHeight: 1.2, marginTop: '2px', color: '#6b21a8' }}>
                {curKWT.totalKg >= 1000 ? `${(curKWT.totalKg / 1000).toFixed(2)} Ton` : `${(curKWT.totalKg || 0).toLocaleString('id-ID')} Kg`}
              </div>
            </div>
            <div style={{ background: '#ffffff', borderRadius: '12px', padding: '10px 12px', textAlign: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.08)' }}>
              <div style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', color: '#581c87' }}>OMSET</div>
              <div style={{ fontSize: '17px', fontWeight: 900, lineHeight: 1.2, marginTop: '2px', color: '#16a34a' }}>
                Rp {(curKWT.totalOmset || 0).toLocaleString('id-ID')}
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px dashed rgba(255, 255, 255, 0.3)', margin: '8px 0' }} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: '8px', fontWeight: 800, textTransform: 'uppercase', color: '#f3e8ff' }}>PRODUKSI TOTAL ({realCurrentYear})</div>
              <div style={{ fontSize: '14px', fontWeight: 900, color: '#ffffff', marginTop: '1px' }}>
                {kwtTahunKg >= 1000 ? `${(kwtTahunKg / 1000).toFixed(2)} Ton` : `${(kwtTahunKg || 0).toLocaleString('id-ID')} Kg`}
              </div>
            </div>
            <div style={{ borderLeft: '1px solid rgba(255, 255, 255, 0.25)', paddingLeft: '6px' }}>
              <div style={{ fontSize: '8px', fontWeight: 800, textTransform: 'uppercase', color: '#f3e8ff' }}>OMSET TOTAL ({realCurrentYear})</div>
              <div style={{ fontSize: '14px', fontWeight: 900, color: '#fef08a', marginTop: '1px' }}>
                Rp {(kwtTahunOmset || 0).toLocaleString('id-ID')}
              </div>
            </div>
          </div>
        </div>

        {/* 3 Metric Pills Strip (SOLID WHITE) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
          <div style={{ background: '#ffffff', padding: '8px 6px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', color: '#581c87' }}>JUMLAH KWT</div>
            <div style={{ fontSize: '13px', fontWeight: 900, color: '#1e1b4b', marginTop: '2px' }}>{totalKWTCount || 2} Kel</div>
          </div>
          <div style={{ background: '#ffffff', padding: '8px 6px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', color: '#581c87' }}>ANGGOTA</div>
            <div style={{ fontSize: '13px', fontWeight: 900, color: '#1e1b4b', marginTop: '2px' }}>{totalKWTMembers || 46} Org</div>
          </div>
          <div style={{ background: '#ffffff', padding: '8px 6px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', color: '#581c87' }}>LUAS LAHAN</div>
            <div style={{ fontSize: '13px', fontWeight: 900, color: '#1e1b4b', marginTop: '2px' }}>{(kwtLuasHa > 0 ? kwtLuasHa.toFixed(2) : '0.02')} Ha</div>
          </div>
        </div>

        {/* Control Bar */}
        <div className="kwt-dash-ctrl" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => setKwtBulanIdx(v => Math.min(11, v + 1))}
              style={{ background: 'rgba(255, 255, 255, 0.25)', border: '1px solid rgba(255, 255, 255, 0.4)', borderRadius: '8px', color: '#fff', fontSize: '10px', fontWeight: 800, padding: '4px 10px', cursor: 'pointer' }}
            >
              ◀ Prev
            </button>
            <button
              onClick={() => setKwtBulanIdx(v => Math.max(0, v - 1))}
              style={{ background: 'rgba(255, 255, 255, 0.25)', border: '1px solid rgba(255, 255, 255, 0.4)', borderRadius: '8px', color: '#fff', fontSize: '10px', fontWeight: 800, padding: '4px 10px', cursor: 'pointer' }}
            >
              Next ▶
            </button>
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button
              onClick={(e) => { e.stopPropagation(); exportKWTData(poktanList); }}
              style={{ background: '#ffffff', border: '1.5px solid #86efac', borderRadius: '8px', padding: '4px 10px', fontSize: '10px', fontWeight: 900, color: '#15803d', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}
              title="Unduh Data KWT Format Excel (.xlsx)"
            >
              📊 XLSX
            </button>
            <button type="button" onClick={(e) => { e.stopPropagation(); onOpenPanel('poktan_kwt'); }} style={{ background: 'linear-gradient(135deg, #facc15 0%, #eab308 100%)', color: '#000000', border: 'none', borderRadius: '8px', padding: '5px 14px', fontSize: '10.5px', fontWeight: 900, cursor: 'pointer', boxShadow: '0 3px 10px rgba(234, 179, 8, 0.4)' }}>Lihat Detail ➔</button>
          </div>
        </div>
      </div>

      {/* ── CARD 2: PERTANIAN - EMERALD GREEN GRADIENT (CAPTURE 3 MOCKUP) ── */}
      <div 
        style={{
          background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
          color: '#ffffff',
          borderRadius: '20px',
          padding: '16px',
          boxShadow: '0 10px 28px rgba(5, 150, 105, 0.3)',
          border: '1.5px solid rgba(255, 255, 255, 0.2)',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden'
        }}
        onClick={() => onOpenPanel('status_sawah')}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.4px', lineHeight: 1.2, color: '#ffffff' }}>
              PERTANIAN
            </div>
            <div style={{ fontSize: '10.5px', color: '#d1fae5', marginTop: '2px', fontWeight: 600 }}>
              Data Padi Sawah & Komoditas Cilegon
            </div>
          </div>
          <div style={{ background: '#ffffff', color: '#047857', borderRadius: '12px', padding: '4px 10px', fontSize: '10px', fontWeight: 900, boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}>
            📅 Agustus 2026
          </div>
        </div>

        {/* 2 Top Cards (SOLID WHITE) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '8px' }}>
          <div style={{ background: '#ffffff', borderRadius: '12px', padding: '10px 12px', textAlign: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', color: '#065f46' }}>PRODUKSI GKG</div>
            <div style={{ fontSize: '17px', fontWeight: 900, lineHeight: 1.2, marginTop: '2px', color: '#047857' }}>
              {gkgStr}
            </div>
          </div>
          <div style={{ background: '#ffffff', borderRadius: '12px', padding: '10px 12px', textAlign: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', color: '#065f46' }}>LUAS TANAM</div>
            <div style={{ fontSize: '17px', fontWeight: 900, lineHeight: 1.2, marginTop: '2px', color: '#047857' }}>
              {luasTanamHa} Ha
            </div>
          </div>
        </div>

        {/* 2 Middle Cards (SOLID WHITE) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '8px' }}>
          <div style={{ background: '#ffffff', borderRadius: '12px', padding: '10px 12px', textAlign: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', color: '#065f46' }}>TOTAL SAWAH</div>
            <div style={{ fontSize: '16px', fontWeight: 900, lineHeight: 1.2, marginTop: '2px', color: '#047857' }}>
              {totalSawahHa} Ha
            </div>
          </div>
          <div style={{ background: '#ffffff', borderRadius: '12px', padding: '10px 12px', textAlign: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', color: '#065f46' }}>SIAP PANEN</div>
            <div style={{ fontSize: '16px', fontWeight: 900, lineHeight: 1.2, marginTop: '2px', color: '#d97706' }}>
              {siapPanenHa} Ha
            </div>
          </div>
        </div>

        {/* 3 Bottom Metric Pills Strip (SOLID WHITE) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
          <div style={{ background: '#ffffff', padding: '8px 6px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', color: '#065f46' }}>LUAS SAWAH</div>
            <div style={{ fontSize: '12px', fontWeight: 900, color: '#047857', marginTop: '2px' }}>{totalSawahHa} Ha</div>
          </div>
          <div style={{ background: '#ffffff', padding: '8px 6px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', color: '#065f46' }}>POLIGON</div>
            <div style={{ fontSize: '12px', fontWeight: 900, color: '#047857', marginTop: '2px' }}>{filteredSawah.length || 407} Petak</div>
          </div>
          <div style={{ background: '#ffffff', padding: '8px 6px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', color: '#065f46' }}>SIAP PANEN</div>
            <div style={{ fontSize: '12px', fontWeight: 900, color: '#047857', marginTop: '2px' }}>{siapPanenHa} Ha</div>
          </div>
        </div>

        {/* Control Bar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={(e) => { e.stopPropagation(); exportPertanianData(filteredSawah, sawahStatus); }}
            style={{ background: '#ffffff', border: '1.5px solid #86efac', borderRadius: '8px', padding: '5px 12px', fontSize: '10px', fontWeight: 900, color: '#047857', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}
            title="Unduh Data Pertanian Format Excel (.xlsx)"
          >
            📊 XLSX
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); onOpenPanel('status_sawah'); }} style={{ background: 'rgba(255, 255, 255, 0.25)', border: '1.5px solid #86efac', borderRadius: '8px', padding: '5px 14px', fontSize: '10.5px', fontWeight: 900, color: '#ffffff', cursor: 'pointer' }}>Lihat Detail ➔</button>
        </div>
      </div>

      {/* ── CARD 3: PERIKANAN BUDIDAYA - OCEAN BLUE GRADIENT (CAPTURE 4 MOCKUP) ── */}
      <div 
        style={{
          background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 50%, #0369a1 100%)',
          color: '#ffffff',
          borderRadius: '20px',
          padding: '16px',
          boxShadow: '0 10px 28px rgba(2, 132, 199, 0.3)',
          border: '1.5px solid rgba(255, 255, 255, 0.2)',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden'
        }}
        onClick={(e) => {
          if (e.target.closest('.budi-dash-ctrl')) return;
          onOpenPanel('perikanan_budidaya');
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.4px', lineHeight: 1.2, color: '#ffffff' }}>
              PERIKANAN BUDIDAYA
            </div>
            <div style={{ fontSize: '10.5px', color: '#e0f2fe', marginTop: '2px', fontWeight: 600 }}>
              KOTA CILEGON
            </div>
          </div>
          <div style={{ background: '#ffffff', color: '#0369a1', borderRadius: '12px', padding: '4px 10px', fontSize: '10px', fontWeight: 900, boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}>
            📅 {curB.label}
          </div>
        </div>

        {/* 3 Top Cards (SOLID WHITE) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
          <div style={{ background: '#ffffff', padding: '10px 6px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', color: '#0c4a6e' }}>JUMLAH UNIT</div>
            <div style={{ fontSize: '15px', fontWeight: 900, color: '#0284c7', marginTop: '2px' }}>{jumlahKolam} Unit</div>
            <div style={{ fontSize: '7.5px', color: '#64748b', marginTop: '1px', fontWeight: 700 }}>{luasKolamTotal} m² • {aktifKolam} aktif</div>
          </div>
          <div style={{ background: '#ffffff', padding: '10px 6px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', color: '#0c4a6e' }}>PRODUKSI IKAN</div>
            <div style={{ fontSize: '15px', fontWeight: 900, color: '#0284c7', marginTop: '2px' }}>
              {curB.totalKg >= 1000 ? `${(curB.totalKg/1000).toFixed(1)} Ton` : `${curB.totalKg || 55} Ton`}
            </div>
            <div style={{ fontSize: '7.5px', color: '#64748b', marginTop: '1px', fontWeight: 700 }}>
              Total: {totTahunB_Kg >= 1000 ? `${(totTahunB_Kg/1000).toFixed(1)} Ton` : `${(totTahunB_Kg || 0).toFixed(1)} Ton`} ({realCurrentYear})
            </div>
          </div>
          <div style={{ background: '#ffffff', padding: '10px 6px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', color: '#0c4a6e' }}>NILAI PRODUKSI</div>
            <div style={{ fontSize: '15px', fontWeight: 900, color: '#16a34a', marginTop: '2px' }}>
              Rp {(curB.totalOmset || 200000).toLocaleString('id-ID')}
            </div>
            <div style={{ fontSize: '7.5px', color: '#64748b', marginTop: '1px', fontWeight: 700 }}>
              Total: Rp {(totTahunB_Omset || 0).toLocaleString('id-ID')} ({realCurrentYear})
            </div>
          </div>
        </div>

        {/* Control Bar */}
        <div className="budi-dash-ctrl" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => setBudiBulanIdx(v => Math.min(11, v + 1))}
              style={{ background: 'rgba(255, 255, 255, 0.25)', border: '1px solid rgba(255, 255, 255, 0.4)', borderRadius: '8px', color: '#fff', fontSize: '10px', fontWeight: 800, padding: '4px 10px', cursor: 'pointer' }}
            >
              ◀ Prev
            </button>
            <button
              onClick={() => setBudiBulanIdx(v => Math.max(0, v - 1))}
              style={{ background: 'rgba(255, 255, 255, 0.25)', border: '1px solid rgba(255, 255, 255, 0.4)', borderRadius: '8px', color: '#fff', fontSize: '10px', fontWeight: 800, padding: '4px 10px', cursor: 'pointer' }}
            >
              Next ▶
            </button>
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button
              onClick={(e) => { e.stopPropagation(); exportBudidayaData(budidayaList); }}
              style={{ background: '#ffffff', border: '1.5px solid #7dd3fc', borderRadius: '8px', padding: '4px 10px', fontSize: '10px', fontWeight: 900, color: '#0284c7', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}
              title="Unduh Data Budidaya Format Excel (.xlsx)"
            >
              📊 XLSX
            </button>
            <button type="button" onClick={(e) => { e.stopPropagation(); onOpenPanel('perikanan_budidaya'); }} style={{ background: '#0284c7', border: '1.5px solid #7dd3fc', color: '#ffffff', borderRadius: '8px', padding: '5px 14px', fontSize: '10.5px', fontWeight: 900, cursor: 'pointer' }}>Lihat Detail ➔</button>
          </div>
        </div>
      </div>

      {/* ── CARD 4: PERIKANAN TANGKAP - DEEP TEAL GRADIENT (CAPTURE 4 MOCKUP) ── */}
      <div 
        style={{
          background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 50%, #0f766e 100%)',
          color: '#ffffff',
          borderRadius: '20px',
          padding: '16px',
          boxShadow: '0 10px 28px rgba(13, 148, 136, 0.3)',
          border: '1.5px solid rgba(255, 255, 255, 0.2)',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden'
        }}
        onClick={() => onOpenPanel('perikanan_tangkap')}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.4px', lineHeight: 1.2, color: '#ffffff' }}>
              PERIKANAN TANGKAP
            </div>
            <div style={{ fontSize: '10.5px', color: '#ccfbf1', marginTop: '2px', fontWeight: 600 }}>
              Pesisir & TPI Kota Cilegon
            </div>
          </div>
          <div style={{ background: '#ffffff', color: '#0f766e', borderRadius: '12px', padding: '4px 10px', fontSize: '10px', fontWeight: 900, boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}>
            📅 Agustus 2026
          </div>
        </div>

        {/* Hero Middle Summary Box (SOLID WHITE) */}
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', marginBottom: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '8px' }}>
            <div style={{ background: '#f0fdf4', borderRadius: '10px', padding: '8px 10px', textAlign: 'center' }}>
              <div style={{ fontSize: '8.5px', fontWeight: 900, textTransform: 'uppercase', color: '#134e4a' }}>PRODUKSI TANGKAP</div>
              <div style={{ fontSize: '17px', fontWeight: 900, lineHeight: 1.2, marginTop: '2px', color: '#0f766e' }}>
                {curT ? (curT.total >= 1000 ? (curT.total/1000).toFixed(1) + ' Ton' : curT.total + ' Kg') : '50 Kg'}
              </div>
            </div>
            <div style={{ background: '#f0fdf4', borderRadius: '10px', padding: '8px 10px', textAlign: 'center' }}>
              <div style={{ fontSize: '8.5px', fontWeight: 900, textTransform: 'uppercase', color: '#134e4a' }}>ESTIMASI OMSET</div>
              <div style={{ fontSize: '16px', fontWeight: 900, lineHeight: 1.2, marginTop: '2px', color: '#16a34a' }}>
                Rp {(totTahunT > 0 ? totTahunT * 35000 : 1750000).toLocaleString('id-ID')}
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px dashed #cbd5e1', margin: '8px 0' }} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: '8px', fontWeight: 800, textTransform: 'uppercase', color: '#64748b' }}>TOTAL NELAYAN</div>
              <div style={{ fontSize: '14px', fontWeight: 900, color: '#0f766e', marginTop: '1px' }}>{jumlahNelayan || 715} Orang</div>
            </div>
            <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '6px' }}>
              <div style={{ fontSize: '8px', fontWeight: 800, textTransform: 'uppercase', color: '#64748b' }}>PANGKALAN / TPI</div>
              <div style={{ fontSize: '14px', fontWeight: 900, color: '#0f766e', marginTop: '1px' }}>{jumlahPangkalan || 9} Pangkalan</div>
            </div>
          </div>
        </div>

        {/* 3 Bottom Metric Pills (SOLID WHITE) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
          <div style={{ background: '#ffffff', padding: '8px 6px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', color: '#134e4a' }}>NELAYAN</div>
            <div style={{ fontSize: '12px', fontWeight: 900, color: '#0f766e', marginTop: '2px' }}>{jumlahNelayan || 715} Org</div>
          </div>
          <div style={{ background: '#ffffff', padding: '8px 6px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', color: '#134e4a' }}>PERAHU MOTOR</div>
            <div style={{ fontSize: '12px', fontWeight: 900, color: '#0f766e', marginTop: '2px' }}>{totalPerahuMotor || 410} Unit</div>
          </div>
          <div style={{ background: '#ffffff', padding: '8px 6px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', color: '#134e4a' }}>TANPA MOTOR</div>
            <div style={{ fontSize: '12px', fontWeight: 900, color: '#0f766e', marginTop: '2px' }}>{totalTanpaMotor || 0} Unit</div>
          </div>
        </div>

        {/* Control Bar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={(e) => { e.stopPropagation(); exportTangkapData(tangkapList); }}
            style={{ background: '#ffffff', border: '1.5px solid #99f6e4', borderRadius: '8px', padding: '5px 12px', fontSize: '10px', fontWeight: 900, color: '#0f766e', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}
            title="Unduh Data Tangkap Format Excel (.xlsx)"
          >
            📊 XLSX
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); onOpenPanel('perikanan_tangkap'); }} style={{ background: '#0f766e', border: '1.5px solid #99f6e4', color: '#ffffff', borderRadius: '8px', padding: '5px 14px', fontSize: '10.5px', fontWeight: 900, cursor: 'pointer' }}>Lihat Detail ➔</button>
        </div>
      </div>

      {/* ── CARD 5: PETERNAKAN - SUNSET ORANGE GRADIENT (CAPTURE 4 MOCKUP) ── */}
      <div 
        style={{
          background: 'linear-gradient(135deg, #f97316 0%, #ea580c 50%, #c2410c 100%)',
          color: '#ffffff',
          borderRadius: '20px',
          padding: '16px',
          boxShadow: '0 10px 28px rgba(234, 88, 12, 0.3)',
          border: '1.5px solid rgba(255, 255, 255, 0.2)',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden'
        }}
        onClick={() => onOpenPanel('peternakan')}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.4px', lineHeight: 1.2, color: '#ffffff' }}>
              PETERNAKAN
            </div>
            <div style={{ fontSize: '10.5px', color: '#ffedd5', marginTop: '2px', fontWeight: 600 }}>
              Populasi & Produksi Ternak Cilegon
            </div>
          </div>
          <div style={{ background: '#ffffff', color: '#ea580c', borderRadius: '12px', padding: '4px 10px', fontSize: '10px', fontWeight: 900, boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}>
            📅 Agustus 2026
          </div>
        </div>

        {/* Hero Middle Summary Box (SOLID WHITE) */}
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', marginBottom: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '8px' }}>
            <div style={{ background: '#fff7ed', borderRadius: '10px', padding: '8px 10px', textAlign: 'center' }}>
              <div style={{ fontSize: '8.5px', fontWeight: 900, textTransform: 'uppercase', color: '#7c2d12' }}>POPULASI TERNAK</div>
              <div style={{ fontSize: '17px', fontWeight: 900, lineHeight: 1.2, marginTop: '2px', color: '#c2410c' }}>
                8.450 Ekor
              </div>
            </div>
            <div style={{ background: '#fff7ed', borderRadius: '10px', padding: '8px 10px', textAlign: 'center' }}>
              <div style={{ fontSize: '8.5px', fontWeight: 900, textTransform: 'uppercase', color: '#7c2d12' }}>PRODUKSI DAGING</div>
              <div style={{ fontSize: '17px', fontWeight: 900, lineHeight: 1.2, marginTop: '2px', color: '#c2410c' }}>
                45,2 Ton
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px dashed #fed7aa', margin: '8px 0' }} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: '8px', fontWeight: 800, textTransform: 'uppercase', color: '#9a3412' }}>TOTAL POPULASI</div>
              <div style={{ fontSize: '14px', fontWeight: 900, color: '#c2410c', marginTop: '1px' }}>8.450 Ekor</div>
            </div>
            <div style={{ borderLeft: '1px solid #fed7aa', paddingLeft: '6px' }}>
              <div style={{ fontSize: '8px', fontWeight: 800, textTransform: 'uppercase', color: '#9a3412' }}>ESTIMASI NILAI</div>
              <div style={{ fontSize: '14px', fontWeight: 900, color: '#16a34a', marginTop: '1px' }}>Rp 1,2 Miliar</div>
            </div>
          </div>
        </div>

        {/* 3 Bottom Metric Pills (SOLID WHITE) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
          <div style={{ background: '#ffffff', padding: '8px 6px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', color: '#7c2d12' }}>SAPI / KERBAU</div>
            <div style={{ fontSize: '12px', fontWeight: 900, color: '#c2410c', marginTop: '2px' }}>1.250 Ekor</div>
          </div>
          <div style={{ background: '#ffffff', padding: '8px 6px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', color: '#7c2d12' }}>KAMBING / DOMBA</div>
            <div style={{ fontSize: '12px', fontWeight: 900, color: '#c2410c', marginTop: '2px' }}>4.800 Ekor</div>
          </div>
          <div style={{ background: '#ffffff', padding: '8px 6px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', color: '#7c2d12' }}>UNGGAS</div>
            <div style={{ fontSize: '12px', fontWeight: 900, color: '#c2410c', marginTop: '2px' }}>2.400 Ekor</div>
          </div>
        </div>

        {/* Control Bar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={(e) => { e.stopPropagation(); exportPeternakanData(); }}
            style={{ background: '#ffffff', border: '1.5px solid #fed7aa', borderRadius: '8px', padding: '5px 12px', fontSize: '10px', fontWeight: 900, color: '#ea580c', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}
            title="Unduh Data Peternakan Format Excel (.xlsx)"
          >
            📊 XLSX
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); onOpenPanel('peternakan'); }} style={{ background: '#ea580c', border: '1.5px solid #fed7aa', color: '#ffffff', borderRadius: '8px', padding: '5px 14px', fontSize: '10.5px', fontWeight: 900, cursor: 'pointer', boxShadow: '0 3px 10px rgba(234, 88, 12, 0.4)' }}>Lihat Detail ➔</button>
        </div>
      </div>

      {/* ── CARD 6: KETAHANAN PANGAN - LAPISAN KEENAM ── */}
      <div 
        className="sp-dash-card sp-dash-card--pangan"
        style={{ borderRadius: '20px', padding: '16px' }}
        onClick={() => onOpenPanel('ikpg_admin')}
      >
        <div className="sp-dash-card__body">
          <div className="sp-dash-card__left">
            <div className="sp-dash-card__header-label">
              KETAHANAN PANGAN (FSVA / SKPG)
            </div>
            <div className="sp-dash-card__hero-value">
              87.4 (Tahan)
            </div>
            <div className="sp-dash-card__bullets">
              <div>• Indeks Ketahanan Pangan (IKP)</div>
              <div>• 43 Kelurahan Terpetakan</div>
            </div>
          </div>
          <div className="sp-dash-card__right">
            <div className="sp-dash-card__badge-pill">
              Peta Kerawanan
            </div>
            <div className="sp-dash-card__badge-pill">
              Data SKPG 2026
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

export default Dashboard;

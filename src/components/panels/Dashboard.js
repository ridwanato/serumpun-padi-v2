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
  peternakanList,
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
  const [tangkapBulanIdx, setTangkapBulanIdx] = useState(defaultMonthIdx);

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
  const curT = prodT[tangkapBulanIdx] || prodT[0] || null;
  const totTahunT = prodT.reduce((s, b) => s + b.total, 0);

  // ── Peternakan (Computed from peternakanList) ──
  const pList = peternakanList || [];
  const totalSapiAll = pList.reduce((s, d) => s + (parseInt(d.sapi) || 0), 0);
  const totalKambingAll = pList.reduce((s, d) => s + (parseInt(d.kambing) || 0), 0);
  const totalAyamAll = pList.reduce((s, d) => s + (parseInt(d.ayam) || 0), 0);
  const totalItikAll = pList.reduce((s, d) => s + (parseInt(d.itik) || 0), 0);
  const totalTernakAll = totalSapiAll + totalKambingAll + totalAyamAll + totalItikAll;

  const totalNilaiTernakAll = pList.reduce((s, d) => {
    let detail = {};
    try { if (typeof d.catatan === 'string' && d.catatan.startsWith('{')) detail = JSON.parse(d.catatan); } catch (e) {}
    const hSapi = parseFloat(detail.harga_sapi || d.harga_sapi || 20000000);
    const hKambing = parseFloat(detail.harga_kambing || d.harga_kambing || 2500000);
    const hAyam = parseFloat(detail.harga_ayam || d.harga_ayam || 40000);
    const hItik = parseFloat(detail.harga_itik || d.harga_itik || 50000);
    return s + (parseInt(d.sapi||0)*hSapi) + (parseInt(d.kambing||0)*hKambing) + (parseInt(d.ayam||0)*hAyam) + (parseInt(d.itik||0)*hItik);
  }, 0);
  const jumlahPeternak = pList.length;

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
            <div style={{ lineHeight: 1.2, color: '#ffffff' }}>
              <div style={{ fontSize: '16px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.4px' }}>KWT</div>
              <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'none', letterSpacing: '0', opacity: 0.9 }}>(Kelompok Wanita Tani)</div>
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
              <div style={{ fontSize: '8.5px', fontWeight: 900, textTransform: 'uppercase', color: '#581c87' }}>PRODUKSI BULANAN</div>
              <div style={{ fontSize: '14px', fontWeight: 800, lineHeight: 1.2, marginTop: '2px', color: '#6b21a8' }}>
                {curKWT.totalKg >= 1000 ? `${(curKWT.totalKg / 1000).toFixed(2)} Ton` : `${(curKWT.totalKg || 0).toLocaleString('id-ID')} Kg`}
              </div>
            </div>
            <div style={{ background: '#ffffff', borderRadius: '12px', padding: '10px 12px', textAlign: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.08)' }}>
              <div style={{ fontSize: '8.5px', fontWeight: 900, textTransform: 'uppercase', color: '#581c87' }}>OMSET BULANAN</div>
              <div style={{ fontSize: '14px', fontWeight: 800, lineHeight: 1.2, marginTop: '2px', color: '#16a34a' }}>
                Rp {(curKWT.totalOmset || 0).toLocaleString('id-ID')}
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px dashed rgba(255, 255, 255, 0.3)', margin: '8px 0' }} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: '8px', fontWeight: 800, textTransform: 'uppercase', color: '#f3e8ff' }}>PRODUKSI TOTAL ({realCurrentYear})</div>
              <div style={{ fontSize: '19px', fontWeight: 900, color: '#ffffff', marginTop: '2px', lineHeight: 1.1 }}>
                {kwtTahunKg >= 1000 ? `${(kwtTahunKg / 1000).toFixed(2)} Ton` : `${(kwtTahunKg || 0).toLocaleString('id-ID')} Kg`}
              </div>
            </div>
            <div style={{ borderLeft: '1px solid rgba(255, 255, 255, 0.25)', paddingLeft: '6px' }}>
              <div style={{ fontSize: '8px', fontWeight: 800, textTransform: 'uppercase', color: '#f3e8ff' }}>OMSET TOTAL ({realCurrentYear})</div>
              <div style={{ fontSize: '19px', fontWeight: 900, color: '#fef08a', marginTop: '2px', lineHeight: 1.1 }}>
                Rp {(kwtTahunOmset || 0).toLocaleString('id-ID')}
              </div>
            </div>
          </div>
        </div>

        {/* 3 Metric Pills Strip (SOLID WHITE) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
          <div style={{ background: '#ffffff', padding: '8px 6px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', color: '#581c87' }}>JUMLAH KWT</div>
            <div style={{ fontSize: '13px', fontWeight: 900, color: '#1e1b4b', marginTop: '2px' }}>{totalKWTCount > 0 ? totalKWTCount + ' Kel' : '-'}</div>
          </div>
          <div style={{ background: '#ffffff', padding: '8px 6px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', color: '#581c87' }}>ANGGOTA</div>
            <div style={{ fontSize: '13px', fontWeight: 900, color: '#1e1b4b', marginTop: '2px' }}>{totalKWTMembers > 0 ? totalKWTMembers + ' Org' : '-'}</div>
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
            📅 {new Date().toLocaleDateString('id-ID', {month:'long', year:'numeric'})}
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
            <div style={{ fontSize: '12px', fontWeight: 900, color: '#047857', marginTop: '2px' }}>{filteredSawah.length > 0 ? filteredSawah.length + ' Petak' : '-'}</div>
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

      {/* ── CARD 3: PERIKANAN BUDIDAYA - OCEAN BLUE GRADIENT (KWT UI/UX MIRROR) ── */}
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

        {/* Highlight Container (KWT Mirror Style) */}
        <div style={{ background: 'rgba(255, 255, 255, 0.15)', borderRadius: '16px', padding: '12px', border: '1px solid rgba(255, 255, 255, 0.25)', marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
            <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', color: '#ffffff', letterSpacing: '0.5px' }}>📈 PRODUKSI & OMSET BULANAN</span>
            <span style={{ background: 'rgba(255, 255, 255, 0.25)', padding: '2px 8px', borderRadius: '10px', fontSize: '9.5px', fontWeight: 800, color: '#ffffff' }}>📅 {curB.label}</span>
          </div>

          {/* 2 Monthly Highlight Cards (SOLID WHITE) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div style={{ background: '#ffffff', borderRadius: '12px', padding: '8px 10px', textAlign: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.08)' }}>
              <div style={{ fontSize: '8.5px', fontWeight: 900, textTransform: 'uppercase', color: '#0c4a6e' }}>PRODUKSI BULANAN</div>
              <div style={{ fontSize: '14px', fontWeight: 800, lineHeight: 1.2, marginTop: '2px', color: '#0284c7' }}>
                {curB.totalKg > 0 ? (curB.totalKg >= 1000 ? `${(curB.totalKg/1000).toFixed(1)} Ton` : `${curB.totalKg} kg`) : '-'}
              </div>
            </div>
            <div style={{ background: '#ffffff', borderRadius: '12px', padding: '8px 10px', textAlign: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.08)' }}>
              <div style={{ fontSize: '8.5px', fontWeight: 900, textTransform: 'uppercase', color: '#0c4a6e' }}>OMSET BULANAN</div>
              <div style={{ fontSize: '14px', fontWeight: 800, lineHeight: 1.2, marginTop: '2px', color: '#16a34a' }}>
                {curB.totalOmset > 0 ? `Rp ${curB.totalOmset.toLocaleString('id-ID')}` : '-'}
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px dashed rgba(255, 255, 255, 0.3)', margin: '8px 0' }} />

          {/* Total Year Row (Bigger Font than Monthly) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: '8px', fontWeight: 800, textTransform: 'uppercase', color: '#e0f2fe' }}>PRODUKSI TOTAL ({realCurrentYear})</div>
              <div style={{ fontSize: '19px', fontWeight: 900, color: '#ffffff', marginTop: '2px', lineHeight: 1.1 }}>
                {totTahunB_Kg >= 1000 ? `${(totTahunB_Kg/1000).toFixed(1)} Ton` : `${(totTahunB_Kg || 0).toLocaleString('id-ID')} Kg`}
              </div>
            </div>
            <div style={{ borderLeft: '1px solid rgba(255, 255, 255, 0.25)', paddingLeft: '6px' }}>
              <div style={{ fontSize: '8px', fontWeight: 800, textTransform: 'uppercase', color: '#e0f2fe' }}>OMSET TOTAL ({realCurrentYear})</div>
              <div style={{ fontSize: '19px', fontWeight: 900, color: '#fef08a', marginTop: '2px', lineHeight: 1.1 }}>
                {totTahunB_Omset > 0 ? `Rp ${totTahunB_Omset.toLocaleString('id-ID')}` : '-'}
              </div>
            </div>
          </div>
        </div>

        {/* 3 Metric Pills Strip (SOLID WHITE) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
          <div style={{ background: '#ffffff', padding: '8px 6px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', color: '#0c4a6e' }}>JUMLAH PEMBUDIDAYA</div>
            <div style={{ fontSize: '12px', fontWeight: 900, color: '#0284c7', marginTop: '2px' }}>{jumlahKolam > 0 ? jumlahKolam + ' Unit' : '-'}</div>
          </div>
          <div style={{ background: '#ffffff', padding: '8px 6px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', color: '#0c4a6e' }}>LUAS TOTAL KOLAM</div>
            <div style={{ fontSize: '12px', fontWeight: 900, color: '#0284c7', marginTop: '2px' }}>{luasKolamTotal ? luasKolamTotal + ' m²' : '-'}</div>
          </div>
          <div style={{ background: '#ffffff', padding: '8px 6px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', color: '#0c4a6e' }}>PEMBUDIDAYA AKTIF</div>
            <div style={{ fontSize: '12px', fontWeight: 900, color: '#0284c7', marginTop: '2px' }}>{aktifKolam > 0 ? aktifKolam + ' Unit' : '-'}</div>
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

      {/* ── CARD 4: PERIKANAN TANGKAP - DEEP TEAL GRADIENT (KWT UI/UX MIRROR) ── */}
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
        onClick={(e) => {
          if (e.target.closest('.tangkap-dash-ctrl')) return;
          onOpenPanel('perikanan_tangkap');
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.4px', lineHeight: 1.2, color: '#ffffff' }}>
              PERIKANAN TANGKAP
            </div>
            <div style={{ fontSize: '10.5px', color: '#ccfbf1', marginTop: '2px', fontWeight: 600 }}>
              Kota Cilegon
            </div>
          </div>
          <div style={{ background: '#ffffff', color: '#0f766e', borderRadius: '12px', padding: '4px 10px', fontSize: '10px', fontWeight: 900, boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}>
            📅 {curT?.label || 'Agustus 2026'}
          </div>
        </div>

        {/* Highlight Container (KWT Mirror Style) */}
        <div style={{ background: 'rgba(255, 255, 255, 0.15)', borderRadius: '16px', padding: '12px', border: '1px solid rgba(255, 255, 255, 0.25)', marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
            <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', color: '#ffffff', letterSpacing: '0.5px' }}>📈 PRODUKSI & OMSET BULANAN</span>
            <span style={{ background: 'rgba(255, 255, 255, 0.25)', padding: '2px 8px', borderRadius: '10px', fontSize: '9.5px', fontWeight: 800, color: '#ffffff' }}>📅 {curT?.label || 'Agustus 2026'}</span>
          </div>

          {/* 2 Monthly Highlight Cards (SOLID WHITE) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div style={{ background: '#ffffff', borderRadius: '12px', padding: '8px 10px', textAlign: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.08)' }}>
              <div style={{ fontSize: '8.5px', fontWeight: 900, textTransform: 'uppercase', color: '#134e4a' }}>PRODUKSI BULANAN</div>
              <div style={{ fontSize: '14px', fontWeight: 800, lineHeight: 1.2, marginTop: '2px', color: '#0f766e' }}>
                {curT && curT.total > 0 ? (curT.total >= 1000 ? (curT.total/1000).toFixed(1) + ' Ton' : curT.total + ' Kg') : '-'}
              </div>
            </div>
            <div style={{ background: '#ffffff', borderRadius: '12px', padding: '8px 10px', textAlign: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.08)' }}>
              <div style={{ fontSize: '8.5px', fontWeight: 900, textTransform: 'uppercase', color: '#134e4a' }}>OMSET BULANAN</div>
              <div style={{ fontSize: '14px', fontWeight: 800, lineHeight: 1.2, marginTop: '2px', color: '#16a34a' }}>
                {curT && curT.total > 0 ? `Rp ${(curT.total * 35000).toLocaleString('id-ID')}` : '-'}
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px dashed rgba(255, 255, 255, 0.3)', margin: '8px 0' }} />

          {/* Total Year Row (Replacing Capture 3 - Bigger Font than Monthly) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: '8px', fontWeight: 800, textTransform: 'uppercase', color: '#ccfbf1' }}>PRODUKSI TOTAL ({realCurrentYear})</div>
              <div style={{ fontSize: '19px', fontWeight: 900, color: '#ffffff', marginTop: '2px', lineHeight: 1.1 }}>
                {totTahunT > 0 ? (totTahunT >= 1000 ? (totTahunT/1000).toFixed(1) + ' Ton' : totTahunT + ' Kg') : '-'}
              </div>
            </div>
            <div style={{ borderLeft: '1px solid rgba(255, 255, 255, 0.25)', paddingLeft: '6px' }}>
              <div style={{ fontSize: '8px', fontWeight: 800, textTransform: 'uppercase', color: '#ccfbf1' }}>OMSET TOTAL ({realCurrentYear})</div>
              <div style={{ fontSize: '19px', fontWeight: 900, color: '#fef08a', marginTop: '2px', lineHeight: 1.1 }}>
                {totTahunT > 0 ? `Rp ${(totTahunT * 35000).toLocaleString('id-ID')}` : '-'}
              </div>
            </div>
          </div>
        </div>

        {/* 3 Metric Pills Strip (SOLID WHITE) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
          <div style={{ background: '#ffffff', padding: '8px 6px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', color: '#134e4a' }}>JUMLAH NELAYAN</div>
            <div style={{ fontSize: '12px', fontWeight: 900, color: '#0f766e', marginTop: '2px' }}>{jumlahNelayan > 0 ? jumlahNelayan + ' Org' : '-'}</div>
          </div>
          <div style={{ background: '#ffffff', padding: '8px 6px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', color: '#134e4a' }}>PANGKALAN / TPI</div>
            <div style={{ fontSize: '12px', fontWeight: 900, color: '#0f766e', marginTop: '2px' }}>{jumlahPangkalan > 0 ? jumlahPangkalan + ' Pangkalan' : '-'}</div>
          </div>
          <div style={{ background: '#ffffff', padding: '8px 6px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', color: '#134e4a' }}>KAPAL MOTOR</div>
            <div style={{ fontSize: '12px', fontWeight: 900, color: '#0f766e', marginTop: '2px' }}>{totalPerahuMotor > 0 ? totalPerahuMotor + ' Unit' : '-'}</div>
          </div>
        </div>

        {/* Control Bar (With Prev / Next Period Buttons) */}
        <div className="tangkap-dash-ctrl" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => setTangkapBulanIdx(v => Math.min(11, v + 1))}
              style={{ background: 'rgba(255, 255, 255, 0.25)', border: '1px solid rgba(255, 255, 255, 0.4)', borderRadius: '8px', color: '#fff', fontSize: '10px', fontWeight: 800, padding: '4px 10px', cursor: 'pointer' }}
            >
              ◀ Prev
            </button>
            <button
              onClick={() => setTangkapBulanIdx(v => Math.max(0, v - 1))}
              style={{ background: 'rgba(255, 255, 255, 0.25)', border: '1px solid rgba(255, 255, 255, 0.4)', borderRadius: '8px', color: '#fff', fontSize: '10px', fontWeight: 800, padding: '4px 10px', cursor: 'pointer' }}
            >
              Next ▶
            </button>
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button
              onClick={(e) => { e.stopPropagation(); exportTangkapData(tangkapList); }}
              style={{ background: '#ffffff', border: '1.5px solid #99f6e4', borderRadius: '8px', padding: '4px 10px', fontSize: '10px', fontWeight: 900, color: '#0f766e', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}
              title="Unduh Data Tangkap Format Excel (.xlsx)"
            >
              📊 XLSX
            </button>
            <button type="button" onClick={(e) => { e.stopPropagation(); onOpenPanel('perikanan_tangkap'); }} style={{ background: '#0f766e', border: '1.5px solid #99f6e4', color: '#ffffff', borderRadius: '8px', padding: '5px 14px', fontSize: '10.5px', fontWeight: 900, cursor: 'pointer' }}>Lihat Detail ➔</button>
          </div>
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
            📅 {new Date().toLocaleDateString('id-ID', {month:'long', year:'numeric'})}
          </div>
        </div>

        {/* Hero Middle Summary Box (SOLID WHITE) */}
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', marginBottom: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '8px' }}>
            <div style={{ background: '#fff7ed', borderRadius: '10px', padding: '8px 10px', textAlign: 'center' }}>
              <div style={{ fontSize: '8.5px', fontWeight: 900, textTransform: 'uppercase', color: '#7c2d12' }}>POPULASI TERNAK</div>
              <div style={{ fontSize: '17px', fontWeight: 900, lineHeight: 1.2, marginTop: '2px', color: '#c2410c' }}>
                {totalTernakAll > 0 ? `${totalTernakAll.toLocaleString('id-ID')} Ekor` : '-'}
              </div>
            </div>
            <div style={{ background: '#fff7ed', borderRadius: '10px', padding: '8px 10px', textAlign: 'center' }}>
              <div style={{ fontSize: '8.5px', fontWeight: 900, textTransform: 'uppercase', color: '#7c2d12' }}>JUMLAH PETERNAK</div>
              <div style={{ fontSize: '17px', fontWeight: 900, lineHeight: 1.2, marginTop: '2px', color: '#c2410c' }}>
                {jumlahPeternak > 0 ? `${jumlahPeternak} Kelompok` : '-'}
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px dashed #fed7aa', margin: '8px 0' }} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: '8px', fontWeight: 800, textTransform: 'uppercase', color: '#9a3412' }}>TOTAL POPULASI</div>
              <div style={{ fontSize: '14px', fontWeight: 900, color: '#c2410c', marginTop: '1px' }}>{totalTernakAll > 0 ? `${totalTernakAll.toLocaleString('id-ID')} Ekor` : '-'}</div>
            </div>
            <div style={{ borderLeft: '1px solid #fed7aa', paddingLeft: '6px' }}>
              <div style={{ fontSize: '8px', fontWeight: 800, textTransform: 'uppercase', color: '#9a3412' }}>ESTIMASI NILAI</div>
              <div style={{ fontSize: '14px', fontWeight: 900, color: '#16a34a', marginTop: '1px' }}>{totalNilaiTernakAll > 0 ? `Rp ${totalNilaiTernakAll.toLocaleString('id-ID')}` : '-'}</div>
            </div>
          </div>
        </div>

        {/* 3 Bottom Metric Pills (SOLID WHITE) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
          <div style={{ background: '#ffffff', padding: '8px 6px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', color: '#7c2d12' }}>SAPI / KERBAU</div>
            <div style={{ fontSize: '12px', fontWeight: 900, color: '#c2410c', marginTop: '2px' }}>{totalSapiAll > 0 ? `${totalSapiAll.toLocaleString('id-ID')} Ekor` : '-'}</div>
          </div>
          <div style={{ background: '#ffffff', padding: '8px 6px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', color: '#7c2d12' }}>KAMBING / DOMBA</div>
            <div style={{ fontSize: '12px', fontWeight: 900, color: '#c2410c', marginTop: '2px' }}>{totalKambingAll > 0 ? `${totalKambingAll.toLocaleString('id-ID')} Ekor` : '-'}</div>
          </div>
          <div style={{ background: '#ffffff', padding: '8px 6px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', color: '#7c2d12' }}>UNGGAS</div>
            <div style={{ fontSize: '12px', fontWeight: 900, color: '#c2410c', marginTop: '2px' }}>{(totalAyamAll + totalItikAll) > 0 ? `${(totalAyamAll + totalItikAll).toLocaleString('id-ID')} Ekor` : '-'}</div>
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


    </div>
  );
}

export default Dashboard;

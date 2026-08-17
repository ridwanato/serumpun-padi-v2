import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import realisasiPanganRaw from '../../data/realisasiPanganData.json';

const YEARS = [2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
const KECAMATAN_LIST = ['Ciwandan', 'Citangkil', 'Pulomerak', 'Purwakarta', 'Grogol', 'Cilegon', 'Jombang', 'Cibeber'];
const COMMODITIES_LIST = ['Padi Sawah', 'Padi Ladang', 'Jagung', 'Kedelai', 'Kacang Tanah', 'Ubi Kayu', 'Ubi Jalar', 'Kacang Hijau', 'Talas', 'Sorgum', 'Porang'];

const METRIC_OPTIONS = [
  { key: 'produksi_ton', label: 'Produksi', unit: 'Ton', color: '#10b981' },
  { key: 'tanam_ha', label: 'Luas Tanam', unit: 'Ha', color: '#0284c7' },
  { key: 'panen_ha', label: 'Luas Panen', unit: 'Ha', color: '#f59e0b' },
  { key: 'produktivitas_ku_ha', label: 'Produktivitas', unit: 'Ku/Ha', color: '#8b5cf6' },
  { key: 'puso_ha', label: 'Puso', unit: 'Ha', color: '#ef4444' }
];

const COMMODITY_COLORS = {
  'Padi Sawah': '#10b981',
  'Padi Ladang': '#84cc16',
  'Jagung': '#f59e0b',
  'Kedelai': '#f97316',
  'Kacang Tanah': '#d97706',
  'Ubi Kayu': '#854d0e',
  'Ubi Jalar': '#a16207',
  'Kacang Hijau': '#06b6d4',
  'Talas': '#3b82f6',
  'Sorgum': '#6366f1',
  'Porang': '#8b5cf6'
};

const GLOSSARY = {
  'Luas Tanam': 'Luas lahan yang ditanami komoditas tanaman pangan pada periode tertentu (satuan Hektar/Ha).',
  'Luas Panen': 'Luas lahan tanaman pangan yang dipungut hasilnya setelah mencapai tingkat kematangan organopik (satuan Hektar/Ha).',
  'Produksi': 'Hasil panen bersih komoditas pangan yang diperoleh selama kurun waktu 1 tahun (satuan Ton / Ton GKG).',
  'Produktivitas': 'Rata-rata hasil produksi yang diperoleh dari setiap 1 hektar luas panen (satuan Kuintal per Hektar / Ku/Ha). 1 Ton = 10 Kuintal.',
  'Puso': 'Kondisi tanaman yang rusak atau tidak dapat dipanen sama sekali akibat bencana alam, kekeringan, banjir, atau serangan hama penyakit.'
};

// ── Cubic Bezier Smooth Curve Generator (Sesuai Capture Model Lengkungan Smooth) ──
function getCurvedPath(points) {
  if (!points || points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? i : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

function ProduksiPangan() {
  const [selectedMetric, setSelectedMetric] = useState('produksi_ton');
  const [selectedKec, setSelectedKec] = useState('KOTA CILEGON');
  const [selectedCommodities, setSelectedCommodities] = useState(['Padi Sawah']);
  const [showGlossaryModal, setShowGlossaryModal] = useState(false);

  const [rankMetric, setRankMetric] = useState('produksi_ton');
  const [rankDimension, setRankDimension] = useState('kecamatan');
  const [rankOrder, setRankOrder] = useState('desc');
  const [rankYear, setRankYear] = useState(2025);
  const [rankCommodityFilter, setRankCommodityFilter] = useState('Padi Sawah');

  const activeMetricSpec = METRIC_OPTIONS.find(m => m.key === selectedMetric) || METRIC_OPTIONS[0];

  const timeSeriesData = useMemo(() => {
    const list = YEARS.map(yr => {
      const row = { tahun: yr };
      selectedCommodities.forEach(com => {
        const item = realisasiPanganRaw.find(r => r.tahun === yr && r.kecamatan === selectedKec && r.komoditas === com);
        row[com] = item ? (item[selectedMetric] || 0) : null;
      });
      return row;
    });

    return { historical: list, combined: list };
  }, [selectedMetric, selectedKec, selectedCommodities]);

  const narrativeText = useMemo(() => {
    const primaryCom = selectedCommodities[0] || 'Padi Sawah';
    const h2025 = realisasiPanganRaw.find(r => r.tahun === 2025 && r.kecamatan === selectedKec && r.komoditas === primaryCom);
    const h2024 = realisasiPanganRaw.find(r => r.tahun === 2024 && r.kecamatan === selectedKec && r.komoditas === primaryCom);

    const val2025 = h2025 ? (h2025[selectedMetric] || 0) : 0;
    const val2024 = h2024 ? (h2024[selectedMetric] || 0) : 0;
    const diff = val2025 - val2024;
    const pct = val2024 > 0 ? ((diff / val2024) * 100).toFixed(1) : '0';
    const statusWord = diff >= 0 ? 'mengalami peningkatan' : 'mengalami penurunan';

    const kecList2025 = realisasiPanganRaw.filter(r => r.tahun === 2025 && r.komoditas === primaryCom && r.kecamatan !== 'KOTA CILEGON');
    const topKec = [...kecList2025].sort((a, b) => (b[selectedMetric] || 0) - (a[selectedMetric] || 0))[0];

    return (
      `Berdasarkan data time series 2014–2025, capaian ${activeMetricSpec.label} untuk komoditas ${primaryCom} di ${selectedKec} pada tahun 2025 tercatat sebesar ${val2025.toLocaleString('id-ID')} ${activeMetricSpec.unit}. ` +
      `Angka ini ${statusWord} sebesar ${Math.abs(pct)}% dibandingkan tahun 2024 (${val2024.toLocaleString('id-ID')} ${activeMetricSpec.unit}). ` +
      (topKec ? `Kecamatan ${topKec.kecamatan} tercatat sebagai kontributor terbesar untuk ${primaryCom} di Kota Cilegon pada tahun 2025.` : '')
    );
  }, [selectedMetric, selectedKec, selectedCommodities, activeMetricSpec]);

  const rankingList = useMemo(() => {
    let raw = [];
    if (rankDimension === 'kecamatan') {
      raw = realisasiPanganRaw.filter(r => r.tahun === rankYear && r.komoditas === rankCommodityFilter && r.kecamatan !== 'KOTA CILEGON');
    } else if (rankDimension === 'komoditas') {
      raw = realisasiPanganRaw.filter(r => r.tahun === rankYear && r.kecamatan === 'KOTA CILEGON');
    } else if (rankDimension === 'tahun') {
      raw = realisasiPanganRaw.filter(r => r.komoditas === rankCommodityFilter && r.kecamatan === 'KOTA CILEGON');
    }

    const sorted = [...raw].sort((a, b) => {
      const valA = a[rankMetric] || 0;
      const valB = b[rankMetric] || 0;
      return rankOrder === 'desc' ? valB - valA : valA - valB;
    });

    return sorted;
  }, [rankMetric, rankDimension, rankOrder, rankYear, rankCommodityFilter]);

  const exportCleanExcel = (exportType) => {
    let exportData = [];
    let fileName = 'Realisasi_Pangan_Kota_Cilegon';

    if (exportType === 'all') {
      exportData = realisasiPanganRaw.map(r => ({
        'Tahun': r.tahun,
        'Kecamatan': r.kecamatan,
        'Komoditas': r.komoditas,
        'Luas Tanam (Ha)': r.tanam_ha ?? '-',
        'Luas Panen (Ha)': r.panen_ha ?? '-',
        'Produksi (Ton)': r.produksi_ton ?? '-',
        'Produktivitas (Ku/Ha)': r.produktivitas_ku_ha ? r.produktivitas_ku_ha.toFixed(2) : '-'
      }));
      fileName = 'Dataset_Lengkap_Padi_Palawija_Cilegon_2014_2025.xlsx';
    } else if (exportType === 'by_commodity') {
      const com = selectedCommodities[0] || 'Padi Sawah';
      exportData = realisasiPanganRaw.filter(r => r.komoditas === com).map(r => ({
        'Tahun': r.tahun,
        'Kecamatan': r.kecamatan,
        'Komoditas': r.komoditas,
        'Luas Tanam (Ha)': r.tanam_ha ?? '-',
        'Luas Panen (Ha)': r.panen_ha ?? '-',
        'Produksi (Ton)': r.produksi_ton ?? '-',
        'Produktivitas (Ku/Ha)': r.produktivitas_ku_ha ? r.produktivitas_ku_ha.toFixed(2) : '-'
      }));
      fileName = `Realisasi_${com.replace(/\s+/g, '_')}_2014_2025.xlsx`;
    }

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Realisasi Pangan');
    XLSX.writeFile(wb, fileName);
  };

  const toggleCommodity = (com) => {
    if (selectedCommodities.includes(com)) {
      setSelectedCommodities(selectedCommodities.filter(c => c !== com));
    } else {
      setSelectedCommodities([...selectedCommodities, com]);
    }
  };

  return (
    <div style={{ padding: '12px 16px', color: '#0f172a', fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* ── HEADER BANNER (MOBILE FIRST RESPONSIVE) ── */}
      <div style={{
        background: 'linear-gradient(135deg, #10b981 0%, #047857 60%, #064e3b 100%)',
        color: '#ffffff',
        borderRadius: '20px',
        padding: '18px 20px',
        marginBottom: '16px',
        boxShadow: '0 10px 28px rgba(16, 185, 129, 0.25)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '10.5px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', color: '#a7f3d0' }}>
              📊 DASHBOARD STATISTIK PANGAN
            </div>
            <h1 style={{ fontSize: '20px', fontWeight: 900, margin: '4px 0 0 0', color: '#ffffff', letterSpacing: '-0.3px' }}>
              Realisasi Produksi Padi & Palawija Kota Cilegon
            </h1>
            <p style={{ fontSize: '11.5px', color: '#d1fae5', margin: '4px 0 0 0', fontWeight: 500 }}>
              Data Time Series Resmi Dinas Ketahanan Pangan & Pertanian (2014 – 2025)
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', width: '100%', maxWidth: '380px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowGlossaryModal(true)}
              style={{
                flex: 1,
                minWidth: '130px',
                height: '42px',
                background: 'rgba(255, 255, 255, 0.18)',
                border: '1px solid rgba(255, 255, 255, 0.35)',
                color: '#ffffff',
                borderRadius: '10px',
                padding: '0 12px',
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <span>📖</span> Glosarium
            </button>
            <button
              onClick={() => exportCleanExcel('all')}
              style={{
                flex: 1.3,
                minWidth: '170px',
                height: '42px',
                background: '#ffffff',
                border: 'none',
                color: '#047857',
                borderRadius: '10px',
                padding: '0 14px',
                fontSize: '11px',
                fontWeight: 900,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <span>📥</span> Unduh Excel (.xlsx)
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. MAIN TIME SERIES CHART & SMOOTH LENGKUNGAN CURVES (SESUAI CAPTURE 3 MOCKUP) ── */}
      <div style={{ background: '#ffffff', borderRadius: '20px', padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', marginBottom: '16px' }}>
        
        {/* Chart Header Controls matching Capture 3 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 900, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📈</span> Grafik Tren Lintas Tahun (2014 – 2025)
            </h3>
            <p style={{ fontSize: '11px', color: '#64748b', margin: '3px 0 0 0' }}>
              Gaya kurva smooth & area gradient (sesuai standar IKP nasional & provinsi)
            </p>
          </div>

          {/* Kecamatan Selector on Top Right */}
          <select
            value={selectedKec}
            onChange={e => setSelectedKec(e.target.value)}
            style={{
              background: '#ffffff',
              border: '1.5px solid #cbd5e1',
              borderRadius: '12px',
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: 800,
              color: '#0f172a',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              minHeight: '38px'
            }}
          >
            <option value="KOTA CILEGON">🏛️ Kota Cilegon</option>
            {KECAMATAN_LIST.map(k => (
              <option key={k} value={k}>📍 Kec. {k}</option>
            ))}
          </select>
        </div>

        {/* JENIS TIME SERIES Selection Section (Matching Capture 3 Mockup) */}
        <div style={{ textAlign: 'center', marginBottom: '14px', padding: '10px 12px', background: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#64748b', marginBottom: '8px' }}>
            JENIS TIME SERIES
          </div>

          {/* Unified Professional Pill Selector for Desktop & Mobile */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: '6px', fontSize: '12px' }}>
            {METRIC_OPTIONS.map((m, idx) => {
              const active = selectedMetric === m.key;
              return (
                <React.Fragment key={m.key}>
                  {idx > 0 && <span style={{ color: '#94a3b8', fontWeight: 500, userSelect: 'none' }}>-</span>}
                  <button
                    onClick={() => setSelectedMetric(m.key)}
                    style={{
                      background: active ? '#0f172a' : 'transparent',
                      color: active ? '#ffffff' : '#334155',
                      border: 'none',
                      borderRadius: '20px',
                      padding: active ? '5px 14px' : '4px 10px',
                      fontSize: '12px',
                      fontWeight: active ? 900 : 800,
                      cursor: 'pointer',
                      transition: 'all 0.18s ease',
                      boxShadow: active ? '0 4px 12px rgba(15, 23, 42, 0.3)' : 'none',
                      lineHeight: '1.2'
                    }}
                  >
                    {m.label.toLowerCase()}
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Commodity Legend & Checkboxes Strip (Multi-Select) */}
        <div className="sp-commodity-box" style={{ background: '#f8fafc', borderRadius: '12px', padding: '10px 12px', border: '1px solid #e2e8f0', marginBottom: '12px' }}>
          <div style={{ fontSize: '9.5px', fontWeight: 900, textTransform: 'uppercase', color: '#64748b', marginBottom: '6px', letterSpacing: '0.5px' }}>
            KOMODITAS DITAMPILKAN (MULTI-SELECT):
          </div>
          <div className="sp-commodity-container">
            {COMMODITIES_LIST.map(com => {
              const active = selectedCommodities.includes(com);
              const color = COMMODITY_COLORS[com] || '#64748b';
              return (
                <button
                  key={com}
                  className="sp-commodity-pill"
                  onClick={() => toggleCommodity(com)}
                  style={{
                    background: active ? color : '#ffffff',
                    color: active ? '#ffffff' : '#334155',
                    border: `1.5px solid ${active ? color : '#cbd5e1'}`,
                    boxShadow: active ? `0 2px 6px ${color}40` : 'none',
                  }}
                >
                  <span
                    className="sp-commodity-pill__dot"
                    style={{ background: active ? '#ffffff' : color }}
                  />
                  {com}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Curved Smooth Chart Container (SVG Bezier Spline + Gradient Area) */}
        <div style={{ height: '300px', width: '100%', position: 'relative', marginTop: '10px' }}>
          <ResponsiveSmoothChart
            data={timeSeriesData.combined}
            commodities={selectedCommodities}
            metricSpec={activeMetricSpec}
          />
        </div>

        {/* Chart Disclaimer & Footnote */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '14px', fontSize: '10.5px', color: '#64748b' }}>
          <div>
            * Lengkungan smooth dengan gradien area murni (2014–2025).
          </div>
          <button
            onClick={() => exportCleanExcel('by_commodity')}
            style={{ background: '#ecfdf5', border: '1px solid #6ee7b7', color: '#047857', borderRadius: '6px', padding: '4px 10px', fontWeight: 800, cursor: 'pointer' }}
          >
            📥 Download xlsx
          </button>
        </div>
      </div>

      {/* ── 3. AUTOMATED NARRATIVE & GLOSSARY ── */}
      <div style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)', borderRadius: '16px', padding: '14px 18px', border: '1px solid #a7f3d0', marginBottom: '16px' }}>
        <div style={{ fontSize: '10.5px', fontWeight: 900, textTransform: 'uppercase', color: '#047857', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>💡 ANALISIS & INTERPRETASI OTOMATIS</span>
        </div>
        <p style={{ fontSize: '12.5px', color: '#064e3b', fontWeight: 600, lineHeight: 1.5, margin: 0 }}>
          "{narrativeText}"
        </p>
      </div>

      {/* ── 4. INTERACTIVE RANKING / SORTING PANEL (FITUR SORTIR TOP - MOBILE RESPONSIVE) ── */}
      <div style={{ background: '#ffffff', borderRadius: '20px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 900, margin: 0, color: '#0f172a' }}>
              🏆 Peringkat & Analisis Urutan ("Fitur Top")
            </h3>
            <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0 0' }}>
              Urutkan kinerja produksi berdasarkan Kecamatan, Komoditas, atau Tahun
            </p>
          </div>

          {/* Ranking Controls */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', width: '100%', maxWidth: '520px' }}>
            <select
              value={rankDimension}
              onChange={e => setRankDimension(e.target.value)}
              style={{ flex: 1, minWidth: '130px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px 8px', fontSize: '11px', fontWeight: 800, minHeight: '36px' }}
            >
              <option value="kecamatan">Per Kecamatan</option>
              <option value="komoditas">Per Komoditas</option>
              <option value="tahun">Per Tahun</option>
            </select>

            <select
              value={rankMetric}
              onChange={e => setRankMetric(e.target.value)}
              style={{ flex: 1, minWidth: '120px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px 8px', fontSize: '11px', fontWeight: 800, minHeight: '36px' }}
            >
              {METRIC_OPTIONS.map(m => (
                <option key={m.key} value={m.key}>{m.label}</option>
              ))}
            </select>

            {rankDimension !== 'tahun' && (
              <select
                value={rankYear}
                onChange={e => setRankYear(parseInt(e.target.value))}
                style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px 8px', fontSize: '11px', fontWeight: 800, minHeight: '36px' }}
              >
                {YEARS.map(yr => (
                  <option key={yr} value={yr}>Tahun {yr}</option>
                ))}
              </select>
            )}

            {rankDimension !== 'komoditas' && (
              <select
                value={rankCommodityFilter}
                onChange={e => setRankCommodityFilter(e.target.value)}
                style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px 8px', fontSize: '11px', fontWeight: 800, minHeight: '36px' }}
              >
                {COMMODITIES_LIST.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}

            <button
              onClick={() => setRankOrder(rankOrder === 'desc' ? 'asc' : 'desc')}
              style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px 10px', fontSize: '11px', fontWeight: 800, cursor: 'pointer', minHeight: '36px' }}
            >
              {rankOrder === 'desc' ? '⬇️ Tinggi → Rendah' : '⬆️ Rendah → Tinggi'}
            </button>
          </div>
        </div>

        {/* Ranking Data Table with Responsive Horizontal Scroll */}
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.5px' }}>
                <th style={{ padding: '8px 10px', width: '50px' }}>Rank</th>
                <th style={{ padding: '8px 10px' }}>
                  {rankDimension === 'kecamatan' ? 'Kecamatan' : rankDimension === 'komoditas' ? 'Komoditas' : 'Tahun'}
                </th>
                <th style={{ padding: '8px 10px' }}>Komoditas / Wilayah</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Luas Tanam (Ha)</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Luas Panen (Ha)</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Produksi (Ton)</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Produktivitas (Ku/Ha)</th>
              </tr>
            </thead>
            <tbody>
              {rankingList.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '16px', color: '#94a3b8' }}>
                    Tidak ada data tersedia untuk kombinasi filter ini.
                  </td>
                </tr>
              ) : (
                rankingList.map((item, idx) => {
                  const label = rankDimension === 'kecamatan' ? item.kecamatan : rankDimension === 'komoditas' ? item.komoditas : item.tahun;
                  const subLabel = rankDimension === 'kecamatan' ? item.komoditas : rankDimension === 'komoditas' ? 'Kota Cilegon' : item.kecamatan;
                  const isTop3 = idx < 3 && rankOrder === 'desc';
                  const badge = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;

                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', background: isTop3 ? '#ecfdf5' : 'transparent' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 900, color: isTop3 ? '#047857' : '#64748b' }}>
                        {badge}
                      </td>
                      <td style={{ padding: '8px 10px', fontWeight: 800, color: '#0f172a' }}>
                        {label}
                      </td>
                      <td style={{ padding: '8px 10px', color: '#64748b', fontWeight: 600 }}>
                        {subLabel}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>
                        {item.tanam_ha ? item.tanam_ha.toLocaleString('id-ID') : '-'}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>
                        {item.panen_ha ? item.panen_ha.toLocaleString('id-ID') : '-'}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 900, color: '#10b981' }}>
                        {item.produksi_ton ? item.produksi_ton.toLocaleString('id-ID') : '-'}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#0284c7' }}>
                        {item.produktivitas_ku_ha ? item.produktivitas_ku_ha.toFixed(2) : '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── GLOSSARY MODAL ── */}
      {showGlossaryModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#ffffff', borderRadius: '20px', maxWidth: '520px', width: '100%', padding: '20px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 900, margin: 0, color: '#0f172a' }}>
                📖 Glosarium Istilah Statistik Pertanian
              </h3>
              <button onClick={() => setShowGlossaryModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontWeight: 800 }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {Object.entries(GLOSSARY).map(([term, desc]) => (
                <div key={term} style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11.5px', fontWeight: 900, color: '#047857', marginBottom: '2px' }}>{term}</div>
                  <div style={{ fontSize: '11px', color: '#475569', lineHeight: 1.4 }}>{desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ── CUSTOM SVG RESPONSIVE SMOOTH CHART (BEZIER CURVE & GRADIENT FILL) ──
function ResponsiveSmoothChart({ data, commodities }) {
  if (!data || data.length === 0) return null;

  const width = 800;
  const height = 300;
  const padding = { top: 25, right: 30, bottom: 40, left: 60 };

  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  let maxVal = 0;
  data.forEach(d => {
    commodities.forEach(c => {
      if (d[c] !== null && !isNaN(d[c])) {
        if (d[c] > maxVal) maxVal = d[c];
      }
    });
  });
  if (maxVal === 0) maxVal = 100;
  maxVal = Math.ceil(maxVal * 1.15);

  const xScale = (idx) => padding.left + (idx / Math.max(1, data.length - 1)) * chartW;
  const yScale = (val) => padding.top + chartH - (val / maxVal) * chartH;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
      <defs>
        {/* Generate Gradient Fills for each commodity */}
        {commodities.map((com) => {
          const color = COMMODITY_COLORS[com] || '#64748b';
          const gradId = `grad_${com.replace(/[^a-zA-Z0-9]/g, '_')}`;
          return (
            <linearGradient key={gradId} id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.35" />
              <stop offset="100%" stopColor={color} stopOpacity="0.0" />
            </linearGradient>
          );
        })}
      </defs>

      {/* Gridlines & Y Labels */}
      {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
        const val = Math.round(maxVal * pct);
        const y = yScale(val);
        return (
          <g key={i}>
            <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#f1f5f9" strokeWidth="1.5" strokeDasharray={i === 0 ? '0' : '4 4'} />
            <text x={padding.left - 10} y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8" fontWeight="600">
              {val.toLocaleString('id-ID')}
            </text>
          </g>
        );
      })}

      {/* X Labels (Years) */}
      {data.map((d, i) => {
        const x = xScale(i);
        return (
          <g key={i}>
            <text x={x} y={height - 10} textAnchor="middle" fontSize="10" fill="#64748b" fontWeight="700">
              {d.tahun}
            </text>
          </g>
        );
      })}

      {/* Render Curves & Area Fills for each commodity */}
      {commodities.map((com) => {
        const strokeColor = COMMODITY_COLORS[com] || '#64748b';
        const gradId = `grad_${com.replace(/[^a-zA-Z0-9]/g, '_')}`;
        
        const points = data.map((d, i) => {
          const val = d[com];
          if (val === null || isNaN(val)) return null;
          return { x: xScale(i), y: yScale(val), val, tahun: d.tahun };
        }).filter(p => p !== null);

        if (points.length === 0) return null;

        // Compute Cubic Bezier Smooth Path String
        const curvedPath = getCurvedPath(points);

        // Area Fill Path
        let areaPath = '';
        if (points.length > 1) {
          const firstP = points[0];
          const lastP = points[points.length - 1];
          const bottomY = yScale(0);
          areaPath = `${curvedPath} L ${lastP.x} ${bottomY} L ${firstP.x} ${bottomY} Z`;
        }

        return (
          <g key={com}>
            {/* Translucent Area Gradient Fill Under Curve */}
            {areaPath && <path d={areaPath} fill={`url(#${gradId})`} opacity="0.9" />}

            {/* Smooth Curve Line */}
            {curvedPath && (
              <path
                d={curvedPath}
                fill="none"
                stroke={strokeColor}
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Node Markers & Value Labels */}
            {points.map((p, i) => (
              <g key={i}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="5"
                  fill="#ffffff"
                  stroke={strokeColor}
                  strokeWidth="3"
                />
                <text
                  x={p.x}
                  y={p.y - 10}
                  textAnchor="middle"
                  fontSize="9.5"
                  fontWeight="900"
                  fill={strokeColor}
                >
                  {p.val.toLocaleString('id-ID')}
                </text>
              </g>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

export default ProduksiPangan;


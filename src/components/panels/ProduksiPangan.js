import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import realisasiPanganRaw from '../../data/realisasiPanganData.json';

const YEARS = [2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
const KECAMATAN_LIST = ['Ciwandan', 'Citangkil', 'Pulomerak', 'Purwakarta', 'Grogol', 'Cilegon', 'Jombang', 'Cibeber'];
const COMMODITIES_LIST = ['Padi Sawah', 'Padi Ladang', 'Jagung', 'Kedelai', 'Kacang Tanah', 'Ubi Kayu', 'Ubi Jalar', 'Kacang Hijau', 'Talas', 'Sorgum', 'Porang'];

const METRIC_OPTIONS = [
  { key: 'produksi_ton', label: 'Produksi', unit: 'Ton', color: '#16a34a' },
  { key: 'tanam_ha', label: 'Luas Tanam', unit: 'Ha', color: '#0284c7' },
  { key: 'panen_ha', label: 'Luas Panen', unit: 'Ha', color: '#eab308' },
  { key: 'produktivitas_ku_ha', label: 'Produktivitas', unit: 'Ku/Ha', color: '#9333ea' }
];

const COMMODITY_COLORS = {
  'Padi Sawah': '#16a34a',
  'Padi Ladang': '#84cc16',
  'Jagung': '#eab308',
  'Kedelai': '#f97316',
  'Kacang Tanah': '#d97706',
  'Ubi Kayu': '#854d0e',
  'Ubi Jalar': '#a16207',
  'Kacang Hijau': '#10b981',
  'Talas': '#06b6d4',
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

function ProduksiPangan() {
  const [selectedMetric, setSelectedMetric] = useState('produksi_ton');
  const [selectedKec, setSelectedKec] = useState('KOTA CILEGON');
  const [selectedCommodities, setSelectedCommodities] = useState(['Padi Sawah', 'Jagung', 'Ubi Kayu']);
  const [showProjection, setShowProjection] = useState(true);
  const [showGlossaryModal, setShowGlossaryModal] = useState(false);

  const [rankMetric, setRankMetric] = useState('produksi_ton');
  const [rankDimension, setRankDimension] = useState('kecamatan');
  const [rankOrder, setRankOrder] = useState('desc');
  const [rankYear, setRankYear] = useState(2025);
  const [rankCommodityFilter, setRankCommodityFilter] = useState('Padi Sawah');

  const activeMetricSpec = METRIC_OPTIONS.find(m => m.key === selectedMetric) || METRIC_OPTIONS[0];

  const kpiData = useMemo(() => {
    const data2025 = realisasiPanganRaw.filter(r => r.tahun === 2025 && r.kecamatan === 'KOTA CILEGON');
    const data2024 = realisasiPanganRaw.filter(r => r.tahun === 2024 && r.kecamatan === 'KOTA CILEGON');
    const last5YearsData = realisasiPanganRaw.filter(r => r.tahun >= 2021 && r.tahun <= 2025 && r.kecamatan === 'KOTA CILEGON');

    const totProd2025 = data2025.reduce((sum, r) => sum + (r.produksi_ton || 0), 0);
    const totProd2024 = data2024.reduce((sum, r) => sum + (r.produksi_ton || 0), 0);
    const yoyChange = totProd2024 > 0 ? (((totProd2025 - totProd2024) / totProd2024) * 100).toFixed(1) : 0;

    const topCommodityObj = [...data2025].sort((a, b) => (b.produksi_ton || 0) - (a.produksi_ton || 0))[0];

    const kec2025Data = realisasiPanganRaw.filter(r => r.tahun === 2025 && r.kecamatan !== 'KOTA CILEGON');
    const kecTotals = {};
    kec2025Data.forEach(r => {
      kecTotals[r.kecamatan] = (kecTotals[r.kecamatan] || 0) + (r.produksi_ton || 0);
    });
    const topKecPair = Object.entries(kecTotals).sort((a, b) => b[1] - a[1])[0];

    const padiSawah2025 = data2025.find(r => r.komoditas === 'Padi Sawah');
    const padiSawah5Yr = last5YearsData.filter(r => r.komoditas === 'Padi Sawah');
    const avg5YrProd = padiSawah5Yr.length > 0 ? (padiSawah5Yr.reduce((s, r) => s + (r.produktivitas_ku_ha || 0), 0) / padiSawah5Yr.length).toFixed(1) : 0;

    return {
      totProd2025: totProd2025.toLocaleString('id-ID', { maximumFractionDigits: 1 }),
      yoyChange,
      topCommodity: topCommodityObj ? topCommodityObj.komoditas : '-',
      topCommodityVal: topCommodityObj ? (topCommodityObj.produksi_ton || 0).toLocaleString('id-ID', { maximumFractionDigits: 1 }) : '0',
      topKec: topKecPair ? topKecPair[0] : '-',
      topKecVal: topKecPair ? topKecPair[1].toLocaleString('id-ID', { maximumFractionDigits: 1 }) : '0',
      padiSawahProd2025: padiSawah2025 ? (padiSawah2025.produktivitas_ku_ha || 0).toFixed(1) : '0',
      avg5YrProd
    };
  }, []);

  const timeSeriesData = useMemo(() => {
    const list = YEARS.map(yr => {
      const row = { tahun: yr };
      selectedCommodities.forEach(com => {
        const item = realisasiPanganRaw.find(r => r.tahun === yr && r.kecamatan === selectedKec && r.komoditas === com);
        row[com] = item ? (item[selectedMetric] || 0) : null;
      });
      return row;
    });

    const projectedRows = [];
    if (showProjection) {
      const projYears = [2026, 2027];
      projYears.forEach((pYr) => {
        const row = { tahun: pYr, isProjection: true };
        selectedCommodities.forEach(com => {
          const last3 = list.slice(-3).map(r => r[com]).filter(v => v !== null && !isNaN(v));
          if (last3.length > 0) {
            const avg = last3.reduce((a, b) => a + b, 0) / last3.length;
            row[com] = parseFloat(avg.toFixed(1));
          } else {
            row[com] = null;
          }
        });
        projectedRows.push(row);
      });
    }

    return { historical: list, projected: projectedRows, combined: [...list, ...projectedRows] };
  }, [selectedMetric, selectedKec, selectedCommodities, showProjection]);

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
      if (selectedCommodities.length === 1) return alert('Pilih minimal 1 komoditas.');
      setSelectedCommodities(selectedCommodities.filter(c => c !== com));
    } else {
      setSelectedCommodities([...selectedCommodities, com]);
    }
  };

  return (
    <div style={{ padding: '16px', color: '#0f172a', fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* ── HEADER BANNER ── */}
      <div style={{
        background: 'linear-gradient(135deg, #15803d 0%, #166534 50%, #14532d 100%)',
        color: '#ffffff',
        borderRadius: '20px',
        padding: '20px 24px',
        marginBottom: '20px',
        boxShadow: '0 10px 28px rgba(22, 101, 52, 0.25)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', color: '#86efac' }}>
              📊 DASHBOARD STATISTIK & PROYEKSI PANGAN
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: 900, margin: '4px 0 0 0', color: '#ffffff', letterSpacing: '-0.3px' }}>
              Realisasi Produksi Padi & Palawija Kota Cilegon
            </h1>
            <p style={{ fontSize: '12px', color: '#dcfce7', margin: '4px 0 0 0', fontWeight: 500 }}>
              Data Time Series Resmi Dinas Ketahanan Pangan & Pertanian (2014 – 2025)
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setShowGlossaryModal(true)}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                color: '#ffffff',
                borderRadius: '10px',
                padding: '8px 14px',
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              📖 Glosarium Istilah
            </button>
            <button
              onClick={() => exportCleanExcel('all')}
              style={{
                background: '#ffffff',
                border: 'none',
                color: '#14532d',
                borderRadius: '10px',
                padding: '8px 16px',
                fontSize: '11px',
                fontWeight: 900,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
              }}
            >
              📊 Unduh Excel Lengkap (.xlsx)
            </button>
          </div>
        </div>
      </div>

      {/* ── 1. KPI CARDS (SUMMARY METRICS) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', color: '#64748b' }}>TOTAL PRODUKSI (2025)</div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#16a34a', marginTop: '4px' }}>
            {kpiData.totProd2025} <span style={{ fontSize: '13px', color: '#475569' }}>Ton</span>
          </div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: parseFloat(kpiData.yoyChange) >= 0 ? '#16a34a' : '#dc2626', marginTop: '4px' }}>
            {parseFloat(kpiData.yoyChange) >= 0 ? '▲' : '▼'} {kpiData.yoyChange}% YoY vs 2024
          </div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', color: '#64748b' }}>KOMODITAS UTAMA (2025)</div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: '#0284c7', marginTop: '4px' }}>
            {kpiData.topCommodity}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', fontWeight: 600 }}>
            Produksi: <strong>{kpiData.topCommodityVal} Ton</strong>
          </div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', color: '#64748b' }}>KECAMATAN TERINGGI (2025)</div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: '#9333ea', marginTop: '4px' }}>
            Kec. {kpiData.topKec}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', fontWeight: 600 }}>
            Produksi: <strong>{kpiData.topKecVal} Ton</strong>
          </div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', color: '#64748b' }}>PRODUKTIVITAS PADI SAWAH</div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#eab308', marginTop: '4px' }}>
            {kpiData.padiSawahProd2025} <span style={{ fontSize: '13px', color: '#475569' }}>Ku/Ha</span>
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', fontWeight: 600 }}>
            Rata-rata 5 Thn: <strong>{kpiData.avg5YrProd} Ku/Ha</strong>
          </div>
        </div>
      </div>

      {/* ── 2. MAIN TIME SERIES CHART & CONTROLS ── */}
      <div style={{ background: '#ffffff', borderRadius: '20px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', marginBottom: '20px' }}>
        
        {/* Chart Header Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 900, margin: 0, color: '#0f172a' }}>
              📈 Grafik Tren Historis & Proyeksi (2014 – 2027)
            </h3>
            <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0 0' }}>
              Pilih metrik, wilayah, dan komoditas untuk menganalisis perkembangan pangan Kota Cilegon
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {/* Metric Selector Pills */}
            <div style={{ background: '#f1f5f9', borderRadius: '10px', padding: '3px', display: 'flex', gap: '3px' }}>
              {METRIC_OPTIONS.map(m => (
                <button
                  key={m.key}
                  onClick={() => setSelectedMetric(m.key)}
                  style={{
                    background: selectedMetric === m.key ? '#ffffff' : 'transparent',
                    color: selectedMetric === m.key ? m.color : '#64748b',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '11px',
                    fontWeight: 900,
                    cursor: 'pointer',
                    boxShadow: selectedMetric === m.key ? '0 2px 6px rgba(0,0,0,0.08)' : 'none'
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Kecamatan Selector */}
            <select
              value={selectedKec}
              onChange={e => setSelectedKec(e.target.value)}
              style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                padding: '6px 12px',
                fontSize: '11px',
                fontWeight: 800,
                color: '#0f172a',
                cursor: 'pointer'
              }}
            >
              <option value="KOTA CILEGON">🏛️ Total Kota Cilegon</option>
              {KECAMATAN_LIST.map(k => (
                <option key={k} value={k}>📍 Kec. {k}</option>
              ))}
            </select>

            {/* Projection Toggle */}
            <button
              onClick={() => setShowProjection(!showProjection)}
              style={{
                background: showProjection ? '#fef3c7' : '#f1f5f9',
                border: showProjection ? '1.5px solid #f59e0b' : '1px solid #cbd5e1',
                color: showProjection ? '#b45309' : '#64748b',
                borderRadius: '10px',
                padding: '6px 12px',
                fontSize: '11px',
                fontWeight: 900,
                cursor: 'pointer'
              }}
            >
              🔮 Proyeksi (2026-2027) {showProjection ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        {/* Commodity Checkboxes Strip */}
        <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '10px 14px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
          <div style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', color: '#64748b', marginBottom: '6px' }}>
            FILTER KOMODITAS (MULTI-SELECT):
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {COMMODITIES_LIST.map(com => {
              const active = selectedCommodities.includes(com);
              const color = COMMODITY_COLORS[com] || '#64748b';
              return (
                <button
                  key={com}
                  onClick={() => toggleCommodity(com)}
                  style={{
                    background: active ? color : '#ffffff',
                    color: active ? '#ffffff' : '#475569',
                    border: `1.5px solid ${active ? color : '#cbd5e1'}`,
                    borderRadius: '8px',
                    padding: '4px 10px',
                    fontSize: '10.5px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {active ? '✓ ' : '+ '}{com}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Chart Container */}
        <div style={{ height: '320px', width: '100%', position: 'relative', marginTop: '10px' }}>
          <ResponsiveChart
            data={timeSeriesData.combined}
            commodities={selectedCommodities}
            metricSpec={activeMetricSpec}
          />
        </div>

        {/* Chart Disclaimer & Footnote */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', fontSize: '10.5px', color: '#64748b' }}>
          <div>
            * Garis putus-putus mewakili proyeksi tren moving average 3-tahun untuk 2026–2027.
          </div>
          <button
            onClick={() => exportCleanExcel('by_commodity')}
            style={{ background: '#f0fdf4', border: '1px solid #86efac', color: '#15803d', borderRadius: '6px', padding: '3px 10px', fontWeight: 800, cursor: 'pointer' }}
          >
            📊 Unduh Data Grafik (.xlsx)
          </button>
        </div>
      </div>

      {/* ── 3. AUTOMATED NARRATIVE & GLOSSARY ── */}
      <div style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', borderRadius: '16px', padding: '16px 20px', border: '1px solid #bbf7d0', marginBottom: '20px' }}>
        <div style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', color: '#15803d', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>💡 ANALISIS & INTERPRETASI OTOMATIS</span>
        </div>
        <p style={{ fontSize: '13px', color: '#14532d', fontWeight: 600, lineHeight: 1.5, margin: 0 }}>
          "{narrativeText}"
        </p>
      </div>

      {/* ── 4. INTERACTIVE RANKING / SORTING PANEL (FITUR SORTIR TOP) ── */}
      <div style={{ background: '#ffffff', borderRadius: '20px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 900, margin: 0, color: '#0f172a' }}>
              🏆 Peringkat & Analisis Urutan ("Fitur Top")
            </h3>
            <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0 0' }}>
              Urutkan kinerja produksi berdasarkan Kecamatan, Komoditas, atau Tahun secara dinamis
            </p>
          </div>

          {/* Ranking Controls */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <select
              value={rankDimension}
              onChange={e => setRankDimension(e.target.value)}
              style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px 10px', fontSize: '11px', fontWeight: 800 }}
            >
              <option value="kecamatan">Urut Per Kecamatan</option>
              <option value="komoditas">Urut Per Komoditas</option>
              <option value="tahun">Urut Per Tahun (Time-Series)</option>
            </select>

            <select
              value={rankMetric}
              onChange={e => setRankMetric(e.target.value)}
              style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px 10px', fontSize: '11px', fontWeight: 800 }}
            >
              {METRIC_OPTIONS.map(m => (
                <option key={m.key} value={m.key}>{m.label}</option>
              ))}
            </select>

            {rankDimension !== 'tahun' && (
              <select
                value={rankYear}
                onChange={e => setRankYear(parseInt(e.target.value))}
                style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px 10px', fontSize: '11px', fontWeight: 800 }}
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
                style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px 10px', fontSize: '11px', fontWeight: 800 }}
              >
                {COMMODITIES_LIST.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}

            <button
              onClick={() => setRankOrder(rankOrder === 'desc' ? 'asc' : 'desc')}
              style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px 10px', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}
            >
              {rankOrder === 'desc' ? '⬇️ Highest → Lowest' : '⬆️ Lowest → Highest'}
            </button>
          </div>
        </div>

        {/* Ranking Data Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.5px' }}>
                <th style={{ padding: '10px 12px', width: '50px' }}>Rank</th>
                <th style={{ padding: '10px 12px' }}>
                  {rankDimension === 'kecamatan' ? 'Kecamatan' : rankDimension === 'komoditas' ? 'Komoditas' : 'Tahun'}
                </th>
                <th style={{ padding: '10px 12px' }}>Komoditas / Wilayah</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Luas Tanam (Ha)</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Luas Panen (Ha)</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Produksi (Ton)</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Produktivitas (Ku/Ha)</th>
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
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', background: isTop3 ? '#f0fdf4' : 'transparent' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 900, color: isTop3 ? '#15803d' : '#64748b' }}>
                        {badge}
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 800, color: '#0f172a' }}>
                        {label}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600 }}>
                        {subLabel}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>
                        {item.tanam_ha ? item.tanam_ha.toLocaleString('id-ID') : '-'}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>
                        {item.panen_ha ? item.panen_ha.toLocaleString('id-ID') : '-'}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 900, color: '#16a34a' }}>
                        {item.produksi_ton ? item.produksi_ton.toLocaleString('id-ID') : '-'}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: '#0284c7' }}>
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
          <div style={{ background: '#ffffff', borderRadius: '20px', maxWidth: '520px', width: '100%', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 900, margin: 0, color: '#0f172a' }}>
                📖 Glosarium Istilah Statistik Pertanian
              </h3>
              <button onClick={() => setShowGlossaryModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '4px 10px', cursor: 'pointer', fontWeight: 800 }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {Object.entries(GLOSSARY).map(([term, desc]) => (
                <div key={term} style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '12px', fontWeight: 900, color: '#166534', marginBottom: '2px' }}>{term}</div>
                  <div style={{ fontSize: '11.5px', color: '#475569', lineHeight: 1.4 }}>{desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ── CUSTOM SVG RESPONSIVE TIME SERIES CHART ──
function ResponsiveChart({ data, commodities }) {
  if (!data || data.length === 0) return null;

  const width = 800;
  const height = 300;
  const padding = { top: 20, right: 30, bottom: 40, left: 60 };

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

  const xScale = (idx) => padding.left + (idx / (data.length - 1)) * chartW;
  const yScale = (val) => padding.top + chartH - (val / maxVal) * chartH;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
      {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
        const val = Math.round(maxVal * pct);
        const y = yScale(val);
        return (
          <g key={i}>
            <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#f1f5f9" strokeWidth="1" strokeDasharray={i === 0 ? '0' : '4 4'} />
            <text x={padding.left - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8" fontWeight="600">
              {val.toLocaleString('id-ID')}
            </text>
          </g>
        );
      })}

      {data.map((d, i) => {
        const x = xScale(i);
        return (
          <g key={i}>
            <text x={x} y={height - 10} textAnchor="middle" fontSize="10" fill={d.isProjection ? '#f59e0b' : '#64748b'} fontWeight={d.isProjection ? '900' : '700'}>
              {d.tahun}{d.isProjection ? '*' : ''}
            </text>
          </g>
        );
      })}

      {commodities.map(com => {
        const strokeColor = COMMODITY_COLORS[com] || '#64748b';
        const points = data.map((d, i) => {
          const val = d[com];
          if (val === null || isNaN(val)) return null;
          return { x: xScale(i), y: yScale(val), val, isProj: d.isProjection };
        }).filter(p => p !== null);

        if (points.length === 0) return null;

        const histPoints = points.filter(p => !p.isProj);
        const projPoints = points.filter(p => p.isProj || points[points.indexOf(p) - 1]?.isProj === false);

        const histPath = histPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
        const projPath = projPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

        return (
          <g key={com}>
            {histPath && <path d={histPath} fill="none" stroke={strokeColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
            {projPath && <path d={projPath} fill="none" stroke={strokeColor} strokeWidth="2.5" strokeDasharray="5 5" opacity="0.8" />}

            {points.map((p, i) => (
              <g key={i}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={p.isProj ? "4" : "4.5"}
                  fill={p.isProj ? "#ffffff" : strokeColor}
                  stroke={strokeColor}
                  strokeWidth="2.5"
                />
                <text
                  x={p.x}
                  y={p.y - 8}
                  textAnchor="middle"
                  fontSize="8.5"
                  fontWeight="900"
                  fill={p.isProj ? '#b45309' : '#1e293b'}
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

import React from 'react';
import * as turf from '@turf/turf';
import { STATUS_CONFIG } from '../../config/komoditas';
import { hitungProduksi, hitungStatusOtomatis } from '../../utils/agronomi';

function Dashboard({
  filteredSawah,
  sawahStatus,
  kolamBudidaya,
  budidayaList,
  nelayanTangkap,
  tangkapList,
  onOpenPanel,
  onClosePanel,
}) {
  // Hitung total luas
  const totalM2 = filteredSawah.reduce((s, f) => s + turf.area(f), 0);
  const totalSawahHa = (totalM2 / 10000).toFixed(2);

  // Breakdown per status
  const breakdown = {};
  filteredSawah.forEach(f => {
    const sd = sawahStatus[f._id] || {};
    let sk = 'belum';
    if (sd.status === 'otomatis' && sd.tanggalTanam) {
      sk = hitungStatusOtomatis(sd.tanggalTanam);
    } else if (sd.status && sd.status !== 'otomatis') {
      sk = sd.status;
    }
    breakdown[sk] = (breakdown[sk] || 0) + turf.area(f);
  });

  const siapPanenHa = ((breakdown.siap_panen || 0) / 10000).toFixed(2);
  const luasTanamHa = (
    ((breakdown.baru_tanam || 0) + (breakdown.tumbuh || 0) + (breakdown.siap_panen || 0)) / 10000
  ).toFixed(2);

  // Total produksi GKG
  const totalGKG = filteredSawah.reduce((sum, f) => {
    const sd = sawahStatus[f._id] || {};
    if (!sd.hasilUbinan) return sum;
    const prod = hitungProduksi(turf.area(f), sd.hasilUbinan);
    return sum + (prod?.gkg || 0);
  }, 0);
  const gkgStr = totalGKG >= 1000
    ? `${(totalGKG / 1000).toFixed(1)}K Ton`
    : `${totalGKG.toFixed(1)} Ton`;

  // Perikanan
  const semuaKolam = [...(kolamBudidaya || []), ...(budidayaList || [])];
  const jumlahKolam = semuaKolam.length;
  const luasKolamTotal = semuaKolam.reduce((s, k) => s + parseFloat(k._luas || k.luas_m2 || 0), 0);

  const semuaNelayan = [...(nelayanTangkap || []), ...(tangkapList || [])];
  const jumlahPangkalan = semuaNelayan.length;
  const jumlahNelayan = semuaNelayan.reduce((s, n) => s + parseInt(n._nelayan || n.jumlah_nelayan || n.no_hp || 1, 10), 0);

  // 4 KPI Cards
  const kpiCards = [
    { icon: '🌱', val: `${luasTanamHa}`, lbl: 'Ha Luas Tanam', view: 'rekap_luas' },
    { icon: '🌾', val: totalGKG > 0 ? gkgStr : '-', lbl: 'Produksi GKG', view: 'rekap_produksi' },
    {
      icon: '🐟', val: jumlahKolam > 0 ? `${jumlahKolam} Lokasi` : '-',
      lbl: `Budidaya${luasKolamTotal > 0 ? ' ' + Math.round(luasKolamTotal) + ' m²' : ''}`,
      view: 'perikanan_budidaya',
    },
    {
      icon: '⛵', val: jumlahPangkalan > 0 ? `${jumlahPangkalan} Pangkalan` : '-',
      lbl: `${jumlahNelayan > 0 ? jumlahNelayan + ' Orang' : 'Nelayan Tangkap'}`,
      view: 'perikanan_tangkap',
    },
  ];

  // Menu cards
  const menuCards = [
    { icon: '⚙️', label: 'Update Data IKP', view: 'ikpg_admin' },
    { icon: '📋', label: 'Rekap Luas Tanam', view: 'rekap_luas' },
    { icon: '🏢', label: 'Rekap Produksi', view: 'rekap_produksi' },
    { icon: '🗺️', label: 'Peta Poligon', view: 'gambar_poligon' },
    { icon: '🌾', label: 'Status Sawah', view: 'status_sawah' },
    { icon: '🌶️', label: 'Hortikultura', view: 'hortikultura' },
    { icon: '🌿', label: 'Palawija', view: 'palawija' },
    { icon: '👨‍🌾', label: 'Poktan & KWT', view: 'poktan_kwt' },
    { icon: '⚠️', label: 'Warning OPT', view: 'warning' },
    { icon: '🐠', label: 'Perikanan Budidaya', view: 'perikanan_budidaya' },
    { icon: '⛵', label: 'Perikanan Tangkap', view: 'perikanan_tangkap' },
  ];

  // Ringkasan komoditas
  const statusCfg = {
    baru_tanam: { label: 'Baru Tanam', icon: '🌱', color: '#4CAF50', bg: '#E8F5E9' },
    tumbuh: { label: 'Sedang Tumbuh', icon: '🌿', color: '#2E7D32', bg: '#C8E6C9' },
    siap_panen: { label: 'Siap Panen', icon: '🌾', color: '#F9A825', bg: '#FFF8E1' },
    bera: { label: 'Bera / Kosong', icon: '⬜', color: '#9E9E9E', bg: '#F5F5F5' },
    belum: { label: 'Belum Ditentukan', icon: '❓', color: '#BDBDBD', bg: '#FAFAFA' },
  };

  const komodList = Object.entries(statusCfg)
    .map(([k, c]) => {
      const ha = ((breakdown[k] || 0) / 10000).toFixed(2);
      const ct = filteredSawah.filter(f => {
        const sd = sawahStatus[f._id] || {};
        let sk = 'belum';
        if (sd.status === 'otomatis' && sd.tanggalTanam) sk = hitungStatusOtomatis(sd.tanggalTanam);
        else if (sd.status && sd.status !== 'otomatis') sk = sd.status;
        return sk === k;
      }).length;
      return { key: k, ...c, ha, ct };
    })
    .filter(x => parseFloat(x.ha) > 0);

  return (
    <div style={{ padding: 12 }}>
      {/* Hero Card */}
      <div style={{
        background: 'linear-gradient(135deg, #166534, #22c55e)',
        color: '#fff', borderRadius: 14, padding: '16px 18px', marginBottom: 12,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      }}>
        <div style={{ fontSize: 10, opacity: 0.85, textTransform: 'uppercase', letterSpacing: 1 }}>🌾 Padi Sawah</div>
        <div style={{ fontSize: 28, fontWeight: 800, marginTop: 2 }}>{totalSawahHa} Ha</div>
        <div style={{ fontSize: 11, opacity: 0.85, marginTop: 4, display: 'flex', gap: 12 }}>
          <span>📍 {filteredSawah.length} petak</span>
          <span>🌾 Siap panen: {siapPanenHa} Ha</span>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
        {kpiCards.map((k, i) => (
          <div key={i} onClick={() => onOpenPanel(k.view)} style={{
            background: '#fff', borderRadius: 10, padding: '10px 12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)', cursor: 'pointer', textAlign: 'center',
            border: '1px solid #f0f0f0',
          }}>
            <div style={{ fontSize: 18 }}>{k.icon}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#166534', marginTop: 2 }}>{k.val}</div>
            <div style={{ fontSize: 9, color: '#888', marginTop: 2 }}>{k.lbl}</div>
          </div>
        ))}
      </div>

      {/* Menu Utama */}
      <div style={{ fontSize: 10, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
        Menu Utama
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 16 }}>
        {menuCards.map(c => (
          <button key={c.view} onClick={() => onOpenPanel(c.view)} style={{
            background: '#fff', border: '1px solid #f0f0f0', borderRadius: 10,
            padding: '10px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 11, fontWeight: 600, color: '#333', boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          }}>
            <span style={{ fontSize: 16 }}>{c.icon}</span>
            <span>{c.label}</span>
          </button>
        ))}
      </div>

      {/* Lihat Peta */}
      <div onClick={onClosePanel} style={{
        background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 10,
        padding: '12px 14px', marginBottom: 16, cursor: 'pointer',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 24 }}>🗺️</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#166534' }}>Lihat Peta</div>
            <div style={{ fontSize: 10, color: '#16a34a' }}>Buka peta interaktif wilayah Cilegon</div>
          </div>
        </div>
        <span style={{ fontSize: 20, color: '#16a34a' }}>›</span>
      </div>

      {/* Ringkasan Komoditas */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: 1 }}>
          Ringkasan Komoditas
        </div>
        <button onClick={() => onOpenPanel('status_sawah')} style={{
          background: 'none', border: 'none', color: '#16a34a', fontSize: 10, fontWeight: 600, cursor: 'pointer',
        }}>
          Lihat semua ›
        </button>
      </div>

      {komodList.length > 0 ? komodList.map(x => (
        <div key={x.key} onClick={() => onOpenPanel('status_sawah')} style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
          background: '#fff', borderRadius: 8, marginBottom: 6, cursor: 'pointer',
          border: '1px solid #f0f0f0',
        }}>
          <span style={{ fontSize: 18 }}>{x.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#333' }}>Padi — {x.label}</div>
            <div style={{ fontSize: 10, color: '#888' }}>{x.ha} Ha · {x.ct} petak</div>
          </div>
          <span style={{
            background: x.bg, color: x.color, fontSize: 10, fontWeight: 700,
            padding: '2px 8px', borderRadius: 10,
          }}>
            {x.ct}
          </span>
          <span style={{ color: '#ccc' }}>›</span>
        </div>
      )) : (
        <div style={{ textAlign: 'center', padding: 16, color: '#999', fontSize: 12 }}>
          Belum ada data sawah. Import file KMZ terlebih dahulu.
        </div>
      )}
    </div>
  );
}

export default Dashboard;
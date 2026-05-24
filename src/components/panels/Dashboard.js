import React, { useState, useMemo } from 'react';
import * as turf from '@turf/turf';
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
  const [bulanIdxB, setBulanIdxB] = useState(0);
  const [bulanIdxT, setBulanIdxT] = useState(0);
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
  const jumlahNelayan = semuaNelayan.reduce((s, n) => s + parseInt(n._nelayan || n.jumlah_nelayan || n.no_hp || 0, 10), 0);
  const totalKapalMotor = semuaNelayan.reduce((s,r)=>{ try{ return s + parseInt(JSON.parse(r.perahu||'{}')['Kapal motor']||0,10); }catch(e){return s;} }, 0);
  const totalPerahuMotor = semuaNelayan.reduce((s,r)=>{ try{ return s + parseInt(JSON.parse(r.perahu||'{}')['Perahu motor tempel']||0,10); }catch(e){return s;} }, 0);
  const totalTanpaMotor = semuaNelayan.reduce((s,r)=>{ try{ return s + parseInt(JSON.parse(r.perahu||'{}')['Perahu tanpa motor']||0,10); }catch(e){return s;} }, 0);

  // Produksi Budidaya
  const prodB = useMemo(() => {
    const map = {};
    (budidayaList||[]).forEach(r=>{
      try{
        JSON.parse(r.catatan||'[]').forEach(p=>{
          const d=new Date(p.tgl);
          const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
          const lb=d.toLocaleDateString('id-ID',{month:'long',year:'numeric'});
          if(!map[k]) map[k]={totalKg:0, totalEkor:0, label:lb};
          if(p.type === 'pembenihan') map[k].totalEkor += parseFloat(p.ekor||0);
          else map[k].totalKg += parseFloat(p.kg||0);
        });
      }catch(e){}
    });
    return Object.entries(map).sort((a,b)=>b[0].localeCompare(a[0])).map(([k,v])=>({key:k,...v}));
  },[budidayaList]);
  const curB = prodB[bulanIdxB]||null;
  const totTahunB_Kg = prodB.reduce((s,b)=>s+b.totalKg,0);
  const totTahunB_Ek = prodB.reduce((s,b)=>s+b.totalEkor,0);

  // Produksi Tangkap
  const prodT = useMemo(() => {
    const map = {};
    (tangkapList||[]).forEach(r=>{
      try{
        JSON.parse(r.catatan||'[]').forEach(p=>{
          const d=new Date(p.tgl);
          const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
          const lb=d.toLocaleDateString('id-ID',{month:'long',year:'numeric'});
          if(!map[k]) map[k]={total:0, label:lb};
          map[k].total += parseFloat(p.kg||0);
        });
      }catch(e){}
    });
    return Object.entries(map).sort((a,b)=>b[0].localeCompare(a[0])).map(([k,v])=>({key:k,...v}));
  },[tangkapList]);
  const curT = prodT[bulanIdxT]||null;
  const totTahunT = prodT.reduce((s,b)=>s+b.total,0);

  // Menu cards
  const menuCards = [
    { icon: '⚙️', label: 'Update Data IKP', view: 'ikpg_admin' },
    { icon: '📋', label: 'Rekap Luas Tanam', view: 'rekap_luas' },
    { icon: '🏢', label: 'Rekap Produksi', view: 'rekap_produksi' },
    { icon: '🗺️', label: 'Peta Poligon', view: 'gambar_poligon' },
    { icon: '🌾', label: 'Rekap Luas Sawah', view: 'status_sawah' },
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
      {/* Hero Card Padi Sawah */}
      <div onClick={() => onOpenPanel('status_sawah')} style={{
        background: 'linear-gradient(135deg, #166534, #22c55e)', cursor: 'pointer',
        color: '#fff', borderRadius: 14, padding: '16px 18px', marginBottom: 12,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div>
          <div style={{ fontSize: 10, opacity: 0.85, textTransform: 'uppercase', letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
            🌾 Padi Sawah
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 2 }}>{totalSawahHa} Ha</div>
          <div style={{ fontSize: 11, opacity: 0.85, marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ whiteSpace: 'nowrap' }}>📍 {filteredSawah.length} petak poligon</span>
            <span style={{ whiteSpace: 'nowrap' }}>🌾 Siap panen: {siapPanenHa} Ha</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
          <div style={{ 
            background: 'linear-gradient(to bottom, #65a30d, #4d7c0f)', color: '#fff', 
            borderRadius: 6, padding: '5px 14px', fontSize: 12, fontWeight: 700, 
            border: '1px solid #84cc16', boxShadow: '0 3px 4px rgba(0,0,0,0.2)', 
            whiteSpace: 'nowrap', textShadow: '0 1px 2px rgba(0,0,0,0.4)' 
          }}>
            Luas tanam {luasTanamHa} Ha
          </div>
          <div style={{ 
            background: 'linear-gradient(to bottom, #65a30d, #4d7c0f)', color: '#fff', 
            borderRadius: 6, padding: '5px 14px', fontSize: 12, fontWeight: 700, 
            border: '1px solid #84cc16', boxShadow: '0 3px 4px rgba(0,0,0,0.2)', 
            whiteSpace: 'nowrap', textShadow: '0 1px 2px rgba(0,0,0,0.4)' 
          }}>
            Produksi GKG {totalGKG > 0 ? gkgStr : '-'}
          </div>
        </div>
      </div>

      {/* Hero Card Perikanan Budidaya */}
      <div onClick={() => onOpenPanel('perikanan_budidaya')} style={{
        background: 'linear-gradient(135deg, #0077b6, #023e8a)', cursor: 'pointer',
        color: '#fff', borderRadius: 14, padding: '16px 18px', marginBottom: 12,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'
      }}>
        <div>
          <div style={{ fontSize: 10, opacity: 0.8, textTransform: 'uppercase', letterSpacing: 1 }}>Perikanan Budidaya · Kota Cilegon</div>
          <div style={{ fontSize: 22, fontWeight: 800, marginTop: 2 }}>{jumlahKolam} Unit</div>
          <div style={{ fontSize: 11, opacity: 0.85, marginTop: 4 }}>{luasKolamTotal.toLocaleString('id-ID')} m² luas · {(budidayaList||[]).filter(r=>r.status_kolam==='Aktif').length} aktif</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, opacity: 0.8 }}>PRODUKSI IKAN {new Date().getFullYear()}</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#ffd166', whiteSpace: 'nowrap' }}>
            {curB ? `${curB.label.toUpperCase()} : ${(curB.totalKg/1000).toFixed(1)} Ton | ${curB.totalEkor.toLocaleString('id-ID')} Ekor` : 'BELUM ADA DATA'}
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, marginTop: 2, whiteSpace: 'nowrap' }}>
            TOTAL : {(totTahunB_Kg/1000).toFixed(1)} Ton | {totTahunB_Ek.toLocaleString('id-ID')} Ekor
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 6, justifyContent: 'flex-end' }}>
            <button onClick={(e)=>{ e.stopPropagation(); setBulanIdxB(p=>Math.min(p+1,prodB.length-1)); }} style={{background:'rgba(255,255,255,0.2)',border:'none',borderRadius:4,color:'#fff',padding:'2px 8px',fontSize:10,cursor:'pointer'}}>◀ Prev</button>
            <button onClick={(e)=>{ e.stopPropagation(); setBulanIdxB(p=>Math.max(p-1,0)); }} style={{background:'rgba(255,255,255,0.2)',border:'none',borderRadius:4,color:'#fff',padding:'2px 8px',fontSize:10,cursor:'pointer'}}>Next ▶</button>
          </div>
        </div>
      </div>

      {/* Hero Card Perikanan Tangkap */}
      <div onClick={() => onOpenPanel('perikanan_tangkap')} style={{
        background: 'linear-gradient(135deg, #00b4d8, #0077b6)', cursor: 'pointer',
        color: '#fff', borderRadius: 14, padding: '16px 18px', marginBottom: 16,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'
      }}>
        <div>
          <div style={{ fontSize: 10, opacity: 0.8, textTransform: 'uppercase', letterSpacing: 1 }}>Perikanan Tangkap · Kota Cilegon</div>
          <div style={{ fontSize: 22, fontWeight: 800, marginTop: 2 }}>{jumlahPangkalan} Pangkalan</div>
          <div style={{ fontSize: 11, opacity: 0.85, marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ whiteSpace: 'nowrap' }}>{jumlahNelayan} Nelayan</span>
            <span style={{ whiteSpace: 'nowrap' }}>{totalKapalMotor} unit Kapal Motor</span>
            <span style={{ whiteSpace: 'nowrap' }}>{totalPerahuMotor} unit Perahu Motor Tempel</span>
            <span style={{ whiteSpace: 'nowrap' }}>{totalTanpaMotor} unit Perahu Tanpa Motor</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, opacity: 0.8 }}>TANGKAPAN IKAN {new Date().getFullYear()}</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#ffd166', whiteSpace: 'nowrap' }}>
            {curT ? `${curT.label.toUpperCase()} : ${(curT.total/1000).toFixed(1)} Ton` : 'BELUM ADA DATA'}
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, marginTop: 2, whiteSpace: 'nowrap' }}>
            TOTAL : {(totTahunT/1000).toFixed(1)} Ton
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 6, justifyContent: 'flex-end' }}>
            <button onClick={(e)=>{ e.stopPropagation(); setBulanIdxT(p=>Math.min(p+1,prodT.length-1)); }} style={{background:'rgba(255,255,255,0.2)',border:'none',borderRadius:4,color:'#fff',padding:'2px 8px',fontSize:10,cursor:'pointer'}}>◀ Prev</button>
            <button onClick={(e)=>{ e.stopPropagation(); setBulanIdxT(p=>Math.max(p-1,0)); }} style={{background:'rgba(255,255,255,0.2)',border:'none',borderRadius:4,color:'#fff',padding:'2px 8px',fontSize:10,cursor:'pointer'}}>Next ▶</button>
          </div>
        </div>
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
import React, { useState, useMemo } from 'react';
import { JENIS_IKAN_BUDIDAYA } from '../../config/komoditas';
import { parseCoordinates } from '../../utils/parsers';

const JENIS_KOLAM = ['Kolam tanah','Kolam beton','Kolam terpal','Karamba','Lainnya'];
const S = (s) => ({ fontSize:11, ...s });

function PerikananBudidaya({ kolamBudidaya, budidayaList, showKolam, onToggleShow, user, mapRef, supabase, onRefresh, onPickLocation, onFlyToLocation }) {
  const [mode, setMode]             = useState(null); // 'add'|'edit'|'add_prod'
  const [editTarget, setEditTarget] = useState(null);
  const [prodTarget, setProdTarget] = useState(null);
  const [bulanIdx, setBulanIdx]     = useState(0);
  const [pendingPin, setPendingPin] = useState(null);
  const [gpsInput, setGpsInput]     = useState('');
  const [picking, setPicking]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [prodMode, setProdMode]     = useState('pembesaran');

  const initForm = { nama_pemilik:'', status_kolam:'Aktif', kolam_units:{}, ikan_units:{}, ikan_pembenihan_units:{}, catatan:'' };
  const [formB, setFormB] = useState(initForm);
  const [formP, setFormP] = useState({ tanggal:new Date().toISOString().slice(0,10), ikan_val:{} });

  /* ── Statistik ── */
  const totalUnit  = (budidayaList||[]).length + (kolamBudidaya||[]).length;
  const totalAktif = (budidayaList||[]).filter(r=>r.status_kolam==='Aktif').length;
  const totalLuas  = (budidayaList||[]).reduce((s,r)=>{ try{ return s+Object.values(JSON.parse(r.jenis_kolam||'{}')).reduce((a,v)=>a+parseFloat(v||0),0); }catch(e){ return s+parseFloat(r.luas_m2||0); } }, 0);

  /* ── Agregasi produksi SEMUA pembudidaya ── */
  const produksiBulanan = useMemo(() => {
    const bulanMap = {};
    (budidayaList||[]).forEach(r=>{
      try{
        JSON.parse(r.catatan||'[]').forEach(p=>{
          const d=new Date(p.tgl);
          const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
          const lb=d.toLocaleDateString('id-ID',{month:'long',year:'numeric'});
          if(!bulanMap[k]) bulanMap[k]={totalKg:0, totalEkor:0, ikanKg:{}, ikanEkor:{}, label:lb};
          if(p.type === 'pembenihan') {
            bulanMap[k].totalEkor += parseFloat(p.ekor||0);
            Object.entries(p.ikan||{}).forEach(([ik,v])=>{ bulanMap[k].ikanEkor[ik]=(bulanMap[k].ikanEkor[ik]||0)+parseFloat(v||0); });
          } else {
            bulanMap[k].totalKg += parseFloat(p.kg||0);
            Object.entries(p.ikan||{}).forEach(([ik,v])=>{ bulanMap[k].ikanKg[ik]=(bulanMap[k].ikanKg[ik]||0)+parseFloat(v||0); });
          }
        });
      }catch(e){}
    });
    return Object.entries(bulanMap).sort((a,b)=>b[0].localeCompare(a[0])).map(([k,v])=>({key:k,...v}));
  },[budidayaList]);

  const cur            = produksiBulanan[bulanIdx]||null;
  const totalTahunKg   = produksiBulanan.reduce((s,b)=>s+b.totalKg,0);
  const totalTahunEkor = produksiBulanan.reduce((s,b)=>s+b.totalEkor,0);

  const openEdit = (r) => {
    if (user && r.user_id && r.user_id !== user.id) {
      alert('Anda tidak memiliki izin untuk mengedit pembudidaya ini.');
      return;
    }
    let kolam_units={}, ikan_units={}, ikan_pembenihan_units={};
    try{ kolam_units=JSON.parse(r.jenis_kolam||'{}'); }catch(e){}
    (r.jenis_ikan||'').split(',').forEach(x=>{ if(x.trim()) ikan_units[x.trim()]=true; });
    (r.jenis_ikan_pembenihan||'').split(',').forEach(x=>{ if(x.trim()) ikan_pembenihan_units[x.trim()]=true; });
    setFormB({ nama_pemilik:r.nama_pemilik||'', status_kolam:r.status_kolam||'Aktif', kolam_units, ikan_units, ikan_pembenihan_units, catatan:r.catatan||'' });
    setPendingPin(r.lat&&r.lng?{lat:r.lat,lng:r.lng}:null);
    setEditTarget(r); setMode('edit');
    window.scrollTo(0,0);
  };

  /* ── Simpan pembudidaya ── */
  const saveBudidaya = async () => {
    if(!user) return alert('Login dulu.');
    if(!formB.nama_pemilik) return alert('Nama pemilik wajib diisi.');
    setSaving(true);
    const kolamStr    = JSON.stringify(formB.kolam_units);
    const totalLuasM2 = Object.values(formB.kolam_units).reduce((s,v)=>{ const num = parseFloat(v); return s + (isNaN(num) ? 0 : num); }, 0);
    const jenisIkan   = Object.keys(formB.ikan_units).filter(k=>formB.ikan_units[k]).join(',');
    const jenisIkanPembenihan = Object.keys(formB.ikan_pembenihan_units).filter(k=>formB.ikan_pembenihan_units[k]).join(',');
    const payload     = {
      nama_pemilik: formB.nama_pemilik, jenis_ikan: jenisIkan, jenis_ikan_pembenihan: jenisIkanPembenihan,
      luas_m2: totalLuasM2, jenis_kolam: kolamStr,
      status_kolam: formB.status_kolam,
      lat: pendingPin?.lat || 0, lng: pendingPin?.lng || 0,
    };
    let error;
    if(editTarget) {
      if (editTarget.user_id && editTarget.user_id !== user.id) {
        setSaving(false);
        return alert('Anda tidak memiliki izin untuk mengubah data ini.');
      }
      if (!editTarget.user_id) {
        payload.user_id = user.id;
      }
      ({ error } = await supabase.from('kolam_budidaya').update(payload).eq('id', editTarget.id));
    } else {
      payload.user_id = user.id;
      ({ error } = await supabase.from('kolam_budidaya').insert(payload));
    }
    setSaving(false);
    if(error) { alert('Gagal simpan: ' + error.message); return; }
    setMode(null); setEditTarget(null); setPendingPin(null); setFormB(initForm); setGpsInput('');
    onRefresh && onRefresh();
  };

  /* ── Simpan produksi ke pembudidaya tertentu ── */
  const saveProduksi = async () => {
    if(!user) return alert('Login dulu.');
    if(!prodTarget) return alert('Pilih pembudidaya terlebih dahulu.');
    if (prodTarget.user_id && prodTarget.user_id !== user.id) return alert('Anda tidak memiliki izin untuk menyimpan produksi pembudidaya ini.');
    const total=Object.values(formP.ikan_val).reduce((s,v)=>s+parseFloat(v||0),0);
    if(total<=0) return alert('Isi minimal satu jenis ikan.');
    setSaving(true);
    // Gunakan catatan sebelumnya (tanpa menimpa kolom data lain)
    const {data:row}=await supabase.from('kolam_budidaya').select('catatan').eq('id',prodTarget.id).single();
    const arr=[];
    try{ arr.push(...JSON.parse(row?.catatan||'[]')); }catch(e){}
    
    if(prodMode === 'pembenihan') {
      arr.push({tgl:formP.tanggal, type:'pembenihan', ekor:total, ikan:formP.ikan_val});
    } else {
      arr.push({tgl:formP.tanggal, type:'pembesaran', kg:total, ikan:formP.ikan_val});
    }

    const updatePayload = { catatan: JSON.stringify(arr) };
    if (!prodTarget.user_id) {
      updatePayload.user_id = user.id;
    }
    await supabase.from('kolam_budidaya').update(updatePayload).eq('id',prodTarget.id);
    setSaving(false); setMode(null); setProdTarget(null);
    setFormP({tanggal:new Date().toISOString().slice(0,10), ikan_val:{}});
    onRefresh&&onRefresh();
  };

  const deleteBudidaya = async (r) => {
    if(!user) return alert('Login dulu.');
    if(r.user_id && r.user_id !== user.id) return alert('Anda tidak memiliki izin untuk menghapus data ini.');
    if(!window.confirm('Tindakan ini tidak dapat dibatalkan (undo). Apakah Anda yakin ingin menghapus data pembudidaya ini beserta seluruh catatan riwayat kolamnya secara permanen?')) return;
    await supabase.from('kolam_budidaya').delete().eq('id',r.id);
    setMode(null); setEditTarget(null); setPendingPin(null); setFormB(initForm);
    onRefresh&&onRefresh();
  };

  const box = {background:'#fff',border:'1px solid #e5e7eb',borderRadius:10,padding:'12px 14px',marginBottom:10};
  const tag = (txt,c='#6b7280') => <div style={{fontSize:10,fontWeight:700,color:c,textTransform:'uppercase',letterSpacing:.5,marginBottom:6}}>{txt}</div>;

  return (
    <div style={{padding:12}}>
      {picking && (
        <div className="sp-pick-indicator">
          📍 Ketuk peta untuk menentukan lokasi kolam
          <button onClick={()=>{setPicking(false);setPendingPin(null);}} style={{background:'rgba(255,255,255,0.2)',border:'none',borderRadius:6,color:'#fff',padding:'2px 8px',cursor:'pointer',fontSize:12}}>Batal</button>
        </div>
      )}

      {/* ── RINGKASAN ── */}
      <div style={{background:'linear-gradient(135deg,#0096c7,#023e8a)',color:'#fff',borderRadius:14,padding:16,marginBottom:12}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
          <div>
            <div style={S({opacity:.8,textTransform:'uppercase',letterSpacing:1})}>Perikanan Budidaya · Kota Cilegon</div>
            <div style={{fontSize:22,fontWeight:800,marginTop:2}}>{totalUnit} Unit</div>
            <div style={S({opacity:.85,marginTop:4})}>{totalLuas.toLocaleString('id-ID')} m² luas · {totalAktif} aktif</div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={S({opacity:.8})}>PRODUKSI IKAN {new Date().getFullYear()}</div>
            <div style={{fontSize:11,fontWeight:700,color:'#ffd166',whiteSpace:'nowrap'}}>
              {cur?`${cur.label.toUpperCase()} : ${(cur.totalKg/1000).toFixed(1)} Ton | ${cur.totalEkor.toLocaleString('id-ID')} Ekor`:'BELUM ADA DATA'}
            </div>
            <div style={{fontSize:10,fontWeight:700,marginTop:2,whiteSpace:'nowrap'}}>
              TOTAL : {(totalTahunKg/1000).toFixed(1)} Ton | {totalTahunEkor.toLocaleString('id-ID')} Ekor
            </div>
            <div style={{display:'flex',gap:6,marginTop:6,justifyContent:'flex-end'}}>
              <button onClick={()=>setBulanIdx(p=>Math.min(p+1,produksiBulanan.length-1))} style={{background:'rgba(255,255,255,0.2)',border:'none',borderRadius:4,color:'#fff',padding:'2px 8px',fontSize:10,cursor:'pointer'}}>◀ Prev</button>
              <button onClick={()=>setBulanIdx(p=>Math.max(p-1,0))} style={{background:'rgba(255,255,255,0.2)',border:'none',borderRadius:4,color:'#fff',padding:'2px 8px',fontSize:10,cursor:'pointer'}}>Next ▶</button>
            </div>
          </div>
        </div>
      </div>

      {/* ── TOMBOL AKSI ── */}
      {user && (
        <div style={{display:'flex',gap:8,marginBottom:12}}>
          <button className="sp-btn sp-btn-primary" style={{flex:1}}
            onClick={()=>{ setMode(mode==='add'?null:'add'); setEditTarget(null); setFormB(initForm); setPendingPin(null); setGpsInput(''); }}>
            ➕ {mode==='add'?'Tutup':'Tambah Pembudidaya'}
          </button>
          <button className="sp-btn" style={{flex:1,background:'#e76f51',color:'#fff'}}
            onClick={()=>{ setMode(mode==='add_prod'?null:'add_prod'); setProdTarget(null); setFormP({tanggal:new Date().toISOString().slice(0,10), ikan_val:{}}); }}>
            🐟 {mode==='add_prod'?'Tutup':'Input Produksi'}
          </button>
        </div>
      )}

      {/* ── FORM TAMBAH/EDIT PEMBUDIDAYA ── */}
      {(mode==='add'||mode==='edit') && (
        <div style={box}>
          {tag(mode==='edit'?`Edit: ${editTarget?.nama_pemilik}`:'Tambah Pembudidaya Ikan','#0096c7')}
          <input className="sp-input" placeholder="Nama pemilik *" value={formB.nama_pemilik}
            onChange={e=>setFormB(p=>({...p,nama_pemilik:e.target.value}))} />
          <select className="sp-select" value={formB.status_kolam} style={{marginTop:6}}
            onChange={e=>setFormB(p=>({...p,status_kolam:e.target.value}))}>
            <option value="Aktif">Aktif</option>
            <option value="Tidak Aktif">Tidak Aktif</option>
            <option value="Dalam Perbaikan">Dalam Perbaikan</option>
          </select>

          <div style={{border:'1px solid #e5e7eb',borderRadius:8,padding:'8px 10px',marginTop:8,background:'#fafafa'}}>
            {tag('Jenis Kolam & Luas (m²)')}
            {JENIS_KOLAM.map(jk=>{
              const checked=formB.kolam_units[jk]!==undefined;
              return <div key={jk} style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                <input type="checkbox" checked={checked} onChange={e=>{ const u={...formB.kolam_units}; e.target.checked?u[jk]='':delete u[jk]; setFormB(p=>({...p,kolam_units:u})); }} />
                <span style={S({flex:1})}>{jk}</span>
                {checked && <><input type="number" min="0" placeholder="0" style={{width:64,...S({padding:'2px 4px',border:'1px solid #d1d5db',borderRadius:4})}}
                  value={formB.kolam_units[jk]} onChange={e=>{ const u={...formB.kolam_units}; u[jk]=e.target.value; setFormB(p=>({...p,kolam_units:u})); }} />
                <span style={S({color:'#999'})}>m²</span></>}
              </div>;
            })}
          </div>

          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:8}}>
            <div style={{border:'1px solid #e5e7eb',borderRadius:8,padding:'8px 10px',background:'#fafafa'}}>
              {tag('Jenis Ikan Budidaya')}
              {JENIS_IKAN_BUDIDAYA.map(ji=>(
                <label key={ji} style={{display:'flex',alignItems:'center',gap:8,marginBottom:4,...S({cursor:'pointer'})}}>
                  <input type="checkbox" checked={!!formB.ikan_units[ji]}
                    onChange={e=>{ const u={...formB.ikan_units}; e.target.checked?u[ji]=true:delete u[ji]; setFormB(p=>({...p,ikan_units:u})); }} />
                  {ji}
                </label>
              ))}
            </div>
            <div style={{border:'1px solid #e5e7eb',borderRadius:8,padding:'8px 10px',background:'#fafafa'}}>
              {tag('Jenis Ikan Pembenihan')}
              {JENIS_IKAN_BUDIDAYA.map(ji=>(
                <label key={`pem-${ji}`} style={{display:'flex',alignItems:'center',gap:8,marginBottom:4,...S({cursor:'pointer'})}}>
                  <input type="checkbox" checked={!!formB.ikan_pembenihan_units[ji]}
                    onChange={e=>{ const u={...formB.ikan_pembenihan_units}; e.target.checked?u[ji]=true:delete u[ji]; setFormB(p=>({...p,ikan_pembenihan_units:u})); }} />
                  {ji}
                </label>
              ))}
            </div>
          </div>

          <button className="sp-btn sp-btn-secondary" style={{width:'100%',marginTop:8}}
            onClick={()=> onPickLocation && onPickLocation((latlng) => setPendingPin(latlng))}>
            📍 {pendingPin?`✅ ${pendingPin.lat.toFixed(5)}, ${pendingPin.lng.toFixed(5)}`:'Pilih Lokasi di Peta'}
          </button>
          <div style={{display:'flex', gap:6, marginTop:8}}>
            <input className="sp-input" placeholder="Atau masukkan koordinat GPS" value={gpsInput} onChange={e=>setGpsInput(e.target.value)} />
            <button className="sp-btn" style={{background:'#e5e7eb', color:'#374151', padding:'0 12px'}} onClick={() => {
              const coords = parseCoordinates(gpsInput);
              if(coords) {
                setPendingPin(coords);
                onFlyToLocation && onFlyToLocation(coords.lat, coords.lng);
              } else {
                alert('Format koordinat tidak valid.');
              }
            }}>Cari</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
            <button className="sp-btn" style={{ background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb' }}
              onClick={() => { setMode(null); setEditTarget(null); setPendingPin(null); setFormB(initForm); setGpsInput(''); }}>Batal</button>
            <button className="sp-btn sp-btn-primary" style={{background:'#0096c7'}} disabled={saving} onClick={saveBudidaya}>
              💾 {saving ? 'Menyimpan...' : editTarget ? 'Update' : 'Simpan'}
            </button>
          </div>
          {mode==='edit' && (
            <button className="sp-btn sp-btn-danger" style={{width:'100%',marginTop:8}} onClick={()=>deleteBudidaya(editTarget)}>
              🗑️ Hapus Data Ini
            </button>
          )}
        </div>
      )}

      {/* ── FORM INPUT PRODUKSI ── */}
      {mode==='add_prod' && (
        <div style={box}>
          {tag('Input Produksi Ikan Budidaya','#e76f51')}
          <select className="sp-select" value={prodTarget?.id||''} onChange={e=>{ const r=(budidayaList||[]).find(x=>String(x.id)===e.target.value); setProdTarget(r||null); }}>
            <option value="">-- Pilih Pembudidaya --</option>
            {(budidayaList||[]).filter(r => user ? (!r.user_id || r.user_id === user.id) : true).map(r=><option key={r.id} value={r.id}>{r.nama_pemilik}</option>)}
          </select>
          <input type="date" className="sp-input" style={{marginTop:8}} value={formP.tanggal}
            onChange={e=>setFormP(p=>({...p,tanggal:e.target.value}))} />
          
          <div style={{display:'flex', gap:8, marginTop:12}}>
            <button className="sp-btn" style={{flex:1, background: prodMode==='pembesaran'?'#60a5fa':'#e5e7eb', color:prodMode==='pembesaran'?'#fff':'#374151'}}
              onClick={()=>{ setProdMode('pembesaran'); setFormP(p=>({...p,ikan_val:{}})); }}>
              Pembesaran ikan (Kg)
            </button>
            <button className="sp-btn" style={{flex:1, background: prodMode==='pembenihan'?'#60a5fa':'#e5e7eb', color:prodMode==='pembenihan'?'#fff':'#374151'}}
              onClick={()=>{ setProdMode('pembenihan'); setFormP(p=>({...p,ikan_val:{}})); }}>
              Pembenihan ikan (ekor)
            </button>
          </div>

          <div style={{border:'1px solid #e5e7eb',borderRadius:8,padding:'8px 10px',marginTop:8,background:'#fafafa'}}>
            {prodMode==='pembesaran' ? tag('Jenis Ikan (kg)') : tag('Jenis Ikan (ekor)')}
            {(prodTarget ? (prodMode==='pembenihan' ? prodTarget.jenis_ikan_pembenihan||'' : prodTarget.jenis_ikan||'').split(',').filter(Boolean) : JENIS_IKAN_BUDIDAYA).map(ikan=>(
              <div key={ikan} style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                <span style={S({flex:1})}>{ikan.trim()}</span>
                <input type="number" min="0" placeholder="0" style={{width:64,...S({padding:'2px 6px',border:'1px solid #d1d5db',borderRadius:4})}}
                  value={formP.ikan_val[ikan.trim()]||''} onChange={e=>{ const ik={...formP.ikan_val}; ik[ikan.trim()]=e.target.value; setFormP(p=>({...p,ikan_val:ik})); }} />
                <span style={S({color:'#999',width:30})}>{prodMode==='pembesaran' ? 'kg' : 'ekor'}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
            <button className="sp-btn" style={{ background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb' }}
              onClick={() => { setMode(null); setProdTarget(null); setFormP({tanggal:new Date().toISOString().slice(0,10), ikan_val:{}}); }}>Batal</button>
            <button className="sp-btn sp-btn-primary" style={{background:'#e76f51'}} disabled={saving} onClick={saveProduksi}>
              💾 {saving?'Menyimpan...':'SIMPAN PRODUKSI'}
            </button>
          </div>
        </div>
      )}

      {/* ── DAFTAR PEMBUDIDAYA — with edit button ── */}
      <div style={box}>
        <div className="sp-info-box__title">📋 Data Pembudidaya ({(budidayaList||[]).length})</div>
        {!(budidayaList||[]).length ? (
          <p style={{color:'#999',fontSize:12,textAlign:'center'}}>Belum ada data.</p>
        ) : (budidayaList||[]).map(r=>{
          let kolamInfo='';
          try{ const k=JSON.parse(r.jenis_kolam||'{}'); kolamInfo=Object.entries(k).filter(([,v])=>parseFloat(v)>0).map(([jk,v])=>`${jk}:${v}m²`).join(', '); }catch(e){ kolamInfo=r.luas_m2?`${r.luas_m2}m²`:''; }
          let prodTotal=0;
          try{ JSON.parse(r.catatan||'[]').forEach(p=>prodTotal+=parseFloat(p.kg||0)); }catch(e){}
          return (
            <div key={r.id} style={{background:'#f9fafb',borderLeft:'3px solid #0096c7',borderRadius:8,padding:'9px 10px',marginBottom:8}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                <div style={{flex:1,cursor:'pointer'}} onClick={()=>r.lat&&r.lng&&mapRef?.current?.flyTo([r.lat,r.lng],17,{duration:1})}>
                  <div style={{fontWeight:700,fontSize:12}}>🐟 {r.nama_pemilik||'Tanpa Nama'}</div>
                  <div style={S({color:'#888',marginTop:2})}>
                    🐠 Budidaya: {r.jenis_ikan||'-'}
                    {r.jenis_ikan_pembenihan ? ` · 🌱 Pembenihan: ${r.jenis_ikan_pembenihan}` : ''} 
                    <br/>📐 {kolamInfo||'-'} · {r.status_kolam||'-'}
                  </div>
                  {prodTotal>0 && <div style={S({color:'#0096c7',marginTop:2})}>📦 Produksi: {(prodTotal/1000).toFixed(2)} ton</div>}
                  {r.lat&&r.lng&&<div style={{fontSize:9,color:'#0096c7',marginTop:2}}>📍 Klik untuk lihat di peta</div>}
                </div>
                {user && (!r.user_id || r.user_id === user.id) && (
                  <button onClick={()=>openEdit(r)} style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:6,padding:'3px 8px',fontSize:10,cursor:'pointer',color:'#1d4ed8',fontWeight:600,flexShrink:0,marginLeft:8}}>✏️ Edit</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Riwayat Produksi Bulanan ── */}
      {cur && (
        <div style={box}>
          <div className="sp-info-box__title">📊 {cur.label}</div>
          {cur.totalKg > 0 && (
            <div style={{marginBottom:10}}>
              <div style={S({color:'#e76f51',fontWeight:'bold'})}>Pembesaran ({(cur.totalKg/1000).toFixed(2)} Ton)</div>
              {Object.entries(cur.ikanKg).sort((a,b)=>b[1]-a[1]).map(([ik,kg])=>(
                <div key={ik} style={{display:'flex',justifyContent:'space-between',padding:'2px 0',...S({})}}>
                  <span>{ik}</span><span style={{fontWeight:700,color:'#0096c7'}}>{kg.toLocaleString('id-ID')} kg</span>
                </div>
              ))}
            </div>
          )}
          {cur.totalEkor > 0 && (
            <div>
              <div style={S({color:'#2a9d8f',fontWeight:'bold'})}>Pembenihan ({cur.totalEkor.toLocaleString('id-ID')} Ekor)</div>
              {Object.entries(cur.ikanEkor).sort((a,b)=>b[1]-a[1]).map(([ik,v])=>(
                <div key={ik} style={{display:'flex',justifyContent:'space-between',padding:'2px 0',...S({})}}>
                  <span>{ik}</span><span style={{fontWeight:700,color:'#0096c7'}}>{v.toLocaleString('id-ID')} ekor</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
export default PerikananBudidaya;
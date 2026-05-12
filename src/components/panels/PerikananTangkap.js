import React, { useState, useMemo } from 'react';
import { ALAT_TANGKAP, ARMADA_TYPES } from '../../config/komoditas';

const JENIS_IKAN = ['Kuwe','Beronang','Kerapu','Cumi','Kembung','Tenggiri','Tongkol','Lainnya'];
const S = (s) => ({ fontSize:11, ...s });

function PerikananTangkap({ nelayanTangkap, tangkapList, showNelayan, onToggleShow, user, mapRef, supabase, onRefresh }) {
  const [mode, setMode]                   = useState(null); // 'add_nelayan'|'edit_nelayan'|'add_prod'
  const [editTarget, setEditTarget]       = useState(null); // row yg di-edit
  const [prodTarget, setProdTarget]       = useState(null); // nelayan yg ditambah produksinya
  const [bulanIdx, setBulanIdx]           = useState(0);
  const [pendingPin, setPendingPin]       = useState(null);
  const [picking, setPicking]             = useState(false);
  const [saving, setSaving]               = useState(false);

  const initForm = { nama_kelompok:'', alat_units:{}, armada_units:{}, jenis_ikan:'', jumlah_anggota:'' };
  const [formN, setFormN] = useState(initForm);
  const [formP, setFormP] = useState({ tanggal: new Date().toISOString().slice(0,10), ikan_kg:{} });

  /* ── Aggregasi produksi dari SEMUA nelayan ── */
  const produksiBulanan = useMemo(() => {
    const bulanMap = {};
    (tangkapList || []).forEach(r => {
      try {
        JSON.parse(r.catatan || '[]').forEach(p => {
          const d  = new Date(p.tgl);
          const k  = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
          const lb = d.toLocaleDateString('id-ID',{month:'long',year:'numeric'});
          if (!bulanMap[k]) bulanMap[k] = { total:0, ikan:{}, label:lb };
          bulanMap[k].total += parseFloat(p.kg||0);
          Object.entries(p.ikan||{}).forEach(([ik,kg]) => {
            bulanMap[k].ikan[ik] = (bulanMap[k].ikan[ik]||0) + parseFloat(kg||0);
          });
        });
      } catch(e) {}
    });
    return Object.entries(bulanMap).sort((a,b)=>b[0].localeCompare(a[0])).map(([k,v])=>({key:k,...v}));
  }, [tangkapList]);

  const cur        = produksiBulanan[bulanIdx] || null;
  const totalTahun = produksiBulanan.reduce((s,b)=>s+b.total, 0);
  const totalOrg   = (tangkapList||[]).reduce((s,r)=>s+parseInt(r.no_hp||r.jumlah_anggota||0,10), 0);

  /* ── Open edit nelayan ── */
  const openEdit = (r) => {
    let alat_units = {}, armada_units = {};
    (r.alat_tangkap||'').split(',').forEach(x => { const [k,v]=x.split(':'); if(k) alat_units[k.trim()]=v||''; });
    try { armada_units = JSON.parse(r.perahu||'{}'); } catch(e) {}
    setFormN({ nama_kelompok:r.nama_nelayan||'', alat_units, armada_units, jenis_ikan:r.jenis_ikan||'', jumlah_anggota:r.no_hp||'' });
    setPendingPin(r.lat&&r.lng ? {lat:r.lat,lng:r.lng} : null);
    setEditTarget(r); setMode('edit_nelayan');
    window.scrollTo(0,0);
  };

  /* ── Simpan nelayan ── */
  const saveNelayan = async () => {
    if (!user) return alert('Login dulu.');
    if (!formN.nama_kelompok) return alert('Nama kelompok wajib diisi.');
    setSaving(true);
    const alatStr   = Object.entries(formN.alat_units).filter(([,v])=>parseInt(v)>0).map(([k,v])=>`${k}:${parseInt(v)}`).join(',')||'Lainnya';
    const armadaStr = JSON.stringify(formN.armada_units);
    const payload   = { nama_nelayan:formN.nama_kelompok, alat_tangkap:alatStr, perahu:armadaStr, jenis_ikan:formN.jenis_ikan, no_hp:formN.jumlah_anggota };
    if (pendingPin) { payload.lat=pendingPin.lat; payload.lng=pendingPin.lng; }
    if (editTarget) {
      await supabase.from('nelayan_tangkap').update(payload).eq('id',editTarget.id);
    } else {
      payload.lat = pendingPin?.lat||0; payload.lng = pendingPin?.lng||0;
      await supabase.from('nelayan_tangkap').insert(payload);
    }
    setSaving(false); setMode(null); setEditTarget(null); setPendingPin(null); setFormN(initForm);
    onRefresh && onRefresh();
  };

  /* ── Simpan produksi ke nelayan tertentu ── */
  const saveProduksi = async () => {
    if (!user) return alert('Login dulu.');
    if (!prodTarget) return alert('Pilih pangkalan nelayan terlebih dahulu.');
    const total = Object.values(formP.ikan_kg).reduce((s,v)=>s+parseFloat(v||0),0);
    if (total <= 0) return alert('Isi minimal satu jenis ikan.');
    setSaving(true);
    const arr = [];
    try { arr.push(...JSON.parse(prodTarget.catatan||'[]')); } catch(e){}
    arr.push({ tgl:formP.tanggal, kg:total, ikan:formP.ikan_kg });
    await supabase.from('nelayan_tangkap').update({ catatan:JSON.stringify(arr) }).eq('id',prodTarget.id);
    setSaving(false); setMode(null); setProdTarget(null);
    setFormP({ tanggal:new Date().toISOString().slice(0,10), ikan_kg:{} });
    onRefresh && onRefresh();
  };

  /* ── Hapus nelayan ── */
  const deleteNelayan = async (r) => {
    if (!user) return alert('Login dulu.');
    if (!window.confirm(`Hapus ${r.nama_nelayan}?`)) return;
    await supabase.from('nelayan_tangkap').delete().eq('id',r.id);
    onRefresh && onRefresh();
  };

  const box = { background:'#fff', border:'1px solid #e5e7eb', borderRadius:10, padding:'12px 14px', marginBottom:10 };
  const tag = (txt,c='#6b7280') => <div style={{fontSize:10,fontWeight:700,color:c,textTransform:'uppercase',letterSpacing:.5,marginBottom:6}}>{txt}</div>;

  return (
    <div style={{ padding:12 }}>
      {picking && (
        <div className="sp-pick-indicator">
          📍 Ketuk peta untuk menentukan lokasi pangkalan
          <button onClick={()=>{setPicking(false);setPendingPin(null);}}
            style={{background:'rgba(255,255,255,0.2)',border:'none',borderRadius:6,color:'#fff',padding:'2px 8px',cursor:'pointer',fontSize:12}}>Batal</button>
        </div>
      )}

      {/* ── RINGKASAN ── */}
      <div style={{background:'linear-gradient(135deg,#2ec4b6,#023e8a)',color:'#fff',borderRadius:14,padding:16,marginBottom:12}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
          <div>
            <div style={S({opacity:.8,textTransform:'uppercase',letterSpacing:1})}>Perikanan Tangkap · Kota Cilegon</div>
            <div style={{fontSize:22,fontWeight:800,marginTop:2}}>{(tangkapList||[]).length} Pangkalan</div>
            <div style={S({opacity:.85,marginTop:4})}>{totalOrg} Nelayan</div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={S({opacity:.8})}>TANGKAPAN IKAN {new Date().getFullYear()}</div>
            <div style={{fontSize:14,fontWeight:700,color:'#ffd166'}}>{cur?`${cur.label.toUpperCase()} : ${(cur.total/1000).toFixed(1)} Ton`:'BELUM ADA DATA'}</div>
            <div style={{fontSize:12,fontWeight:700,marginTop:2}}>TOTAL : {(totalTahun/1000).toFixed(1)} Ton</div>
            <div style={{display:'flex',gap:6,marginTop:6,justifyContent:'flex-end'}}>
              <button onClick={()=>setBulanIdx(p=>Math.min(p+1,produksiBulanan.length-1))} style={{background:'rgba(255,255,255,0.2)',border:'none',borderRadius:4,color:'#fff',padding:'2px 8px',fontSize:10,cursor:'pointer'}}>◀ Prev</button>
              <button onClick={()=>setBulanIdx(p=>Math.max(p-1,0))} style={{background:'rgba(255,255,255,0.2)',border:'none',borderRadius:4,color:'#fff',padding:'2px 8px',fontSize:10,cursor:'pointer'}}>Next ▶</button>
            </div>
          </div>
        </div>
      </div>

      {/* ── TOMBOL AKSI ── */}
      <div style={{display:'flex',gap:8,marginBottom:12}}>
        <button className="sp-btn sp-btn-primary" style={{flex:1}}
          onClick={()=>{ setMode(mode==='add_nelayan'?null:'add_nelayan'); setEditTarget(null); setFormN(initForm); setPendingPin(null); }}>
          ➕ {mode==='add_nelayan'?'Tutup':'Tambah Pangkalan'}
        </button>
        <button className="sp-btn" style={{flex:1,background:'#e76f51',color:'#fff'}}
          onClick={()=>{ setMode(mode==='add_prod'?null:'add_prod'); setProdTarget(null); setFormP({tanggal:new Date().toISOString().slice(0,10),ikan_kg:{}}); }}>
          🐟 {mode==='add_prod'?'Tutup':'Input Produksi'}
        </button>
      </div>

      {/* ── FORM TAMBAH/EDIT NELAYAN ── */}
      {(mode==='add_nelayan'||mode==='edit_nelayan') && (
        <div style={box}>
          {tag(mode==='edit_nelayan'?`Edit: ${editTarget?.nama_nelayan}`:'Tambah Pangkalan Nelayan','#166534')}
          <input className="sp-input" placeholder="Nama kelompok/pangkalan nelayan *" value={formN.nama_kelompok}
            onChange={e=>setFormN(p=>({...p,nama_kelompok:e.target.value}))} />
          <input className="sp-input" placeholder="Jumlah anggota nelayan" type="number" style={{marginTop:6}}
            value={formN.jumlah_anggota} onChange={e=>setFormN(p=>({...p,jumlah_anggota:e.target.value}))} />

          <div style={{border:'1px solid #e5e7eb',borderRadius:8,padding:'8px 10px',marginTop:8,background:'#fafafa'}}>
            {tag('Alat Tangkap')}
            {ALAT_TANGKAP.map(alat=>{
              const checked = formN.alat_units[alat]!==undefined;
              return <div key={alat} style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                <input type="checkbox" checked={checked} onChange={e=>{ const u={...formN.alat_units}; e.target.checked?u[alat]='':delete u[alat]; setFormN(p=>({...p,alat_units:u})); }} />
                <span style={S({flex:1})}>{alat}</span>
                {checked && <><input type="number" min="0" style={{width:50,...S({padding:'2px 4px',border:'1px solid #d1d5db',borderRadius:4})}}
                  value={formN.alat_units[alat]} onChange={e=>{ const u={...formN.alat_units}; u[alat]=e.target.value; setFormN(p=>({...p,alat_units:u})); }} /><span style={S({color:'#999'})}>unit</span></>}
              </div>;
            })}
          </div>

          <div style={{border:'1px solid #e5e7eb',borderRadius:8,padding:'8px 10px',marginTop:8,background:'#fafafa'}}>
            {tag('Armada')}
            {ARMADA_TYPES.map(arm=>{
              const checked = formN.armada_units[arm]!==undefined;
              return <div key={arm} style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                <input type="checkbox" checked={checked} onChange={e=>{ const u={...formN.armada_units}; e.target.checked?u[arm]='':delete u[arm]; setFormN(p=>({...p,armada_units:u})); }} />
                <span style={S({flex:1})}>{arm}</span>
                {checked && <><input type="number" min="0" style={{width:50,...S({padding:'2px 4px',border:'1px solid #d1d5db',borderRadius:4})}}
                  value={formN.armada_units[arm]} onChange={e=>{ const u={...formN.armada_units}; u[arm]=e.target.value; setFormN(p=>({...p,armada_units:u})); }} /><span style={S({color:'#999'})}>unit</span></>}
              </div>;
            })}
          </div>

          <button className="sp-btn sp-btn-secondary" style={{width:'100%',marginTop:8}}
            onClick={()=>setPicking(true)}>
            📍 {pendingPin?`✅ ${pendingPin.lat.toFixed(5)}, ${pendingPin.lng.toFixed(5)}`:'Pilih Lokasi di Peta'}
          </button>
          <button className="sp-btn sp-btn-primary" style={{width:'100%',marginTop:8}} disabled={saving} onClick={saveNelayan}>
            💾 {saving?'Menyimpan...':'SIMPAN'}
          </button>
          {mode==='edit_nelayan' && (
            <button className="sp-btn sp-btn-danger" style={{width:'100%',marginTop:6}} onClick={()=>deleteNelayan(editTarget)}>
              🗑️ Hapus Pangkalan Ini
            </button>
          )}
        </div>
      )}

      {/* ── FORM INPUT PRODUKSI ── */}
      {mode==='add_prod' && (
        <div style={box}>
          {tag('Input Produksi Tangkap','#e76f51')}
          <select className="sp-select" value={prodTarget?.id||''} onChange={e=>{ const r=(tangkapList||[]).find(x=>String(x.id)===e.target.value); setProdTarget(r||null); }}>
            <option value="">-- Pilih Pangkalan Nelayan --</option>
            {(tangkapList||[]).map(r=><option key={r.id} value={r.id}>{r.nama_nelayan}</option>)}
          </select>
          <input type="date" className="sp-input" style={{marginTop:8}} value={formP.tanggal}
            onChange={e=>setFormP(p=>({...p,tanggal:e.target.value}))} />
          <div style={{border:'1px solid #e5e7eb',borderRadius:8,padding:'8px 10px',marginTop:8,background:'#fafafa'}}>
            {tag('Jenis Ikan (kg)')}
            {JENIS_IKAN.map(ikan=>(
              <div key={ikan} style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                <span style={S({flex:1})}>{ikan}</span>
                <input type="number" min="0" placeholder="0" style={{width:64,...S({padding:'2px 6px',border:'1px solid #d1d5db',borderRadius:4})}}
                  value={formP.ikan_kg[ikan]||''} onChange={e=>{ const ik={...formP.ikan_kg}; ik[ikan]=e.target.value; setFormP(p=>({...p,ikan_kg:ik})); }} />
                <span style={S({color:'#999',width:16})}>kg</span>
              </div>
            ))}
          </div>
          <button className="sp-btn sp-btn-primary" style={{width:'100%',marginTop:8,background:'#e76f51'}} disabled={saving} onClick={saveProduksi}>
            💾 {saving?'Menyimpan...':'SIMPAN PRODUKSI'}
          </button>
        </div>
      )}

      {/* ── DAFTAR PANGKALAN — with edit button ── */}
      <div style={box}>
        <div className="sp-info-box__title">📋 Data Pangkalan Nelayan ({(tangkapList||[]).length})</div>
        {!(tangkapList||[]).length ? (
          <p style={{color:'#999',fontSize:12,textAlign:'center'}}>Belum ada data pangkalan.</p>
        ) : (tangkapList||[]).map(r=>{
          let armInfo='';
          try{ const a=JSON.parse(r.perahu||'{}'); armInfo=Object.entries(a).filter(([,v])=>parseInt(v)>0).map(([j,v])=>`${j}:${v}`).join(', '); }catch(e){}
          // Hitung total produksi per nelayan
          let prodTotal=0;
          try{ JSON.parse(r.catatan||'[]').forEach(p=>prodTotal+=parseFloat(p.kg||0)); }catch(e){}
          return (
            <div key={r.id} style={{background:'#f9fafb',borderLeft:'3px solid #2ec4b6',borderRadius:8,padding:'9px 10px',marginBottom:8}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                <div style={{flex:1}} onClick={()=>r.lat&&r.lng&&mapRef?.current?.flyTo([r.lat,r.lng],17,{duration:1})} className="sp-kom-item__body">
                  <div style={{fontWeight:700,fontSize:12}}>⛵ {r.nama_nelayan||'Tanpa Nama'}</div>
                  <div style={S({color:'#888',marginTop:2})}>🎣 {r.alat_tangkap||'-'} · 👥 {r.no_hp||'?'} org {armInfo&&`· ⛵ ${armInfo}`}</div>
                  {prodTotal>0 && <div style={S({color:'#0d9488',marginTop:2})}>🐟 Produksi: {(prodTotal/1000).toFixed(2)} ton</div>}
                  {r.lat&&r.lng&&r.lat!==0 && <div style={{fontSize:9,color:'#2ec4b6',marginTop:2}}>📍 Klik untuk lihat di peta</div>}
                </div>
                <div style={{display:'flex',gap:4,flexShrink:0,marginLeft:8}}>
                  <button onClick={()=>openEdit(r)} style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:6,padding:'3px 8px',fontSize:10,cursor:'pointer',color:'#166534',fontWeight:600}}>✏️ Edit</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Riwayat Produksi Bulanan ── */}
      {cur && (
        <div style={box}>
          <div className="sp-info-box__title">📊 {cur.label} — {(cur.total/1000).toFixed(2)} Ton</div>
          {Object.entries(cur.ikan).sort((a,b)=>b[1]-a[1]).map(([ik,kg])=>(
            <div key={ik} style={{display:'flex',justifyContent:'space-between',padding:'4px 0',borderBottom:'1px solid #f0f0f0',...S({})}}>
              <span>{ik}</span><span style={{fontWeight:700,color:'#166534'}}>{kg.toLocaleString('id-ID')} kg</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
export default PerikananTangkap;
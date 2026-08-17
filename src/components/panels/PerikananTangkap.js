import React, { useState, useEffect, useMemo } from 'react';
import { ALAT_TANGKAP, ARMADA_TYPES } from '../../config/komoditas';
import { parseCoordinates } from '../../utils/parsers';
import { canEditRecord, isSuperAdmin } from '../../utils/authHelper';

const DEFAULT_PRODUCTS = [
  { key: 'kuwe', label: 'Kuwe', unit: 'kg', priceUnit: 'Rp/kg' },
  { key: 'beronang', label: 'Beronang', unit: 'kg', priceUnit: 'Rp/kg' },
  { key: 'kerapu', label: 'Kerapu', unit: 'kg', priceUnit: 'Rp/kg' },
  { key: 'cumi', label: 'Cumi', unit: 'kg', priceUnit: 'Rp/kg' },
  { key: 'kembung', label: 'Kembung', unit: 'kg', priceUnit: 'Rp/kg' },
  { key: 'tenggiri', label: 'Tenggiri', unit: 'kg', priceUnit: 'Rp/kg' },
  { key: 'tongkol', label: 'Tongkol', unit: 'kg', priceUnit: 'Rp/kg' },
  { key: 'lainnya', label: 'Lainnya', unit: 'kg', priceUnit: 'Rp/kg' },
];

const S = (s) => ({ fontSize: 11, ...s });

function PerikananTangkap({ nelayanTangkap, tangkapList, showNelayan, onToggleShow, user, mapRef, supabase, onRefresh, onPickLocation, onFlyToLocation }) {
  const superAdmin = isSuperAdmin(user);
  const [mode, setMode]                   = useState(null); // 'add_nelayan'|'edit_nelayan'|'add_prod'
  const [editTarget, setEditTarget]       = useState(null); // row nelayan yg di-edit
  const [prodTarget, setProdTarget]       = useState(null); // nelayan yg ditambah produksinya
  const [editingProdIndex, setEditingProdIndex] = useState(null); // index catatan produksi yg sedang di-edit
  const [bulanIdx, setBulanIdx]           = useState(0);
  const [pendingPin, setPendingPin]       = useState(null);
  const [gpsInput, setGpsInput]           = useState('');
  const [picking, setPicking]             = useState(false);
  const [saving, setSaving]               = useState(false);
  const [showMasterModal, setShowMasterModal] = useState(false);

  // Master product state
  const [productList, setProductList] = useState(() => {
    try {
      const saved = localStorage.getItem('dkpp_tangkap_products');
      return saved ? JSON.parse(saved) : DEFAULT_PRODUCTS;
    } catch(e) {
      return DEFAULT_PRODUCTS;
    }
  });

  const [newProdName, setNewProdName] = useState('');
  const [newProdUnit, setNewProdUnit] = useState('kg');

  const initForm = { nama_kelompok: '', alat_units: {}, armada_units: {}, jenis_ikan: '', jumlah_anggota: '' };
  const [formN, setFormN] = useState(initForm);
  const [formP, setFormP] = useState({ tanggal: new Date().toISOString().slice(0, 10), ikan_data: {} });

  // Sync Master Products with localStorage & Supabase
  const saveProductListToStorage = (list) => {
    setProductList(list);
    localStorage.setItem('dkpp_tangkap_products', JSON.stringify(list));
  };

  useEffect(() => {
    async function loadMasterProducts() {
      if (!supabase) return;
      try {
        const { data, error } = await supabase
          .from('master_produk_tangkap')
          .select('*')
          .order('urutan', { ascending: true });
        if (!error && data && data.length > 0) {
          const mapped = data.map(d => ({
            key: d.key,
            label: d.label,
            unit: d.unit,
            priceUnit: d.price_unit || `Rp/${d.unit}`
          }));
          setProductList(mapped);
          localStorage.setItem('dkpp_tangkap_products', JSON.stringify(mapped));
        }
      } catch (err) {
        console.error('Error fetching master_produk_tangkap:', err);
      }
    }
    loadMasterProducts();
  }, [supabase]);

  // Master product handlers for super admin
  const handleAddNewProduct = async () => {
    if (!newProdName.trim()) return alert('Nama jenis tangkapan tidak boleh kosong.');
    const rawKey = newProdName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const key = rawKey.length > 0 ? `${rawKey}_${Date.now().toString().slice(-4)}` : `prod_${Date.now()}`;
    const unit = newProdUnit.trim() || 'kg';
    const newItem = { key, label: newProdName.trim(), unit, priceUnit: `Rp/${unit}` };
    const newList = [...productList, newItem];
    saveProductListToStorage(newList);
    setNewProdName('');
    setNewProdUnit('kg');

    if (supabase) {
      const { error } = await supabase.from('master_produk_tangkap').upsert({
        key,
        label: newItem.label,
        unit: newItem.unit,
        price_unit: newItem.priceUnit,
        urutan: newList.length
      }, { onConflict: 'key' });
      if (error) console.warn('Supabase sync note:', error.message);
    }
  };

  const handleDeleteProduct = async (key) => {
    if (!window.confirm('Hapus jenis tangkapan ini dari daftar master produk?')) return;
    const newList = productList.filter(p => p.key !== key);
    saveProductListToStorage(newList);

    if (supabase) {
      const { error } = await supabase.from('master_produk_tangkap').delete().eq('key', key);
      if (error) console.warn('Supabase delete note:', error.message);
    }
  };

  const handleEditProductLabel = async (key, currentLabel, currentUnit) => {
    const newLabel = window.prompt('Ubah nama jenis tangkapan:', currentLabel);
    if (!newLabel || !newLabel.trim()) return;
    const newUnit = window.prompt('Ubah satuan produk (misal: kg, ton, ekor):', currentUnit) || currentUnit;
    const priceUnit = `Rp/${newUnit.trim()}`;
    const newList = productList.map(p => p.key === key ? { ...p, label: newLabel.trim(), unit: newUnit.trim(), priceUnit } : p);
    saveProductListToStorage(newList);

    if (supabase) {
      const { error } = await supabase.from('master_produk_tangkap').update({
        label: newLabel.trim(),
        unit: newUnit.trim(),
        price_unit: priceUnit
      }).eq('key', key);
      if (error) console.warn('Supabase update note:', error.message);
    }
  };

  const handleResetProducts = async () => {
    if (!window.confirm('Kembalikan daftar jenis tangkapan ke setelan awal default?')) return;
    saveProductListToStorage(DEFAULT_PRODUCTS);
    if (supabase) {
      await supabase.from('master_produk_tangkap').delete().neq('id', 0);
      for (let i = 0; i < DEFAULT_PRODUCTS.length; i++) {
        const d = DEFAULT_PRODUCTS[i];
        await supabase.from('master_produk_tangkap').insert({
          key: d.key,
          label: d.label,
          unit: d.unit,
          price_unit: d.priceUnit,
          urutan: i + 1
        });
      }
    }
  };

  /* ── Aggregasi produksi dari SEMUA nelayan ── */
  const produksiBulanan = useMemo(() => {
    const bulanMap = {};
    (tangkapList || []).forEach(r => {
      try {
        JSON.parse(r.catatan || '[]').forEach((p, idx) => {
          const d  = new Date(p.tgl);
          const k  = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
          const lb = d.toLocaleDateString('id-ID',{month:'long',year:'numeric'});
          if (!bulanMap[k]) bulanMap[k] = { total:0, totalOmset:0, ikan:{}, ikanOmset:{}, label:lb, entries:[] };
          
          let omsetEntry = parseFloat(p.omset || 0);
          bulanMap[k].total += parseFloat(p.kg||0);
          
          Object.entries(p.ikan||{}).forEach(([ik, val]) => {
            const kg = typeof val === 'object' ? parseFloat(val?.kg || 0) : parseFloat(val || 0);
            const harga = typeof val === 'object' ? parseFloat(val?.harga || 0) : 0;
            bulanMap[k].ikan[ik] = (bulanMap[k].ikan[ik]||0) + kg;
            if (harga > 0) {
              bulanMap[k].ikanOmset[ik] = (bulanMap[k].ikanOmset[ik]||0) + (kg * harga);
              if (!p.omset) omsetEntry += (kg * harga);
            }
          });
          bulanMap[k].totalOmset += omsetEntry;
          bulanMap[k].entries.push({ ...p, pangkalanId: r.id, pangkalanNama: r.nama_nelayan, pangkalanUserId: r.user_id, entryIdx: idx });
        });
      } catch(e) {}
    });
    return Object.entries(bulanMap).sort((a,b)=>b[0].localeCompare(a[0])).map(([k,v])=>({key:k,...v}));
  }, [tangkapList]);

  const cur        = produksiBulanan[bulanIdx] || null;
  const totalTahun = produksiBulanan.reduce((s,b)=>s+b.total, 0);
  const totalTahunOmset = produksiBulanan.reduce((s,b)=>s+b.totalOmset, 0);
  const totalOrg   = (tangkapList||[]).reduce((s,r)=>s+parseInt(r.no_hp||r.jumlah_anggota||0,10), 0);
  const totalKapalMotor = (tangkapList||[]).reduce((s,r)=>{ try{ return s + parseInt(JSON.parse(r.perahu||'{}')['Kapal motor']||0,10); }catch(e){return s;} }, 0);
  const totalPerahuMotor = (tangkapList||[]).reduce((s,r)=>{ try{ return s + parseInt(JSON.parse(r.perahu||'{}')['Perahu motor tempel']||0,10); }catch(e){return s;} }, 0);
  const totalTanpaMotor = (tangkapList||[]).reduce((s,r)=>{ try{ return s + parseInt(JSON.parse(r.perahu||'{}')['Perahu tanpa motor']||0,10); }catch(e){return s;} }, 0);

  /* ── Open edit nelayan ── */
  const openEdit = (r) => {
    if (!canEditRecord(user, r)) {
      alert('Anda tidak memiliki izin untuk mengedit pangkalan ini.');
      return;
    }
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
      if (!canEditRecord(user, editTarget)) {
        setSaving(false);
        return alert('Anda tidak memiliki izin untuk mengubah data ini.');
      }
      if (!editTarget.user_id) {
        payload.user_id = user.id;
      }
      await supabase.from('nelayan_tangkap').update(payload).eq('id',editTarget.id);
    } else {
      payload.user_id = user.id;
      payload.lat = pendingPin?.lat||0; payload.lng = pendingPin?.lng||0;
      await supabase.from('nelayan_tangkap').insert(payload);
    }
    setSaving(false); setMode(null); setEditTarget(null); setPendingPin(null); setFormN(initForm);
    onRefresh && onRefresh();
  };

  /* ── Buka Form Edit Catatan Produksi ── */
  const openEditProduksi = (entry) => {
    const pangkalan = (tangkapList || []).find(r => r.id === entry.pangkalanId);
    if (!pangkalan) return alert('Pangkalan tidak ditemukan.');
    const canEdit = superAdmin || (entry.user_id ? entry.user_id === user?.id : canEditRecord(user, pangkalan));
    if (!canEdit) {
      alert('Anda hanya dapat mengubah/menghapus catatan produksi yang Anda input sendiri.');
      return;
    }

    setProdTarget(pangkalan);
    setEditingProdIndex(entry.entryIdx);
    setFormP({
      tanggal: entry.tgl || new Date().toISOString().slice(0,10),
      ikan_data: entry.ikan || {}
    });
    setMode('add_prod');
    window.scrollTo(0, 0);
  };

  /* ── Hapus Catatan Produksi Tersimpan ── */
  const deleteProduksiEntry = async (entry) => {
    const pangkalan = (tangkapList || []).find(r => r.id === entry.pangkalanId);
    if (!pangkalan) return alert('Pangkalan tidak ditemukan.');
    const canEdit = superAdmin || (entry.user_id ? entry.user_id === user?.id : canEditRecord(user, pangkalan));
    if (!canEdit) {
      alert('Anda hanya dapat mengubah/menghapus catatan produksi yang Anda input sendiri.');
      return;
    }

    if (!window.confirm(`Hapus catatan produksi tanggal ${entry.tgl} dari ${pangkalan.nama_nelayan}?`)) return;

    let arr = [];
    try { arr = JSON.parse(pangkalan.catatan || '[]'); } catch(e){}
    arr.splice(entry.entryIdx, 1);

    setSaving(true);
    await supabase.from('nelayan_tangkap').update({ catatan: JSON.stringify(arr) }).eq('id', pangkalan.id);
    setSaving(false);
    onRefresh && onRefresh();
  };

  /* ── Simpan / Update produksi ke nelayan tertentu ── */
  const saveProduksi = async () => {
    if (!user) return alert('Login dulu.');
    if (!prodTarget) return alert('Pilih pangkalan nelayan terlebih dahulu.');
    
    let totalKg = 0;
    let totalOmset = 0;
    const cleanIkanData = {};

    Object.entries(formP.ikan_data).forEach(([ik, val]) => {
      const kg = typeof val === 'object' ? parseFloat(val?.kg || 0) : parseFloat(val || 0);
      const harga = typeof val === 'object' ? parseFloat(val?.harga || 0) : 0;
      if (kg > 0) {
        cleanIkanData[ik] = { kg, harga };
        totalKg += kg;
        totalOmset += kg * harga;
      }
    });

    if (totalKg <= 0) return alert('Isi minimal satu kuantitas jenis tangkapan.');
    setSaving(true);
    const arr = [];
    try { arr.push(...JSON.parse(prodTarget.catatan||'[]')); } catch(e){}

    const newRecord = {
      tgl: formP.tanggal,
      kg: totalKg,
      omset: totalOmset,
      ikan: cleanIkanData,
      user_id: user.id
    };

    if (editingProdIndex !== null && editingProdIndex >= 0 && editingProdIndex < arr.length) {
      // Update existing entry
      arr[editingProdIndex] = { ...arr[editingProdIndex], ...newRecord };
    } else {
      // Add new entry
      arr.push(newRecord);
    }

    const updatePayload = { catatan: JSON.stringify(arr) };
    if (!prodTarget.user_id) {
      updatePayload.user_id = user.id;
    }
    await supabase.from('nelayan_tangkap').update(updatePayload).eq('id',prodTarget.id);
    setSaving(false); setMode(null); setProdTarget(null); setEditingProdIndex(null);
    setFormP({ tanggal:new Date().toISOString().slice(0,10), ikan_data:{} });
    onRefresh && onRefresh();
  };

  /* ── Hapus nelayan ── */
  const deleteNelayan = async (r) => {
    if (!user) return alert('Login dulu.');
    if (!canEditRecord(user, r)) return alert('Anda tidak memiliki izin untuk menghapus data ini.');
    if (!window.confirm('Tindakan ini tidak dapat dibatalkan (undo). Apakah Anda yakin ingin menghapus pangkalan nelayan ini beserta seluruh catatan riwayat tangkapannya secara permanen?')) return;
    await supabase.from('nelayan_tangkap').delete().eq('id',r.id);
    setMode(null); setEditTarget(null); setPendingPin(null); setFormN(initForm);
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
            <div style={S({opacity:.85,marginTop:4,display:'flex',flexDirection:'column',gap:2})}>
              <span style={{ whiteSpace: 'nowrap' }}>{totalOrg} Nelayan</span>
              <span style={{ whiteSpace: 'nowrap' }}>{totalKapalMotor} unit Kapal Motor</span>
              <span style={{ whiteSpace: 'nowrap' }}>{totalPerahuMotor} unit Perahu Motor Tempel</span>
              <span style={{ whiteSpace: 'nowrap' }}>{totalTanpaMotor} unit Perahu Tanpa Motor</span>
            </div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={S({opacity:.8})}>TANGKAPAN IKAN {new Date().getFullYear()}</div>
            <div style={{fontSize:13,fontWeight:700,color:'#ffd166'}}>{cur?`${cur.label.toUpperCase()} : ${(cur.total/1000).toFixed(1)} Ton`:'BELUM ADA DATA'}</div>
            {cur && cur.totalOmset > 0 && (
              <div style={{fontSize:11,fontWeight:700,color:'#86efac',marginTop:1,whiteSpace:'nowrap'}}>
                💰 Rp {cur.totalOmset.toLocaleString('id-ID')}
              </div>
            )}
            <div style={{fontSize:11,fontWeight:700,marginTop:2}}>TOTAL : {(totalTahun/1000).toFixed(1)} Ton</div>
            {totalTahunOmset > 0 && (
              <div style={{fontSize:10,fontWeight:700,color:'#ffd166',whiteSpace:'nowrap'}}>
                💰 Total: Rp {totalTahunOmset.toLocaleString('id-ID')}
              </div>
            )}
            <div style={{display:'flex',gap:6,marginTop:6,justifyContent:'flex-end'}}>
              <button onClick={()=>setBulanIdx(p=>Math.min(p+1,produksiBulanan.length-1))} style={{background:'rgba(255,255,255,0.2)',border:'none',borderRadius:4,color:'#fff',padding:'2px 8px',fontSize:10,cursor:'pointer'}}>◀ Prev</button>
              <button onClick={()=>setBulanIdx(p=>Math.max(p-1,0))} style={{background:'rgba(255,255,255,0.2)',border:'none',borderRadius:4,color:'#fff',padding:'2px 8px',fontSize:10,cursor:'pointer'}}>Next ▶</button>
            </div>
          </div>
        </div>
      </div>

      {/* ── TOMBOL AKSI ── */}
      {user && (
        <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
          <button className="sp-btn sp-btn-primary" style={{flex:1}}
            onClick={()=>{ setMode(mode==='add_nelayan'?null:'add_nelayan'); setEditTarget(null); setFormN(initForm); setPendingPin(null); setGpsInput(''); }}>
            ➕ {mode==='add_nelayan'?'Tutup':'Tambah Pangkalan'}
          </button>
          <button className="sp-btn" style={{flex:1,background:'#e76f51',color:'#fff'}}
            onClick={()=>{ setMode(mode==='add_prod'?null:'add_prod'); setProdTarget(null); setEditingProdIndex(null); setFormP({tanggal:new Date().toISOString().slice(0,10),ikan_data:{}}); }}>
            🐟 {mode==='add_prod'?'Tutup':'Input Produksi'}
          </button>
          {superAdmin && (
            <button className="sp-btn" style={{background:'#6b21a8',color:'#fff',fontWeight:700}} onClick={()=>setShowMasterModal(!showMasterModal)}>
              ⚙️ {showMasterModal ? 'Tutup Master' : 'Master Jenis Ikan'}
            </button>
          )}
        </div>
      )}

      {/* ── MODAL / SECTION MASTER PRODUK (SUPER ADMIN ONLY) ── */}
      {superAdmin && showMasterModal && (
        <div style={{ background: '#f3e8ff', border: '1.5px solid #c084fc', borderRadius: 12, padding: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 900, color: '#581c87', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>⚙️ Pengaturan Master Jenis Tangkapan (Super Admin)</span>
            <button onClick={handleResetProducts} style={{ background: '#fff', border: '1px solid #c084fc', borderRadius: 6, padding: '2px 8px', fontSize: 10, cursor: 'pointer', color: '#6b21a8', fontWeight: 700 }}>
              🔄 Reset Default
            </button>
          </div>
          <p style={{ fontSize: 11, color: '#6b21a8', marginBottom: 10, lineHeight: 1.3 }}>
            Kelola jenis ikan/tangkapan laut yang dapat diisi oleh pengguna saat menginput produksi tangkap.
          </p>

          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            <input className="sp-input" style={{ flex: 2, marginTop: 0 }} placeholder="Nama Jenis Tangkapan Baru (misal: Udang Windu)" value={newProdName} onChange={e=>setNewProdName(e.target.value)} />
            <input className="sp-input" style={{ flex: 1, marginTop: 0 }} placeholder="Satuan (kg, ton)" value={newProdUnit} onChange={e=>setNewProdUnit(e.target.value)} />
            <button className="sp-btn" style={{ background: '#7e22ce', color: '#fff', fontWeight: 800, padding: '0 12px' }} onClick={handleAddNewProduct}>
              ➕ Tambah
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 6 }}>
            {productList.map(p => (
              <div key={p.key} style={{ background: '#ffffff', border: '1px solid #e9d5ff', borderRadius: 8, padding: '6px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#3b0764' }}>{p.label} <span style={{ fontSize: 9, color: '#7e22ce' }}>({p.unit})</span></span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => handleEditProductLabel(p.key, p.label, p.unit)} style={{ background: '#f3e8ff', border: 'none', borderRadius: 4, padding: '2px 6px', fontSize: 10, cursor: 'pointer' }} title="Edit nama/satuan">✏️</button>
                  <button onClick={() => handleDeleteProduct(p.key)} style={{ background: '#fee2e2', border: 'none', borderRadius: 4, padding: '2px 6px', fontSize: 10, cursor: 'pointer', color: '#dc2626' }} title="Hapus produk">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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

          {/* Lokasi Koordinat */}
          <div style={{
            marginTop: 12,
            padding: '12px',
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '10px',
            marginBottom: 10
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#166534', marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>📍 Lokasi Koordinat (GPS)</span>
              {pendingPin && (
                <span style={{ fontSize: 10, background: '#dcfce7', color: '#15803d', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                  ✓ {pendingPin.lat.toFixed(4)}, {pendingPin.lng.toFixed(4)}
                </span>
              )}
            </div>

            <button
              type="button"
              className="sp-btn"
              style={{
                width: '100%',
                background: '#0d9488',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                fontWeight: 700,
                padding: '9px',
                borderRadius: '8px',
                marginBottom: 8,
                boxShadow: '0 2px 6px rgba(13, 148, 136, 0.25)',
                cursor: 'pointer'
              }}
              onClick={() => {
                if (onPickLocation) {
                  onPickLocation((coords) => {
                    setPendingPin(coords);
                    if (onFlyToLocation) onFlyToLocation(coords.lat, coords.lng);
                  });
                }
              }}
            >
              <span>📍</span> Pilih Lokasi di Peta
            </button>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 600, color: '#4b5563', display: 'block' }}>Latitude</label>
                <input
                  type="number"
                  step="any"
                  className="sp-input"
                  placeholder="-6.012345"
                  style={{ marginTop: 2 }}
                  value={pendingPin?.lat ?? ''}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    const currentLng = pendingPin?.lng ?? 106.05;
                    setPendingPin({ lat: isNaN(val) ? 0 : val, lng: currentLng });
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 600, color: '#4b5563', display: 'block' }}>Longitude</label>
                <input
                  type="number"
                  step="any"
                  className="sp-input"
                  placeholder="106.054321"
                  style={{ marginTop: 2 }}
                  value={pendingPin?.lng ?? ''}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    const currentLat = pendingPin?.lat ?? -6.01;
                    setPendingPin({ lat: currentLat, lng: isNaN(val) ? 0 : val });
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              <input
                className="sp-input"
                style={{ marginTop: 0, fontSize: 11 }}
                placeholder="Atau tempel: -6.0123, 106.0543"
                value={gpsInput}
                onChange={(e) => setGpsInput(e.target.value)}
              />
              <button
                type="button"
                className="sp-btn"
                style={{ background: '#dcfce7', color: '#166534', fontWeight: 700, padding: '0 12px', border: '1px solid #86efac', flexShrink: 0, cursor: 'pointer' }}
                onClick={() => {
                  const coords = parseCoordinates(gpsInput);
                  if (coords) {
                    setPendingPin(coords);
                    if (onFlyToLocation) onFlyToLocation(coords.lat, coords.lng);
                  } else {
                    alert('Format koordinat tidak valid. Contoh: -6.012345, 106.054321');
                  }
                }}
              >
                Terapkan
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
            <button className="sp-btn" style={{ background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb' }}
              onClick={() => { setMode(null); setEditTarget(null); setPendingPin(null); setFormN(initForm); setGpsInput(''); }}>Batal</button>
            <button className="sp-btn sp-btn-primary" disabled={saving} onClick={saveNelayan}>
              💾 {saving ? 'Menyimpan...' : editTarget ? 'Update' : 'Simpan'}
            </button>
          </div>
          {mode==='edit_nelayan' && (
            <button className="sp-btn sp-btn-danger" style={{width:'100%',marginTop:8}} onClick={()=>deleteNelayan(editTarget)}>
              🗑️ Hapus Pangkalan Ini
            </button>
          )}
        </div>
      )}

      {/* ── FORM INPUT PRODUKSI (DYNAMIC MASTER PRODUCTS) ── */}
      {mode==='add_prod' && (
        <div style={box}>
          {tag(editingProdIndex !== null ? 'Edit Produksi Tangkap' : 'Input Produksi Tangkap', '#e76f51')}
          <select className="sp-select" value={prodTarget?.id||''} onChange={e=>{ const r=(tangkapList||[]).find(x=>String(x.id)===e.target.value); setProdTarget(r||null); }}>
            <option value="">-- Pilih Pangkalan Nelayan --</option>
            {(tangkapList||[]).filter(r => superAdmin || canEditRecord(user, r)).map(r=><option key={r.id} value={r.id}>{r.nama_nelayan}</option>)}
          </select>
          <input type="date" className="sp-input" style={{marginTop:8}} value={formP.tanggal}
            onChange={e=>setFormP(p=>({...p,tanggal:e.target.value}))} />
          
          <div style={{border:'1px solid #e5e7eb',borderRadius:8,padding:'8px 10px',marginTop:8,background:'#fafafa'}}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#4b5563', marginBottom: 8, textTransform: 'uppercase' }}>
              PRODUKSI DAN HARGA TANGKAPAN
            </div>
            {productList.map(pItem => {
              const ikData = formP.ikan_data[pItem.label] || formP.ikan_data[pItem.key];
              const kgVal = typeof ikData === 'object' ? (ikData?.kg ?? '') : (ikData ?? '');
              const hargaVal = typeof ikData === 'object' ? (ikData?.harga ?? '') : '';
              return (
                <div key={pItem.key} style={{display:'flex',alignItems:'center',gap:6,marginBottom:6}}>
                  <span style={S({flex:1.2, fontWeight:500})}>{pItem.label}</span>
                  <input type="number" min="0" placeholder="0" style={{width:55,...S({padding:'2px 4px',border:'1px solid #d1d5db',borderRadius:4})}}
                    onFocus={e => e.target.select()}
                    value={kgVal} onChange={e=>{
                      const q = e.target.value.replace(/^0+(?=\d)/, '');
                      setFormP(p=>({
                        ...p,
                        ikan_data: {
                          ...p.ikan_data,
                          [pItem.label]: {
                            ...(typeof p.ikan_data[pItem.label] === 'object' ? p.ikan_data[pItem.label] : {}),
                            kg: q
                          }
                        }
                      }));
                    }} />
                  <span style={S({color:'#999',width:25})}>{pItem.unit || 'kg'}</span>
                  <span style={S({color:'#666',fontSize:10})}>Rp/{pItem.unit || 'kg'}</span>
                  <input type="number" min="0" placeholder="0" style={{width:70,...S({padding:'2px 4px',border:'1px solid #d1d5db',borderRadius:4})}}
                    onFocus={e => e.target.select()}
                    value={hargaVal} onChange={e=>{
                      const h = e.target.value.replace(/^0+(?=\d)/, '');
                      setFormP(p=>({
                        ...p,
                        ikan_data: {
                          ...p.ikan_data,
                          [pItem.label]: {
                            ...(typeof p.ikan_data[pItem.label] === 'object' ? p.ikan_data[pItem.label] : {}),
                            harga: h
                          }
                        }
                      }));
                    }} />
                </div>
              );
            })}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
            <button className="sp-btn" style={{ background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb' }}
              onClick={() => { setMode(null); setProdTarget(null); setEditingProdIndex(null); setFormP({ tanggal:new Date().toISOString().slice(0,10), ikan_data:{} }); }}>Batal</button>
            <button className="sp-btn sp-btn-primary" style={{background:'#e76f51'}} disabled={saving} onClick={saveProduksi}>
              💾 {saving?'Menyimpan...': (editingProdIndex !== null ? 'UPDATE PRODUKSI' : 'SIMPAN PRODUKSI')}
            </button>
          </div>
        </div>
      )}

      {/* ── DAFTAR PANGKALAN NELAYAN ── */}
      <div style={box}>
        <div className="sp-info-box__title">📋 Data Pangkalan Nelayan ({(tangkapList||[]).length})</div>
        {!(tangkapList||[]).length ? (
          <p style={{color:'#999',fontSize:12,textAlign:'center'}}>Belum ada data pangkalan.</p>
        ) : (tangkapList||[]).map(r=>{
          let armInfo='';
          try{ const a=JSON.parse(r.perahu||'{}'); armInfo=Object.entries(a).filter(([,v])=>parseInt(v)>0).map(([j,v])=>`${j}:${v}`).join(', '); }catch(e){}
          let prodTotal=0;
          let omsetTotal=0;
          try{
            JSON.parse(r.catatan||'[]').forEach(p=>{
              prodTotal += parseFloat(p.kg||0);
              omsetTotal += parseFloat(p.omset||0);
            });
          }catch(e){}

          const canEditPangkalan = superAdmin || canEditRecord(user, r);

          return (
            <div key={r.id} style={{background:'#f9fafb',borderLeft:'3px solid #2ec4b6',borderRadius:8,padding:'9px 10px',marginBottom:8}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                <div style={{flex:1}} onClick={()=>r.lat&&r.lng&&mapRef?.current?.flyTo([r.lat,r.lng],17,{duration:1})} className="sp-kom-item__body">
                  <div style={{fontWeight:700,fontSize:12}}>⛵ {r.nama_nelayan||'Tanpa Nama'}</div>
                  <div style={S({color:'#888',marginTop:2})}>🎣 {r.alat_tangkap||'-'} · 👥 {r.no_hp||'?'} org {armInfo&&`· ⛵ ${armInfo}`}</div>
                  {prodTotal>0 && (
                    <div style={S({color:'#0d9488',marginTop:2,fontWeight:600})}>
                      🐟 Produksi: {(prodTotal/1000).toFixed(2)} ton {omsetTotal>0 && `· 💰 Rp ${omsetTotal.toLocaleString('id-ID')}`}
                    </div>
                  )}
                  {r.lat&&r.lng&&r.lat!==0 && <div style={{fontSize:9,color:'#2ec4b6',marginTop:2}}>📍 Klik untuk lihat di peta</div>}
                </div>
                <div style={{display:'flex',gap:4,flexShrink:0,marginLeft:8,alignItems:'center'}}>
                  {user && canEditPangkalan ? (
                    <button onClick={()=>openEdit(r)} style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:6,padding:'3px 8px',fontSize:10,cursor:'pointer',color:'#166534',fontWeight:600}}>✏️ Edit</button>
                  ) : (
                    <span style={{ fontSize: 9, color: '#9ca3af', fontStyle: 'italic' }}>🔒 Read-only</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── DAFTAR PRODUKSI TERSIMPAN (CAPTURE 2 - GOVERNANCE EDIT & HAPUS) ── */}
      <div style={box}>
        <div className="sp-info-box__title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>📦 Daftar Catatan Produksi Tersimpan</span>
          {cur && <span style={{ fontSize: 10, background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>📅 {cur.label}</span>}
        </div>

        {!cur || !cur.entries || cur.entries.length === 0 ? (
          <p style={{ color: '#999', fontSize: 11, textAlign: 'center', padding: '8px 0' }}>Belum ada catatan produksi tersimpan untuk periode ini.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {cur.entries.map((entry, idx) => {
              const pangkalan = (tangkapList || []).find(r => r.id === entry.pangkalanId);
              const canEditEntry = superAdmin || (entry.user_id ? entry.user_id === user?.id : (pangkalan ? canEditRecord(user, pangkalan) : false));

              return (
                <div key={idx} style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '9px 11px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <div>
                      <div style={{ fontSize: 11.5, fontWeight: 800, color: '#0f766e' }}>
                        ⛵ {entry.pangkalanNama}
                      </div>
                      <div style={{ fontSize: 10, color: '#6b7280', marginTop: 1 }}>
                        📅 Tanggal Tangkap: <strong>{entry.tgl}</strong>
                      </div>
                    </div>
                    
                    {/* Governance Controls */}
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      {user && canEditEntry ? (
                        <>
                          <button
                            onClick={() => openEditProduksi(entry)}
                            style={{ background: '#f0fdf4', border: '1px solid #86efac', color: '#166534', borderRadius: 5, padding: '3px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}
                            title="Edit catatan produksi ini"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => deleteProduksiEntry(entry)}
                            style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: 5, padding: '3px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}
                            title="Hapus catatan produksi ini"
                          >
                            🗑️ Hapus
                          </button>
                        </>
                      ) : (
                        <span style={{ fontSize: 9.5, background: '#f3f4f6', color: '#9ca3af', padding: '2px 7px', borderRadius: 4, fontWeight: 600 }} title="Hanya penginput atau Super Admin yang dapat mengubah/menghapus data ini">
                          🔒 Read-only
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Fish Commodities Breakdown */}
                  <div style={{ background: '#f9fafb', borderRadius: 6, padding: '6px 8px', border: '1px solid #f3f4f6' }}>
                    {Object.entries(entry.ikan || {}).map(([ik, val]) => {
                      const kg = typeof val === 'object' ? parseFloat(val?.kg || 0) : parseFloat(val || 0);
                      const harga = typeof val === 'object' ? parseFloat(val?.harga || 0) : 0;
                      if (kg <= 0) return null;
                      return (
                        <div key={ik} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, padding: '2px 0' }}>
                          <span style={{ color: '#374151', fontWeight: 600 }}>{ik}</span>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontWeight: 800, color: '#0f766e' }}>{kg.toLocaleString('id-ID')} kg</span>
                            {harga > 0 && <span style={{ color: '#0d9488', marginLeft: 6 }}>· Rp {(kg * harga).toLocaleString('id-ID')}</span>}
                          </div>
                        </div>
                      );
                    })}
                    <div style={{ borderTop: '1px dashed #e5e7eb', marginTop: 4, paddingTop: 4, display: 'flex', justifyContent: 'space-between', fontSize: 10.5, fontWeight: 900 }}>
                      <span style={{ color: '#111827' }}>Total Produksi & Nilai:</span>
                      <span style={{ color: '#15803d' }}>
                        {entry.kg >= 1000 ? `${(entry.kg/1000).toFixed(2)} Ton` : `${entry.kg} kg`}
                        {entry.omset > 0 && ` · Rp ${entry.omset.toLocaleString('id-ID')}`}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}

export default PerikananTangkap;

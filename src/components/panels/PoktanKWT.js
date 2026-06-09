// eslint-disable-next-line no-unused-vars
import React, { useState } from 'react';
import * as turf from '@turf/turf';
import { ALL_KEL } from '../../config/wilayah';
import { parseCoordinates } from '../../utils/parsers';

const findKelurahanForCoords = (lat, lng, boundaries) => {
  if (!boundaries || boundaries.length === 0) return '';
  const pt = turf.point([lng, lat]);
  for (const feat of boundaries) {
    if (feat.geometry) {
      const isInside = turf.booleanPointInPolygon(pt, feat);
      if (isInside) {
        return feat.properties?.name || '';
      }
    }
  }
  return '';
};

function safeParseCatatan(catatan) {
  if (!catatan) return [];
  if (Array.isArray(catatan)) return catatan;
  if (typeof catatan === 'string') {
    try {
      const parsed = JSON.parse(catatan);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      console.error("Error parsing catatan:", e);
    }
  }
  return [];
}

function PoktanKWT({ poktanKMZ, poktanList, showPoktan, showKWT, showGapoktan, onTogglePoktan, onToggleKWT, onToggleGapoktan, user, mapRef, supabase, onRefresh, onPickLocation, onFlyToLocation, kelurahanBoundaries }) {
  const initForm = {
    nama_poktan: '', jenis: 'Poktan', nama_ketua: '',
    jumlah_anggota: '', kelurahan: '',
    produk_unggulan: '', status_aktif: 'Aktif',
  };
  const [form, setForm]           = useState(initForm);
  const [editTarget, setEditTarget] = useState(null);
  const [pendingPin, setPendingPin] = useState(null);
  const [gpsInput, setGpsInput]     = useState('');
  const [picking, setPicking]     = useState(false);
  const [showForm, setShowForm]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const [formP, setFormP] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    luas_lahan: '',
    produk: {
      cabai: { qty: '', harga: '' },
      tomat: { qty: '', harga: '' },
      sawi: { qty: '', harga: '' },
      pakcoy: { qty: '', harga: '' },
      buah_buahan: { qty: '', harga: '' },
      sayuran: { qty: '', harga: '' },
      minuman_herbal: { qty: '', harga: '' },
      kue: { qty: '', harga: '' },
      keripik: { qty: '', harga: '' },
      lainnya: { qty: '', harga: '' },
    }
  });

  const openAdd = () => {
    setForm(initForm); setEditTarget(null); setPendingPin(null); setGpsInput(''); setShowForm(true);
  };
  const openEdit = (p) => {
    setForm({
      nama_poktan: p.nama_poktan || '', jenis: p.jenis || 'Poktan',
      nama_ketua: p.nama_ketua || '', jumlah_anggota: String(p.jumlah_anggota || ''),
      kelurahan: p.kelurahan || '',
      produk_unggulan: p.produk_unggulan || '', status_aktif: p.status_aktif || 'Aktif',
    });
    setPendingPin(p.lat && p.lng ? { lat: p.lat, lng: p.lng } : null);
    setEditTarget(p); setShowForm(true);
  };

  const handleSave = async () => {
    if (!user) return alert('Login dulu.');
    if (!form.nama_poktan) return alert('Nama kelompok wajib diisi.');

    let kelurahanVal = form.kelurahan;
    if (form.jenis === 'KWT' && pendingPin && kelurahanBoundaries) {
      const autoKel = findKelurahanForCoords(pendingPin.lat, pendingPin.lng, kelurahanBoundaries);
      if (autoKel) {
        kelurahanVal = autoKel;
      }
    }

    setSaving(true);
    const payload = {
      nama_poktan: form.nama_poktan, jenis: form.jenis,
      nama_ketua: form.nama_ketua || null,
      jumlah_anggota: form.jumlah_anggota ? parseInt(form.jumlah_anggota) : null,
      kelurahan: kelurahanVal || null,
      produk_unggulan: form.jenis === 'KWT' ? null : (form.produk_unggulan || null),
      status_aktif: form.status_aktif || 'Aktif',
    };
    if (pendingPin) { payload.lat = pendingPin.lat; payload.lng = pendingPin.lng; }

    let error;
    if (editTarget) {
      ({ error } = await supabase.from('poktan_kwt').update(payload).eq('id', editTarget.id));
    } else {
      payload.user_id = user.id;
      payload.lat = pendingPin?.lat || 0; payload.lng = pendingPin?.lng || 0;
      ({ error } = await supabase.from('poktan_kwt').insert(payload));
    }
    setSaving(false);
    if (error) { alert('Gagal: ' + error.message); return; }
    setPendingPin(null); setPicking(false); setShowForm(false); setEditTarget(null); setForm(initForm); setGpsInput('');
    if (onRefresh) onRefresh();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus data ini?')) return;
    await supabase.from('poktan_kwt').delete().eq('id', id);
    if (onRefresh) onRefresh();
  };

  const saveProduksi = async () => {
    if (!user) return alert('Login dulu.');
    if (!editTarget) return alert('Pilih KWT terlebih dahulu.');
    
    // Check if at least one product has a quantity
    let hasQty = false;
    Object.values(formP.produk).forEach(val => {
      if (parseFloat(val.qty || 0) > 0) hasQty = true;
    });
    if (!hasQty) return alert('Isi minimal satu kuantitas produk.');

    setSaving(true);
    const { data: row } = await supabase.from('poktan_kwt').select('catatan').eq('id', editTarget.id).single();
    let arr = [];
    if (row && row.catatan) {
      if (Array.isArray(row.catatan)) {
        arr = [...row.catatan];
      } else if (typeof row.catatan === 'string') {
        try {
          arr = JSON.parse(row.catatan);
          if (!Array.isArray(arr)) arr = [];
        } catch (e) {
          console.error("Error parsing existing catatan:", e);
        }
      }
    }
    
    const newEntry = {
      tgl: formP.tanggal,
      luas_lahan: parseFloat(formP.luas_lahan || 0),
      produk: {}
    };
    
    Object.entries(formP.produk).forEach(([k, v]) => {
      const qty = parseFloat(v.qty || 0);
      const harga = parseFloat(v.harga || 0);
      if (qty > 0) {
        newEntry.produk[k] = { qty, harga };
      }
    });
    
    arr.push(newEntry);
    
    const { error } = await supabase.from('poktan_kwt').update({ catatan: arr }).eq('id', editTarget.id);
    setSaving(false);
    if (error) {
      alert('Gagal simpan produksi: ' + error.message);
    } else {
      alert('✅ Produksi KWT berhasil disimpan!');
      setFormP({
        tanggal: new Date().toISOString().split('T')[0],
        luas_lahan: '',
        produk: {
          cabai: { qty: '', harga: '' },
          tomat: { qty: '', harga: '' },
          sawi: { qty: '', harga: '' },
          pakcoy: { qty: '', harga: '' },
          buah_buahan: { qty: '', harga: '' },
          sayuran: { qty: '', harga: '' },
          minuman_herbal: { qty: '', harga: '' },
          kue: { qty: '', harga: '' },
          keripik: { qty: '', harga: '' },
          lainnya: { qty: '', harga: '' },
        }
      });
      if (onRefresh) onRefresh();
    }
  };

  const statusColor = (s) => s === 'Aktif' ? '#2d6a4f' : '#9ca3af';

  return (
    <div style={{ padding: 12 }}>
      {picking && (
        <div className="sp-pick-indicator">
          📍 Ketuk peta untuk pilih lokasi
          <button onClick={() => { setPicking(false); setPendingPin(null); }}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 6, color: '#fff', padding: '2px 8px', cursor: 'pointer', fontSize: 12, marginLeft: 8 }}>Batal</button>
        </div>
      )}

      {/* ── Tombol Tambah ── */}
      {user && !showForm && (
        <button className="sp-btn sp-btn-primary" style={{ width: '100%', marginBottom: 12 }} onClick={openAdd}>
          ➕ Tambah Poktan / KWT / Gapoktan
        </button>
      )}

      {/* ── Form Tambah / Edit ── */}
      {showForm && (
        <div className="sp-info-box">
          <div className="sp-info-box__title" style={{ color: editTarget ? '#1d4ed8' : '#166534' }}>
            {editTarget ? `✏️ Edit: ${editTarget.nama_poktan}` : '➕ Tambah Poktan / KWT'}
          </div>

          {/* Jenis */}
          <select className="sp-select" value={form.jenis} onChange={e => setForm(p => ({ ...p, jenis: e.target.value }))}>
            <option>Poktan</option><option>KWT</option><option>Gapoktan</option>
          </select>

          {/* Nama */}
          <input className="sp-input" placeholder="Nama kelompok *" value={form.nama_poktan}
            onChange={e => setForm(p => ({ ...p, nama_poktan: e.target.value }))} style={{ marginTop: 8 }} />

          {/* Ketua */}
          <input className="sp-input" placeholder="Nama ketua" value={form.nama_ketua}
            onChange={e => setForm(p => ({ ...p, nama_ketua: e.target.value }))} style={{ marginTop: 8 }} />

          {/* Anggota */}
          <input type="number" className="sp-input" placeholder="Jumlah anggota" value={form.jumlah_anggota}
            onChange={e => setForm(p => ({ ...p, jumlah_anggota: e.target.value }))} style={{ marginTop: 8 }} />

          {/* Kelurahan */}
          {form.jenis !== 'KWT' && (
            <select className="sp-select" value={form.kelurahan} onChange={e => setForm(p => ({ ...p, kelurahan: e.target.value }))} style={{ marginTop: 8 }}>
              <option value="">-- Pilih Kelurahan --</option>
              {ALL_KEL.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          )}

          {/* Produk Unggulan — free text */}
          {form.jenis !== 'KWT' && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase' }}>Produk Unggulan</div>
              <input className="sp-input" placeholder="Contoh: Padi Ciherang, Jagung Manis, Cabai..." value={form.produk_unggulan}
                onChange={e => setForm(p => ({ ...p, produk_unggulan: e.target.value }))} style={{ marginTop: 0 }} />
            </div>
          )}

          {/* Status Aktif */}
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase' }}>Status Kelompok</div>
            <select className="sp-select" value={form.status_aktif} onChange={e => setForm(p => ({ ...p, status_aktif: e.target.value }))} style={{ marginTop: 0 }}>
              <option value="Aktif">✅ Aktif</option>
              <option value="Tidak Aktif">❌ Tidak Aktif</option>
              <option value="Vakum">⏸️ Vakum</option>
            </select>
          </div>



          {/* Lokasi */}
          <button className="sp-btn sp-btn-secondary" style={{ width:'100%', marginTop:10 }}
            onClick={() => onPickLocation && onPickLocation((latlng) => setPendingPin(latlng))}>
            📍 {pendingPin?`✅ ${pendingPin.lat.toFixed(4)}, ${pendingPin.lng.toFixed(4)}`:'Pilih Lokasi di Peta'}
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

          {form.jenis === 'KWT' && editTarget && (
            <div style={{ marginTop: 15, borderTop: '2px dashed #e5e7eb', paddingTop: 15 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#e76f51', marginBottom: 10, textTransform: 'uppercase' }}>
                INPUT PRODUKSI KWT
              </div>
              
              <input type="date" className="sp-input" style={{ marginTop: 8 }} value={formP.tanggal}
                onChange={e => setFormP(p => ({ ...p, tanggal: e.target.value }))} />
                
              <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px', marginTop: 10, background: '#fafafa' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#4b5563', marginBottom: 8 }}>PRODUKSI DAN OMSET</div>
                
                {[
                  { key: 'cabai', label: 'Cabai', unit: 'kg', priceUnit: 'Rp/kg' },
                  { key: 'tomat', label: 'Tomat', unit: 'kg', priceUnit: 'Rp/kg' },
                  { key: 'sawi', label: 'Sawi', unit: 'kg', priceUnit: 'Rp/kg' },
                  { key: 'pakcoy', label: 'Pakcoy', unit: 'kg', priceUnit: 'Rp/kg' },
                  { key: 'buah_buahan', label: 'Buah-buahan', unit: 'kg', priceUnit: 'Rp/kg' },
                  { key: 'sayuran', label: 'Sayuran', unit: 'kg', priceUnit: 'Rp/kg' },
                  { key: 'minuman_herbal', label: 'Minuman herbal', unit: 'botol', priceUnit: 'Rp/botol' },
                  { key: 'kue', label: 'Kue', unit: 'kg', priceUnit: 'Rp/kg' },
                  { key: 'keripik', label: 'Keripik', unit: 'kg', priceUnit: 'Rp/kg' },
                  { key: 'lainnya', label: 'Lainnya', unit: 'kg', priceUnit: 'Rp/kg' }
                ].map(item => (
                  <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <span style={{ fontSize: 11, flex: 1.5 }}>{item.label}</span>
                    <input type="number" min="0" placeholder="0" style={{ width: 55, fontSize: 11, padding: '2px 4px', border: '1px solid #d1d5db', borderRadius: 4 }}
                      value={formP.produk[item.key]?.qty || ''} onChange={e => {
                        const qtyVal = e.target.value;
                        setFormP(prev => ({
                          ...prev,
                          produk: {
                            ...prev.produk,
                            [item.key]: {
                              ...prev.produk[item.key],
                              qty: qtyVal
                            }
                          }
                        }));
                      }} />
                    <span style={{ fontSize: 10, color: '#999', width: 30 }}>{item.unit}</span>
                    
                    <span style={{ fontSize: 10, color: '#666' }}>{item.priceUnit}</span>
                    <input type="number" min="0" placeholder="0" style={{ width: 70, fontSize: 11, padding: '2px 4px', border: '1px solid #d1d5db', borderRadius: 4 }}
                      value={formP.produk[item.key]?.harga || ''} onChange={e => {
                        const hargaVal = e.target.value;
                        setFormP(prev => ({
                          ...prev,
                          produk: {
                            ...prev.produk,
                            [item.key]: {
                              ...prev.produk[item.key],
                              harga: hargaVal
                            }
                          }
                        }));
                      }} />
                  </div>
                ))}
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>LUAS LAHAN PRODUKSI:</span>
                <input type="number" min="0" placeholder="0" style={{ width: 60, fontSize: 11, padding: '4px 6px', border: '1px solid #d1d5db', borderRadius: 4 }}
                  value={formP.luas_lahan} onChange={e => {
                    const luasVal = e.target.value;
                    setFormP(prev => ({ ...prev, luas_lahan: luasVal }));
                  }} />
                <span style={{ fontSize: 11, color: '#666' }}>m2</span>
              </div>
              
              <button className="sp-btn" style={{ width: '100%', background: '#e76f51', color: '#fff', fontSize: 11, fontWeight: 700, padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 12 }}
                disabled={saving} onClick={saveProduksi}>
                💾 SIMPAN PRODUKSI
              </button>
            </div>
          )}

          {/* Simpan / Batal */}
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button className="sp-btn" style={{ flex: 1, background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb' }}
              onClick={() => { setShowForm(false); setEditTarget(null); setForm(initForm); setGpsInput(''); }}>Batal</button>
            <button className="sp-btn sp-btn-primary" style={{ flex: 2 }} disabled={saving} onClick={handleSave}>
              💾 {saving ? 'Menyimpan...' : editTarget ? 'Update' : 'Simpan'}
            </button>
          </div>
          {editTarget && (
            <button className="sp-btn sp-btn-danger" style={{ width: '100%', marginTop: 8 }} onClick={() => handleDelete(editTarget.id)}>
              🗑️ Hapus Data Ini
            </button>
          )}
        </div>
      )}

      {/* ── Pin KMZ ── */}
      {poktanKMZ && poktanKMZ.length > 0 && (
        <div className="sp-info-box">
          <div className="sp-info-box__title">📍 Pin KMZ ({poktanKMZ.length})</div>
          <label className="sp-check-row"><input type="checkbox" checked={showPoktan} onChange={e => onTogglePoktan(e.target.checked)} /> Poktan</label>
          <label className="sp-check-row"><input type="checkbox" checked={showKWT} onChange={e => onToggleKWT(e.target.checked)} /> KWT</label>
          <label className="sp-check-row"><input type="checkbox" checked={showGapoktan} onChange={e => onToggleGapoktan(e.target.checked)} /> Gapoktan</label>
          {poktanKMZ.map(p => (
            <div key={p._id} className="sp-drawn-item" style={{ borderLeft: '3px solid #2d6a4f', marginTop: 6 }}
              onClick={() => mapRef?.current?.flyTo([p._lat, p._lng], 17, { duration: 1 })}>
              <div>
                <b style={{ fontSize: 11 }}>👨‍🌾 {p._name}</b>
                <div style={{ fontSize: 10, color: '#888' }}>{p._jenis} {p._ketua && '· Ketua: ' + p._ketua}</div>
                {p._kelurahan && <div style={{ fontSize: 10, color: '#2d6a4f' }}>🏘️ {p._kelurahan}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Daftar DB ── */}
      <div className="sp-info-box">
        <div className="sp-info-box__title">📋 Data Poktan / KWT ({poktanList?.length || 0})</div>
        {!poktanList || poktanList.length === 0
          ? <p style={{ color: '#999', fontSize: 12 }}>Belum ada data.</p>
          : poktanList.map(p => (
            <div key={p.id} style={{ background: '#f9fafb', border: '1px solid #f0f0f0', borderLeft: `3px solid ${statusColor(p.status_aktif)}`, borderRadius: 8, padding: '9px 10px', marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, cursor: p.lat ? 'pointer' : 'default' }}
                  onClick={() => p.lat && p.lng && mapRef?.current?.flyTo([p.lat, p.lng], 17, { duration: 1 })}>
                  <b style={{ fontSize: 12 }}>👨‍🌾 {p.nama_poktan}</b>
                  <span style={{ fontSize: 10, background: p.status_aktif === 'Aktif' ? '#dcfce7' : '#f3f4f6', color: statusColor(p.status_aktif), borderRadius: 4, padding: '1px 6px', marginLeft: 6, fontWeight: 600 }}>
                    {p.status_aktif || 'Aktif'}
                  </span>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{p.jenis} {p.nama_ketua && '· Ketua: ' + p.nama_ketua}</div>
                  {p.jumlah_anggota && <div style={{ fontSize: 10, color: '#888' }}>👤 {p.jumlah_anggota} anggota</div>}
                  {p.kelurahan && <div style={{ fontSize: 10, color: '#2d6a4f' }}>🏘️ {p.kelurahan}</div>}
                  {p.jenis === 'KWT' && (() => {
                    const logs = safeParseCatatan(p.catatan);
                    if (logs.length === 0) return null;
                    
                    let totalKg = 0;
                    let totalOmset = 0;
                    logs.forEach(entry => {
                      const prodData = entry.produk || {};
                      Object.entries(prodData).forEach(([prodKey, val]) => {
                        const qty = parseFloat(val?.qty || 0);
                        const harga = parseFloat(val?.harga || 0);
                        totalOmset += qty * harga;
                        if (prodKey !== 'minuman_herbal') {
                          totalKg += qty;
                        }
                      });
                    });
                    
                    return (
                      <div style={{ fontSize: 10, color: '#7c3aed', fontWeight: 600, marginTop: 4 }}>
                        🍇 Produksi: {(totalKg / 1000).toFixed(2)} ton · 💰 Omset: Rp. {totalOmset.toLocaleString('id-ID')}
                      </div>
                    );
                  })()}
                  {p.produk_unggulan && (
                    <div style={{ fontSize: 10, marginTop: 3, background: '#fef3c7', color: '#92400e', borderRadius: 4, padding: '2px 6px', display: 'inline-block' }}>
                      🌾 {p.produk_unggulan}
                    </div>
                  )}
                </div>
                {user && (
                  <button onClick={() => openEdit(p)}
                    style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, padding: '3px 8px', fontSize: 10, cursor: 'pointer', color: '#1d4ed8', fontWeight: 600, flexShrink: 0, marginLeft: 8 }}>
                    ✏️ Edit
                  </button>
                )}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

export default PoktanKWT;
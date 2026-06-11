// eslint-disable-next-line no-unused-vars
import React, { useState } from 'react';
import { PALAWIJA_CONFIG } from '../../config/komoditas';
import { fmtTgl, hitungHariTanam } from '../../utils/agronomi';
import { parseCoordinates } from '../../utils/parsers';

function Palawija({ palawijaKMZ, palawijaList, showPin, onToggleShow, user, mapRef, supabase, onRefresh, onPickLocation, onFlyToLocation }) {
  const initForm = { komoditas: 'jagung', nama_pemilik: '', kapasitas_value: '', kapasitas_satuan: 'luas_m2', tanggal_tanam: '', catatan: '' };
  const [form, setForm]           = useState(initForm);
  const [pendingPin, setPendingPin] = useState(null);
  const [gpsInput, setGpsInput]     = useState('');
  const [editTarget, setEditTarget] = useState(null);
  const [saving, setSaving]       = useState(false);
  const [mode, setMode]           = useState(null); // null | 'add' | 'edit'

  const openAdd = () => {
    setForm(initForm);
    setEditTarget(null);
    setPendingPin(null);
    setGpsInput('');
    setMode('add');
  };

  const openEdit = (p) => {
    if (user && p.user_id !== user.id) {
      alert('Anda tidak memiliki izin untuk mengedit data ini.');
      return;
    }
    setForm({
      komoditas: p.komoditas || 'jagung',
      nama_pemilik: p.nama_pemilik || '',
      kapasitas_value: p.kapasitas_value || '',
      kapasitas_satuan: p.kapasitas_satuan || 'luas_m2',
      tanggal_tanam: p.tanggal_tanam || '',
      catatan: p.catatan || '',
    });
    setPendingPin(p.lat && p.lon ? { lat: p.lat, lng: p.lon } : null);
    setEditTarget(p);
    setMode('edit');
    window.scrollTo(0,0);
  };

  const handleSave = async () => {
    if (!user) return alert('Silakan login terlebih dahulu.');
    if (!form.nama_pemilik) return alert('Nama pemilik wajib diisi.');
    if (editTarget && editTarget.user_id !== user.id) return alert('Anda tidak memiliki izin untuk mengubah data ini.');
    setSaving(true);
    const cfg = PALAWIJA_CONFIG[form.komoditas];
    const tgl = form.tanggal_tanam || null;
    const prediksi = tgl && cfg ? new Date(new Date(tgl).getTime() + cfg.umur * 864e5).toISOString().split('T')[0] : null;
    const payload = {
      komoditas: form.komoditas,
      nama_pemilik: form.nama_pemilik,
      lat: pendingPin?.lat || 0,
      lon: pendingPin?.lng || 0,
      kapasitas_value: (!form.kapasitas_value || isNaN(parseFloat(form.kapasitas_value))) ? null : parseFloat(form.kapasitas_value),
      kapasitas_satuan: form.kapasitas_satuan,
      tanggal_tanam: tgl,
      prediksi_panen: prediksi,
      catatan: form.catatan,
    };
    let error;
    if (editTarget) {
      ({ error } = await supabase.from('komoditas_palawija').update(payload).eq('id', editTarget.id));
    } else {
      payload.user_id = user.id;
      ({ error } = await supabase.from('komoditas_palawija').insert(payload));
    }
    setSaving(false);
    if (error) { alert('Gagal simpan: ' + error.message); return; }
    setForm(initForm); setEditTarget(null); setPendingPin(null); setGpsInput(''); setMode(null);
    if (onRefresh) onRefresh();
  };

  const handleDelete = async (id) => {
    if (!user) return alert('Silakan login terlebih dahulu.');
    const item = (palawijaList || []).find(x => x.id === id);
    if (item && item.user_id !== user.id) return alert('Anda tidak memiliki izin untuk menghapus data ini.');
    if (!window.confirm('Tindakan ini tidak dapat dibatalkan (undo). Apakah Anda yakin ingin menghapus data lahan palawija ini secara permanen?')) return;
    const { error } = await supabase.from('komoditas_palawija').delete().eq('id', id);
    if (error) { alert('Gagal hapus: ' + error.message); return; }
    setMode(null); setEditTarget(null); setPendingPin(null); setForm(initForm); setGpsInput('');
    if (onRefresh) onRefresh();
  };

  const flyTo = (lat, lon) => { if (mapRef?.current) mapRef.current.flyTo([lat, lon], 17, { duration: 1 }); };
  const isEditing = !!editTarget;

  return (
    <div style={{ padding: 12 }}>
      {/* KMZ Pins */}
      {palawijaKMZ && palawijaKMZ.length > 0 && (
        <div className="sp-info-box">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="sp-info-box__title" style={{ margin: 0 }}>📍 Pin KMZ ({palawijaKMZ.length})</div>
            <label className="sp-check-row" style={{ margin: 0 }}>
              <input type="checkbox" checked={showPin} onChange={e => onToggleShow(e.target.checked)} />
              <span style={{ fontSize: 10 }}>Tampilkan</span>
            </label>
          </div>
        </div>
      )}

      {/* Tombol Tambah */}
      {user && (
        <button className="sp-btn sp-btn-primary" style={{ width: '100%', marginBottom: 12 }}
          onClick={() => {
            if (mode === 'add') {
              setMode(null);
              setEditTarget(null);
            } else {
              openAdd();
            }
          }}>
          ➕ {mode === 'add' ? 'Tutup Form' : 'Tambah Palawija'}
        </button>
      )}

      {/* Form Tambah/Edit */}
      {(mode === 'add' || mode === 'edit') && user && (
        <div className="sp-info-box">
          <div className="sp-info-box__title">
            {isEditing ? '✏️ Edit Palawija' : '➕ Tambah Palawija'}
          </div>

          <select className="sp-select" value={form.komoditas} onChange={e => setForm(p => ({ ...p, komoditas: e.target.value }))}>
            {Object.entries(PALAWIJA_CONFIG).map(([k, c]) => <option key={k} value={k}>{c.icon} {c.label} ({c.umur} hr)</option>)}
          </select>
          <input className="sp-input" placeholder="Nama pemilik *" value={form.nama_pemilik}
            onChange={e => setForm(p => ({ ...p, nama_pemilik: e.target.value }))} style={{ marginTop: 8 }} />
          <input type="date" className="sp-input" value={form.tanggal_tanam}
            onChange={e => setForm(p => ({ ...p, tanggal_tanam: e.target.value }))} style={{ marginTop: 8 }} />
          <input className="sp-input" placeholder="Catatan" value={form.catatan}
            onChange={e => setForm(p => ({ ...p, catatan: e.target.value }))} style={{ marginTop: 8 }} />

          <button className="sp-btn sp-btn-secondary" style={{ width: '100%', marginTop: 10 }}
            onClick={() => onPickLocation && onPickLocation((latlng) => setPendingPin(latlng))}>
            📍 {pendingPin ? `✅ ${pendingPin.lat.toFixed(5)}, ${pendingPin.lng.toFixed(5)}` : 'Pilih Lokasi di Peta (opsional)'}
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
              onClick={() => { setMode(null); setEditTarget(null); setPendingPin(null); setGpsInput(''); }}>Batal</button>
            <button className="sp-btn sp-btn-primary" disabled={saving} onClick={handleSave}>
              💾 {saving ? '⏳...' : (isEditing ? 'Update' : 'Simpan')}
            </button>
          </div>
          {isEditing && (
            <button className="sp-btn sp-btn-danger" style={{ width: '100%', marginTop: 8 }} onClick={() => handleDelete(editTarget.id)}>
              🗑️ Hapus Lahan Ini
            </button>
          )}
        </div>
      )}

      {/* Daftar Data */}
      <div className="sp-info-box">
        <div className="sp-info-box__title">📋 Data Palawija ({palawijaList?.length || 0})</div>
        {!palawijaList || palawijaList.length === 0
          ? <p style={{ color: '#999', fontSize: 12 }}>Belum ada data.</p>
          : palawijaList.map(p => {
              const cfg = PALAWIJA_CONFIG[p.komoditas] || {};
              const hari = hitungHariTanam(p.tanggal_tanam);
              return (
                <div key={p.id} style={{ background: '#fff', border: '1px solid #e8f5e9', borderLeft: '3px solid #74c69d', borderRadius: 8, padding: '8px 10px', marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, cursor: p.lat && p.lon ? 'pointer' : 'default' }} onClick={() => p.lat && flyTo(p.lat, p.lon)}>
                      <b style={{ fontSize: 12 }}>{cfg.icon} {cfg.label || p.komoditas}</b>
                      {p.nama_pemilik && <span style={{ color: '#666', fontSize: 11 }}> · {p.nama_pemilik}</span>}
                      <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                        📅 Tanam: {fmtTgl(p.tanggal_tanam)} {hari !== null ? `(${hari} HST)` : ''}
                      </div>
                      {p.prediksi_panen && <div style={{ fontSize: 11, color: '#52b788' }}>🌾 Est. Panen: {fmtTgl(p.prediksi_panen)}</div>}
                      {p.catatan && <div style={{ fontSize: 10, color: '#aaa' }}>{p.catatan}</div>}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginLeft: 6 }}>
                      {user && p.user_id === user.id && (
                        <>
                          <button style={{ background: '#fff3e0', border: 'none', borderRadius: 4, padding: '3px 7px', fontSize: 11, cursor: 'pointer' }}
                            onClick={() => openEdit(p)}>✏️</button>
                          <button style={{ background: '#fde8e8', border: 'none', borderRadius: 4, padding: '3px 7px', fontSize: 11, cursor: 'pointer', color: '#c0392b' }}
                            onClick={() => handleDelete(p.id)}>🗑️</button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
      </div>
    </div>
  );
}

export default Palawija;
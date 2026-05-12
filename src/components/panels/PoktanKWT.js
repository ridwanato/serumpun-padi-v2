// eslint-disable-next-line no-unused-vars
import React, { useState } from 'react';
import { ALL_KEL, KEL_TO_KEC } from '../../config/wilayah';

function PoktanKWT({ poktanKMZ, poktanList, showPoktan, showKWT, showGapoktan, onTogglePoktan, onToggleKWT, onToggleGapoktan, user, mapRef, supabase, onRefresh }) {
  const [form, setForm] = useState({ nama_poktan: '', jenis: 'Poktan', nama_ketua: '', jumlah_anggota: '', kelurahan: '', kecamatan: '', catatan: '' });
  const [pendingPin, setPendingPin] = useState(null);
  const [picking, setPicking] = useState(false);

  const handleSave = async () => {
    if (!user) return alert('Login dulu.');
    if (!pendingPin) return alert('Pilih lokasi di peta.');
    if (!form.nama_poktan) return alert('Nama wajib diisi.');
    const { error } = await supabase.from('poktan_kwt').insert({
      user_id: user.id, lat: pendingPin.lat, lng: pendingPin.lng,
      nama_poktan: form.nama_poktan, jenis: form.jenis, nama_ketua: form.nama_ketua || null,
      jumlah_anggota: form.jumlah_anggota ? parseInt(form.jumlah_anggota) : null,
      kelurahan: form.kelurahan || null, kecamatan: form.kecamatan || null, catatan: form.catatan || null,
    });
    if (error) { alert('Gagal: ' + error.message); return; }
    setPendingPin(null); setPicking(false);
    setForm({ nama_poktan: '', jenis: 'Poktan', nama_ketua: '', jumlah_anggota: '', kelurahan: '', kecamatan: '', catatan: '' });
    if (onRefresh) onRefresh();
  };

  const handleDelete = async (id) => {
    await supabase.from('poktan_kwt').delete().eq('id', id);
    if (onRefresh) onRefresh();
  };

  return (
    <div style={{ padding: 12 }}>
      {user && (
        <div className="sp-info-box">
          <div className="sp-info-box__title">➕ Tambah Poktan / KWT</div>
          <select className="sp-select" value={form.jenis} onChange={e => setForm(p => ({ ...p, jenis: e.target.value }))}>
            <option>Poktan</option><option>KWT</option><option>Gapoktan</option>
          </select>
          <input className="sp-input" placeholder="Nama kelompok *" value={form.nama_poktan} onChange={e => setForm(p => ({ ...p, nama_poktan: e.target.value }))} style={{ marginTop: 8 }} />
          <input className="sp-input" placeholder="Nama ketua" value={form.nama_ketua} onChange={e => setForm(p => ({ ...p, nama_ketua: e.target.value }))} style={{ marginTop: 8 }} />
          <input type="number" className="sp-input" placeholder="Jumlah anggota" value={form.jumlah_anggota} onChange={e => setForm(p => ({ ...p, jumlah_anggota: e.target.value }))} style={{ marginTop: 8 }} />
          <select className="sp-select" value={form.kelurahan} onChange={e => setForm(p => ({ ...p, kelurahan: e.target.value }))} style={{ marginTop: 8 }}>
            <option value="">-- Pilih Kelurahan --</option>
            {ALL_KEL.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button className="sp-btn sp-btn-secondary" style={{ flex: 2 }} onClick={() => setPicking(true)}>
              📍 {pendingPin ? '✅ Dipilih' : 'Pilih Lokasi'}
            </button>
            <button className="sp-btn sp-btn-primary" style={{ flex: 1 }} onClick={handleSave}>💾 Simpan</button>
          </div>
        </div>
      )}

      {poktanKMZ && poktanKMZ.length > 0 && (
        <div className="sp-info-box">
          <div className="sp-info-box__title">📍 Pin KMZ ({poktanKMZ.length})</div>
          <label className="sp-check-row"><input type="checkbox" checked={showPoktan} onChange={e => onTogglePoktan(e.target.checked)} /> Poktan</label>
          <label className="sp-check-row"><input type="checkbox" checked={showKWT} onChange={e => onToggleKWT(e.target.checked)} /> KWT</label>
          <label className="sp-check-row"><input type="checkbox" checked={showGapoktan} onChange={e => onToggleGapoktan(e.target.checked)} /> Gapoktan</label>
          {poktanKMZ.map(p => (
            <div key={p._id} className="sp-drawn-item" style={{ borderLeft: '3px solid #2d6a4f', marginTop: 6 }}
              onClick={() => mapRef?.current?.flyTo([p._lat, p._lng], 17, { duration: 1 })}>
              <b style={{ fontSize: 11 }}>👨‍🌾 {p._name}</b>
              <div style={{ fontSize: 10, color: '#888' }}>{p._jenis} {p._ketua && '· Ketua: ' + p._ketua} {p._anggota && '· ' + p._anggota + ' org'}</div>
              {p._kelurahan && <div style={{ fontSize: 10, color: '#2d6a4f' }}>🏘️ {p._kelurahan}</div>}
            </div>
          ))}
        </div>
      )}

      <div className="sp-info-box">
        <div className="sp-info-box__title">📋 Data Poktan/KWT ({poktanList?.length || 0})</div>
        {!poktanList || poktanList.length === 0 ? <p style={{ color: '#999', fontSize: 12 }}>Belum ada data.</p> :
          poktanList.map(p => (
            <div key={p.id} style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: 8, padding: '8px 10px', marginBottom: 6 }}>
              <b>👨‍🌾 {p.nama_poktan}</b> <span style={{ color: '#888', fontSize: 11 }}>· {p.jenis}</span>
              {p.nama_ketua && <div style={{ fontSize: 11, color: '#888' }}>Ketua: {p.nama_ketua}</div>}
              {p.jumlah_anggota && <div style={{ fontSize: 11, color: '#888' }}>👤 {p.jumlah_anggota} anggota</div>}
              {p.kelurahan && <div style={{ fontSize: 10, color: '#2d6a4f' }}>🏘️ {p.kelurahan}</div>}
              {user && <button className="sp-btn sp-btn-danger" style={{ fontSize: 10, padding: '2px 6px', marginTop: 4 }} onClick={() => handleDelete(p.id)}>🗑️</button>}
            </div>
          ))}
      </div>
    </div>
  );
}

export default PoktanKWT;
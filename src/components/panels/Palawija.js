// eslint-disable-next-line no-unused-vars
import React, { useState } from 'react';
import { PALAWIJA_CONFIG } from '../../config/komoditas';
import { fmtTgl, hitungHariTanam } from '../../utils/agronomi';

function Palawija({ palawijaKMZ, palawijaList, showPin, onToggleShow, user, mapRef, supabase, onRefresh }) {
  const [form, setForm] = useState({ komoditas: 'jagung', nama_pemilik: '', kapasitas_value: '', kapasitas_satuan: 'luas_m2', tanggal_tanam: '', catatan: '' });
  const [pendingPin, setPendingPin] = useState(null);
  const [picking, setPicking] = useState(false);

  const handleSave = async () => {
    if (!user) return alert('Silakan login.');
    if (!pendingPin) return alert('Klik peta untuk lokasi pin.');
    const cfg = PALAWIJA_CONFIG[form.komoditas];
    const tgl = form.tanggal_tanam || null;
    const prediksi = tgl && cfg ? new Date(new Date(tgl).getTime() + cfg.umur * 864e5).toISOString().split('T')[0] : null;
    const { error } = await supabase.from('komoditas_palawija').insert({
      user_id: user.id, komoditas: form.komoditas, nama_pemilik: form.nama_pemilik,
      lat: pendingPin.lat, lon: pendingPin.lng, kapasitas_value: form.kapasitas_value || null,
      kapasitas_satuan: form.kapasitas_satuan, tanggal_tanam: tgl, prediksi_panen: prediksi, catatan: form.catatan,
    });
    if (error) { alert('Gagal: ' + error.message); return; }
    setPendingPin(null); setPicking(false);
    setForm({ komoditas: 'jagung', nama_pemilik: '', kapasitas_value: '', kapasitas_satuan: 'luas_m2', tanggal_tanam: '', catatan: '' });
    if (onRefresh) onRefresh();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus?')) return;
    await supabase.from('komoditas_palawija').delete().eq('id', id);
    if (onRefresh) onRefresh();
  };

  const flyTo = (lat, lng) => { if (mapRef?.current) mapRef.current.flyTo([lat, lng], 17, { duration: 1 }); };

  return (
    <div style={{ padding: 12 }}>
      {palawijaKMZ && palawijaKMZ.length > 0 && (
        <div className="sp-info-box">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="sp-info-box__title" style={{ margin: 0 }}>📍 Pin KMZ ({palawijaKMZ.length})</div>
            <label className="sp-check-row" style={{ margin: 0 }}>
              <input type="checkbox" checked={showPin} onChange={e => onToggleShow(e.target.checked)} />
              <span style={{ fontSize: 10 }}>Tampilkan</span>
            </label>
          </div>
          {palawijaKMZ.map(p => (
            <div key={p._id} className="sp-drawn-item" style={{ borderLeft: '3px solid #74c69d', marginTop: 6 }}
              onClick={() => flyTo(p._lat, p._lng)}>
              <b style={{ fontSize: 11 }}>🌿 {p._name}</b>
              <div style={{ fontSize: 10, color: '#888' }}>{p._komoditas} {p._pemilik && '👤 ' + p._pemilik} {p._luas && '📐 ' + p._luas + ' m²'}</div>
              {p._tgl_tanam && <div style={{ fontSize: 10, color: '#74c69d' }}>📅 Tanam: {p._tgl_tanam}</div>}
            </div>
          ))}
        </div>
      )}

      {user && (
        <div className="sp-info-box">
          <div className="sp-info-box__title">➕ Tambah Palawija</div>
          <select className="sp-select" value={form.komoditas} onChange={e => setForm(p => ({ ...p, komoditas: e.target.value }))}>
            {Object.entries(PALAWIJA_CONFIG).map(([k, c]) => <option key={k} value={k}>{c.icon} {c.label} ({c.umur} hr)</option>)}
          </select>
          <input className="sp-input" placeholder="Nama pemilik" value={form.nama_pemilik} onChange={e => setForm(p => ({ ...p, nama_pemilik: e.target.value }))} style={{ marginTop: 8 }} />
          <input type="date" className="sp-input" value={form.tanggal_tanam} onChange={e => setForm(p => ({ ...p, tanggal_tanam: e.target.value }))} style={{ marginTop: 8 }} />
          <input className="sp-input" placeholder="Catatan" value={form.catatan} onChange={e => setForm(p => ({ ...p, catatan: e.target.value }))} style={{ marginTop: 8 }} />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button className="sp-btn sp-btn-secondary" style={{ flex: 2 }} onClick={() => setPicking(true)}>
              📍 {pendingPin ? '✅ ' + pendingPin.lat.toFixed(5) : 'Pilih Lokasi'}
            </button>
            <button className="sp-btn sp-btn-primary" style={{ flex: 1 }} onClick={handleSave}>💾 Simpan</button>
          </div>
        </div>
      )}

      <div className="sp-info-box">
        <div className="sp-info-box__title">📋 Data Palawija ({palawijaList?.length || 0})</div>
        {!palawijaList || palawijaList.length === 0 ? <p style={{ color: '#999', fontSize: 12 }}>Belum ada data.</p> :
          palawijaList.map(p => {
            const cfg = PALAWIJA_CONFIG[p.komoditas] || {};
            const hari = hitungHariTanam(p.tanggal_tanam);
            return (
              <div key={p.id} style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: 8, padding: '8px 10px', marginBottom: 6 }}>
                <b>{cfg.icon} {cfg.label || p.komoditas}</b>
                {p.nama_pemilik && <span style={{ color: '#888', fontSize: 11 }}> · {p.nama_pemilik}</span>}
                <div style={{ fontSize: 11, color: '#888' }}>📅 Tanam: {fmtTgl(p.tanggal_tanam)} {hari !== null ? `(${hari} HST)` : ''}</div>
                {p.prediksi_panen && <div style={{ fontSize: 11, color: '#52b788' }}>🌾 Panen: {fmtTgl(p.prediksi_panen)}</div>}
                {user && <button className="sp-btn sp-btn-danger" style={{ fontSize: 10, padding: '2px 6px', marginTop: 4 }} onClick={() => handleDelete(p.id)}>🗑️</button>}
              </div>
            );
          })}
      </div>
    </div>
  );
}

export default Palawija;
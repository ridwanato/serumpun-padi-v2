import React, { useState } from 'react';
import { HORTIKULTURA_CONFIG } from '../../config/komoditas';
import { fmtTgl, hitungHariTanam } from '../../utils/agronomi';

function Hortikultura({
  hortiKMZ,
  hortis,
  showHortiPin,
  onToggleShow,
  user,
  mapRef,
  supabase,
  onRefresh,
}) {
  const [form, setForm] = useState({
    komoditas: 'cabai_merah',
    nama_pemilik: '',
    kapasitas_value: '',
    kapasitas_satuan: 'luas_m2',
    tanggal_tanam: '',
    catatan: '',
  });
  const [pendingPin, setPendingPin] = useState(null);
  const [picking, setPicking] = useState(false);

  const handleSave = async () => {
    if (!user) return alert('Silakan login terlebih dahulu.');
    if (!pendingPin) return alert('Klik peta untuk menentukan lokasi pin.');
    const cfg = HORTIKULTURA_CONFIG[form.komoditas];
    const tgl = form.tanggal_tanam || null;
    const prediksi = tgl && cfg
      ? new Date(new Date(tgl).getTime() + cfg.umur * 864e5).toISOString().split('T')[0]
      : null;

    const { error } = await supabase.from('komoditas_hortikultura').insert({
      user_id: user.id,
      komoditas: form.komoditas,
      nama_pemilik: form.nama_pemilik,
      lat: pendingPin.lat,
      lon: pendingPin.lng,
      kapasitas_value: form.kapasitas_value || null,
      kapasitas_satuan: form.kapasitas_satuan,
      tanggal_tanam: tgl,
      prediksi_panen: prediksi,
      catatan: form.catatan,
    });

    if (error) { alert('Gagal simpan: ' + error.message); return; }

    setPendingPin(null);
    setPicking(false);
    setForm({ komoditas: 'cabai_merah', nama_pemilik: '', kapasitas_value: '', kapasitas_satuan: 'luas_m2', tanggal_tanam: '', catatan: '' });
    if (onRefresh) onRefresh();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus data ini?')) return;
    await supabase.from('komoditas_hortikultura').delete().eq('id', id);
    if (onRefresh) onRefresh();
  };

  const flyTo = (lat, lng) => {
    if (mapRef?.current) mapRef.current.flyTo([lat, lng], 17, { duration: 1 });
  };

  return (
    <div style={{ padding: 12 }}>
      {/* Pin KMZ */}
      {hortiKMZ && hortiKMZ.length > 0 && (
        <div className="sp-info-box">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="sp-info-box__title" style={{ margin: 0 }}>📍 Pin KMZ ({hortiKMZ.length})</div>
            <label className="sp-check-row" style={{ margin: 0 }}>
              <input type="checkbox" checked={showHortiPin} onChange={e => onToggleShow(e.target.checked)} />
              <span style={{ fontSize: 10 }}>Tampilkan</span>
            </label>
          </div>
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {hortiKMZ.map(p => (
              <div key={p._id} className="sp-drawn-item" style={{ borderLeft: '3px solid #52b788' }}
                onClick={() => flyTo(p._lat, p._lng)}>
                <b style={{ fontSize: 11 }}>🌶️ {p._name}</b>
                <div style={{ fontSize: 10, color: '#888' }}>
                  {p._komoditas && <span>{p._komoditas} </span>}
                  {p._pemilik && <span>👤 {p._pemilik} </span>}
                  {p._luas && <span>📐 {p._luas} m²</span>}
                </div>
                {p._tgl_tanam && <div style={{ fontSize: 10, color: '#52b788' }}>📅 Tanam: {p._tgl_tanam}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Form Tambah */}
      {user && (
        <div className="sp-info-box">
          <div className="sp-info-box__title">➕ Tambah Lokasi Hortikultura</div>

          <label style={{ fontSize: 11, color: '#888' }}>Komoditas</label>
          <select className="sp-select" value={form.komoditas}
            onChange={e => setForm(p => ({ ...p, komoditas: e.target.value }))}>
            {Object.entries(HORTIKULTURA_CONFIG).map(([k, c]) => (
              <option key={k} value={k}>{c.icon} {c.label} ({c.umur} hari)</option>
            ))}
          </select>

          <label style={{ fontSize: 11, color: '#888', marginTop: 8 }}>Nama Pemilik</label>
          <input className="sp-input" placeholder="Nama pemilik lahan" value={form.nama_pemilik}
            onChange={e => setForm(p => ({ ...p, nama_pemilik: e.target.value }))} />

          <label style={{ fontSize: 11, color: '#888', marginTop: 8 }}>Tanggal Tanam</label>
          <input type="date" className="sp-input" value={form.tanggal_tanam}
            onChange={e => setForm(p => ({ ...p, tanggal_tanam: e.target.value }))} />

          <label style={{ fontSize: 11, color: '#888', marginTop: 8 }}>Catatan</label>
          <input className="sp-input" placeholder="Opsional" value={form.catatan}
            onChange={e => setForm(p => ({ ...p, catatan: e.target.value }))} />

          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button className="sp-btn sp-btn-secondary" style={{ flex: 2 }}
              onClick={() => setPicking(true)}>
              📍 {pendingPin ? `✅ ${pendingPin.lat.toFixed(5)}, ${pendingPin.lng.toFixed(5)}` : 'Pilih Lokasi di Peta'}
            </button>
            <button className="sp-btn sp-btn-primary" style={{ flex: 1 }} onClick={handleSave}>💾 Simpan</button>
          </div>
        </div>
      )}

      {!user && (
        <p style={{ color: '#999', padding: '0 0 8px', fontSize: 12 }}>🔐 Login untuk menambah data.</p>
      )}

      {/* Data Tersimpan */}
      <div className="sp-info-box">
        <div className="sp-info-box__title">📋 Data Hortikultura ({hortis?.length || 0})</div>
        {!hortis || hortis.length === 0 ? (
          <p style={{ color: '#999', fontSize: 12 }}>Belum ada data.</p>
        ) : hortis.map(h => {
          const cfg = HORTIKULTURA_CONFIG[h.komoditas] || {};
          const hari = hitungHariTanam(h.tanggal_tanam);
          return (
            <div key={h.id} style={{
              background: '#fff', border: '1px solid #f0f0f0', borderRadius: 8,
              padding: '8px 10px', marginBottom: 6,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <b>{cfg.icon} {cfg.label || h.komoditas}</b>
                  {h.nama_pemilik && <span style={{ color: '#888', fontSize: 11 }}> · {h.nama_pemilik}</span>}
                  <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                    📅 Tanam: {fmtTgl(h.tanggal_tanam)} {hari !== null ? `(${hari} HST)` : ''}
                  </div>
                  {h.prediksi_panen && <div style={{ fontSize: 11, color: '#52b788' }}>🌾 Est. Panen: {fmtTgl(h.prediksi_panen)}</div>}
                  <div style={{ fontSize: 10, color: '#aaa' }}>📍 {h.lat?.toFixed(5)}, {h.lon?.toFixed(5)}</div>
                </div>
                {user && (
                  <button className="sp-btn sp-btn-danger" style={{ fontSize: 10, padding: '3px 8px' }}
                    onClick={() => handleDelete(h.id)}>🗑️</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Hortikultura;
// eslint-disable-next-line no-unused-vars
import React, { useState } from 'react';
import { HORTIKULTURA_CONFIG } from '../../config/komoditas';
import { fmtTgl, hitungHariTanam } from '../../utils/agronomi';
import { parseCoordinates } from '../../utils/parsers';

function Hortikultura({
  hortiKMZ, hortis, showHortiPin, onToggleShow,
  user, mapRef, supabase, onRefresh, onPickLocation, onFlyToLocation
}) {
  const [form, setForm] = useState({
    komoditas: 'cabai_merah', nama_pemilik: '',
    kapasitas_value: '', kapasitas_satuan: 'luas_m2',
    tanggal_tanam: '', catatan: '',
  });
  const [pendingPin, setPendingPin] = useState(null);
  const [gpsInput, setGpsInput]     = useState('');
  const [mode, setMode]             = useState(null); // null | 'add' | 'edit'
  const [editTarget, setEditTarget] = useState(null);

  const openAdd = () => {
    setForm({
      komoditas: 'cabai_merah', nama_pemilik: '',
      kapasitas_value: '', kapasitas_satuan: 'luas_m2',
      tanggal_tanam: '', catatan: '',
    });
    setPendingPin(null); setGpsInput(''); setEditTarget(null); setMode('add');
  };

  const openEdit = (h) => {
    if (user && h.user_id !== user.id) {
      alert('Anda tidak memiliki izin untuk mengedit data ini.');
      return;
    }
    setForm({
      komoditas: h.komoditas || 'cabai_merah',
      nama_pemilik: h.nama_pemilik || '',
      kapasitas_value: h.kapasitas_value !== null ? String(h.kapasitas_value) : '',
      kapasitas_satuan: h.kapasitas_satuan || 'luas_m2',
      tanggal_tanam: h.tanggal_tanam || '',
      catatan: h.catatan || '',
    });
    setPendingPin({ lat: h.lat, lng: h.lon });
    setGpsInput('');
    setEditTarget(h);
    setMode('edit');
    window.scrollTo(0,0);
  };

  const handleSave = async () => {
    if (!user) return alert('Silakan login terlebih dahulu.');
    if (!pendingPin) return alert('Klik peta untuk menentukan lokasi pin.');
    if (editTarget && editTarget.user_id !== user.id) return alert('Anda tidak memiliki izin untuk mengubah data ini.');
    const cfg = HORTIKULTURA_CONFIG[form.komoditas];
    const tgl = form.tanggal_tanam || null;
    const prediksi = tgl && cfg
      ? new Date(new Date(tgl).getTime() + cfg.umur * 864e5).toISOString().split('T')[0]
      : null;

    const payload = {
      komoditas: form.komoditas,
      nama_pemilik: form.nama_pemilik,
      lat: pendingPin.lat,
      lon: pendingPin.lng,
      kapasitas_value: (!form.kapasitas_value || isNaN(parseFloat(form.kapasitas_value))) ? null : parseFloat(form.kapasitas_value),
      kapasitas_satuan: form.kapasitas_satuan,
      tanggal_tanam: tgl,
      prediksi_panen: prediksi,
      catatan: form.catatan,
    };

    let error;
    if (editTarget) {
      ({ error } = await supabase.from('komoditas_hortikultura').update(payload).eq('id', editTarget.id));
    } else {
      payload.user_id = user.id;
      ({ error } = await supabase.from('komoditas_hortikultura').insert(payload));
    }

    if (error) { alert('Gagal simpan: ' + error.message); return; }

    setPendingPin(null);
    setGpsInput('');
    setEditTarget(null);
    setMode(null);
    setForm({ komoditas: 'cabai_merah', nama_pemilik: '', kapasitas_value: '', kapasitas_satuan: 'luas_m2', tanggal_tanam: '', catatan: '' });
    if (onRefresh) onRefresh();
  };

  const handleDelete = async (id) => {
    if (!user) return alert('Silakan login terlebih dahulu.');
    if (editTarget && editTarget.user_id !== user.id) return alert('Anda tidak memiliki izin untuk menghapus data ini.');
    if (!window.confirm('Tindakan ini tidak dapat dibatalkan (undo). Apakah Anda yakin ingin menghapus data lahan hortikultura ini secara permanen?')) return;
    await supabase.from('komoditas_hortikultura').delete().eq('id', id);
    setPendingPin(null);
    setGpsInput('');
    setEditTarget(null);
    setMode(null);
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
          ➕ {mode === 'add' ? 'Tutup Form' : 'Tambah Hortikultura'}
        </button>
      )}

      {/* Form Tambah/Edit */}
      {(mode === 'add' || mode === 'edit') && user && (
        <div className="sp-info-box">
          <div className="sp-info-box__title">{editTarget ? `✏️ Edit Hortikultura: ${editTarget.nama_pemilik || ''}` : '➕ Tambah Lahan Hortikultura'}</div>

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

          <button className="sp-btn sp-btn-secondary" style={{ width: '100%', marginTop: 10 }}
            onClick={() => onPickLocation && onPickLocation((latlng) => setPendingPin(latlng))}>
            📍 {pendingPin ? `✅ ${pendingPin.lat.toFixed(5)}, ${pendingPin.lng.toFixed(5)}` : 'Pilih Lokasi di Peta'}
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
            <button className="sp-btn sp-btn-primary" onClick={handleSave}>
              💾 {editTarget ? 'Update' : 'Simpan'}
            </button>
          </div>
          {editTarget && (
            <button className="sp-btn sp-btn-danger" style={{ width: '100%', marginTop: 8 }} onClick={() => handleDelete(editTarget.id)}>
              🗑️ Hapus Lahan Ini
            </button>
          )}
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
                <div style={{ flex: 1, cursor: h.lat && h.lon ? 'pointer' : 'default' }}
                  onClick={() => h.lat && h.lon && flyTo(h.lat, h.lon)}>
                  <b>{cfg.icon} {cfg.label || h.komoditas}</b>
                  {h.nama_pemilik && <span style={{ color: '#888', fontSize: 11 }}> · {h.nama_pemilik}</span>}
                  <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                    📅 Tanam: {fmtTgl(h.tanggal_tanam)} {hari !== null ? `(${hari} HST)` : ''}
                  </div>
                  {h.prediksi_panen && <div style={{ fontSize: 11, color: '#52b788' }}>🌾 Est. Panen: {fmtTgl(h.prediksi_panen)}</div>}
                  <div style={{ fontSize: 10, color: '#aaa' }}>📍 {h.lat?.toFixed(5)}, {h.lon?.toFixed(5)}</div>
                </div>
                {user && h.user_id === user.id && (
                  <button className="sp-btn sp-btn-secondary" style={{ fontSize: 10, padding: '3px 8px', border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1d4ed8' }}
                    onClick={() => openEdit(h)}>✏️ Edit</button>
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
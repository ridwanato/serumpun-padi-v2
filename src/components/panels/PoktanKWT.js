// eslint-disable-next-line no-unused-vars
import React, { useState } from 'react';
import { ALL_KEL } from '../../config/wilayah';

function PoktanKWT({ poktanKMZ, poktanList, showPoktan, showKWT, showGapoktan, onTogglePoktan, onToggleKWT, onToggleGapoktan, user, mapRef, supabase, onRefresh, onPickLocation }) {
  const initForm = {
    nama_poktan: '', jenis: 'Poktan', nama_ketua: '',
    jumlah_anggota: '', kelurahan: '',
    produk_unggulan: '', status_aktif: 'Aktif', catatan: '',
  };
  const [form, setForm]           = useState(initForm);
  const [editTarget, setEditTarget] = useState(null);
  const [pendingPin, setPendingPin] = useState(null);
  const [picking, setPicking]     = useState(false);
  const [showForm, setShowForm]   = useState(false);
  const [saving, setSaving]       = useState(false);

  const openAdd = () => {
    setForm(initForm); setEditTarget(null); setPendingPin(null); setShowForm(true);
  };
  const openEdit = (p) => {
    setForm({
      nama_poktan: p.nama_poktan || '', jenis: p.jenis || 'Poktan',
      nama_ketua: p.nama_ketua || '', jumlah_anggota: String(p.jumlah_anggota || ''),
      kelurahan: p.kelurahan || '',
      produk_unggulan: p.produk_unggulan || '', status_aktif: p.status_aktif || 'Aktif',
      catatan: p.catatan || '',
    });
    setPendingPin(p.lat && p.lng ? { lat: p.lat, lng: p.lng } : null);
    setEditTarget(p); setShowForm(true);
  };

  const handleSave = async () => {
    if (!user) return alert('Login dulu.');
    if (!form.nama_poktan) return alert('Nama kelompok wajib diisi.');
    setSaving(true);
    const payload = {
      nama_poktan: form.nama_poktan, jenis: form.jenis,
      nama_ketua: form.nama_ketua || null,
      jumlah_anggota: form.jumlah_anggota ? parseInt(form.jumlah_anggota) : null,
      kelurahan: form.kelurahan || null,
      produk_unggulan: form.produk_unggulan || null,
      status_aktif: form.status_aktif || 'Aktif',
      catatan: form.catatan || null,
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
    setPendingPin(null); setPicking(false); setShowForm(false); setEditTarget(null); setForm(initForm);
    if (onRefresh) onRefresh();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus data ini?')) return;
    await supabase.from('poktan_kwt').delete().eq('id', id);
    if (onRefresh) onRefresh();
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
          <select className="sp-select" value={form.kelurahan} onChange={e => setForm(p => ({ ...p, kelurahan: e.target.value }))} style={{ marginTop: 8 }}>
            <option value="">-- Pilih Kelurahan --</option>
            {ALL_KEL.map(k => <option key={k} value={k}>{k}</option>)}
          </select>

          {/* Produk Unggulan — free text */}
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase' }}>Produk Unggulan</div>
            <input className="sp-input" placeholder="Contoh: Padi Ciherang, Jagung Manis, Cabai..." value={form.produk_unggulan}
              onChange={e => setForm(p => ({ ...p, produk_unggulan: e.target.value }))} style={{ marginTop: 0 }} />
          </div>

          {/* Status Aktif */}
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase' }}>Status Kelompok</div>
            <select className="sp-select" value={form.status_aktif} onChange={e => setForm(p => ({ ...p, status_aktif: e.target.value }))} style={{ marginTop: 0 }}>
              <option value="Aktif">✅ Aktif</option>
              <option value="Tidak Aktif">❌ Tidak Aktif</option>
              <option value="Vakum">⏸️ Vakum</option>
            </select>
          </div>

          {/* Catatan */}
          <input className="sp-input" placeholder="Catatan (opsional)" value={form.catatan}
            onChange={e => setForm(p => ({ ...p, catatan: e.target.value }))} style={{ marginTop: 8 }} />

          {/* Lokasi */}
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button className="sp-btn sp-btn-secondary" style={{ width:'100%', marginTop:8 }}
              onClick={() => onPickLocation && onPickLocation((latlng) => setPendingPin(latlng))}>
              📍 {pendingPin?`✅ ${pendingPin.lat.toFixed(4)}, ${pendingPin.lng.toFixed(4)}`:'Pilih Lokasi di Peta'}
            </button>
          </div>

          {/* Simpan / Batal */}
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button className="sp-btn" style={{ flex: 1, background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb' }}
              onClick={() => { setShowForm(false); setEditTarget(null); setForm(initForm); }}>Batal</button>
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
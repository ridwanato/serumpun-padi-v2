import React, { useState } from 'react';
import { WARNING_CONFIG } from '../../config/komoditas';
import { ALL_KEL, KEL_TO_KEC } from '../../config/wilayah';
import { fmtTgl } from '../../utils/agronomi';

function WarningOPT({ warningKMZ, warnings, showPin, onToggleShow, user, supabase, onRefresh }) {
  const [form, setForm] = useState({ jenis_warning: 'opt', nama_opt: '', komoditas: 'Padi', kelurahan: '', kecamatan: '', luas_terdampak: '', satuan_luas: 'ha', tanggal_kejadian: '', keterangan: '' });

  const handleSave = async () => {
    if (!user) return alert('Login dulu.');
    const { error } = await supabase.from('warning_opt').insert({
      user_id: user.id, jenis_warning: form.jenis_warning, nama_opt: form.nama_opt || null,
      komoditas: form.komoditas, kelurahan: form.kelurahan, kecamatan: form.kecamatan,
      luas_terdampak: form.luas_terdampak ? parseFloat(form.luas_terdampak) : null,
      satuan_luas: form.satuan_luas, tanggal_kejadian: form.tanggal_kejadian || null,
      keterangan: form.keterangan,
    });
    if (error) { alert('Gagal: ' + error.message); return; }
    setForm({ jenis_warning: 'opt', nama_opt: '', komoditas: 'Padi', kelurahan: '', kecamatan: '', luas_terdampak: '', satuan_luas: 'ha', tanggal_kejadian: '', keterangan: '' });
    if (onRefresh) onRefresh();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus?')) return;
    await supabase.from('warning_opt').delete().eq('id', id);
    if (onRefresh) onRefresh();
  };

  return (
    <div style={{ padding: 12 }}>
      {warningKMZ && warningKMZ.length > 0 && (
        <div className="sp-info-box">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="sp-info-box__title" style={{ margin: 0 }}>📍 Pin KMZ ({warningKMZ.length})</div>
            <label className="sp-check-row" style={{ margin: 0 }}>
              <input type="checkbox" checked={showPin} onChange={e => onToggleShow(e.target.checked)} />
              <span style={{ fontSize: 10 }}>Tampilkan</span>
            </label>
          </div>
          {warningKMZ.map(w => (
            <div key={w._id} className="sp-drawn-item" style={{ borderLeft: '3px solid #e63946', marginTop: 6 }}>
              <b style={{ fontSize: 11 }}>⚠️ {w._name}</b>
              <div style={{ fontSize: 10, color: '#888' }}>{w._jenis} {w._opt && '🐛 ' + w._opt}</div>
              {w._luas && <div style={{ fontSize: 10, color: '#e63946' }}>Terdampak: {w._luas} Ha</div>}
            </div>
          ))}
        </div>
      )}

      {user && (
        <div className="sp-info-box">
          <div className="sp-info-box__title">➕ Tambah Warning</div>
          <select className="sp-select" value={form.jenis_warning} onChange={e => setForm(p => ({ ...p, jenis_warning: e.target.value }))}>
            {Object.entries(WARNING_CONFIG).map(([k, c]) => <option key={k} value={k}>{c.icon} {c.label}</option>)}
          </select>
          {form.jenis_warning === 'opt' && <input className="sp-input" placeholder="Nama OPT" value={form.nama_opt} onChange={e => setForm(p => ({ ...p, nama_opt: e.target.value }))} style={{ marginTop: 8 }} />}
          <select className="sp-select" value={form.kelurahan} onChange={e => setForm(p => ({ ...p, kelurahan: e.target.value, kecamatan: KEL_TO_KEC[e.target.value] || '' }))} style={{ marginTop: 8 }}>
            <option value="">-- Pilih Kelurahan --</option>
            {ALL_KEL.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
          <input type="date" className="sp-input" value={form.tanggal_kejadian} onChange={e => setForm(p => ({ ...p, tanggal_kejadian: e.target.value }))} style={{ marginTop: 8 }} />
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <input type="number" className="sp-input" placeholder="Luas" value={form.luas_terdampak} onChange={e => setForm(p => ({ ...p, luas_terdampak: e.target.value }))} />
            <select className="sp-select" style={{ width: 80 }} value={form.satuan_luas} onChange={e => setForm(p => ({ ...p, satuan_luas: e.target.value }))}>
              <option value="ha">ha</option><option value="m2">m²</option>
            </select>
          </div>
          <button className="sp-btn sp-btn-primary" style={{ marginTop: 10, width: '100%' }} onClick={handleSave}>⚠️ Simpan Warning</button>
        </div>
      )}

      <div className="sp-info-box">
        <div className="sp-info-box__title">📋 Daftar Warning ({warnings?.length || 0})</div>
        {!warnings || warnings.length === 0 ? <p style={{ color: '#999', fontSize: 12 }}>Tidak ada warning.</p> :
          warnings.map(w => {
            const cfg = WARNING_CONFIG[w.jenis_warning] || {};
            return (
              <div key={w.id} style={{ background: '#fff', border: '1px solid #fecaca', borderLeft: '3px solid #e63946', borderRadius: 8, padding: '8px 10px', marginBottom: 6 }}>
                <b>{cfg.icon} {cfg.label}{w.nama_opt ? ' — ' + w.nama_opt : ''}</b>
                <div style={{ fontSize: 11, color: '#888' }}>📍 {w.kelurahan || '-'} · 📅 {fmtTgl(w.tanggal_kejadian)}</div>
                {w.luas_terdampak && <div style={{ fontSize: 11 }}>Luas: {w.luas_terdampak} {w.satuan_luas}</div>}
                {user && <button className="sp-btn sp-btn-danger" style={{ fontSize: 10, padding: '2px 6px', marginTop: 4 }} onClick={() => handleDelete(w.id)}>🗑️</button>}
              </div>
            );
          })}
      </div>
    </div>
  );
}

export default WarningOPT;
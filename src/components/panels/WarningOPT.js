import { exportOPTData } from '../../utils/excelExporter';
import React, { useState } from 'react';
import { WARNING_CONFIG } from '../../config/komoditas';
import { ALL_KEL, KEL_TO_KEC } from '../../config/wilayah';
import { fmtTgl } from '../../utils/agronomi';
import { parseCoordinates } from '../../utils/parsers';

function WarningOPT({ warningKMZ, warnings, showPin, onToggleShow, user, supabase, onRefresh, onPickLocation, onFlyToLocation }) {
  const initForm = {
    jenis_warning: 'opt', nama_opt: '', komoditas: 'Padi',
    kelurahan: '', kecamatan: '', luas_terdampak: '',
    satuan_luas: 'ha', tanggal_kejadian: '', keterangan: '',
  };
  const [form, setForm]           = useState(initForm);
  const [pendingPin, setPendingPin] = useState(null);
  const [gpsInput, setGpsInput]     = useState('');
  const [saving, setSaving]       = useState(false);

  const handleSave = async () => {
    if (!user) return alert('Login dulu.');
    if (!form.kelurahan) return alert('Pilih kelurahan terlebih dahulu.');
    setSaving(true);
    const { error } = await supabase.from('warning_opt').insert({
      user_id: user.id,
      jenis_warning: form.jenis_warning,
      nama_opt: form.nama_opt || null,
      komoditas: form.komoditas,
      kelurahan: form.kelurahan,
      kecamatan: form.kecamatan,
      luas_terdampak: (!form.luas_terdampak || isNaN(parseFloat(form.luas_terdampak))) ? null : parseFloat(form.luas_terdampak),
      satuan_luas: form.satuan_luas,
      tanggal_kejadian: form.tanggal_kejadian || null,
      keterangan: form.keterangan,
      lat: pendingPin?.lat || 0,
      lng: pendingPin?.lng || 0,
    });
    setSaving(false);
    if (error) { alert('Gagal simpan: ' + error.message); return; }
    setPendingPin(null);
    setGpsInput('');
    setForm(initForm);
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
          <div className="sp-info-box__title">➕ Tambah Warning OPT</div>

          {/* Jenis warning */}
          <select className="sp-select" value={form.jenis_warning}
            onChange={e => setForm(p => ({ ...p, jenis_warning: e.target.value }))}>
            {Object.entries(WARNING_CONFIG).map(([k, c]) =>
              <option key={k} value={k}>{c.icon} {c.label}</option>)}
          </select>

          {/* Nama OPT */}
          {form.jenis_warning === 'opt' && (
            <input className="sp-input" placeholder="Nama OPT (mis. Wereng, Blast...)"
              value={form.nama_opt}
              onChange={e => setForm(p => ({ ...p, nama_opt: e.target.value }))}
              style={{ marginTop: 8 }} />
          )}

          {/* Kelurahan */}
          <select className="sp-select" value={form.kelurahan}
            onChange={e => setForm(p => ({ ...p, kelurahan: e.target.value, kecamatan: KEL_TO_KEC[e.target.value] || '' }))}
            style={{ marginTop: 8 }}>
            <option value="">-- Pilih Kelurahan --</option>
            {ALL_KEL.map(k => <option key={k} value={k}>{k}</option>)}
          </select>

          {/* Tanggal */}
          <input type="date" className="sp-input" value={form.tanggal_kejadian}
            onChange={e => setForm(p => ({ ...p, tanggal_kejadian: e.target.value }))}
            style={{ marginTop: 8 }} />

          {/* Luas terdampak */}
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <input type="number" className="sp-input" placeholder="Luas terdampak"
              value={form.luas_terdampak}
              onChange={e => setForm(p => ({ ...p, luas_terdampak: e.target.value }))} />
            <select className="sp-select" style={{ width: 80 }} value={form.satuan_luas}
              onChange={e => setForm(p => ({ ...p, satuan_luas: e.target.value }))}>
              <option value="ha">ha</option>
              <option value="m2">m²</option>
            </select>
          </div>

          {/* Keterangan */}
          <input className="sp-input" placeholder="Keterangan singkat" value={form.keterangan}
            onChange={e => setForm(p => ({ ...p, keterangan: e.target.value }))}
            style={{ marginTop: 8 }} />

          {/* Lokasi Koordinat (Pilih di Peta atau Input Manual) */}
          <div style={{
            marginTop: 12,
            padding: '12px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '10px',
            marginBottom: 10
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#991b1b', marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>📍 Lokasi Titik Kejadian (GPS)</span>
              {pendingPin && (
                <span style={{ fontSize: 10, background: '#fee2e2', color: '#b91c1c', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                  ✓ {pendingPin.lat.toFixed(4)}, {pendingPin.lng.toFixed(4)}
                </span>
              )}
            </div>

            <button
              type="button"
              className="sp-btn"
              style={{
                width: '100%',
                background: '#dc2626',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                fontWeight: 700,
                padding: '9px',
                borderRadius: '8px',
                marginBottom: 8,
                boxShadow: '0 2px 6px rgba(220, 38, 38, 0.25)',
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
                style={{ background: '#fee2e2', color: '#b91c1c', fontWeight: 700, padding: '0 12px', border: '1px solid #fca5a5', flexShrink: 0, cursor: 'pointer' }}
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

          <button className="sp-btn sp-btn-primary" style={{ marginTop: 8, width: '100%' }}
            disabled={saving} onClick={handleSave}>
            {saving ? '⏳ Menyimpan...' : '⚠️ Simpan Warning'}
          </button>
        </div>
      )}

      <div className="sp-info-box">
        <div className="sp-info-box__title">📋 Daftar Warning ({warnings?.length || 0})</div>
        {!warnings || warnings.length === 0
          ? <p style={{ color: '#999', fontSize: 12 }}>Tidak ada warning.</p>
          : warnings.map(w => {
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
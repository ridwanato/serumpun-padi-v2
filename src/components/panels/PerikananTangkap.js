import React, { useState, useMemo } from 'react';
import { ALAT_TANGKAP, ARMADA_TYPES } from '../../config/komoditas';

const JENIS_IKAN = ['Kuwe', 'Beronang', 'Kerapu', 'Cumi', 'Kembung', 'Lainnya'];

function PerikananTangkap({ nelayanTangkap, tangkapList, showNelayan, onToggleShow, user, mapRef, supabase, onRefresh }) {
  const [editNelayan, setEditNelayan] = useState(false);
  const [editTangkapan, setEditTangkapan] = useState(false);
  const [selectedKelompok, setSelectedKelompok] = useState(null);
  const [bulanIdx, setBulanIdx] = useState(0);
  const [pendingPin, setPendingPin] = useState(null);
  const [picking, setPicking] = useState(false);

  const [formNelayan, setFormNelayan] = useState({
    nama_kelompok: '', alat_units: {}, armada_units: {}, jenis_ikan: '', jumlah_anggota: '',
  });

  const [formTangkapan, setFormTangkapan] = useState({
    tanggal: new Date().toISOString().slice(0, 10),
    ikan_kg: {},
  });

  // Data produksi per bulan
  const produksiBulanan = useMemo(() => {
    const map = {};
    (tangkapList || []).forEach(r => {
      try {
        const arr = JSON.parse(r.catatan || '[]');
        arr.forEach(p => {
          if (!map[p.tgl]) map[p.tgl] = { total: 0, ikan: {} };
          map[p.tgl].total += parseFloat(p.kg || 0);
          if (p.ikan) {
            Object.entries(p.ikan).forEach(([ik, kg]) => {
              map[p.tgl].ikan[ik] = (map[p.tgl].ikan[ik] || 0) + parseFloat(kg || 0);
            });
          }
        });
      } catch(e) {}
    });

    const bulanMap = {};
    Object.entries(map).forEach(([tgl, data]) => {
      const d = new Date(tgl);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      if (!bulanMap[key]) bulanMap[key] = { total: 0, ikan: {}, label: d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) };
      bulanMap[key].total += data.total;
      Object.entries(data.ikan).forEach(([ik, kg]) => {
        bulanMap[key].ikan[ik] = (bulanMap[key].ikan[ik] || 0) + kg;
      });
    });

    return Object.entries(bulanMap)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, val]) => ({ key, ...val }));
  }, [tangkapList]);

  const currentBulan = produksiBulanan[bulanIdx] || null;
  const totalTahun = produksiBulanan.reduce((s, b) => s + b.total, 0);

  const totalNelayan = (tangkapList || []).reduce((s, r) => s + parseInt(r.no_hp || r.jumlah_anggota || 1, 10), 0);
  const totalMotorTempel = (tangkapList || []).reduce((s, r) => {
    try {
      const arm = JSON.parse(r.perahu || '{}');
      return s + parseInt(arm['Perahu motor tempel'] || 0);
    } catch(e) { return s; }
  }, 0);
  const totalKapalMotor = (tangkapList || []).reduce((s, r) => {
    try {
      const arm = JSON.parse(r.perahu || '{}');
      return s + parseInt(arm['Kapal motor'] || 0);
    } catch(e) { return s; }
  }, 0);

  const handleSaveNelayan = async () => {
    if (!user) return alert('Login dulu.');
    if (!formNelayan.nama_kelompok) return alert('Nama kelompok wajib diisi.');

    const alatStr = Object.entries(formNelayan.alat_units)
      .filter(([,v]) => parseInt(v) > 0)
      .map(([k,v]) => `${k}:${parseInt(v)}`).join(',') || 'Lainnya';
    const armadaStr = JSON.stringify(formNelayan.armada_units);

    if (selectedKelompok) {
      const updateData = {
        nama_nelayan: formNelayan.nama_kelompok,
        alat_tangkap: alatStr,
        perahu: armadaStr,
        jenis_ikan: formNelayan.jenis_ikan,
        no_hp: formNelayan.jumlah_anggota,
      };
      if (pendingPin) { updateData.lat = pendingPin.lat; updateData.lng = pendingPin.lng; }
      await supabase.from('nelayan_tangkap').update(updateData).eq('id', selectedKelompok.id);
    } else {
      await supabase.from('nelayan_tangkap').insert({
        nama_nelayan: formNelayan.nama_kelompok,
        alat_tangkap: alatStr,
        perahu: armadaStr,
        jenis_ikan: formNelayan.jenis_ikan,
        no_hp: formNelayan.jumlah_anggota,
        lat: pendingPin?.lat || 0,
        lng: pendingPin?.lng || 0,
      });
    }

    setEditNelayan(false);
    setSelectedKelompok(null);
    setPendingPin(null);
    setPicking(false);
    setFormNelayan({ nama_kelompok: '', alat_units: {}, armada_units: {}, jenis_ikan: '', jumlah_anggota: '' });
    if (onRefresh) onRefresh();
    alert('Data nelayan tersimpan!');
  };

  const handleSaveTangkapan = async () => {
    if (!user) return alert('Login dulu.');
    const { data: list } = await supabase.from('nelayan_tangkap').select('*');
    if (!list || list.length === 0) return alert('Tambahkan kelompok nelayan dulu.');

    const r = list[0];
    const arr = [];
    try { const a = JSON.parse(r.catatan || '[]'); arr.push(...a); } catch(e) {}
    arr.push({
      tgl: formTangkapan.tanggal,
      kg: Object.values(formTangkapan.ikan_kg).reduce((s, v) => s + parseFloat(v || 0), 0),
      ikan: formTangkapan.ikan_kg,
    });

    await supabase.from('nelayan_tangkap').update({ catatan: JSON.stringify(arr) }).eq('id', r.id);
    setEditTangkapan(false);
    setFormTangkapan({ tanggal: new Date().toISOString().slice(0, 10), ikan_kg: {} });
    if (onRefresh) onRefresh();
    alert('Data tangkapan tersimpan!');
  };

  return (
    <div style={{ padding: 12 }}>
      {/* Pick indicator */}
      {picking && (
        <div className="sp-pick-indicator">
          📍 Ketuk peta untuk menentukan lokasi pangkalan
          <button onClick={() => { setPicking(false); setPendingPin(null); }}
            style={{ marginLeft: 10, background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 6, color: '#fff', padding: '2px 8px', cursor: 'pointer', fontSize: 12 }}>
            Batal
          </button>
        </div>
      )}

      {/* RINGKASAN */}
      <div style={{ background: 'linear-gradient(135deg, #2ec4b6, #023e8a)', color: '#fff', borderRadius: 14, padding: 16, marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 10, opacity: 0.8, textTransform: 'uppercase', letterSpacing: 1 }}>Perikanan Tangkap · Kota Cilegon</div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 2 }}>{(tangkapList || []).length} Pangkalan</div>
            <div style={{ fontSize: 11, opacity: 0.85, marginTop: 4 }}>
              {totalNelayan} Org Nelayan · {totalMotorTempel} Motor tempel · {totalKapalMotor} Kapal motor
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, opacity: 0.8 }}>TANGKAPAN IKAN {new Date().getFullYear()}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#ffd166' }}>
              {currentBulan ? `${currentBulan.label.toUpperCase()} : ${(currentBulan.total / 1000).toFixed(1)} Ton` : 'BELUM ADA DATA'}
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, marginTop: 2 }}>
              TOTAL : {(totalTahun / 1000).toFixed(1)} Ton
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 6, justifyContent: 'flex-end' }}>
              <button onClick={() => setBulanIdx(p => Math.min(p + 1, produksiBulanan.length - 1))}
                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 4, color: '#fff', padding: '2px 8px', fontSize: 10, cursor: 'pointer' }}>
                ◀ Prev
              </button>
              <button onClick={() => setBulanIdx(p => Math.max(p - 1, 0))}
                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 4, color: '#fff', padding: '2px 8px', fontSize: 10, cursor: 'pointer' }}>
                Next ▶
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* TOMBOL EDIT NELAYAN */}
      <div className="sp-info-box">
        <button className="sp-btn sp-btn-primary" style={{ width: '100%' }}
          onClick={() => { setEditNelayan(!editNelayan); setEditTangkapan(false); }}>
          ✏️ {editNelayan ? 'TUTUP' : 'EDIT DATA NELAYAN'}
        </button>

        {editNelayan && (
          <div style={{ marginTop: 12 }}>
            <input className="sp-input" placeholder="Nama kelompok nelayan *"
              value={formNelayan.nama_kelompok}
              onChange={e => setFormNelayan(p => ({ ...p, nama_kelompok: e.target.value }))} />

            {/* Alat Tangkap */}
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 10px', marginTop: 8, background: '#fafafa' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase' }}>Alat Tangkap</div>
              {ALAT_TANGKAP.map(alat => {
                const checked = formNelayan.alat_units[alat] !== undefined;
                return (
                  <div key={alat} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <input type="checkbox" checked={checked}
                      onChange={e => {
                        const u = { ...formNelayan.alat_units };
                        if (e.target.checked) u[alat] = ''; else delete u[alat];
                        setFormNelayan(p => ({ ...p, alat_units: u }));
                      }} />
                    <span style={{ fontSize: 11, flex: 1 }}>{alat}</span>
                    {checked && (
                      <>
                        <input type="number" min="0" style={{ width: 50, fontSize: 11, padding: '2px 4px', border: '1px solid #d1d5db', borderRadius: 4 }}
                          value={formNelayan.alat_units[alat]}
                          onChange={e => {
                            const u = { ...formNelayan.alat_units };
                            u[alat] = e.target.value;
                            setFormNelayan(p => ({ ...p, alat_units: u }));
                          }} />
                        <span style={{ fontSize: 10, color: '#999' }}>unit</span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Armada */}
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 10px', marginTop: 8, background: '#fafafa' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase' }}>Armada Penangkapan</div>
              {ARMADA_TYPES.map(arm => {
                const checked = formNelayan.armada_units[arm] !== undefined;
                return (
                  <div key={arm} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <input type="checkbox" checked={checked}
                      onChange={e => {
                        const u = { ...formNelayan.armada_units };
                        if (e.target.checked) u[arm] = ''; else delete u[arm];
                        setFormNelayan(p => ({ ...p, armada_units: u }));
                      }} />
                    <span style={{ fontSize: 11, flex: 1 }}>{arm}</span>
                    {checked && (
                      <>
                        <input type="number" min="0" style={{ width: 50, fontSize: 11, padding: '2px 4px', border: '1px solid #d1d5db', borderRadius: 4 }}
                          value={formNelayan.armada_units[arm]}
                          onChange={e => {
                            const u = { ...formNelayan.armada_units };
                            u[arm] = e.target.value;
                            setFormNelayan(p => ({ ...p, armada_units: u }));
                          }} />
                        <span style={{ fontSize: 10, color: '#999' }}>unit</span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Lokasi Pangkalan */}
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 10px', marginTop: 8, background: '#fafafa' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase' }}>Lokasi Pangkalan</div>
              <button className="sp-btn sp-btn-secondary" style={{ width: '100%' }}
                onClick={() => setPicking(true)}>
                📍 {pendingPin ? `✅ ${pendingPin.lat.toFixed(5)}, ${pendingPin.lng.toFixed(5)}` : 'Pilih Lokasi di Peta'}
              </button>
            </div>

            <input className="sp-input" placeholder="Jumlah anggota nelayan" type="number"
              value={formNelayan.jumlah_anggota}
              onChange={e => setFormNelayan(p => ({ ...p, jumlah_anggota: e.target.value }))}
              style={{ marginTop: 8 }} />

            <button className="sp-btn sp-btn-primary" style={{ width: '100%', marginTop: 10 }} onClick={handleSaveNelayan}>
              💾 SIMPAN DATA NELAYAN
            </button>
          </div>
        )}
      </div>

      {/* TOMBOL TAMBAH TANGKAPAN */}
      <div className="sp-info-box">
        <button className="sp-btn sp-btn-primary" style={{ width: '100%', background: '#e76f51' }}
          onClick={() => { setEditTangkapan(!editTangkapan); setEditNelayan(false); }}>
          🐟 {editTangkapan ? 'TUTUP' : 'TAMBAH/EDIT DATA TANGKAPAN'}
        </button>

        {editTangkapan && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase' }}>
              PRODUKSI TANGKAP · {new Date(formTangkapan.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            <input type="date" className="sp-input"
              value={formTangkapan.tanggal}
              onChange={e => setFormTangkapan(p => ({ ...p, tanggal: e.target.value }))} />

            {/* Per jenis ikan */}
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 10px', marginTop: 8, background: '#fafafa' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase' }}>Jenis Ikan</div>
              {JENIS_IKAN.map(ikan => (
                <div key={ikan} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, flex: 1 }}>{ikan}</span>
                  <input type="number" min="0" placeholder="kg" style={{ width: 60, fontSize: 11, padding: '2px 4px', border: '1px solid #d1d5db', borderRadius: 4 }}
                    value={formTangkapan.ikan_kg[ikan] || ''}
                    onChange={e => {
                      const ik = { ...formTangkapan.ikan_kg };
                      ik[ikan] = e.target.value;
                      setFormTangkapan(p => ({ ...p, ikan_kg: ik }));
                    }} />
                  <span style={{ fontSize: 10, color: '#999' }}>kg</span>
                </div>
              ))}
            </div>

            <button className="sp-btn sp-btn-primary" style={{ width: '100%', marginTop: 10, background: '#e76f51' }}
              onClick={handleSaveTangkapan}>
              💾 SIMPAN DATA TANGKAPAN
            </button>
          </div>
        )}
      </div>
      {/* DAFTAR PANGKALAN NELAYAN */}
      <div className="sp-info-box">
        <div className="sp-info-box__title">📋 Data Pangkalan Nelayan ({(tangkapList || []).length})</div>
        {!tangkapList || tangkapList.length === 0 ? (
          <p style={{ color: '#999', fontSize: 12, textAlign: 'center' }}>Belum ada data pangkalan.</p>
        ) : tangkapList.map(r => {
          let armadaInfo = '';
          try {
            const a = JSON.parse(r.perahu || '{}');
            armadaInfo = Object.entries(a).filter(([,v]) => parseInt(v) > 0).map(([j, v]) => `${j}: ${v}`).join(', ');
          } catch(e) { armadaInfo = r.perahu || ''; }
          return (
            <div key={r.id} className="sp-drawn-item" style={{ borderLeft: '3px solid #2ec4b6', marginBottom: 6 }}
              onClick={() => r.lat && r.lng && mapRef?.current?.flyTo([r.lat, r.lng], 17, { duration: 1 })}>
              <div style={{ fontWeight: 700, fontSize: 12 }}>⛵ {r.nama_nelayan || 'Tanpa Nama'}</div>
              <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>
                🎣 {r.alat_tangkap || '-'} · 👥 {r.no_hp || '?'} orang
                {armadaInfo && <span> · ⛵ {armadaInfo}</span>}
              </div>
              {r.lat && r.lng && r.lat !== 0 && (
                <div style={{ fontSize: 9, color: '#2ec4b6', marginTop: 2 }}>📍 Klik untuk lihat di peta</div>
              )}
            </div>
          );
        })}
      </div>
      {/* Riwayat Tangkapan */}
      {produksiBulanan.length > 0 && currentBulan && (
        <div className="sp-info-box">
          <div className="sp-info-box__title">📊 {currentBulan.label} — Total: {(currentBulan.total / 1000).toFixed(1)} Ton</div>
          {Object.entries(currentBulan.ikan).map(([ik, kg]) => (
            <div key={ik} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f0f0f0', fontSize: 11 }}>
              <span>{ik}</span>
              <span style={{ fontWeight: 700, color: '#166534' }}>{kg.toLocaleString('id-ID')} kg</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PerikananTangkap;
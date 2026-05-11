import React, { useState, useMemo } from 'react';
import { JENIS_IKAN_BUDIDAYA } from '../../config/komoditas';

const JENIS_KOLAM = ['Kolam tanah', 'Kolam beton', 'Kolam Terpal', 'Karamba', 'Lainnya'];

function PerikananBudidaya({ kolamBudidaya, budidayaList, showKolam, onToggleShow, user, mapRef, supabase, onRefresh }) {
  const [editBudidaya, setEditBudidaya] = useState(false);
  const [editProduksi, setEditProduksi] = useState(false);
  const [selectedPembudidaya, setSelectedPembudidaya] = useState(null);
  const [bulanIdx, setBulanIdx] = useState(0);
  const [pendingPin, setPendingPin] = useState(null);
  const [picking, setPicking] = useState(false);

  const [formBudidaya, setFormBudidaya] = useState({
    nama_pemilik: '', status_kolam: 'Aktif', kolam_units: {}, ikan_units: {}, catatan: '',
  });

  const [formProduksi, setFormProduksi] = useState({
    tanggal: new Date().toISOString().slice(0, 10),
    ikan_kg: {},
  });

  // Statistik
  const totalUnit = (budidayaList || []).length + (kolamBudidaya || []).length;
  const totalLuas = (budidayaList || []).reduce((s, r) => {
    try {
      const k = JSON.parse(r.jenis_kolam || '{}');
      return s + Object.values(k).reduce((a, v) => a + parseFloat(v || 0), 0);
    } catch(e) { return s + parseFloat(r.luas_m2 || 0); }
  }, 0);
  const totalAktif = (budidayaList || []).filter(r => r.status_kolam === 'Aktif').length;
  const jenisIkanSet = new Set((budidayaList || []).map(r => r.jenis_ikan).filter(Boolean));

  // Produksi per bulan
  const produksiBulanan = useMemo(() => {
    const map = {};
    (budidayaList || []).forEach(r => {
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
  }, [budidayaList]);

  const currentBulan = produksiBulanan[bulanIdx] || null;
  const totalTahun = produksiBulanan.reduce((s, b) => s + b.total, 0);

  const handleSaveBudidaya = async () => {
    if (!user) return alert('Login dulu.');
    if (!formBudidaya.nama_pemilik) return alert('Nama pemilik wajib diisi.');

    const kolamStr = JSON.stringify(formBudidaya.kolam_units);
    const totalLuasM2 = Object.values(formBudidaya.kolam_units).reduce((s, v) => s + parseFloat(v || 0), 0);

    if (selectedPembudidaya) {
      const updateData = {
        nama_pemilik: formBudidaya.nama_pemilik,
        jenis_ikan: formBudidaya.jenis_ikan,
        luas_m2: totalLuasM2,
        jenis_kolam: kolamStr,
        status_kolam: formBudidaya.status_kolam,
        catatan: formBudidaya.catatan,
      };
      if (pendingPin) { updateData.lat = pendingPin.lat; updateData.lng = pendingPin.lng; }
      await supabase.from('kolam_budidaya').update(updateData).eq('id', selectedPembudidaya.id);
    } else {
      await supabase.from('kolam_budidaya').insert({
        nama_pemilik: formBudidaya.nama_pemilik,
        jenis_ikan: formBudidaya.jenis_ikan,
        luas_m2: totalLuasM2,
        jenis_kolam: kolamStr,
        status_kolam: formBudidaya.status_kolam,
        catatan: formBudidaya.catatan,
        lat: pendingPin?.lat || 0,
        lng: pendingPin?.lng || 0,
      });
    }

    setEditBudidaya(false);
    setSelectedPembudidaya(null);
    setPendingPin(null);
    setPicking(false);
    setFormBudidaya({ nama_pemilik: '', status_kolam: 'Aktif', kolam_units: {}, ikan_units: {}, catatan: '' });
    if (onRefresh) onRefresh();
    alert('Data pembudidaya tersimpan!');
  };

  const handleSaveProduksi = async () => {
    if (!user) return alert('Login dulu.');
    const { data: list } = await supabase.from('kolam_budidaya').select('*');
    if (!list || list.length === 0) return alert('Tambahkan data pembudidaya dulu.');

    const r = list[0];
    const arr = [];
    try { const a = JSON.parse(r.catatan || '[]'); arr.push(...a); } catch(e) {}
    arr.push({
      tgl: formProduksi.tanggal,
      kg: Object.values(formProduksi.ikan_kg).reduce((s, v) => s + parseFloat(v || 0), 0),
      ikan: formProduksi.ikan_kg,
    });

    await supabase.from('kolam_budidaya').update({ catatan: JSON.stringify(arr) }).eq('id', r.id);
    setEditProduksi(false);
    setFormProduksi({ tanggal: new Date().toISOString().slice(0, 10), ikan_kg: {} });
    if (onRefresh) onRefresh();
    alert('Data produksi tersimpan!');
  };

  const flyTo = (lat, lng) => {
    if (mapRef?.current) mapRef.current.flyTo([lat, lng], 17, { duration: 1 });
  };

  return (
    <div style={{ padding: 12 }}>
      {/* Pick indicator */}
      {picking && (
        <div className="sp-pick-indicator">
          📍 Ketuk peta untuk menentukan lokasi kolam
          <button onClick={() => { setPicking(false); setPendingPin(null); }}
            style={{ marginLeft: 10, background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 6, color: '#fff', padding: '2px 8px', cursor: 'pointer', fontSize: 12 }}>
            Batal
          </button>
        </div>
      )}

      {/* RINGKASAN */}
      <div style={{ background: 'linear-gradient(135deg, #0096c7, #023e8a)', color: '#fff', borderRadius: 14, padding: 16, marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 10, opacity: 0.8, textTransform: 'uppercase', letterSpacing: 1 }}>Perikanan Budidaya · Kota Cilegon</div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 2 }}>{totalUnit} Unit</div>
            <div style={{ fontSize: 11, opacity: 0.85, marginTop: 4 }}>
              {(totalLuas).toLocaleString('id-ID')} m² luas · {totalAktif} aktif · {jenisIkanSet.size} jenis ikan
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, opacity: 0.8 }}>PRODUKSI IKAN {new Date().getFullYear()}</div>
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

      {/* TOMBOL EDIT PEMBUDIDAYA */}
      <div className="sp-info-box">
        <button className="sp-btn sp-btn-primary" style={{ width: '100%' }}
          onClick={() => { setEditBudidaya(!editBudidaya); setEditProduksi(false); }}>
          ✏️ {editBudidaya ? 'TUTUP' : 'EDIT DATA PEMBUDIDAYA'}
        </button>

        {editBudidaya && (
          <div style={{ marginTop: 12 }}>
            {/* Nama pemilik */}
            <input className="sp-input" placeholder="Nama pemilik *"
              value={formBudidaya.nama_pemilik}
              onChange={e => setFormBudidaya(p => ({ ...p, nama_pemilik: e.target.value }))} />

            {/* Status */}
            <select className="sp-select" value={formBudidaya.status_kolam}
              onChange={e => setFormBudidaya(p => ({ ...p, status_kolam: e.target.value }))}
              style={{ marginTop: 8 }}>
              <option value="Aktif">Aktif</option>
              <option value="Tidak Aktif">Tidak Aktif</option>
              <option value="Dalam Perbaikan">Dalam Perbaikan</option>
            </select>

            {/* Jenis Kolam */}
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 10px', marginTop: 8, background: '#fafafa' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase' }}>Jenis Kolam</div>
              {JENIS_KOLAM.map(jk => {
                const checked = formBudidaya.kolam_units[jk] !== undefined;
                return (
                  <div key={jk} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <input type="checkbox" checked={checked}
                      onChange={e => {
                        const u = { ...formBudidaya.kolam_units };
                        if (e.target.checked) u[jk] = ''; else delete u[jk];
                        setFormBudidaya(p => ({ ...p, kolam_units: u }));
                      }} />
                    <span style={{ fontSize: 11, flex: 1 }}>{jk}</span>
                    {checked && (
                      <>
                        <input type="number" min="0" placeholder="0" style={{ width: 60, fontSize: 11, padding: '2px 4px', border: '1px solid #d1d5db', borderRadius: 4 }}
                          value={formBudidaya.kolam_units[jk]}
                          onChange={e => {
                            const u = { ...formBudidaya.kolam_units };
                            u[jk] = e.target.value;
                            setFormBudidaya(p => ({ ...p, kolam_units: u }));
                          }} />
                        <span style={{ fontSize: 10, color: '#999' }}>m²</span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Jenis Ikan */}
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 10px', marginTop: 8, background: '#fafafa' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase' }}>Jenis Ikan</div>
              {JENIS_IKAN_BUDIDAYA.map(ji => (
                <label key={ji} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, fontSize: 11, cursor: 'pointer' }}>
                  <input type="checkbox"
                    checked={!!formBudidaya.ikan_units[ji]}
                    onChange={e => {
                      const u = { ...formBudidaya.ikan_units };
                      if (e.target.checked) u[ji] = true; else delete u[ji];
                      setFormBudidaya(p => ({ ...p, ikan_units: u }));
                    }} />
                  {ji}
                </label>
              ))}
            </div>

            {/* Lokasi */}
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 10px', marginTop: 8, background: '#fafafa' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase' }}>Lokasi Kolam</div>
              <button className="sp-btn sp-btn-secondary" style={{ width: '100%' }}
                onClick={() => setPicking(true)}>
                📍 {pendingPin ? `✅ ${pendingPin.lat.toFixed(5)}, ${pendingPin.lng.toFixed(5)}` : 'Pilih Lokasi di Peta'}
              </button>
            </div>

            <button className="sp-btn sp-btn-primary" style={{ width: '100%', marginTop: 10 }} onClick={handleSaveBudidaya}>
              💾 SIMPAN DATA
            </button>
          </div>
        )}
      </div>

      {/* TOMBOL TAMBAH PRODUKSI */}
      <div className="sp-info-box">
        <button className="sp-btn sp-btn-primary" style={{ width: '100%', background: '#e76f51' }}
          onClick={() => { setEditProduksi(!editProduksi); setEditBudidaya(false); }}>
          🐟 {editProduksi ? 'TUTUP' : 'TAMBAH/EDIT DATA PRODUKSI'}
        </button>

        {editProduksi && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase' }}>
              PRODUKSI BUDIDAYA · {new Date(formProduksi.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            <input type="date" className="sp-input"
              value={formProduksi.tanggal}
              onChange={e => setFormProduksi(p => ({ ...p, tanggal: e.target.value }))} />

            <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 10px', marginTop: 8, background: '#fafafa' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase' }}>Jenis Ikan</div>
              {JENIS_IKAN_BUDIDAYA.map(ikan => (
                <div key={ikan} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, flex: 1 }}>{ikan}</span>
                  <input type="number" min="0" placeholder="kg" style={{ width: 60, fontSize: 11, padding: '2px 4px', border: '1px solid #d1d5db', borderRadius: 4 }}
                    value={formProduksi.ikan_kg[ikan] || ''}
                    onChange={e => {
                      const ik = { ...formProduksi.ikan_kg };
                      ik[ikan] = e.target.value;
                      setFormProduksi(p => ({ ...p, ikan_kg: ik }));
                    }} />
                  <span style={{ fontSize: 10, color: '#999' }}>kg</span>
                </div>
              ))}
            </div>

            <button className="sp-btn sp-btn-primary" style={{ width: '100%', marginTop: 10, background: '#e76f51' }}
              onClick={handleSaveProduksi}>
              💾 SIMPAN DATA PRODUKSI
            </button>
          </div>
        )}
      </div>

      {/* DAFTAR PEMBUDIDAYA */}
      <div className="sp-info-box">
        <div className="sp-info-box__title">📋 Data Pembudidaya ({(budidayaList || []).length})</div>
        {!budidayaList || budidayaList.length === 0 ? (
          <p style={{ color: '#999', fontSize: 12, textAlign: 'center' }}>Belum ada data.</p>
        ) : budidayaList.map(r => {
          let kolamInfo = '';
          try {
            const k = JSON.parse(r.jenis_kolam || '{}');
            kolamInfo = Object.entries(k).filter(([,v]) => parseFloat(v) > 0).map(([jk, v]) => `${jk}: ${v}m²`).join(', ');
          } catch(e) { kolamInfo = r.luas_m2 ? `${r.luas_m2}m²` : ''; }
          return (
            <div key={r.id} className="sp-drawn-item" style={{ borderLeft: '3px solid #0096c7', marginBottom: 6 }}
              onClick={() => r.lat && r.lng && flyTo(r.lat, r.lng)}>
              <div style={{ fontWeight: 700, fontSize: 12 }}>🐟 {r.nama_pemilik || 'Tanpa Nama'}</div>
              <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>
                🐠 {r.jenis_ikan || '-'} · 📐 {kolamInfo || '-'} · {r.status_kolam || '-'}
              </div>
              {r.lat && r.lng && <div style={{ fontSize: 9, color: '#0096c7', marginTop: 2 }}>📍 Klik untuk lihat di peta</div>}
            </div>
          );
        })}
      </div>

      {/* Riwayat Produksi */}
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

export default PerikananBudidaya;
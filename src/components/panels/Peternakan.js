import React, { useState, useEffect, useCallback } from 'react';
import * as turf from '@turf/turf';
import { ALL_KEC } from '../../config/wilayah';
import { parseCoordinates } from '../../utils/parsers';

const findBoundaryForCoords = (lat, lng, boundaries) => {
  if (!boundaries || boundaries.length === 0) return '';
  const pt = turf.point([lng, lat]);
  for (const feat of boundaries) {
    if (feat.geometry) {
      const isInside = turf.booleanPointInPolygon(pt, feat);
      if (isInside) {
        return feat.properties?.name || '';
      }
    }
  }
  return '';
};

function Peternakan({ onOpenPanel, user, supabase, onRefresh, onPickLocation, onFlyToLocation, kelurahanBoundaries, kecamatanBoundaries }) {
  const isSuperAdmin = user?.email === 'ketapangcilegon@gmail.com';
  const [activeTab, setActiveTab] = useState('ringkasan');
  const [pendingPin, setPendingPin] = useState(null);
  const [gpsInput, setGpsInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [dataTernak, setDataTernak] = useState([
    { id: 1, pemilik: 'Kelompok Ternak Berkah Jaya', kecamatan: 'Cibeber', kelurahan: 'Kedaleman', sapi: 12, kambing: 25, ayam: 150, lat: -6.0331, lng: 106.0696 },
    { id: 2, pemilik: 'Peternakan Unggas Mandiri', kecamatan: 'Jombang', kelurahan: 'Masigit', sapi: 0, kambing: 8, ayam: 400, lat: -6.0125, lng: 106.0543 },
    { id: 3, pemilik: 'Kandang Sapi Barokah', kecamatan: 'Citangkil', kelurahan: 'Warnasari', sapi: 18, kambing: 15, ayam: 0, lat: -6.0198, lng: 106.0287 },
  ]);

  const [formInput, setFormInput] = useState({
    pemilik: '',
    sapi: 0,
    harga_sapi: 20000000,
    kambing: 0,
    harga_kambing: 2500000,
    ayam: 0,
    harga_ayam: 40000,
    itik: 0,
    harga_itik: 50000,
  });

  const loadDataPeternakan = useCallback(async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase.from('peternakan').select('*').order('id', { ascending: false });
      if (!error && data && data.length > 0) {
        setDataTernak(data);
      }
    } catch (e) {
      console.error('Error fetching peternakan:', e);
    }
  }, [supabase]);

  useEffect(() => {
    loadDataPeternakan();
  }, [loadDataPeternakan]);

  const totalSapi = dataTernak.reduce((s, d) => s + (parseInt(d.sapi) || 0), 0);
  const totalKambing = dataTernak.reduce((s, d) => s + (parseInt(d.kambing) || 0), 0);
  const totalAyam = dataTernak.reduce((s, d) => s + (parseInt(d.ayam) || 0), 0);
  const totalItik = dataTernak.reduce((s, d) => s + (parseInt(d.itik) || 0), 0);
  const totalTernak = totalSapi + totalKambing + totalAyam + totalItik;

  const getItemDetail = (d) => {
    let detail = {};
    try {
      if (typeof d.catatan === 'string' && d.catatan.startsWith('{')) {
        detail = JSON.parse(d.catatan);
      }
    } catch (e) {}
    const hSapi = parseFloat(detail.harga_sapi || d.harga_sapi || 20000000);
    const hKambing = parseFloat(detail.harga_kambing || d.harga_kambing || 2500000);
    const hAyam = parseFloat(detail.harga_ayam || d.harga_ayam || 40000);
    const hItik = parseFloat(detail.harga_itik || d.harga_itik || 50000);
    const totalVal = (parseInt(d.sapi||0)*hSapi) + (parseInt(d.kambing||0)*hKambing) + (parseInt(d.ayam||0)*hAyam) + (parseInt(d.itik||0)*hItik);
    return { hSapi, hKambing, hAyam, hItik, totalVal };
  };

  const totalNilaiSapi = dataTernak.reduce((s, d) => s + (parseInt(d.sapi||0) * getItemDetail(d).hSapi), 0);
  const totalNilaiKambing = dataTernak.reduce((s, d) => s + (parseInt(d.kambing||0) * getItemDetail(d).hKambing), 0);
  const totalNilaiAyam = dataTernak.reduce((s, d) => s + (parseInt(d.ayam||0) * getItemDetail(d).hAyam), 0);
  const totalNilaiItik = dataTernak.reduce((s, d) => s + (parseInt(d.itik||0) * getItemDetail(d).hItik), 0);
  const totalNilaiSemua = totalNilaiSapi + totalNilaiKambing + totalNilaiAyam + totalNilaiItik;

  const handleTambahData = async (e) => {
    e.preventDefault();
    if (!user) return alert('Silakan login terlebih dahulu untuk menambah data.');
    if (!formInput.pemilik.trim()) {
      alert('Mohon isi nama peternak / kelompok ternak.');
      return;
    }
    
    let detectedKel = '-';
    let detectedKec = 'Cilegon';
    if (pendingPin) {
      if (kelurahanBoundaries) detectedKel = findBoundaryForCoords(pendingPin.lat, pendingPin.lng, kelurahanBoundaries) || '-';
      if (kecamatanBoundaries) detectedKec = findBoundaryForCoords(pendingPin.lat, pendingPin.lng, kecamatanBoundaries) || 'Cilegon';
    }

    setSaving(true);
    const nSapi = parseInt(formInput.sapi) || 0;
    const nKambing = parseInt(formInput.kambing) || 0;
    const nAyam = parseInt(formInput.ayam) || 0;
    const nItik = parseInt(formInput.itik) || 0;

    const hSapi = parseFloat(formInput.harga_sapi) || 20000000;
    const hKambing = parseFloat(formInput.harga_kambing) || 2500000;
    const hAyam = parseFloat(formInput.harga_ayam) || 40000;
    const hItik = parseFloat(formInput.harga_itik) || 50000;

    const totalVal = (nSapi * hSapi) + (nKambing * hKambing) + (nAyam * hAyam) + (nItik * hItik);

    const detailObj = {
      harga_sapi: hSapi,
      harga_kambing: hKambing,
      harga_ayam: hAyam,
      harga_itik: hItik,
      total_nilai: totalVal
    };

    const payload = {
      pemilik: formInput.pemilik.trim(),
      kecamatan: detectedKec,
      kelurahan: detectedKel,
      sapi: nSapi,
      kambing: nKambing,
      ayam: nAyam,
      itik: nItik,
      catatan: JSON.stringify(detailObj),
      lat: pendingPin?.lat || 0,
      lng: pendingPin?.lng || 0,
      user_id: user.id
    };

    if (supabase) {
      const { error } = await supabase.from('peternakan').insert(payload);
      if (error) {
        alert('Gagal simpan ke Supabase: ' + error.message);
        setSaving(false);
        return;
      }
    }

    await loadDataPeternakan();
    setSaving(false);
    setFormInput({
      pemilik: '', sapi: 0, harga_sapi: 20000000,
      kambing: 0, harga_kambing: 2500000,
      ayam: 0, harga_ayam: 40000,
      itik: 0, harga_itik: 50000
    });
    setPendingPin(null);
    setGpsInput('');
    alert('✅ Data peternakan berhasil disimpan ke Supabase!');
    setActiveTab('tabel');
    if (onRefresh) onRefresh();
  };

  const handleDeletePeternakan = async (id, ownerId) => {
    if (!user) return alert('Silakan login terlebih dahulu untuk menghapus data.');

    // Permission check
    const canDelete = isSuperAdmin || !ownerId || ownerId === user.id;
    if (!canDelete) {
      return alert('Anda tidak memiliki izin menghapus data ini.');
    }

    const confirmed = window.confirm('Hapus data peternak ini dari database?');
    if (!confirmed) return;

    // Immediately filter out from local UI state
    setDataTernak(prev => prev.filter(d => d.id !== id));

    if (supabase) {
      try {
        const { error } = await supabase
          .from('peternakan')
          .delete()
          .eq('id', id);

        if (error) {
          console.error('[Delete Peternakan] Supabase error:', error);
          alert('Peringatan: Gagal menghapus dari Supabase database: ' + (error.message || error.code));
        }
      } catch (err) {
        console.error('[Delete Peternakan] Exception:', err);
      }
    }

    await loadDataPeternakan();
    if (onRefresh) onRefresh();
  };

  return (
    <div style={{ padding: '16px' }}>
      {/* Header Banner Placeholder */}
      <div style={{
        background: 'linear-gradient(135deg, #78350f, #92400e)',
        color: '#fff',
        borderRadius: 12,
        padding: '16px',
        marginBottom: 16,
        boxShadow: '0 4px 12px rgba(120, 53, 15, 0.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, opacity: 0.9, textTransform: 'uppercase', letterSpacing: 1 }}>
          <span>🐄 Modul Peternakan</span>
          <span style={{ background: '#f59e0b', color: '#78350f', padding: '2px 6px', borderRadius: 4, fontWeight: 800, fontSize: 9 }}>
            DATABASE ACTIVE
          </span>
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>
          {totalTernak} Ekor Populasi
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#fde68a', marginTop: 2 }}>
          💰 Est. Nilai Total: Rp {totalNilaiSemua.toLocaleString('id-ID')}
        </div>
        <div style={{ fontSize: 10, opacity: 0.9, marginTop: 4 }}>
          Sapi: {totalSapi} | Kambing: {totalKambing} | Ayam: {totalAyam} | Itik: {totalItik}
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, borderBottom: '1px solid #e5e7eb', paddingBottom: 8 }}>
        <button
          onClick={() => setActiveTab('ringkasan')}
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            border: 'none',
            background: activeTab === 'ringkasan' ? '#92400e' : '#f3f4f6',
            color: activeTab === 'ringkasan' ? '#fff' : '#4b5563',
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          📊 Ringkasan Komoditas
        </button>
        <button
          onClick={() => setActiveTab('tabel')}
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            border: 'none',
            background: activeTab === 'tabel' ? '#92400e' : '#f3f4f6',
            color: activeTab === 'tabel' ? '#fff' : '#4b5563',
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          📋 Daftar Peternak ({dataTernak.length})
        </button>
        <button
          onClick={() => setActiveTab('input')}
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            border: 'none',
            background: activeTab === 'input' ? '#92400e' : '#f3f4f6',
            color: activeTab === 'input' ? '#fff' : '#4b5563',
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          ➕ Input Data Baru
        </button>
      </div>

      {/* TAB 1: RINGKASAN */}
      {activeTab === 'ringkasan' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            <div style={{ background: '#fff', border: '1px solid #fde68a', borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 20 }}>🐂</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#92400e', marginTop: 2 }}>{totalSapi} Ekor</div>
              <div style={{ fontSize: 10, color: '#6b7280' }}>Sapi Potong & Perah</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#15803d', marginTop: 2 }}>Rp {totalNilaiSapi.toLocaleString('id-ID')}</div>
            </div>
            <div style={{ background: '#fff', border: '1px solid #fde68a', borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 20 }}>🐐</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#92400e', marginTop: 2 }}>{totalKambing} Ekor</div>
              <div style={{ fontSize: 10, color: '#6b7280' }}>Kambing & Domba</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#15803d', marginTop: 2 }}>Rp {totalNilaiKambing.toLocaleString('id-ID')}</div>
            </div>
            <div style={{ background: '#fff', border: '1px solid #fde68a', borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 20 }}>🐓</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#92400e', marginTop: 2 }}>{totalAyam} Ekor</div>
              <div style={{ fontSize: 10, color: '#6b7280' }}>Ayam Broiler & Kampung</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#15803d', marginTop: 2 }}>Rp {totalNilaiAyam.toLocaleString('id-ID')}</div>
            </div>
            <div style={{ background: '#fff', border: '1px solid #fde68a', borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 20 }}>🦆</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#92400e', marginTop: 2 }}>{totalItik} Ekor</div>
              <div style={{ fontSize: 10, color: '#6b7280' }}>Itik & Bebek</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#15803d', marginTop: 2 }}>Rp {totalNilaiItik.toLocaleString('id-ID')}</div>
            </div>
          </div>

          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 12, marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 8, textTransform: 'uppercase' }}>
              Sebaran Ternak per Kecamatan
            </div>
            {ALL_KEC.map((kec) => {
              const items = dataTernak.filter((d) => (d.kecamatan || d.kec) === kec);
              const ternakKec = items.reduce((sum, d) => sum + (parseInt(d.sapi) || 0) + (parseInt(d.kambing) || 0) + (parseInt(d.ayam) || 0) + (parseInt(d.itik) || 0), 0);
              const nilaiKec = items.reduce((sum, d) => sum + getItemDetail(d).totalVal, 0);
              return (
                <div key={kec} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f3f4f6', fontSize: 11 }}>
                  <span style={{ color: '#4b5563' }}>{kec}</span>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontWeight: 700, color: '#92400e' }}>{ternakKec} Ekor</span>
                    {nilaiKec > 0 && <span style={{ fontSize: 10, color: '#15803d', marginLeft: 6 }}>(Rp {nilaiKec.toLocaleString('id-ID')})</span>}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 10, fontSize: 11, color: '#166534' }}>
            ✅ <strong>Tersinkronisasi:</strong> Basis data peternakan aktif dan terhubung langsung ke Supabase.
          </div>
        </div>
      )}

      {/* TAB 2: TABEL DATA */}
      {activeTab === 'tabel' && (
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: '#f9fafb', color: '#6b7280', textAlign: 'left' }}>
                <th style={{ padding: '8px 10px' }}>Peternak / Kelompok</th>
                <th style={{ padding: '8px 10px' }}>Wilayah</th>
                <th style={{ padding: '8px 10px' }}>Populasi & Nilai</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {dataTernak.map((d) => {
                const detail = getItemDetail(d);
                return (
                  <tr key={d.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 600 }}>
                      <div style={{ cursor: d.lat ? 'pointer' : 'default' }} onClick={() => d.lat && d.lng && onFlyToLocation && onFlyToLocation(d.lat, d.lng)}>
                        {d.pemilik}
                        {d.lat && d.lng && <div style={{ fontSize: 9, color: '#92400e' }}>📍 Lihat di Peta</div>}
                      </div>
                    </td>
                    <td style={{ padding: '8px 10px', color: '#6b7280' }}>{d.kecamatan || d.kec}, {d.kelurahan || d.kel}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <div style={{ color: '#92400e', fontWeight: 700 }}>
                        {[
                          d.sapi > 0 && `Sapi: ${d.sapi}`,
                          d.kambing > 0 && `Kmb: ${d.kambing}`,
                          d.ayam > 0 && `Aym: ${d.ayam}`,
                          d.itik > 0 && `Itik: ${d.itik}`
                        ].filter(Boolean).join(' | ') || '0 Ekor'}
                      </div>
                      {detail.totalVal > 0 && (
                        <div style={{ fontSize: 10, color: '#15803d', fontWeight: 600 }}>
                          💰 Rp {detail.totalVal.toLocaleString('id-ID')}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                      {user && (isSuperAdmin || !d.user_id || d.user_id === user.id) && (
                        <button
                          onClick={() => handleDeletePeternakan(d.id, d.user_id)}
                          style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 6, padding: '4px 8px', fontSize: 13, color: '#b91c1c', cursor: 'pointer', lineHeight: 1 }}
                          title="Hapus data peternak ini"
                          aria-label="Hapus"
                        >
                          🗑️
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: INPUT DATA BARU */}
      {activeTab === 'input' && (
        <form onSubmit={handleTambahData} style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 14 }}>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>
              Nama Peternak / Kelompok Ternak *
            </label>
            <input
              type="text"
              className="sp-input"
              placeholder="Contoh: Kelompok Ternak Maju Bersama"
              value={formInput.pemilik}
              onChange={(e) => setFormInput({ ...formInput, pemilik: e.target.value })}
              required
            />
          </div>

          <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px', marginBottom: 14, background: '#fafafa' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#4b5563', marginBottom: 8, textTransform: 'uppercase' }}>
              POPULASI DAN HARGA TERNAK
            </div>

            {/* Sapi */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 11, flex: 1.2, fontWeight: 600 }}>🐂 Sapi</span>
              <input type="number" min="0" placeholder="0" style={{ width: 55, fontSize: 11, padding: '2px 4px', border: '1px solid #d1d5db', borderRadius: 4 }}
                value={formInput.sapi === 0 ? '' : formInput.sapi} onFocus={e => e.target.select()} onChange={e => setFormInput({ ...formInput, sapi: e.target.value.replace(/^0+(?=\d)/, '') })}  />
              <span style={{ fontSize: 10, color: '#999', width: 28 }}>ekor</span>
              <span style={{ fontSize: 10, color: '#666' }}>Rp/ekor</span>
              <input type="number" min="0" placeholder="20000000" style={{ width: 85, fontSize: 11, padding: '2px 4px', border: '1px solid #d1d5db', borderRadius: 4 }}
                value={formInput.harga_sapi === 0 ? '' : formInput.harga_sapi} onFocus={e => e.target.select()} onChange={e => setFormInput({ ...formInput, harga_sapi: e.target.value.replace(/^0+(?=\d)/, '') })}  />
            </div>

            {/* Kambing */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 11, flex: 1.2, fontWeight: 600 }}>🐐 Kambing</span>
              <input type="number" min="0" placeholder="0" style={{ width: 55, fontSize: 11, padding: '2px 4px', border: '1px solid #d1d5db', borderRadius: 4 }}
                value={formInput.kambing === 0 ? '' : formInput.kambing} onFocus={e => e.target.select()} onChange={e => setFormInput({ ...formInput, kambing: e.target.value.replace(/^0+(?=\d)/, '') })}  />
              <span style={{ fontSize: 10, color: '#999', width: 28 }}>ekor</span>
              <span style={{ fontSize: 10, color: '#666' }}>Rp/ekor</span>
              <input type="number" min="0" placeholder="2500000" style={{ width: 85, fontSize: 11, padding: '2px 4px', border: '1px solid #d1d5db', borderRadius: 4 }}
                value={formInput.harga_kambing === 0 ? '' : formInput.harga_kambing} onFocus={e => e.target.select()} onChange={e => setFormInput({ ...formInput, harga_kambing: e.target.value.replace(/^0+(?=\d)/, '') })}  />
            </div>

            {/* Ayam */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 11, flex: 1.2, fontWeight: 600 }}>🐓 Ayam</span>
              <input type="number" min="0" placeholder="0" style={{ width: 55, fontSize: 11, padding: '2px 4px', border: '1px solid #d1d5db', borderRadius: 4 }}
                value={formInput.ayam === 0 ? '' : formInput.ayam} onFocus={e => e.target.select()} onChange={e => setFormInput({ ...formInput, ayam: e.target.value.replace(/^0+(?=\d)/, '') })}  />
              <span style={{ fontSize: 10, color: '#999', width: 28 }}>ekor</span>
              <span style={{ fontSize: 10, color: '#666' }}>Rp/ekor</span>
              <input type="number" min="0" placeholder="40000" style={{ width: 85, fontSize: 11, padding: '2px 4px', border: '1px solid #d1d5db', borderRadius: 4 }}
                value={formInput.harga_ayam === 0 ? '' : formInput.harga_ayam} onFocus={e => e.target.select()} onChange={e => setFormInput({ ...formInput, harga_ayam: e.target.value.replace(/^0+(?=\d)/, '') })}  />
            </div>

            {/* Itik */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 11, flex: 1.2, fontWeight: 600 }}>🦆 Itik</span>
              <input type="number" min="0" placeholder="0" style={{ width: 55, fontSize: 11, padding: '2px 4px', border: '1px solid #d1d5db', borderRadius: 4 }}
                value={formInput.itik === 0 ? '' : formInput.itik} onFocus={e => e.target.select()} onChange={e => setFormInput({ ...formInput, itik: e.target.value.replace(/^0+(?=\d)/, '') })}  />
              <span style={{ fontSize: 10, color: '#999', width: 28 }}>ekor</span>
              <span style={{ fontSize: 10, color: '#666' }}>Rp/ekor</span>
              <input type="number" min="0" placeholder="50000" style={{ width: 85, fontSize: 11, padding: '2px 4px', border: '1px solid #d1d5db', borderRadius: 4 }}
                value={formInput.harga_itik === 0 ? '' : formInput.harga_itik} onFocus={e => e.target.select()} onChange={e => setFormInput({ ...formInput, harga_itik: e.target.value.replace(/^0+(?=\d)/, '') })}  />
            </div>
          </div>

          {/* Lokasi Koordinat (Pilih di Peta atau Input Manual) */}
          <div style={{
            marginTop: 12,
            padding: '12px',
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '10px',
            marginBottom: 14
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#92400e', marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>📍 Lokasi Kandang / Peternakan (GPS)</span>
              {pendingPin && (
                <span style={{ fontSize: 10, background: '#fef3c7', color: '#b45309', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                  ✓ {pendingPin.lat.toFixed(4)}, {pendingPin.lng.toFixed(4)}
                  {(() => {
                    const detectedKel = kelurahanBoundaries ? findBoundaryForCoords(pendingPin.lat, pendingPin.lng, kelurahanBoundaries) : '';
                    return detectedKel ? ` (Kel. ${detectedKel})` : '';
                  })()}
                </span>
              )}
            </div>

            <button
              type="button"
              className="sp-btn"
              style={{
                width: '100%',
                background: '#92400e',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                fontWeight: 700,
                padding: '9px',
                borderRadius: '8px',
                marginBottom: 8,
                boxShadow: '0 2px 6px rgba(146, 64, 14, 0.25)',
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
                style={{ background: '#fde68a', color: '#92400e', fontWeight: 700, padding: '0 12px', border: '1px solid #f59e0b', flexShrink: 0, cursor: 'pointer' }}
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

          <button
            type="submit"
            disabled={saving}
            style={{
              width: '100%',
              background: '#92400e',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '10px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            💾 {saving ? 'Menyimpan...' : 'Simpan Data Peternakan'}
          </button>
        </form>
      )}
    </div>
  );
}

export default Peternakan;

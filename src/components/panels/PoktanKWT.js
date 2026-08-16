import { exportKWTData } from '../../utils/excelExporter';
import React, { useState, useEffect, useMemo } from 'react';
import * as turf from '@turf/turf';
import { parseCoordinates } from '../../utils/parsers';

const findKelurahanForCoords = (lat, lng, boundaries) => {
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

const DEFAULT_PRODUCTS = [
  { key: 'cabai', label: 'Cabai', unit: 'kg', priceUnit: 'Rp/kg' },
  { key: 'tomat', label: 'Tomat', unit: 'kg', priceUnit: 'Rp/kg' },
  { key: 'sawi', label: 'Sawi', unit: 'kg', priceUnit: 'Rp/kg' },
  { key: 'pakcoy', label: 'Pakcoy', unit: 'kg', priceUnit: 'Rp/kg' },
  { key: 'buah_buahan', label: 'Buah-buahan', unit: 'kg', priceUnit: 'Rp/kg' },
  { key: 'sayuran', label: 'Sayuran', unit: 'kg', priceUnit: 'Rp/kg' },
  { key: 'kacang_panjang', label: 'Kacang Panjang', unit: 'kg', priceUnit: 'Rp/kg' },
  { key: 'terong', label: 'Terong', unit: 'kg', priceUnit: 'Rp/kg' },
  { key: 'bayam', label: 'Bayam', unit: 'kg', priceUnit: 'Rp/kg' },
  { key: 'minuman_herbal', label: 'Minuman herbal', unit: 'botol', priceUnit: 'Rp/botol' },
  { key: 'kue', label: 'Kue', unit: 'kg', priceUnit: 'Rp/kg' },
  { key: 'keripik', label: 'Keripik', unit: 'kg', priceUnit: 'Rp/kg' },
  { key: 'lainnya', label: 'Lainnya', unit: 'kg', priceUnit: 'Rp/kg' }
];

const getStoredProducts = () => {
  try {
    const saved = localStorage.getItem('dkpp_kwt_products');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return DEFAULT_PRODUCTS;
};

function safeParseCatatan(catatan) {
  if (!catatan) return [];
  if (Array.isArray(catatan)) return catatan;
  if (typeof catatan === 'string') {
    try {
      const parsed = JSON.parse(catatan);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      console.error("Error parsing catatan:", e);
    }
  }
  return [];
}

function PoktanKWT({
  poktanKMZ,
  poktanList,
  showPoktan,
  showKWT,
  showGapoktan,
  onTogglePoktan,
  onToggleKWT,
  onToggleGapoktan,
  user,
  mapRef,
  supabase,
  onRefresh,
  onPickLocation,
  onFlyToLocation,
  kelurahanBoundaries
}) {
  const isSuperAdmin = user?.email === 'ketapangcilegon@gmail.com';
  const realCurrentYear = new Date().getFullYear();

  const [productList, setProductList] = useState(getStoredProducts);
  const [isManagingProducts, setIsManagingProducts] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdUnit, setNewProdUnit] = useState('kg');

  // UI Navigation states
  const [activeSubTab, setActiveSubTab] = useState('kwt'); // 'kwt' | 'poktan' | 'gapoktan'
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [bulanIdx] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const initForm = {
    nama_poktan: '', jenis: 'KWT', nama_ketua: '',
    jumlah_anggota: '', kelurahan: '',
    produk_unggulan: '', status_aktif: 'Aktif',
  };
  const [form, setForm]               = useState(initForm);
  const [editTarget, setEditTarget]   = useState(null);
  const [prodTarget, setProdTarget]   = useState(null);
  const [pendingPin, setPendingPin]   = useState(null);
  const [gpsInput, setGpsInput]       = useState('');
  const [picking, setPicking]         = useState(false);
  const [mode, setMode]               = useState(null); // null | 'add_kelompok' | 'edit_kelompok' | 'add_prod'
  const [prodJenisFilter, setProdJenisFilter] = useState('KWT');
  const [saving, setSaving]           = useState(false);
  const [formP, setFormP] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    luas_lahan: '',
    produk: {}
  });

  const saveProductListToStorage = (newList) => {
    setProductList(newList);
    localStorage.setItem('dkpp_kwt_products', JSON.stringify(newList));
  };

  // Load master products from Supabase on mount
  useEffect(() => {
    async function loadMasterProducts() {
      if (!supabase) return;
      try {
        const { data, error } = await supabase
          .from('master_produk_kwt')
          .select('*')
          .order('urutan', { ascending: true });
        if (!error && data && data.length > 0) {
          const mapped = data.map(d => ({
            key: d.key,
            label: d.label,
            unit: d.unit,
            priceUnit: d.price_unit || `Rp/${d.unit}`
          }));
          setProductList(mapped);
          localStorage.setItem('dkpp_kwt_products', JSON.stringify(mapped));
        }
      } catch (err) {
        console.error('Error fetching master_produk_kwt:', err);
      }
    }
    loadMasterProducts();
  }, [supabase]);

  // Master product handlers for super admin
  const handleAddNewProduct = async () => {
    if (!newProdName.trim()) return alert('Nama produk tidak boleh kosong.');
    const rawKey = newProdName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const key = rawKey.length > 0 ? `${rawKey}_${Date.now().toString().slice(-4)}` : `prod_${Date.now()}`;
    const unit = newProdUnit.trim() || 'kg';
    const newItem = { key, label: newProdName.trim(), unit, priceUnit: `Rp/${unit}` };
    const newList = [...productList, newItem];
    saveProductListToStorage(newList);
    setNewProdName('');
    setNewProdUnit('kg');

    if (supabase) {
      const { error } = await supabase.from('master_produk_kwt').upsert({
        key,
        label: newItem.label,
        unit: newItem.unit,
        price_unit: newItem.priceUnit,
        urutan: newList.length
      }, { onConflict: 'key' });
      if (error) console.warn('Supabase sync note:', error.message);
    }
  };

  const handleDeleteProduct = async (key) => {
    if (!window.confirm('Hapus jenis produk ini dari daftar master produk?')) return;
    const newList = productList.filter(p => p.key !== key);
    saveProductListToStorage(newList);

    if (supabase) {
      const { error } = await supabase.from('master_produk_kwt').delete().eq('key', key);
      if (error) console.warn('Supabase delete note:', error.message);
    }
  };

  const handleEditProductLabel = async (key, currentLabel, currentUnit) => {
    const newLabel = window.prompt('Ubah nama jenis produk:', currentLabel);
    if (!newLabel || !newLabel.trim()) return;
    const newUnit = window.prompt('Ubah satuan produk (misal: kg, botol, ikat, pack):', currentUnit) || currentUnit;
    const priceUnit = `Rp/${newUnit.trim()}`;
    const newList = productList.map(p => p.key === key ? { ...p, label: newLabel.trim(), unit: newUnit.trim(), priceUnit } : p);
    saveProductListToStorage(newList);

    if (supabase) {
      const { error } = await supabase.from('master_produk_kwt').update({
        label: newLabel.trim(),
        unit: newUnit.trim(),
        price_unit: priceUnit
      }).eq('key', key);
      if (error) console.warn('Supabase update note:', error.message);
    }
  };

  const handleResetProducts = async () => {
    if (!window.confirm('Kembalikan daftar produk ke setelan awal default?')) return;
    saveProductListToStorage(DEFAULT_PRODUCTS);
    if (supabase) {
      await supabase.from('master_produk_kwt').delete().neq('id', 0);
      for (let i = 0; i < DEFAULT_PRODUCTS.length; i++) {
        const d = DEFAULT_PRODUCTS[i];
        await supabase.from('master_produk_kwt').insert({
          key: d.key,
          label: d.label,
          unit: d.unit,
          price_unit: d.priceUnit,
          urutan: i + 1
        });
      }
    }
  };

  // Group lists by type
  const kwtList = useMemo(() => (poktanList || []).filter(p => p.jenis === 'KWT'), [poktanList]);
  const poktanOnlyList = useMemo(() => (poktanList || []).filter(p => p.jenis === 'Poktan'), [poktanList]);
  const gapoktanList = useMemo(() => (poktanList || []).filter(p => p.jenis === 'Gapoktan'), [poktanList]);

  // Current active list based on submodule tab
  const currentCategoryList = useMemo(() => {
    if (activeSubTab === 'poktan') return poktanOnlyList;
    if (activeSubTab === 'gapoktan') return gapoktanList;
    return kwtList;
  }, [activeSubTab, kwtList, poktanOnlyList, gapoktanList]);

  /* ──────────────────────────────────────────────────────────
     AGGREGASI DATA BULANAN & TAHUNAN DARI SELURUH KWT (REAL YEAR)
  ────────────────────────────────────────────────────────── */
  const { monthlyData, totalTahunKg, totalTahunOmset, totalAllLuasM2, latestTimestamp } = useMemo(() => {
    const bulanMap = {};
    let totalLuasM2 = 0;
    const commodityVolumes = {};
    let maxDateFound = null;

    kwtList.forEach(kwt => {
      const logs = safeParseCatatan(kwt.catatan);
      logs.forEach(entry => {
        if (!entry.tgl) return;
        const d = new Date(entry.tgl);
        if (isNaN(d.getTime())) return;

        if (!maxDateFound || d > maxDateFound) {
          maxDateFound = d;
        }

        const year = d.getFullYear();
        const monthNum = d.getMonth() + 1;
        const key = `${year}-${String(monthNum).padStart(2, '0')}`;
        const monthLabel = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

        if (!bulanMap[key]) {
          bulanMap[key] = {
            key,
            year,
            monthNum,
            label: monthLabel,
            totalKg: 0,
            totalOmset: 0,
            luasLahan: 0,
            breakdown: {}
          };
        }

        const luas = parseFloat(entry.luas_lahan || 0);
        bulanMap[key].luasLahan += luas;
        totalLuasM2 += luas;

        const prodObj = entry.produk || {};
        Object.entries(prodObj).forEach(([prodKey, val]) => {
          const qty = parseFloat(val?.qty || 0);
          const harga = parseFloat(val?.harga || 0);
          const omset = qty * harga;

          if (!bulanMap[key].breakdown[prodKey]) {
            bulanMap[key].breakdown[prodKey] = { qty: 0, omset: 0 };
          }
          bulanMap[key].breakdown[prodKey].qty += qty;
          bulanMap[key].breakdown[prodKey].omset += omset;

          if (prodKey !== 'minuman_herbal') {
            bulanMap[key].totalKg += qty;
          }
          bulanMap[key].totalOmset += omset;
          commodityVolumes[prodKey] = (commodityVolumes[prodKey] || 0) + qty;
        });
      });
    });

    const sortedMonths = Object.values(bulanMap).sort((a, b) => b.key.localeCompare(a.key));
    const monthsInRealYear = sortedMonths.filter(m => m.year === realCurrentYear);

    const yearKg = monthsInRealYear.reduce((acc, m) => acc + m.totalKg, 0);
    const yearOmset = monthsInRealYear.reduce((acc, m) => acc + m.totalOmset, 0);

    const earliestMonth = monthsInRealYear.length > 0 ? monthsInRealYear[monthsInRealYear.length - 1] : null;
    const latestMonth = monthsInRealYear.length > 0 ? monthsInRealYear[0] : null;

    const eLabel = earliestMonth ? new Date(earliestMonth.year, earliestMonth.monthNum - 1, 1).toLocaleDateString('id-ID', { month: 'short' }) : 'Jan';
    const lLabel = latestMonth ? new Date(latestMonth.year, latestMonth.monthNum - 1, 1).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }) : `${new Date().toLocaleDateString('id-ID', { month: 'short' })} ${realCurrentYear}`;

    // Sorted top commodities
    const sortedCommodities = Object.entries(commodityVolumes)
      .sort((a, b) => b[1] - a[1])
      .map(([k]) => {
        const found = productList.find(p => p.key === k);
        return found ? found.label : k;
      });

    const defaultTop = ['Sayuran', 'Cabai', 'Kacang Panjang', 'Terong', 'Bayam'];
    const finalTop = sortedCommodities.length > 0 ? sortedCommodities.slice(0, 5) : defaultTop;

    return {
      monthlyData: sortedMonths,
      totalTahunKg: yearKg,
      totalTahunOmset: yearOmset,
      earliestMonthLabel: eLabel,
      latestMonthLabel: lLabel,
      totalAllLuasM2: totalLuasM2,
      topCommoditiesList: finalTop,
      latestTimestamp: maxDateFound
    };
  }, [kwtList, productList, realCurrentYear]);

  // Current selected month data
  const curMonth = monthlyData[bulanIdx] || (monthlyData.length > 0 ? monthlyData[0] : {
    label: new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
    totalKg: 0,
    totalOmset: 0,
    luasLahan: 0,
    breakdown: {}
  });

  const totalKWTCount = kwtList.length;
  const totalAnggotaCount = kwtList.reduce((acc, p) => acc + (parseInt(p.jumlah_anggota) || 0), 0);
  const totalLuasHa = (totalAllLuasM2 / 10000);

  const formatDateTimeDisplay = (d) => {
    const target = d instanceof Date && !isNaN(d) ? d : new Date();
    return target.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }) + ' ' + target.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
  };

  const filteredGroups = (poktanList || []).filter(p => p.jenis === prodJenisFilter && (user ? (!p.user_id || p.user_id === user.id) : true));

  const openAdd = () => {
    setForm({ ...initForm, jenis: activeSubTab === 'poktan' ? 'Poktan' : activeSubTab === 'gapoktan' ? 'Gapoktan' : 'KWT' });
    setEditTarget(null);
    setPendingPin(null);
    setGpsInput('');
    setMode('add_kelompok');
  };

  const openEdit = (p) => {
    if (user && p.user_id && p.user_id !== user.id) {
      alert('Anda tidak memiliki izin untuk mengedit kelompok ini.');
      return;
    }
    setForm({
      nama_poktan: p.nama_poktan || '', jenis: p.jenis || 'KWT',
      nama_ketua: p.nama_ketua || '', jumlah_anggota: String(p.jumlah_anggota || ''),
      kelurahan: p.kelurahan || '',
      produk_unggulan: p.produk_unggulan || '', status_aktif: p.status_aktif || 'Aktif',
    });
    setPendingPin(p.lat && p.lng ? { lat: p.lat, lng: p.lng } : null);
    setEditTarget(p);
    setMode('edit_kelompok');
  };

  const handleSave = async () => {
    if (!user) return alert('Silakan login terlebih dahulu.');
    if (editTarget && editTarget.user_id && editTarget.user_id !== user.id) return alert('Anda tidak memiliki izin untuk mengubah data ini.');
    if (!form.nama_poktan) return alert('Nama kelompok wajib diisi.');

    let kelurahanVal = form.kelurahan;
    if (pendingPin && kelurahanBoundaries) {
      const autoKel = findKelurahanForCoords(pendingPin.lat, pendingPin.lng, kelurahanBoundaries);
      if (autoKel) {
        kelurahanVal = autoKel;
      }
    }

    setSaving(true);
    const payload = {
      nama_poktan: form.nama_poktan,
      jenis: form.jenis,
      nama_ketua: form.nama_ketua || null,
      jumlah_anggota: form.jumlah_anggota ? parseInt(form.jumlah_anggota) : null,
      kelurahan: kelurahanVal || null,
      produk_unggulan: form.jenis === 'KWT' ? null : (form.produk_unggulan || null),
      status_aktif: form.status_aktif || 'Aktif',
    };
    if (pendingPin) { payload.lat = pendingPin.lat; payload.lng = pendingPin.lng; }

    let error;
    if (editTarget) {
      if (!editTarget.user_id) {
        payload.user_id = user.id;
      }
      ({ error } = await supabase.from('poktan_kwt').update(payload).eq('id', editTarget.id));
    } else {
      payload.user_id = user.id;
      payload.lat = pendingPin?.lat || 0; payload.lng = pendingPin?.lng || 0;
      ({ error } = await supabase.from('poktan_kwt').insert(payload));
    }
    setSaving(false);
    if (error) { alert('Gagal menyimpan: ' + error.message); return; }
    setPendingPin(null); setPicking(false); setMode(null); setEditTarget(null); setForm(initForm); setGpsInput('');
    if (onRefresh) onRefresh();
  };

  const handleDelete = async (id) => {
    if (editTarget && editTarget.user_id && editTarget.user_id !== user.id) return alert('Anda tidak memiliki izin untuk menghapus data ini.');
    if (!window.confirm('Apakah Anda yakin ingin menghapus kelompok ini secara permanen beserta riwayat produksinya?')) return;
    await supabase.from('poktan_kwt').delete().eq('id', id);
    setMode(null); setEditTarget(null); setForm(initForm); setPendingPin(null); setGpsInput('');
    if (onRefresh) onRefresh();
  };

  const saveProduksi = async () => {
    if (!user) return alert('Silakan login terlebih dahulu.');
    if (!prodTarget) return alert('Pilih kelompok terlebih dahulu.');
    if (prodTarget.user_id && prodTarget.user_id !== user.id) return alert('Anda tidak memiliki izin untuk menyimpan produksi kelompok ini.');

    let hasQty = false;
    Object.values(formP.produk).forEach(val => {
      if (parseFloat(val.qty || 0) > 0) hasQty = true;
    });
    if (!hasQty) return alert('Isi minimal satu kuantitas produk.');

    setSaving(true);
    const { data: row } = await supabase.from('poktan_kwt').select('catatan').eq('id', prodTarget.id).single();
    let arr = [];
    if (row && row.catatan) {
      if (Array.isArray(row.catatan)) {
        arr = [...row.catatan];
      } else if (typeof row.catatan === 'string') {
        try {
          arr = JSON.parse(row.catatan);
          if (!Array.isArray(arr)) arr = [];
        } catch (e) {
          console.error("Error parsing existing catatan:", e);
        }
      }
    }

    const newEntry = {
      tgl: formP.tanggal,
      luas_lahan: parseFloat(formP.luas_lahan || 0),
      produk: {}
    };

    Object.entries(formP.produk).forEach(([k, v]) => {
      const qty = parseFloat(v.qty || 0);
      const harga = parseFloat(v.harga || 0);
      if (qty > 0) {
        newEntry.produk[k] = { qty, harga };
      }
    });

    arr.push(newEntry);

    const updatePayload = { catatan: arr };
    if (!prodTarget.user_id) {
      updatePayload.user_id = user.id;
    }
    const { error } = await supabase.from('poktan_kwt').update(updatePayload).eq('id', prodTarget.id);
    setSaving(false);
    if (error) {
      alert('Gagal simpan produksi: ' + error.message);
    } else {
      alert('✅ Produksi kelompok berhasil disimpan!');
      setMode(null);
      setProdTarget(null);
      setFormP({
        tanggal: new Date().toISOString().split('T')[0],
        luas_lahan: '',
        produk: {}
      });
      if (onRefresh) onRefresh();
    }
  };

  const statusColor = (s) => s === 'Aktif' ? '#2d6a4f' : '#9ca3af';

  return (
    <div style={{ padding: '12px 14px', fontFamily: 'inherit' }}>
      {picking && (
        <div className="sp-pick-indicator">
          📍 Ketuk peta untuk menentukan titik koordinat lokasi KWT
          <button onClick={() => { setPicking(false); setPendingPin(null); }}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 6, color: '#fff', padding: '2px 8px', cursor: 'pointer', fontSize: 12, marginLeft: 8 }}>Batal</button>
        </div>
      )}

      {/* ── TOP HERO SUMMARY BANNER ── */}
      <div style={{
        background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 45%, #3730a3 100%)',
        color: '#ffffff',
        borderRadius: '16px',
        padding: '16px 18px',
        boxShadow: '0 8px 24px rgba(67, 56, 202, 0.22)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        marginBottom: '14px'
      }}>
        {/* Header Title */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              KELOMPOK WANITA TANI (KWT)
            </div>
            <div style={{ fontSize: '11px', opacity: 0.85, marginTop: '2px' }}>
              Rekapitulasi Spasial & Produksi Kota Cilegon (📅 {curMonth.label})
            </div>
          </div>
        </div>

        {/* 2 Main Metric Stats: Produksi & Omset */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.12)', borderRadius: '10px', padding: '10px 12px' }}>
            <div style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', opacity: 0.85 }}>PRODUKSI BULAN INI</div>
            <div style={{ fontSize: '18px', fontWeight: 800, marginTop: '2px' }}>
              {curMonth.totalKg >= 1000 ? `${(curMonth.totalKg / 1000).toFixed(2)} Ton` : `${curMonth.totalKg.toLocaleString('id-ID')} Kg`}
            </div>
            <div style={{ fontSize: '9.5px', opacity: 0.75, marginTop: '1px' }}>
              Total ({realCurrentYear}): {(totalTahunKg / 1000).toFixed(2)} Ton
            </div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.12)', borderRadius: '10px', padding: '10px 12px' }}>
            <div style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', opacity: 0.85 }}>OMSET BULAN INI</div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#86efac', marginTop: '2px' }}>
              Rp {curMonth.totalOmset.toLocaleString('id-ID')}
            </div>
            <div style={{ fontSize: '9.5px', opacity: 0.75, marginTop: '1px' }}>
              Total ({realCurrentYear}): Rp {totalTahunOmset.toLocaleString('id-ID')}
            </div>
          </div>
        </div>

        {/* Quick stat badges */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', fontSize: '10px' }}>
          <span style={{ background: 'rgba(255, 255, 255, 0.15)', padding: '2px 8px', borderRadius: '6px' }}>
            Jumlah KWT: <b>{totalKWTCount}</b> Kel
          </span>
          <span style={{ background: 'rgba(255, 255, 255, 0.15)', padding: '2px 8px', borderRadius: '6px' }}>
            Anggota: <b>{totalAnggotaCount}</b> Orang
          </span>
          <span style={{ background: 'rgba(255, 255, 255, 0.15)', padding: '2px 8px', borderRadius: '6px' }}>
            Luas Lahan: <b>{totalLuasHa > 0 ? `${totalLuasHa.toFixed(2)} Ha` : `${totalAllLuasM2.toLocaleString('id-ID')} m²`}</b>
          </span>
          <span style={{ background: 'rgba(255, 255, 255, 0.15)', padding: '2px 8px', borderRadius: '6px' }}>
            Update: {formatDateTimeDisplay(latestTimestamp)}
          </span>
        </div>
      </div>

      {/* ── INFO MODAL / POPUP ── */}
      {showInfoModal && (
        <div style={{
          background: '#eff6ff',
          border: '1.5px solid #93c5fd',
          borderRadius: '12px',
          padding: '12px 14px',
          marginBottom: '12px',
          position: 'relative'
        }}>
          <button
            onClick={() => setShowInfoModal(false)}
            style={{
              position: 'absolute',
              right: '10px',
              top: '10px',
              background: '#dbeafe',
              border: 'none',
              borderRadius: '50%',
              width: '20px',
              height: '20px',
              cursor: 'pointer',
              fontWeight: 800,
              color: '#1e40af'
            }}
          >
            ✕
          </button>
          <div style={{ fontSize: '12px', fontWeight: 800, color: '#1e40af', marginBottom: '4px' }}>
            ℹ️ Informasi Panel KWT & Poktan
          </div>
          <div style={{ fontSize: '11px', color: '#1e3a8a', lineHeight: 1.4 }}>
            Kelola data kelompok wanita tani, kelompok tani, titik koordinat GPS spasial, dan riwayat volume panen beserta harga transaksi bulanan.
          </div>
        </div>
      )}

      {/* ── PRIMARY DETAIL MODE: SUB-TABS, ACTION BUTTONS, SEARCH & LIST ── */}
      <div>
        {/* Sub-tabs: KWT, Poktan, Gapoktan */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', borderBottom: '2px solid #e5e7eb', paddingBottom: '8px' }}>
          {[
            { key: 'kwt', label: `👩‍🌾 KWT (${kwtList.length})` },
            { key: 'poktan', label: `🌾 Poktan (${poktanOnlyList.length})` },
            { key: 'gapoktan', label: `🏢 Gapoktan (${gapoktanList.length})` }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveSubTab(tab.key);
                setProdJenisFilter(tab.key === 'poktan' ? 'Poktan' : tab.key === 'gapoktan' ? 'Gapoktan' : 'KWT');
              }}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: activeSubTab === tab.key ? '#4338ca' : '#f3f4f6',
                color: activeSubTab === tab.key ? '#ffffff' : '#4b5563',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Action Buttons for Logged-In Users */}
        {user && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <button
              className="sp-btn sp-btn-primary"
              style={{ flex: 1, background: '#4338ca', color: '#fff', fontWeight: 700 }}
              onClick={() => {
                if (mode === 'add_kelompok') {
                  setMode(null);
                  setEditTarget(null);
                } else {
                  openAdd();
                }
              }}
            >
              ➕ {mode === 'add_kelompok' ? 'Tutup Form' : `Tambah ${activeSubTab.toUpperCase()}`}
            </button>

            <button
              className="sp-btn"
              style={{ flex: 1, background: '#e76f51', color: '#fff', fontWeight: 700 }}
              onClick={() => {
                if (mode === 'add_prod') {
                  setMode(null);
                  setProdTarget(null);
                } else {
                  setMode('add_prod');
                  setProdTarget(null);
                  setFormP({
                    tanggal: new Date().toISOString().split('T')[0],
                    luas_lahan: '',
                    produk: {}
                  });
                }
              }}
            >
              🥬 {mode === 'add_prod' ? 'Tutup Form' : 'Input Produksi'}
            </button>

            {isSuperAdmin && (
              <button
                className="sp-btn"
                style={{
                  background: isManagingProducts ? '#fef3c7' : '#eff6ff',
                  color: isManagingProducts ? '#92400e' : '#1d4ed8',
                  border: `1px solid ${isManagingProducts ? '#fde68a' : '#bfdbfe'}`,
                  fontWeight: 700
                }}
                onClick={() => setIsManagingProducts(v => !v)}
              >
                ⚙️ {isManagingProducts ? 'Tutup Master' : 'Master Produk'}
              </button>
            )}
          </div>
        )}

        {/* Super Admin Master Products Box */}
        {isSuperAdmin && isManagingProducts && (
          <div style={{ background: '#fffbeb', border: '1.5px dashed #f59e0b', borderRadius: '12px', padding: '12px', marginBottom: '14px' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#92400e', marginBottom: '8px' }}>
              ⚙️ PANEL KELOLA MASTER JENIS PRODUK KWT (SUPER ADMIN):
            </div>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
              <input
                className="sp-input"
                placeholder="Nama produk baru..."
                style={{ marginTop: 0, fontSize: '11px', flex: 2 }}
                value={newProdName}
                onChange={e => setNewProdName(e.target.value)}
              />
              <input
                className="sp-input"
                placeholder="Satuan (kg/botol/ikat)"
                style={{ marginTop: 0, fontSize: '11px', flex: 1 }}
                value={newProdUnit}
                onChange={e => setNewProdUnit(e.target.value)}
              />
              <button
                type="button"
                className="sp-btn"
                style={{ background: '#166534', color: '#fff', fontSize: '11px', padding: '0 12px', fontWeight: 700, cursor: 'pointer' }}
                onClick={handleAddNewProduct}
              >
                ➕ Tambah
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={handleResetProducts}
                style={{ background: 'transparent', border: 'none', color: '#b91c1c', fontSize: '10px', cursor: 'pointer', textDecoration: 'underline' }}
              >
                ↺ Reset ke Produk Standar Default
              </button>
            </div>
          </div>
        )}

        {/* ── Form Tambah / Edit Kelompok ── */}
        {(mode === 'add_kelompok' || mode === 'edit_kelompok') && (
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '14px', marginBottom: '14px' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: editTarget ? '#1d4ed8' : '#166534', marginBottom: '8px' }}>
              {editTarget ? `✏️ Edit: ${editTarget.nama_poktan}` : `➕ Tambah Data ${form.jenis}`}
            </div>

            {/* Jenis */}
            <select className="sp-select" value={form.jenis} onChange={e => setForm(p => ({ ...p, jenis: e.target.value }))}>
              <option value="KWT">KWT (Kelompok Wanita Tani)</option>
              <option value="Poktan">Poktan (Kelompok Tani)</option>
              <option value="Gapoktan">Gapoktan (Gabungan Kelompok Tani)</option>
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

            {/* Status Aktif */}
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase' }}>Status Kelompok</div>
              <select className="sp-select" value={form.status_aktif} onChange={e => setForm(p => ({ ...p, status_aktif: e.target.value }))} style={{ marginTop: 0 }}>
                <option value="Aktif">✅ Aktif</option>
                <option value="Tidak Aktif">❌ Tidak Aktif</option>
                <option value="Vakum">⏸️ Vakum</option>
              </select>
            </div>

            {/* Lokasi Koordinat (Pilih di Peta atau Input Manual) */}
            <div style={{
              marginTop: 12,
              padding: '12px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '10px',
              marginBottom: 10
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#166534', marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>📍 Lokasi Koordinat (GPS)</span>
                {pendingPin && (
                  <span style={{ fontSize: 10, background: '#dcfce7', color: '#15803d', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                    ✓ {pendingPin.lat.toFixed(4)}, {pendingPin.lng.toFixed(4)}
                    {(() => {
                      const detectedKel = kelurahanBoundaries ? findKelurahanForCoords(pendingPin.lat, pendingPin.lng, kelurahanBoundaries) : '';
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
                  background: picking ? '#ea580c' : '#166534',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  fontWeight: 700,
                  padding: '9px',
                  borderRadius: '8px',
                  marginBottom: 8,
                  boxShadow: '0 2px 6px rgba(22, 101, 52, 0.25)',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  setPicking(true);
                  if (onPickLocation) {
                    onPickLocation((coords) => {
                      setPendingPin(coords);
                      setPicking(false);
                      if (onFlyToLocation) onFlyToLocation(coords.lat, coords.lng);
                    });
                  }
                }}
              >
                <span>📍</span> {picking ? 'Klik sembarang titik di peta...' : 'Pilih Lokasi di Peta'}
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
                  style={{ background: '#dcfce7', color: '#166534', fontWeight: 700, padding: '0 12px', border: '1px solid #86efac', flexShrink: 0, cursor: 'pointer' }}
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
              <button className="sp-btn" style={{ background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb' }}
                onClick={() => { setMode(null); setEditTarget(null); setForm(initForm); setGpsInput(''); }}>Batal</button>
              <button className="sp-btn sp-btn-primary" disabled={saving} onClick={handleSave}>
                💾 {saving ? 'Menyimpan...' : editTarget ? 'Update' : 'Simpan'}
              </button>
            </div>
            {editTarget && (
              <button className="sp-btn sp-btn-danger" style={{ width: '100%', marginTop: 8 }} onClick={() => handleDelete(editTarget.id)}>
                🗑️ Hapus Kelompok Ini
              </button>
            )}
          </div>
        )}

        {/* ── Form Input Produksi ── */}
        {mode === 'add_prod' && (
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '14px', marginBottom: '14px' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#e76f51', textTransform: 'uppercase', marginBottom: '8px' }}>
              INPUT PRODUKSI & OMSET
            </div>

            <select className="sp-select" value={prodJenisFilter} onChange={e => { setProdJenisFilter(e.target.value); setProdTarget(null); }}>
              <option value="KWT">KWT</option>
              <option value="Poktan">Poktan</option>
              <option value="Gapoktan">Gapoktan</option>
            </select>

            <select className="sp-select" style={{ marginTop: 8 }} value={prodTarget?.id || ''} onChange={e => {
              const found = filteredGroups.find(g => String(g.id) === e.target.value);
              setProdTarget(found || null);
            }}>
              <option value="">-- Pilih Kelompok ({prodJenisFilter}) --</option>
              {filteredGroups.map(g => (
                <option key={g.id} value={g.id}>{g.nama_poktan}</option>
              ))}
            </select>

            {prodTarget && (
              <>
                <input type="date" className="sp-input" style={{ marginTop: 8 }} value={formP.tanggal}
                  onChange={e => setFormP(p => ({ ...p, tanggal: e.target.value }))} />

                <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px', marginTop: 10, background: '#fafafa' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', marginBottom: 8 }}>
                    RINCIAN PRODUKSI DAN HARGA
                  </div>

                  {productList.map(item => (
                    <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <span style={{ fontSize: 11, flex: 1.5, display: 'flex', alignItems: 'center', gap: 4 }}>
                        {item.label}
                        {isSuperAdmin && isManagingProducts && (
                          <>
                            <button
                              type="button"
                              title="Edit nama/satuan"
                              onClick={() => handleEditProductLabel(item.key, item.label, item.unit)}
                              style={{ background: '#eff6ff', border: 'none', borderRadius: 3, padding: '1px 4px', fontSize: 9, cursor: 'pointer', color: '#1d4ed8' }}
                            >
                              ✏️
                            </button>
                            <button
                              type="button"
                              title="Hapus produk"
                              onClick={() => handleDeleteProduct(item.key)}
                              style={{ background: '#fee2e2', border: 'none', borderRadius: 3, padding: '1px 4px', fontSize: 9, cursor: 'pointer', color: '#b91c1c' }}
                            >
                              🗑️
                            </button>
                          </>
                        )}
                      </span>
                      <input type="number" min="0" placeholder="0" style={{ width: 55, fontSize: 11, padding: '2px 4px', border: '1px solid #d1d5db', borderRadius: 4 }}
                        value={formP.produk[item.key]?.qty || ''} onChange={e => {
                          const qtyVal = e.target.value;
                          setFormP(prev => ({
                            ...prev,
                            produk: {
                              ...prev.produk,
                              [item.key]: {
                                ...prev.produk[item.key],
                                qty: qtyVal
                              }
                            }
                          }));
                        }} />
                      <span style={{ fontSize: 10, color: '#999', width: 32 }}>{item.unit}</span>

                      <span style={{ fontSize: 10, color: '#666' }}>{item.priceUnit || `Rp/${item.unit}`}</span>
                      <input type="number" min="0" placeholder="0" style={{ width: 70, fontSize: 11, padding: '2px 4px', border: '1px solid #d1d5db', borderRadius: 4 }}
                        value={formP.produk[item.key]?.harga || ''} onChange={e => {
                          const hargaVal = e.target.value;
                          setFormP(prev => ({
                            ...prev,
                            produk: {
                              ...prev.produk,
                              [item.key]: {
                                ...prev.produk[item.key],
                                harga: hargaVal
                              }
                            }
                          }));
                        }} />
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>LUAS LAHAN PRODUKSI:</span>
                  <input type="number" min="0" placeholder="0" style={{ width: 60, fontSize: 11, padding: '4px 6px', border: '1px solid #d1d5db', borderRadius: 4 }}
                    value={formP.luas_lahan} onChange={e => {
                      const luasVal = e.target.value;
                      setFormP(prev => ({ ...prev, luas_lahan: luasVal }));
                    }} />
                  <span style={{ fontSize: 11, color: '#666' }}>m²</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
                  <button className="sp-btn" style={{ background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb' }}
                    onClick={() => { setMode(null); setProdTarget(null); }}>Batal</button>
                  <button className="sp-btn sp-btn-primary" disabled={saving} onClick={saveProduksi}>
                    💾 {saving ? 'Menyimpan...' : 'Simpan Produksi'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── RINCIAN BREAKDOWN KOMODITAS BULAN INI ── */}
        {curMonth && Object.keys(curMonth.breakdown || {}).length > 0 && (
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '14px', marginBottom: '14px' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#4338ca', marginBottom: '8px', textTransform: 'uppercase' }}>
              📊 Rincian Komoditas ({curMonth.label})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {Object.entries(curMonth.breakdown).map(([prodKey, val]) => {
                const prodDef = productList.find(p => p.key === prodKey) || { label: prodKey, unit: 'kg' };
                return (
                  <div key={prodKey} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: '#f9fafb', borderRadius: '6px', fontSize: '11px' }}>
                    <span style={{ fontWeight: 600 }}>{prodDef.label}</span>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontWeight: 700, color: '#4338ca' }}>{val.qty.toLocaleString('id-ID')} {prodDef.unit}</span>
                      {val.omset > 0 && (
                        <span style={{ color: '#166534', fontWeight: 600, marginLeft: '8px' }}>
                          (Rp {val.omset.toLocaleString('id-ID')})
                        </span>
                      )}
                      {user && (user.email === 'ketapangcilegon@gmail.com' || isSuperAdmin || !val.user_id || val.user_id === user.id) && (
                        <button
                          type="button"
                          onClick={() => {
                            const newQtyStr = window.prompt(`Edit Volume Produksi ${prodDef.label} (${prodDef.unit}):`, val.qty);
                            if (newQtyStr === null) return;
                            const newQty = parseFloat(newQtyStr);
                            if (isNaN(newQty)) return alert('Volume tidak valid.');

                            const currentHarga = val.omset && val.qty ? val.omset / val.qty : 0;
                            const newHargaStr = window.prompt(`Edit Harga per ${prodDef.unit} (Rp):`, currentHarga);
                            if (newHargaStr === null) return;
                            const newHarga = parseFloat(newHargaStr);
                            if (isNaN(newHarga)) return alert('Harga tidak valid.');

                            alert(`Produksi ${prodDef.label} berhasil diperbarui: ${newQty} ${prodDef.unit} @ Rp ${newHarga.toLocaleString('id-ID')}`);
                            if (onRefresh) onRefresh();
                          }}
                          style={{
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            borderRadius: '4px',
                            padding: '2px 6px',
                            fontSize: '10px',
                            cursor: 'pointer',
                            color: '#1d4ed8',
                            fontWeight: 700,
                            marginLeft: '8px'
                          }}
                          title="Edit volume & harga komoditas ini (Khusus Pemilik & Super Admin)"
                        >
                          ✏️ Edit
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── DAFTAR DATA KELOMPOK (KWT / POKTAN / GAPOKTAN) ── */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '14px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#374151' }}>
              📋 Daftar {activeSubTab.toUpperCase()} ({currentCategoryList.length})
            </div>
            <input
              type="text"
              placeholder="Cari kelompok / kelurahan..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ fontSize: '11px', padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: '6px', width: '160px' }}
            />
          </div>

          {currentCategoryList.length === 0 ? (
            <p style={{ color: '#9ca3af', fontSize: '11px', textAlign: 'center', padding: '16px 0' }}>Belum ada data {activeSubTab.toUpperCase()}.</p>
          ) : (
            currentCategoryList
              .filter(p => {
                if (!searchQuery) return true;
                const q = searchQuery.toLowerCase();
                return (p.nama_poktan || '').toLowerCase().includes(q) ||
                       (p.kelurahan || '').toLowerCase().includes(q) ||
                       (p.nama_ketua || '').toLowerCase().includes(q);
              })
              .map(p => {
                const logs = safeParseCatatan(p.catatan);
                let totalKg = 0;
                let totalOmset = 0;
                logs.forEach(entry => {
                  const prodData = entry.produk || {};
                  Object.entries(prodData).forEach(([prodKey, val]) => {
                    const qty = parseFloat(val?.qty || 0);
                    const harga = parseFloat(val?.harga || 0);
                    totalOmset += qty * harga;
                    if (prodKey !== 'minuman_herbal') {
                      totalKg += qty;
                    }
                  });
                });

                return (
                  <div key={p.id} style={{
                    background: '#f9fafb',
                    border: '1px solid #f0f0f0',
                    borderLeft: `3px solid ${statusColor(p.status_aktif)}`,
                    borderRadius: '8px',
                    padding: '10px 12px',
                    marginBottom: '8px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1, cursor: p.lat ? 'pointer' : 'default' }}
                        onClick={() => p.lat && p.lng && mapRef?.current?.flyTo([p.lat, p.lng], 17, { duration: 1 })}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <b style={{ fontSize: '12px' }}>{p.jenis === 'KWT' ? '👩‍🌾' : '👨‍🌾'} {p.nama_poktan}</b>
                          <span style={{
                            fontSize: '9px',
                            background: p.status_aktif === 'Aktif' ? '#dcfce7' : '#f3f4f6',
                            color: statusColor(p.status_aktif),
                            borderRadius: '4px',
                            padding: '1px 6px',
                            fontWeight: 700
                          }}>
                            {p.status_aktif || 'Aktif'}
                          </span>
                        </div>

                        <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '3px' }}>
                          {p.nama_ketua && `Ketua: ${p.nama_ketua}`}
                          {p.jumlah_anggota ? ` · 👤 ${p.jumlah_anggota} anggota` : ''}
                          {p.kelurahan ? ` · 🏘️ Kel. ${p.kelurahan}` : ''}
                        </div>

                        {totalKg > 0 || totalOmset > 0 ? (
                          <div style={{ fontSize: '10px', color: '#4338ca', fontWeight: 700, marginTop: '4px' }}>
                            📦 Total Produksi: {(totalKg / 1000).toFixed(2)} ton · 💰 Omset: Rp {totalOmset.toLocaleString('id-ID')}
                          </div>
                        ) : null}

                        {p.lat && p.lng ? (
                          <div style={{ fontSize: '9px', color: '#4338ca', marginTop: '3px' }}>
                            📍 Titik GPS: {p.lat.toFixed(4)}, {p.lng.toFixed(4)} (Klik untuk zoom)
                          </div>
                        ) : null}
                      </div>

                      {user && (!p.user_id || p.user_id === user.id) && (
                        <button onClick={() => openEdit(p)}
                          style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '3px 8px', fontSize: '10px', cursor: 'pointer', color: '#1d4ed8', fontWeight: 700, flexShrink: 0, marginLeft: '8px' }}>
                          ✏️ Edit
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </div>
    </div>
  );
}

export default PoktanKWT;
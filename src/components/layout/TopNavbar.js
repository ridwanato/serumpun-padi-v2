import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ALL_KEC, ALL_KEL, KEL_TO_KEC } from '../../config/wilayah';
import { fetchRealtimeWeather } from '../../utils/weatherService';

function TopNavbar({
  // Search data props
  layers,
  sawahStatus,
  budidayaList,
  tangkapList,
  poktanList,
  hortiList,
  palawijaList,
  warningList,
  onSelectView,
  onZoomToSawah,
  onFlyToLocation,
  onOpenModal,
  // User Auth props
  user,
  setUser,
  supabase,
  setShowAuth,
  isSidebarOpen,
  onToggleDashboardPanel,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [activeSearchIndex, setActiveSearchIndex] = useState(-1);

  const searchBoxRef = useRef(null);
  const userMenuRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setIsSearchOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Live formatted Indonesian Date
  const [currentDateStr, setCurrentDateStr] = useState('');
  useEffect(() => {
    const formatIndonesianDate = () => {
      const now = new Date();
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      const dayName = days[now.getDay()];
      const dayNum = now.getDate();
      const monthName = months[now.getMonth()];
      const year = 2026;
      return `${dayName}, ${dayNum} ${monthName} ${year}`;
    };
    setCurrentDateStr(formatIndonesianDate());
  }, []);

  /* ─────────────────────────────────────────────────────────────
     REAL-TIME BMKG WEATHER SERVICE
  ───────────────────────────────────────────────────────────── */
  const [weatherData, setWeatherData] = useState({
    temp: '32°C',
    desc: 'Cerah',
    icon: '☀️',
    fullText: 'Cuaca Kota Cilegon: Memuat data realtime BMKG...',
  });

  useEffect(() => {
    let isMounted = true;
    const loadWeather = async () => {
      const w = await fetchRealtimeWeather();
      if (isMounted && w) {
        setWeatherData(w);
      }
    };
    loadWeather();
    const interval = setInterval(loadWeather, 10 * 60 * 1000); // refresh every 10 min
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  /* ─────────────────────────────────────────────────────────────
     ALGORITMA PENCARIAN CERDAS (SMART SEARCH AUTO-COMPLETE ALGORITHM)
  ───────────────────────────────────────────────────────────── */
  const searchResults = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q || q.length < 2) return [];

    const results = [];

    // 1. Pencarian Wilayah (Kecamatan & Kelurahan)
    ALL_KEC.forEach((kec) => {
      if (kec.toLowerCase().includes(q)) {
        results.push({
          category: 'Wilayah & Lokasi',
          type: 'kecamatan',
          icon: '🏛️',
          title: `Kecamatan ${kec}`,
          subtitle: 'Wilayah Kota Cilegon',
          action: () => {
            const kelFeatures = (layers.kelurahan || []).filter(
              (f) => KEL_TO_KEC[f.properties?.name] === kec
            );
            if (kelFeatures.length > 0 && onFlyToLocation) {
              onSelectView('gambar_poligon');
            }
            setIsSearchOpen(false);
          },
        });
      }
    });

    ALL_KEL.forEach((kel) => {
      if (kel.toLowerCase().includes(q)) {
        const kec = KEL_TO_KEC[kel] || 'Kota Cilegon';
        results.push({
          category: 'Wilayah & Lokasi',
          type: 'kelurahan',
          icon: '🏘️',
          title: `Kelurahan ${kel}`,
          subtitle: `Kecamatan ${kec}`,
          action: () => {
            const target = (layers.kelurahan || []).find(
              (f) => (f.properties?.name || '').toLowerCase() === kel.toLowerCase()
            );
            if (target && onFlyToLocation) {
              onSelectView('gambar_poligon');
            }
            setIsSearchOpen(false);
          },
        });
      }
    });

    // 2. Pencarian Petak Sawah & Poligon
    (layers.sawah || []).slice(0, 300).forEach((f) => {
      const props = f.properties || {};
      const name = props.pemilik || props.nama || props.name || `Petak Sawah #${f._id}`;
      const kec = props.kecamatan || props.WADMKC || '';
      const kel = props.kelurahan || props.WADMKD || '';
      const sd = (sawahStatus || {})[f._id] || {};
      const status = sd.status || 'Belum Ditentukan';
      const varietas = sd.varietas || '-';

      const matchText = `${name} ${kec} ${kel} ${status} ${varietas} sawah ${f._id}`.toLowerCase();
      if (matchText.includes(q)) {
        results.push({
          category: 'Petak Sawah & Poligon',
          type: 'sawah',
          icon: '🌾',
          title: `${name}`,
          subtitle: `${kel ? kel + ', ' : ''}${kec ? kec : 'Kota Cilegon'} • Status: ${status}`,
          action: () => {
            if (onZoomToSawah) onZoomToSawah(f);
            setIsSearchOpen(false);
          },
        });
      }
    });

    // 3. Pencarian Perikanan & Kelompok Tani
    (budidayaList || []).forEach((b) => {
      const match = `${b.nama || b.nama_kolam || ''} ${b.komoditas || ''} ${b.kelurahan || ''} budidaya kolam`.toLowerCase();
      if (match.includes(q)) {
        results.push({
          category: 'Perikanan & Peternakan',
          type: 'budidaya',
          icon: '🐟',
          title: b.nama || b.nama_kolam || 'Kolam Budidaya Ikan',
          subtitle: `${b.komoditas ? b.komoditas + ' • ' : ''}${b.kelurahan || 'Cilegon'}`,
          action: () => {
            onSelectView('perikanan_budidaya');
            if (b.lat && b.lng && onFlyToLocation) onFlyToLocation(b.lat, b.lng);
            setIsSearchOpen(false);
          },
        });
      }
    });

    (tangkapList || []).forEach((t) => {
      const match = `${t.nama || t.pangkalan || ''} ${t.kelurahan || ''} nelayan tangkap`.toLowerCase();
      if (match.includes(q)) {
        results.push({
          category: 'Perikanan & Peternakan',
          type: 'tangkap',
          icon: '⛵',
          title: t.nama || t.pangkalan || 'Pangkalan Nelayan',
          subtitle: `Pangkalan Nelayan • ${t.kelurahan || 'Cilegon'}`,
          action: () => {
            onSelectView('perikanan_tangkap');
            if (t.lat && t.lng && onFlyToLocation) onFlyToLocation(t.lat, t.lng);
            setIsSearchOpen(false);
          },
        });
      }
    });

    (poktanList || []).forEach((p) => {
      const match = `${p.nama || ''} ${p.jenis || ''} ${p.kelurahan || ''} kwt poktan gapoktan`.toLowerCase();
      if (match.includes(q)) {
        results.push({
          category: 'Kelompok Tani & KWT',
          type: 'poktan',
          icon: p.jenis === 'KWT' ? '👩‍🌾' : '👨‍🌾',
          title: `${p.nama || 'Kelompok Tani'} (${p.jenis || 'Poktan'})`,
          subtitle: `${p.kelurahan ? p.kelurahan + ' • ' : ''}Ketua: ${p.ketua || '-'}`,
          action: () => {
            onSelectView('poktan_kwt');
            if (p.lat && p.lng && onFlyToLocation) onFlyToLocation(p.lat, p.lng);
            setIsSearchOpen(false);
          },
        });
      }
    });

    // 4. Pencarian Fitur, Menu & Layanan
    const featuresList = [
      { name: 'Dashboard Utama', view: 'dashboard', icon: '🏠', desc: 'Ringkasan data pertanian & perikanan' },
      { name: 'Rekap Luas Tanam Padi', view: 'rekap_luas', icon: '📋', desc: 'Laporan luas tanam per kecamatan' },
      { name: 'Rekap Produksi GKG & Panen', view: 'rekap_produksi', icon: '🏢', desc: 'Kalkulasi produksi gabah kering giling' },
      { name: 'Peta Poligon Sawah & Draw Tool', view: 'gambar_poligon', icon: '🗺️', desc: 'Gambar dan edit batas bidang lahan' },
      { name: 'Data Hortikultura (Cabai, Tomat)', view: 'hortikultura', icon: '🌶️', desc: 'Titik sebaran komoditas hortikultura' },
      { name: 'Data Palawija (Jagung, Kedelai)', view: 'palawija', icon: '🌿', desc: 'Titik sebaran komoditas palawija' },
      { name: 'Modul Peternakan Kota Cilegon', view: 'peternakan', icon: '🐄', desc: 'Populasi sapi, kambing, dan unggas' },
      { name: 'Peringatan OPT & Bencana Pertanian', view: 'warning', icon: '⚠️', desc: 'Deteksi dini serangan hama penyakit' },
      { name: 'Ketahanan Pangan (FSVA / SKPG)', view: 'ikpg_admin', icon: '🥣', desc: 'Kelola data peta FSVA dan SKPG kelurahan' },
      { name: 'Cetak Peta & Dokumen', view: 'cetak_peta', icon: '🖨️', desc: 'Cetak tampilan peta resolusi tinggi' },
    ];

    featuresList.forEach((feat) => {
      if (`${feat.name} ${feat.desc}`.toLowerCase().includes(q)) {
        results.push({
          category: 'Menu & Fitur Sistem',
          type: 'feature',
          icon: feat.icon,
          title: feat.name,
          subtitle: feat.desc,
          action: () => {
            if (feat.view === 'cetak_peta') {
              window.print();
            } else {
              onSelectView(feat.view);
            }
            setIsSearchOpen(false);
          },
        });
      }
    });

    return results.slice(0, 15);
  }, [
    searchTerm,
    layers,
    sawahStatus,
    budidayaList,
    tangkapList,
    poktanList,
    onSelectView,
    onZoomToSawah,
    onFlyToLocation,
  ]);

  const handleKeyDown = (e) => {
    if (!isSearchOpen || searchResults.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSearchIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSearchIndex((prev) => (prev > 0 ? prev - 1 : searchResults.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeSearchIndex >= 0 && activeSearchIndex < searchResults.length) {
        searchResults[activeSearchIndex].action();
      } else if (searchResults.length > 0) {
        searchResults[0].action();
      }
    } else if (e.key === 'Escape') {
      setIsSearchOpen(false);
    }
  };

  /* ─────────────────────────────────────────────────────────────
     ALGORITMA USER PROFILE (ADMIN & USER GMAIL)
  ───────────────────────────────────────────────────────────── */
  const isSuper = user && user.email && user.email.toLowerCase() === 'ketapangcilegon@gmail.com';

  const userDisplayName = user
    ? (isSuper ? 'ADMIN' : user.email)
    : 'Tamu (Read Only)';

  const userGmailPlaceholder = user
    ? user.email
    : 'Masuk Akun DKPP';

  const userRole = user
    ? (isSuper ? 'Super Admin (DKPP Cilegon)' : 'Pengguna Terdaftar')
    : 'Tamu / Viewer';

  const handleSignOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    if (setUser) setUser(null);
    setIsUserMenuOpen(false);
  };

  // Langsung tampilkan modal login jika belum login saat tombol diklik
  const handleUserBtnClick = () => {
    if (!user) {
      if (setShowAuth) setShowAuth(true);
    } else {
      setIsUserMenuOpen((v) => !v);
    }
  };

  return (
    <header className="sp-topbar">
      {/* ── Kotak Pencarian Pintar (Smart Search Bar) ── */}
      <div className="sp-topbar__search-wrap" ref={searchBoxRef}>
        <div className="sp-topbar__search-box">
          <span className="sp-topbar__search-icon">🔍</span>
          <input
            type="text"
            className="sp-topbar__search-input"
            placeholder="Cari lokasi, data, atau layer..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsSearchOpen(true);
              setActiveSearchIndex(-1);
            }}
            onFocus={() => {
              if (searchTerm.trim().length >= 2) setIsSearchOpen(true);
            }}
            onKeyDown={handleKeyDown}
          />
          {searchTerm && (
            <button
              className="sp-topbar__search-clear"
              onClick={() => {
                setSearchTerm('');
                setIsSearchOpen(false);
              }}
              title="Hapus pencarian"
            >
              ✕
            </button>
          )}
          <span className="sp-topbar__search-end-icon">🔍</span>
        </div>

        {/* Search Results Dropdown List */}
        {isSearchOpen && (
          <div className="sp-search-dropdown">
            {searchResults.length > 0 ? (
              <div className="sp-search-dropdown__list">
                {searchResults.map((item, idx) => {
                  const isSelected = activeSearchIndex === idx;
                  return (
                    <div
                      key={idx}
                      className={`sp-search-dropdown__item ${isSelected ? 'is-selected' : ''}`}
                      onClick={item.action}
                      onMouseEnter={() => setActiveSearchIndex(idx)}
                    >
                      <span className="sp-search-dropdown__item-icon">{item.icon}</span>
                      <div className="sp-search-dropdown__item-info">
                        <div className="sp-search-dropdown__item-title">{item.title}</div>
                        <div className="sp-search-dropdown__item-sub">{item.subtitle}</div>
                      </div>
                      <span className="sp-search-dropdown__item-cat">{item.category}</span>
                    </div>
                  );
                })}
              </div>
            ) : searchTerm.trim().length >= 2 ? (
              <div className="sp-search-dropdown__empty">
                <span>🌾 Tidak ada data atau layer yang cocok dengan "{searchTerm}"</span>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* ── Mobile Centered Header Button: PANEL PRODUKSI (Capture 2) ── */}
      {onToggleDashboardPanel && (
        <div className="sp-mobile-header-center">
          <button
            className="sp-mobile-header-btn"
            onClick={onToggleDashboardPanel}
            title="Buka Panel Produksi"
          >
            <span>PANEL PRODUKSI</span>
          </button>
        </div>
      )}

      {/* ── Status & Info Section (Date, Weather, User Profile) ── */}
      <div className="sp-topbar__right">
        {/* Date Display */}
        <div className="sp-topbar__date">
          <span>{currentDateStr || 'Minggu, 16 Agustus 2026'}</span>
        </div>

        {/* Real-time BMKG Weather Indicator */}
        <div className="sp-topbar__weather" title={weatherData.fullText}>
          <span className="sp-topbar__weather-icon">{weatherData.icon}</span>
          <span className="sp-topbar__weather-temp">{weatherData.temp}</span>
        </div>

        {/* ── User Account Profile Widget & Direct Login Trigger ── */}
        <div className="sp-topbar__user-wrap" ref={userMenuRef}>
          <div
            className="sp-topbar__user-btn"
            onClick={handleUserBtnClick}
            title={user ? "Profil Pengguna & Akun" : "Klik untuk Masuk Akun DKPP (Login)"}
          >
            <div className="sp-topbar__avatar">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>
            <div className="sp-topbar__user-info">
              <div className="sp-topbar__user-name">{userDisplayName}</div>
              <div className="sp-topbar__user-role">{userGmailPlaceholder}</div>
            </div>
            {user && <span className="sp-topbar__user-caret">▾</span>}
          </div>

          {/* User Account Dropdown Modal (Only shown if user is logged in) */}
          {isUserMenuOpen && user && (
            <div className="sp-user-dropdown">
              <div className="sp-user-dropdown__header">
                <div className="sp-user-dropdown__avatar-large">
                  <svg viewBox="0 0 24 24" width="32" height="32" fill="#166534">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                </div>
                <div>
                  <div className="sp-user-dropdown__name">{userDisplayName}</div>
                  <div className="sp-user-dropdown__email">{userGmailPlaceholder}</div>
                  <div className="sp-user-dropdown__badge">
                    <span className="sp-user-dropdown__status-dot" /> {userRole}
                  </div>
                </div>
              </div>

              <div className="sp-user-dropdown__divider" />

              <div className="sp-user-dropdown__footer">
                <button className="sp-user-dropdown__logout-btn" onClick={handleSignOut}>
                  <span>🚪</span> Keluar Sesi (Logout)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default TopNavbar;

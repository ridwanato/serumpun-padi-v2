import React from 'react';

function LeftIconRail({
  activeView,
  onSelectView,
  onToggleSidebar,
  isSidebarOpen,
  onOpenModal,
}) {
  const iconItems = [
    { id: 'status_sawah', icon: '🌾', label: 'Padi Sawah', type: 'view' },
    { id: 'perikanan_budidaya', icon: '🐟', label: 'Perikanan Budidaya', type: 'view' },
    { id: 'perikanan_tangkap', icon: '⛵', label: 'Perikanan Tangkap', type: 'view' },
    { id: 'hortikultura', icon: '🌶️', label: 'Hortikultura', type: 'view' },
    { id: 'palawija', icon: '🌿', label: 'Palawija', type: 'view' },
    { id: 'peternakan', icon: '🐄', label: 'Peternakan', type: 'view' },
    { id: 'poktan_kwt', icon: '👩‍🌾', label: 'Poktan & KWT', type: 'view' },
    { id: 'gapoktan', icon: '🤝', label: 'Gapoktan', type: 'view' },
    { id: 'ketahanan_pangan', icon: '🥣', label: 'Ketahanan Pangan', type: 'view' },
    { id: 'warning', icon: '⚠️', label: 'Peringatan OPT', type: 'view' },
    { id: 'upload_kmz', icon: '📤', label: 'Upload KMZ / Shapefile', type: 'modal' },
    { id: 'fsva_skpg', icon: '📋', label: 'FSVA / SKPG', type: 'modal' },
    { id: 'analisis', icon: '🧮', label: 'Analisis & Perhitungan', type: 'modal' },
    { id: 'pengaturan', icon: '⚙️', label: 'Transparansi Layer', type: 'modal' },
  ];

  const handleClick = (item) => {
    if (item.type === 'view') {
      onSelectView(item.id);
    } else if (item.type === 'modal') {
      onOpenModal(item.id);
    } else if (item.id === 'cetak_peta') {
      window.print();
    }
  };

  return (
    <aside className="sp-icon-rail" aria-label="Quick Navigation Rail">
      {/* Top Logo / Chevron Toggle Icon */}
      <div 
        className="sp-icon-rail__logo"
        onClick={onToggleSidebar}
        title={isSidebarOpen ? "Tutup menu sidebar" : "Buka menu sidebar"}
      >
        <div className={`sp-icon-rail__logo-badge ${!isSidebarOpen ? 'is-collapsed-trigger' : ''}`}>
          {!isSidebarOpen ? (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#ffffff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          ) : (
            <svg viewBox="0 0 36 36" width="22" height="22" fill="none">
              <path d="M18 5 C13 11, 9 17, 9 23 C9 27.5 12.8 30 18 30 C23.2 30, 27 27.5, 27 23 C27 17, 23 11, 18 5 Z" fill="#22c55e" opacity="0.9" />
              <path d="M18 9 L18 29 M18 15 C15.5 13.5, 13.5 16, 13.5 16 M18 19 C20.5 17.5, 22.5 20, 22.5 20 M18 23 C15.5 21.5, 13.5 24, 13.5 24" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          )}
        </div>
      </div>

      {/* Main Action Icons */}
      <div className="sp-icon-rail__list">
        {iconItems.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              className={`sp-icon-rail__btn ${isActive ? 'is-active' : ''}`}
              onClick={() => handleClick(item)}
              title={item.label}
              aria-label={item.label}
            >
              <span className="sp-icon-rail__symbol">{item.icon}</span>
            </button>
          );
        })}
      </div>

      {/* Bottom Help Icon */}
      <div className="sp-icon-rail__bottom">
        <button
          className="sp-icon-rail__btn sp-icon-rail__btn--help"
          onClick={() => onOpenModal('panduan')}
          title="Panduan Penggunaan"
          aria-label="Panduan Penggunaan"
        >
          <span className="sp-icon-rail__symbol">❓</span>
        </button>
      </div>
    </aside>
  );
}

export default LeftIconRail;

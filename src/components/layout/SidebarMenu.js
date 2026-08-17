import React, { useRef } from 'react';

function SidebarMenu({
  isOpen,
  onToggleSidebar,
  activeView,
  onSelectView,
  // Layer toggles
  layerStates,
  onToggleLayer,
  // Actions
  onOpenModal,
  onImportFile,
}) {
  const fileInputRef = useRef(null);

  const menuItems = [
    {
      id: 'sawah',
      label: 'Padi Sawah (Poligon)',
      icon: '🌾',
      view: 'status_sawah',
      checked: layerStates.showSawah,
      key: 'showSawah',
    },
    {
      id: 'perikanan_budidaya',
      label: 'Perikanan Budidaya',
      icon: '🐟',
      view: 'perikanan_budidaya',
      checked: layerStates.showKolam,
      key: 'showKolam',
    },
    {
      id: 'perikanan_tangkap',
      label: 'Perikanan Tangkap',
      icon: '⛵',
      view: 'perikanan_tangkap',
      checked: layerStates.showNelayan,
      key: 'showNelayan',
    },
    {
      id: 'hortikultura',
      label: 'Hortikultura',
      icon: '🌶️',
      view: 'hortikultura',
      checked: layerStates.showHortiPin,
      key: 'showHortiPin',
    },
    {
      id: 'palawija',
      label: 'Palawija',
      icon: '🌿',
      view: 'palawija',
      checked: layerStates.showPalawijaPin,
      key: 'showPalawijaPin',
    },
    {
      id: 'peternakan',
      label: 'Peternakan',
      icon: '🐄',
      view: 'peternakan',
      checked: layerStates.showPeternakan !== false,
      key: 'showPeternakan',
    },
    {
      id: 'poktan_kwt',
      label: 'Poktan & KWT',
      icon: '👩‍🌾',
      view: 'poktan_kwt',
      checked: layerStates.showKWTPin,
      key: 'showKWTPin',
    },
    {
      id: 'gapoktan',
      label: 'Gapoktan',
      icon: '🤝',
      view: 'poktan_kwt',
      checked: layerStates.showGapoktanPin,
      key: 'showGapoktanPin',
    },
    {
      id: 'ketahanan_pangan',
      label: 'Ketahanan Pangan',
      icon: '🥣',
      view: 'ikpg_admin',
      checked: layerStates.showIKPGLayer !== null,
      key: 'showIKPGLayer',
    },
    {
      id: 'peta_administrasi',
      label: 'Nama kelurahan',
      icon: '🗺️',
      view: 'gambar_poligon',
      checked: layerStates.showKelNama,
      key: 'showKelNama',
    },
    {
      id: 'warning',
      label: 'Peringatan OPT',
      icon: '⚠️',
      view: 'warning',
      checked: layerStates.showWarningPin,
      key: 'showWarningPin',
    },
    {
      id: 'produksi_pangan',
      label: 'Produksi Pangan (2014-2025)',
      icon: '📊',
      view: 'produksi_pangan',
      checked: activeView === 'produksi_pangan',
      key: 'showProduksiPangan',
    },
  ];

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className={`sp-sidebar ${isOpen ? 'is-open' : 'is-collapsed'}`}>
      {/* Hidden file input for KMZ / Shapefile upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={onImportFile}
        accept=".kmz,.kml,.zip,.geojson,.json"
        style={{ display: 'none' }}
      />

      {/* Header */}
      <div className="sp-sidebar__header">
        <div className="sp-sidebar__brand">
          <h1 className="sp-sidebar__title">DKPP.INFO</h1>
          <p className="sp-sidebar__subtitle">Dashboard KWT, Pertanian & Perikanan Kota Cilegon</p>
        </div>
        <button
          className="sp-sidebar__toggle-btn"
          onClick={onToggleSidebar}
          title={isOpen ? 'Tutup sidebar' : 'Buka sidebar'}
          aria-label="Toggle Sidebar"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="11 17 6 12 11 7" />
            <polyline points="18 17 13 12 18 7" />
          </svg>
        </button>
      </div>

      <div className="sp-sidebar__content">
        {/* Section: MENU UTAMA */}
        <div className="sp-sidebar__section">
          <div className="sp-sidebar__section-title">MENU UTAMA</div>

          {/* List of Layers & Submodules (Dashboard item removed) */}
          <div className="sp-sidebar__layer-list">
            {menuItems.map((item) => {
              const isChecked = !!item.checked;
              const isCurrentView = activeView === item.view;
              return (
                <div
                  key={item.id}
                  className={`sp-sidebar__item ${isCurrentView ? 'is-highlighted' : ''}`}
                  onClick={() => onSelectView(item.view)}
                >
                  <div className="sp-sidebar__item-left">
                    <span className="sp-sidebar__item-icon">{item.icon}</span>
                    <span className="sp-sidebar__item-label">{item.label}</span>
                  </div>
                  <label 
                    className="sp-sidebar__checkbox-wrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      className="sp-sidebar__checkbox"
                      checked={isChecked}
                      onChange={(e) => onToggleLayer(item.key, e.target.checked)}
                    />
                    <span className="sp-sidebar__checkmark"></span>
                  </label>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section: ALAT & UTILITAS */}
        <div className="sp-sidebar__section">
          <div className="sp-sidebar__section-title">ALAT & UTILITAS</div>
          <div className="sp-sidebar__tools-list">
            <button
              className="sp-sidebar__tool-btn"
              onClick={() => onOpenModal('pilih_pin')}
            >
              <span className="sp-sidebar__tool-icon">📍</span>
              <span>Pilih Pin</span>
            </button>

            <button
              className="sp-sidebar__tool-btn"
              onClick={handleUploadClick}
            >
              <span className="sp-sidebar__tool-icon">📤</span>
              <span>Upload KMZ / Shapefile</span>
            </button>

            <button
              className="sp-sidebar__tool-btn"
              onClick={() => onSelectView('ikpg_admin')}
            >
              <span className="sp-sidebar__tool-icon">📋</span>
              <span>Upload FSVA / SKPG</span>
            </button>

            <button
              className="sp-sidebar__tool-btn"
              onClick={() => onSelectView('rekap_produksi')}
            >
              <span className="sp-sidebar__tool-icon">🧮</span>
              <span>Analisis & Perhitungan</span>
            </button>

            

            <button
              className="sp-sidebar__tool-btn"
              onClick={() => onOpenModal('pengaturan')}
            >
              <span className="sp-sidebar__tool-icon">⚙️</span>
              <span>Transparansi Layer</span>
            </button>
          </div>
        </div>

        {/* Bottom User Guide Button */}
        <div className="sp-sidebar__footer">
          <button
            className="sp-sidebar__guide-btn"
            onClick={() => onOpenModal('panduan')}
          >
            <span className="sp-sidebar__guide-icon">❓</span>
            <span>Panduan Penggunaan</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default SidebarMenu;

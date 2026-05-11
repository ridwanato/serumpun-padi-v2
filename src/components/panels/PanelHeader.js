import React from 'react';

const PANEL_TITLES = {
  dashboard:          { icon: '🌾', text: 'Dashboard Pertanian Cilegon' },
  gambar_poligon:     { icon: '🗺️',  text: 'Gambar Poligon' },
  sawah_detail:       { icon: '📍', text: 'Detail Sawah' },
  status_sawah:       { icon: '🌾', text: 'Status Sawah' },
  rekap_luas:         { icon: '📋', text: 'Rekap Luas Tanam' },
  rekap_produksi:     { icon: '🏢', text: 'Rekap Produksi Padi' },
  hortikultura:       { icon: '🌶️', text: 'Hortikultura' },
  palawija:           { icon: '🌿', text: 'Palawija' },
  poktan_kwt:         { icon: '👨‍🌾', text: 'Poktan & KWT' },
  warning:            { icon: '⚠️', text: 'Warning OPT & Bencana' },
  perikanan_budidaya: { icon: '🐠', text: 'Perikanan Budidaya' },
  perikanan_tangkap:  { icon: '⛵', text: 'Perikanan Tangkap' },
  produksi_tangkap:   { icon: '🐟', text: 'Hasil Produksi Tangkap' },
  ikpg_admin:         { icon: '⚙️', text: 'Update Data IKP & SKPG' },
};

function PanelHeader({ panelView, onClose, onBack, user, onLogin, onLogout }) {
  const today = new Date().toLocaleDateString('id-ID', { 
    weekday: 'short', 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  });
  const t = PANEL_TITLES[panelView] || PANEL_TITLES.dashboard;

  const closeBtn = (
    <button className="sp-panel__close-btn" onClick={onClose} title="Tutup panel">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>
  );

  // Header Dashboard
  if (panelView === 'dashboard') {
    return (
      <div className="sp-panel__header sp-panel__header--dashboard">
        <div className="sp-panel__header-titleblock">
          <span className="sp-panel__title">{t.icon} {t.text}</span>
          <span className="sp-panel__date">{today}</span>
        </div>
        <div className="sp-panel__header-right">
          {user ? (
            <button className="sp-panel__user-btn" onClick={onLogout} title="Keluar">
              <span className="sp-panel__user-name">{user.email?.split('@')[0]}</span>
              <span className="sp-panel__user-logout">Keluar</span>
            </button>
          ) : (
            <button className="sp-panel__user-btn sp-panel__user-btn--login" onClick={onLogin}>
              🔐 Login
            </button>
          )}
          {closeBtn}
        </div>
      </div>
    );
  }

  // Header Sub-menu
  return (
    <div className="sp-panel__header">
      <button className="sp-panel__back-btn" onClick={onBack} title="Kembali ke Dashboard">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <span className="sp-panel__title">{t.icon} {t.text}</span>
      {closeBtn}
    </div>
  );
}

export default PanelHeader;
import React from 'react';

const PANEL_TITLES = {
  dashboard:          { icon: '🌾', text: 'Dashboard Pertanian dan Perikanan Kota Cilegon' },
  gambar_poligon:     { icon: '🗺️',  text: 'Gambar Poligon' },
  sawah_detail:       { icon: '📍', text: 'Detail Sawah' },
  status_sawah:       { icon: '🌾', text: 'Rekap Luas Sawah' },
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

/* Ikon exit (→ dengan kotak) */
const ExitIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

function PanelHeader({ panelView, onClose, onBack, user, setUser, supabase, setShowAuth }) {
  const today = new Date().toLocaleDateString('id-ID', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
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
      <div className="sp-panel__header sp-panel__header--dashboard" style={{ position: 'relative' }}>
        <div className="sp-panel__header-titleblock">
          <span className="sp-panel__title">{t.icon} {t.text}</span>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
            <div className="sp-panel__date" style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>{today}</span>
              {user && (
                <>
                  <span style={{ opacity: 0.6 }}>|</span>
                  <span style={{ color: '#fff', fontWeight: 600, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.email?.split('@')[0]}
                  </span>
                </>
              )}
            </div>
            {/* User Button */}
            {user ? (
              <button className="sp-panel__user-btn" onClick={async () => { await supabase.auth.signOut(); setUser(null); }} title="Keluar"
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255, 255, 255, 0.1)', border: 'none', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', color: '#fff', marginLeft: 'auto' }}>
                <ExitIcon />
              </button>
            ) : (
              <button className="sp-panel__user-btn sp-panel__user-btn--login" onClick={() => setShowAuth(true)}
                style={{ background: 'rgba(255, 255, 255, 0.15)', border: 'none', borderRadius: '6px', color: '#fff', padding: '4px 8px', cursor: 'pointer', fontSize: 10, fontWeight: 600, marginLeft: 'auto' }}>
                🔐 Login
              </button>
            )}
          </div>
        </div>
        <div className="sp-panel__header-right" style={{ alignSelf: 'flex-start' }}>
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
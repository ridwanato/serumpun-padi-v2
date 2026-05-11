import React from 'react';
import { GeoJSON } from 'react-leaflet';
import L from 'leaflet';

// Style untuk kecamatan
const kecamatanStyle = {
  color: '#c0392b',
  weight: 3,
  fillOpacity: 0,
  dashArray: '8,4',
};

// Style untuk kelurahan
const kelurahanStyle = {
  color: '#f39c12',
  weight: 2,
  fillOpacity: 0,
  dashArray: '4,3',
};

export function KecamatanLayer({ data, onEachFeature }) {
  if (!data || data.length === 0) return null;
  return data.map((f, i) => (
    <GeoJSON
      key={`kec-${i}`}
      data={f}
      style={kecamatanStyle}
      onEachFeature={onEachFeature}
    />
  ));
}

export function KelurahanLayer({ data, onEachFeature, style }) {
  if (!data || data.length === 0) return null;
  return data.map((f, i) => (
    <GeoJSON
      key={`kel-${i}`}
      data={f}
      style={style || kelurahanStyle}
      onEachFeature={onEachFeature}
    />
  ));
}

export function SawahLayer({ data, showSawah, getStyle, onEachFeature }) {
  if (!showSawah || !data || data.length === 0) return null;
  return data.map((f, i) => (
    <GeoJSON
      key={f._id || `sawah-${i}`}
      data={f}
      style={getStyle ? getStyle(f) : undefined}
      onEachFeature={onEachFeature}
    />
  ));
}

// SVG petani
const PETANI_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="20" height="20">
  <polygon points="16,3 1,20 31,20" fill="#c8860a" stroke="#7a4f00" stroke-width="1.2"/>
  <rect x="1" y="19" width="30" height="3" rx="1.5" fill="#b07010" />
  <circle cx="16" cy="25" r="6" fill="#f5c07a" stroke="#c88040" stroke-width="1"/>
  <circle cx="13.5" cy="24" r="0.9" fill="#3a2000"/>
  <circle cx="18.5" cy="24" r="0.9" fill="#3a2000"/>
  <path d="M13.5 27 Q16 29.5 18.5 27" fill="none" stroke="#a05020" stroke-width="0.9" stroke-linecap="round"/>
</svg>`;

const POKTAN_ICON_HTML = `<div style="width:34px;height:34px;display:flex;align-items:center;justify-content:center;background:#2d6a4f;border:2.5px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,0.45)">
  <div style="transform:rotate(45deg);display:flex;align-items:center;justify-content:center">${PETANI_SVG}</div>
</div>`;

// Helper: buat ikon
const makeIcon = (emoji, bgColor, size = 26) =>
  L.divIcon({
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    html: `<div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;background:${bgColor};border:2px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,0.4)"><span style="transform:rotate(45deg);font-size:${size * 0.5}px">${emoji}</span></div>`,
  });

// Pin Hortikultura KMZ
export function HortiPins({ data, visible, onFlyTo }) {
  if (!visible || !data || data.length === 0) return null;
  const icon = makeIcon('🌶️', '#52b788');
  return data.map((p, i) => (
    <GeoJSON
      key={`horti-${i}`}
      data={{ type: 'Feature', geometry: { type: 'Point', coordinates: [p._lng, p._lat] }, properties: {} }}
      pointToLayer={(_, ll) => L.marker(ll, { icon })}
      onEachFeature={(_, layer) => {
        layer.bindPopup(`<b style="color:#52b788">🌶️ ${p._name}</b><br/>${p._komoditas || ''} ${p._pemilik ? '· 👤 ' + p._pemilik : ''}`);
        layer.on('click', () => onFlyTo && onFlyTo(p._lat, p._lng));
      }}
    />
  ));
}

// Pin Palawija KMZ
export function PalawijaPins({ data, visible, onFlyTo }) {
  if (!visible || !data || data.length === 0) return null;
  const icon = makeIcon('🌿', '#74c69d');
  return data.map((p, i) => (
    <GeoJSON
      key={`palawija-${i}`}
      data={{ type: 'Feature', geometry: { type: 'Point', coordinates: [p._lng, p._lat] }, properties: {} }}
      pointToLayer={(_, ll) => L.marker(ll, { icon })}
      onEachFeature={(_, layer) => {
        layer.bindPopup(`<b style="color:#74c69d">🌿 ${p._name}</b><br/>${p._komoditas || ''} ${p._pemilik ? '· 👤 ' + p._pemilik : ''}`);
        layer.on('click', () => onFlyTo && onFlyTo(p._lat, p._lng));
      }}
    />
  ));
}

// Pin Poktan/KWT/Gapoktan
export function PoktanPins({ data, showPoktan, showKWT, showGapoktan, onFlyTo }) {
  if (!data || data.length === 0) return null;
  const icon = L.divIcon({
    className: '',
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    html: POKTAN_ICON_HTML,
  });
  return data.map((p, i) => {
    const show =
      p._jenis === 'KWT' ? showKWT :
      p._jenis === 'Gapoktan' ? showGapoktan :
      showPoktan;
    if (!show) return null;
    return (
      <GeoJSON
        key={`poktan-${i}`}
        data={{ type: 'Feature', geometry: { type: 'Point', coordinates: [p._lng, p._lat] }, properties: {} }}
        pointToLayer={(_, ll) => L.marker(ll, { icon })}
        onEachFeature={(_, layer) => {
          layer.bindPopup(`<b style="color:#2d6a4f">👨‍🌾 ${p._name}</b><br/>${p._jenis || ''} ${p._ketua ? '· Ketua: ' + p._ketua : ''} ${p._kelurahan ? '<br/>🏘️ ' + p._kelurahan : ''}`);
          layer.on('click', () => onFlyTo && onFlyTo(p._lat, p._lng));
        }}
      />
    );
  });
}

// Pin Warning
export function WarningPins({ data, visible, onFlyTo }) {
  if (!visible || !data || data.length === 0) return null;
  const icon = makeIcon('⚠️', '#e63946');
  return data.map((w, i) => (
    <GeoJSON
      key={`warning-${i}`}
      data={{ type: 'Feature', geometry: { type: 'Point', coordinates: [w._lng, w._lat] }, properties: {} }}
      pointToLayer={(_, ll) => L.marker(ll, { icon })}
      onEachFeature={(_, layer) => {
        layer.bindPopup(`<b style="color:#e63946">⚠️ ${w._name}</b><br/>${w._jenis || ''} ${w._opt ? '· 🐛 ' + w._opt : ''}`);
        layer.on('click', () => onFlyTo && onFlyTo(w._lat, w._lng));
      }}
    />
  ));
}

// Pin Kolam Budidaya
export function KolamPins({ data, visible, onFlyTo }) {
  if (!visible || !data || data.length === 0) return null;
  return data
    .filter(k => k.geometry)
    .map((k, i) => {
      const icon = makeIcon('🐟', '#0096c7');
      const popup = `<b style="color:#0096c7">🐟 ${k._name}</b><br/>${k._pemilik ? '👤 ' + k._pemilik + '<br/>' : ''}🐠 ${k._jenis_ikan || '—'}<br/>📐 ${k._luas || '—'} m² · ${k._status}`;
      return (
        <GeoJSON
          key={`kolam-${i}`}
          data={k}
          style={{ color: '#0096c7', weight: 2.5, fillColor: '#0096c7', fillOpacity: 0.25 }}
          pointToLayer={(_, ll) => L.marker(ll, { icon })}
          onEachFeature={(_, layer) => {
            layer.bindPopup(popup);
            layer.on('click', () => onFlyTo && onFlyTo(k._lat, k._lng));
          }}
        />
      );
    });
}

// Pin Nelayan
export function NelayanPins({ dataKMZ, dataDB, visible, onFlyTo }) {
  if (!visible) return null;
  const icon = makeIcon('⛵', '#2ec4b6', 28);
  const items = [];

  // KMZ
  if (dataKMZ) {
    dataKMZ.forEach((n, i) => {
      items.push(
        <GeoJSON
          key={`nelayan-kmz-${i}`}
          data={{ type: 'Feature', geometry: { type: 'Point', coordinates: [n._lng, n._lat] }, properties: {} }}
          pointToLayer={(_, ll) => L.marker(ll, { icon })}
          onEachFeature={(_, layer) => {
            layer.bindPopup(`<b style="color:#2ec4b6">⛵ ${n._name}</b><br/>${n._alat ? '🎣 ' + n._alat + '<br/>' : ''}${n._jenis_ikan ? '🐟 ' + n._jenis_ikan + '<br/>' : ''}${n._perahu ? 'Perahu: ' + n._perahu : ''}`);
            layer.on('click', () => onFlyTo && onFlyTo(n._lat, n._lng));
          }}
        />
      );
    });
  }

  // Supabase
  if (dataDB) {
    dataDB.filter(r => r.lat && r.lng).forEach((r, i) => {
      items.push(
        <GeoJSON
          key={`nelayan-db-${i}`}
          data={{ type: 'Feature', geometry: { type: 'Point', coordinates: [r.lng, r.lat] }, properties: {} }}
          pointToLayer={(_, ll) => L.marker(ll, { icon })}
          onEachFeature={(_, layer) => {
            layer.bindPopup(`<b style="color:#2ec4b6">⛵ ${r.nama_nelayan || '—'}</b><br/>🎣 ${r.alat_tangkap}<br/>${r.no_hp ? '📱 ' + r.no_hp : ''}`);
            layer.on('click', () => onFlyTo && onFlyTo(r.lat, r.lng));
          }}
        />
      );
    });
  }

  return <>{items}</>;
}

// Pin Kolam dari Supabase
export function KolamDBPins({ data, visible, onFlyTo }) {
  if (!visible || !data || data.length === 0) return null;
  const icon = makeIcon('🐟', '#0096c7');
  return data.filter(r => r.lat && r.lng).map((r, i) => (
    <GeoJSON
      key={`kolam-db-${i}`}
      data={{ type: 'Feature', geometry: { type: 'Point', coordinates: [r.lng, r.lat] }, properties: {} }}
      pointToLayer={(_, ll) => L.marker(ll, { icon })}
      onEachFeature={(_, layer) => {
        layer.bindPopup(`<b style="color:#0096c7">🐟 ${r.nama_pemilik || '—'}</b><br/>🐠 ${r.jenis_ikan}<br/>📐 ${r.luas_m2 ? r.luas_m2 + ' m²' : '—'} · ${r.status_kolam}`);
        layer.on('click', () => onFlyTo && onFlyTo(r.lat, r.lng));
      }}
    />
  ));
}
import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, FeatureGroup, useMap } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet.locatecontrol/dist/L.Control.Locate.min.css';
import { MapRefSetter, MoveZoomControl, MapZoomTracker } from './MapHelpers';
import LocateMe from './LocateMe';

function LayerToggleControl({ setShowOsm }) {
  const map = useMap();
  useEffect(() => {
    const Ctrl = L.Control.extend({
      onAdd() {
        const btn = L.DomUtil.create('button', 'sp-locate-btn leaflet-bar');
        btn.title = 'Tampilkan/Sembunyikan layer jalan & sungai';
        btn.style.marginBottom = '5px'; // Jarak dengan locate me
        btn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 12 12 17 22 12"/><polyline points="2 17 12 22 22 17"/></svg>`;
        L.DomEvent.disableClickPropagation(btn);
        L.DomEvent.on(btn, 'click', () => setShowOsm(p => !p));
        return btn;
      }
    });
    const ctrl = new Ctrl({ position: 'bottomleft' });
    ctrl.addTo(map);
    return () => ctrl.remove();
  }, [map, setShowOsm]);
  return null;
}

function MapView({
  mapRef,
  featureGroupRef,
  mapZoom,
  setMapZoom,
  showDrawBar,
  onCreated,
  children,
}) {
  const [showOsm, setShowOsm] = useState(false);

  return (
    <MapContainer
      center={[-6.2, 106.8]}
      zoom={13}
      style={{ height: '100%', width: '100%' }}
      className={!showDrawBar ? 'sp-hide-draw' : ''}
      preferCanvas={true}
    >
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        attribution='<span style="background:#fff;border:1.5px solid #e0e0e0;border-radius:5px;padding:2px 9px 2px 6px;font-weight:800;color:#c45200;font-size:11px;display:inline-flex;align-items:center;gap:5px;vertical-align:middle">🐺 RidwanS</span> Tiles &copy; Esri'
      />
      {showOsm && (
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          opacity={0.65}
        />
      )}
      <FeatureGroup ref={featureGroupRef}>
        <EditControl
          position="topright"
          onCreated={onCreated}
          draw={{
            rectangle: false,
            circle: false,
            circlemarker: false,
            marker: false,
            polyline: false,
            polygon: true,
          }}
        />
      </FeatureGroup>
      <MapRefSetter mapRef={mapRef} />
      <MapZoomTracker setZoom={setMapZoom} />
      <MoveZoomControl />
      <LayerToggleControl setShowOsm={setShowOsm} />
      <LocateMe />
      {children}
    </MapContainer>
  );
}

export default MapView;
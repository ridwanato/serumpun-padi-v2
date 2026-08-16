import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, FeatureGroup, useMap } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet.locatecontrol/dist/L.Control.Locate.min.css';
import { MapRefSetter, MoveZoomControl, MapZoomTracker, FitBoundsControl } from './MapHelpers';
import LocateMe from './LocateMe';

function LayerToggleControl({ setShowOsm }) {
  const map = useMap();
  useEffect(() => {
    const Ctrl = L.Control.extend({
      onAdd() {
        const btn = L.DomUtil.create('button', 'sp-map-action-btn sp-layer-toggle-btn leaflet-bar');
        btn.title = 'Tampilkan/Sembunyikan layer jalan & sungai';
        btn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 12 12 17 22 12"/><polyline points="2 17 12 22 22 17"/></svg>`;
        L.DomEvent.disableClickPropagation(btn);
        L.DomEvent.on(btn, 'click', () => setShowOsm(p => !p));
        return btn;
      }
    });
    const ctrl = new Ctrl({ position: 'topleft' });
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

  
  useEffect(() => {
    const injectDrawIcons = () => {
      const polyBtn = document.querySelector('.leaflet-draw-draw-polygon');
      if (polyBtn) {
        polyBtn.style.backgroundImage = 'none';
        if (!polyBtn.querySelector('svg')) {
          polyBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 3 2 19 22 19" /></svg>';
        }
      }
      const editBtn = document.querySelector('.leaflet-draw-edit-edit');
      if (editBtn) {
        editBtn.style.backgroundImage = 'none';
        if (!editBtn.querySelector('svg')) {
          editBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
        }
      }
      const delBtn = document.querySelector('.leaflet-draw-edit-remove');
      if (delBtn) {
        delBtn.style.backgroundImage = 'none';
        if (!delBtn.querySelector('svg')) {
          delBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>';
        }
      }
    };
    const timer = setTimeout(injectDrawIcons, 500);
    const interval = setInterval(injectDrawIcons, 1500);
    return () => { clearTimeout(timer); clearInterval(interval); };
  }, []);

return (
    <MapContainer
      center={[-6.01, 106.02]}
      zoom={12.5}
      style={{ height: '100%', width: '100%' }}
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

      {/* Draw Polygon Controls in topleft under layer icon */}
      <FeatureGroup ref={featureGroupRef}>
        <EditControl
          position="topleft"
          onCreated={onCreated}
          draw={{
            rectangle: false,
            circle: false,
            circlemarker: false,
            marker: false,
            polyline: false,
            polygon: {
              allowIntersection: false,
              showArea: true,
              shapeOptions: {
                color: '#166534',
                fillColor: '#22c55e',
                fillOpacity: 0.45,
                weight: 2.5,
              },
            },
          }}
          edit={{
            featureGroup: featureGroupRef.current,
            remove: true,
          }}
        />
      </FeatureGroup>

      <MapRefSetter mapRef={mapRef} />
      <MapZoomTracker setZoom={setMapZoom} />
      <MoveZoomControl />
      <FitBoundsControl />
      <LocateMe />
      <LayerToggleControl setShowOsm={setShowOsm} />
      {children}
    </MapContainer>
  );
}

export default MapView;
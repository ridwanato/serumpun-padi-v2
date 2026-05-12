import React from 'react';
import { MapContainer, TileLayer, FeatureGroup } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet.locatecontrol/dist/L.Control.Locate.min.css';
import { MapRefSetter, MoveZoomControl, MapZoomTracker } from './MapHelpers';
import LocateMe from './LocateMe';

function MapView({
  mapRef,
  featureGroupRef,
  mapZoom,
  setMapZoom,
  showDrawBar,
  onCreated,
  children,
}) {
  return (
    <MapContainer
      center={[-6.2, 106.8]}
      zoom={13}
      style={{ height: '100%', width: '100%' }}
      className={!showDrawBar ? 'sp-hide-draw' : ''}
    >
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        attribution='<span style="background:#fff;border:1.5px solid #e0e0e0;border-radius:5px;padding:2px 9px 2px 6px;font-weight:800;color:#c45200;font-size:11px;display:inline-flex;align-items:center;gap:5px;vertical-align:middle">🐺 RidwanS</span> Tiles &copy; Esri'
      />
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
      <LocateMe />
      {children}
    </MapContainer>
  );
}

export default MapView;
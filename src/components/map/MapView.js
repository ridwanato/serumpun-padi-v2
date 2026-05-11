import React from 'react';
import { MapContainer, TileLayer, FeatureGroup, GeoJSON } from 'react-leaflet';
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
        attribution="Tiles &copy; Esri"
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
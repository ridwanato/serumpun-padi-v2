import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

// Komponen untuk menyimpan referensi peta ke parent
export function MapRefSetter({ mapRef }) {
  const map = useMap();
  useEffect(() => {
    mapRef.current = map;
  }, [map, mapRef]);
  return null;
}

// Komponen untuk memindahkan zoom control ke kiri atas sesuai mockup
export function MoveZoomControl() {
  const map = useMap();
  useEffect(() => {
    if (map.zoomControl) {
      map.zoomControl.remove();
      map.zoomControl.setPosition('topleft');
      map.zoomControl.addTo(map);
    }
  }, [map]);
  return null;
}

// Komponen tombol Fit Bounds / Full View di topleft
export function FitBoundsControl({ bounds }) {
  const map = useMap();
  useEffect(() => {
    const FitCtrl = L.Control.extend({
      onAdd() {
        const btn = L.DomUtil.create('button', 'sp-map-action-btn leaflet-bar');
        btn.title = 'Pusatkan Peta ke Seluruh Wilayah Kota Cilegon';
        btn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>`;
        L.DomEvent.disableClickPropagation(btn);
        L.DomEvent.on(btn, 'click', () => {
          map.flyTo([-6.01, 106.02], 12.5, { animate: true, duration: 1.2 });
        });
        return btn;
      },
    });
    const ctrl = new FitCtrl({ position: 'topleft' });
    ctrl.addTo(map);
    return () => ctrl.remove();
  }, [map]);
  return null;
}

// Komponen untuk tracking zoom level (untuk label kelurahan)
export function MapZoomTracker({ setZoom }) {
  const map = useMap();
  useEffect(() => {
    const calcFs = (z) => Math.max(7, Math.min(13, (z - 8) * 1.5)).toFixed(1) + 'px';
    const onZoomEnd = () => {
      const z = map.getZoom();
      setZoom(z);
      document.querySelectorAll('.ikpg-kel-label span').forEach((el) => {
        el.style.fontSize = calcFs(z);
      });
    };
    map.on('zoomend', onZoomEnd);
    return () => map.off('zoomend', onZoomEnd);
  }, [map, setZoom]);
  return null;
}
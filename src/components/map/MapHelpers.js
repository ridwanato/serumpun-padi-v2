import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

// Komponen untuk menyimpan referensi peta ke parent
export function MapRefSetter({ mapRef }) {
  const map = useMap();
  useEffect(() => { mapRef.current = map; }, [map, mapRef]);
  return null;
}

// Komponen untuk memindahkan zoom control ke kanan bawah
export function MoveZoomControl() {
  const map = useMap();
  useEffect(() => {
    map.zoomControl.remove();
    map.zoomControl.setPosition('bottomright');
    map.zoomControl.addTo(map);
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
      document.querySelectorAll('.ikpg-kel-label span').forEach(el => {
        el.style.fontSize = calcFs(z);
      });
    };
    map.on('zoomend', onZoomEnd);
    return () => map.off('zoomend', onZoomEnd);
  }, [map, setZoom]);
  return null;
}
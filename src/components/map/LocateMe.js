import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

function LocateMe() {
  const map = useMap();
  const markerRef = useRef(null);
  const headingRef = useRef(null);
  const firstLocateRef = useRef(true);

  const buildIcon = (heading) => {
    const hasHeading = heading !== null && heading !== undefined;
    const coneAngle = hasHeading ? heading : 0;
    return L.divIcon({
      className: '',
      iconSize: [52, 52],
      iconAnchor: [26, 26],
      html: `
        <div style="position:relative;width:52px;height:52px;display:flex;align-items:center;justify-content:center;">
          <div class="sp-loc-pulse"></div>
          ${hasHeading ? `
          <svg style="position:absolute;width:52px;height:52px;top:0;left:0;overflow:visible;"
               viewBox="-26 -26 52 52">
            <g transform="rotate(${coneAngle})">
              <path d="M0,0 L-9,-28 A30,30,0,0,1,9,-28 Z"
                fill="rgba(66,133,244,0.25)" stroke="none"/>
            </g>
          </svg>` : ''}
          <div class="sp-loc-dot"></div>
        </div>`,
    });
  };

  useEffect(() => {
    const LocateBtn = L.Control.extend({
      onAdd() {
        const btn = L.DomUtil.create('button', 'sp-locate-btn leaflet-bar');
        btn.title = 'Temukan lokasi saya';
        btn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><circle cx="12" cy="12" r="8" stroke-dasharray="4 2" opacity="0.4"/></svg>`;
        L.DomEvent.disableClickPropagation(btn);
        L.DomEvent.on(btn, 'click', () => {
          firstLocateRef.current = true;
          map.locate({ setView: false, enableHighAccuracy: true, watch: true });
        });
        return btn;
      }
    });
    const ctrl = new LocateBtn({ position: 'bottomright' });
    ctrl.addTo(map);

    const onLocate = (e) => {
      const h = headingRef.current;
      if (!markerRef.current) {
        markerRef.current = L.marker(e.latlng, {
          icon: buildIcon(h),
          zIndexOffset: 1000,
          interactive: false,
        }).addTo(map);
      } else {
        markerRef.current.setLatLng(e.latlng);
        markerRef.current.setIcon(buildIcon(h));
      }
      if (firstLocateRef.current) {
        map.flyTo(e.latlng, 17, { animate: true, duration: 1.5 });
        firstLocateRef.current = false;
      }
    };
    map.on('locationfound', onLocate);

    const onOrientation = (evt) => {
      let heading = null;
      if (evt.webkitCompassHeading !== undefined) {
        heading = evt.webkitCompassHeading;
      } else if (evt.alpha !== null) {
        heading = 360 - evt.alpha;
      }
      if (heading === null) return;
      headingRef.current = heading;
      if (markerRef.current) {
        markerRef.current.setIcon(buildIcon(heading));
      }
    };
    window.addEventListener('deviceorientationabsolute', onOrientation, true);
    window.addEventListener('deviceorientation', onOrientation, true);

    return () => {
      ctrl.remove();
      map.off('locationfound', onLocate);
      map.stopLocate();
      window.removeEventListener('deviceorientationabsolute', onOrientation, true);
      window.removeEventListener('deviceorientation', onOrientation, true);
      if (markerRef.current) { markerRef.current.remove(); markerRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  return null;
}

export default LocateMe;
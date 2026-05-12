import { useState, useCallback, useRef } from 'react';
import JSZip from 'jszip';
import togeojson from '@mapbox/togeojson';
import * as turf from '@turf/turf';
import { KEL_TO_KEC, ALL_KEL } from '../config/wilayah';
import { supabase } from '../supabase';

const KMZ_URL = `https://xxdbgnxxlumdfczflytg.supabase.co/storage/v1/object/public/kmz-files/my-places-apr-2026-v250426.kmz?t=${Date.now()}`;

export function useKMZLoader(mapRef) {
  const [layers, setLayers] = useState({ kecamatan: [], kelurahan: [], sawah: [] });
  const [kolamBudidaya, setKolamBudidaya] = useState([]);
  const [nelayanTangkap, setNelayanTangkap] = useState([]);
  const [hortiKMZ, setHortiKMZ] = useState([]);
  const [palawijaKMZ, setPalawijaKMZ] = useState([]);
  const [poktanKMZ, setPoktanKMZ] = useState([]);
  const [warningKMZ, setWarningKMZ] = useState([]);
  const [sawahStatus, setSawahStatus] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Cegah fetch berulang
  const loadedRef = useRef(false);

  const mergeIntoList = (list, feature, nama) => {
    const ex = list.find(f => (f.properties?.name || f.properties?.Name) === nama);
    if (ex) {
      const ec = ex.geometry.type === 'MultiPolygon' ? ex.geometry.coordinates : [ex.geometry.coordinates];
      const nc = feature.geometry.type === 'MultiPolygon' ? feature.geometry.coordinates : [feature.geometry.coordinates];
      ex.geometry = { type: 'MultiPolygon', coordinates: [...ec, ...nc] };
    } else {
      list.push({ ...feature });
    }
  };

  const findLocation = (feature, kelList, kecList) => {
    try {
      const center = turf.centroid(feature);
      let namaKelurahan = '-', namaKecamatan = '-';
      for (const kel of kelList) {
        if (kel.geometry && turf.booleanPointInPolygon(center, kel)) {
          namaKelurahan = kel.properties?.name || kel.properties?.Name || '-';
          break;
        }
      }
      if (namaKelurahan !== '-') {
        namaKecamatan = KEL_TO_KEC[namaKelurahan] || '-';
      } else {
        for (const kec of kecList) {
          if (kec.geometry && turf.booleanPointInPolygon(center, kec)) {
            namaKecamatan = kec.properties?.name || kec.properties?.Name || '-';
            break;
          }
        }
      }
      return { namaKelurahan, namaKecamatan };
    } catch {
      return { namaKelurahan: '-', namaKecamatan: '-' };
    }
  };

  const parseDesc = (txt) => {
    const obj = {};
    if (!txt) return obj;
    txt.split(/\n|<br\s*\/?>/).forEach(line => {
      const m = line.replace(/<[^>]+>/g, '').match(/^([^:]+):\s*(.+)$/);
      if (m) obj[m[1].trim().toLowerCase().replace(/\s+/g, '_')] = m[2].trim();
    });
    return obj;
  };

  const mkPin = (pmName, pmCoord, pmDesc, prefix) => ({
    _id: `${prefix}_${Math.abs(pmCoord.lng * 10000).toFixed(0)}_${Math.abs(pmCoord.lat * 10000).toFixed(0)}`,
    _name: pmName,
    _lat: pmCoord.lat,
    _lng: pmCoord.lng,
    ...parseDesc(pmDesc),
  });

  const processKML = useCallback(async (kmlText) => {
    setLoading(true);
    setError(null);
    try {
      const kml = new DOMParser().parseFromString(kmlText, 'text/xml');
      const geojson = togeojson.kml(kml);
      const kecF = [], kelF = [], sawF = [];
      const kolamF = [], nelayanF = [], hortiF = [], palawijaF = [], poktanF = [], warningF = [];

      const getFirstCoord = (pm) => {
        const c = pm.querySelector('coordinates');
        if (!c) return null;
        const p = c.textContent.trim().split(/[\s,]+/);
        return { lng: parseFloat(p[0]), lat: parseFloat(p[1]) };
      };

      const allPM = [];
      const collectPM = (el, top) => {
        el.querySelectorAll(':scope > Placemark').forEach(pm => allPM.push({ pm, top }));
        el.querySelectorAll(':scope > Folder').forEach(sub => collectPM(sub, top));
      };

      const folders = kml.querySelector('Document')?.querySelectorAll(':scope > Folder') || [];
      folders.forEach(folder => {
        const fn = folder.querySelector(':scope > name')?.textContent || '';
        if (fn === 'My Places' || fn === 'Temporary Places') {
          folder.querySelectorAll(':scope > Folder').forEach(sub =>
            collectPM(sub, sub.querySelector(':scope > name')?.textContent || '')
          );
        } else {
          collectPM(folder, fn);
        }
      });

      allPM.forEach(({ pm, top }) => {
        const pmName = pm.querySelector('name')?.textContent || '';
        const pmCoord = getFirstCoord(pm);
        if (!pmCoord) return;
        const pmDesc = pm.querySelector('description')?.textContent || '';
        let feature = null;

        if (top === 'Sawah') {
          const polyEl = pm.querySelector('Polygon');
          if (polyEl) {
            const coordsEl = polyEl.querySelector('outerBoundaryIs coordinates') || polyEl.querySelector('coordinates');
            if (coordsEl) {
              const coords = coordsEl.textContent.trim().split(/\s+/).reduce((acc, pair) => {
                const parts = pair.split(',').map(parseFloat);
                if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) acc.push([parts[0], parts[1]]);
                return acc;
              }, []);
              if (coords.length >= 3) {
                feature = { type: 'Feature', geometry: { type: 'Polygon', coordinates: [coords] }, properties: { name: pmName } };
              }
            }
          }
        } else if (['Kecamatan', 'Kelurahan', 'Kolam_Budidaya'].includes(top)) {
          feature = geojson.features.find(f => {
            if (!f.geometry) return false;
            let coords = f.geometry.type === 'Polygon' ? f.geometry.coordinates[0] : f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates[0][0] : f.geometry.coordinates;
            if (!coords?.length) return false;
            return Math.abs(coords[0][0] - pmCoord.lng) < 0.00001 && Math.abs(coords[0][1] - pmCoord.lat) < 0.00001;
          });
          if (!feature) feature = geojson.features.find(f => f.geometry && (f.properties?.name === pmName || f.properties?.Name === pmName));
        } else {
          feature = { type: 'Feature', geometry: { type: 'Point', coordinates: [pmCoord.lng, pmCoord.lat] }, properties: { name: pmName } };
        }
        if (!feature) return;

        const desc = parseDesc(pmDesc);

        if (top === 'Kecamatan') mergeIntoList(kecF, feature, pmName);
        else if (top === 'Kelurahan') mergeIntoList(kelF, feature, pmName);
        else if (top === 'Sawah') {
          const namaId = (pmName || '').toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
          sawF.push({ ...feature, _id: `sawah_${namaId}_${Math.abs(pmCoord.lng * 10000).toFixed(0)}_${Math.abs(pmCoord.lat * 10000).toFixed(0)}` });
        } else if (top === 'Kolam_Budidaya') {
          kolamF.push({ ...feature, ...mkPin(pmName, pmCoord, pmDesc, 'kolam'), _jenis_ikan: desc.jenis_ikan || '', _pemilik: desc.nama || desc.nama_pemilik || '', _luas: desc.luas_m2 || '', _status: desc.status || 'Aktif' });
        } else if (top === 'Nelayan_Tangkap') {
          nelayanF.push({ ...mkPin(pmName, pmCoord, pmDesc, 'nelayan'), _alat: desc.alat_tangkap || '', _jenis_ikan: desc.jenis_ikan || '', _perahu: desc.perahu || '', _no_hp: desc.no_hp || '' });
        } else if (top === 'Hortikultura') {
          hortiF.push({ ...mkPin(pmName, pmCoord, pmDesc, 'horti'), _komoditas: desc.komoditas || pmName, _pemilik: desc.nama || desc.nama_pemilik || '', _luas: desc.luas_m2 || '', _tgl_tanam: desc.tanggal_tanam || '', _catatan: desc.catatan || '' });
        } else if (top === 'Palawija') {
          palawijaF.push({ ...mkPin(pmName, pmCoord, pmDesc, 'palawija'), _komoditas: desc.komoditas || pmName, _pemilik: desc.nama || desc.nama_pemilik || '', _luas: desc.luas_m2 || '', _tgl_tanam: desc.tanggal_tanam || '', _catatan: desc.catatan || '' });
        } else if (top === 'Poktan_KWT') {
          poktanF.push({ ...mkPin(pmName, pmCoord, pmDesc, 'poktan'), _jenis: desc.jenis || 'Poktan', _ketua: desc.ketua || '', _anggota: desc.anggota || '', _no_hp: desc.no_hp || '', _kelurahan: desc.kelurahan || '' });
        } else if (top === 'Warning_OPT') {
          warningF.push({ ...mkPin(pmName, pmCoord, pmDesc, 'warning'), _jenis: desc.jenis || 'OPT', _opt: desc.nama_opt || '', _komoditas: desc.komoditas || '', _luas: desc.luas_terdampak || '', _tgl: desc.tanggal || '', _ket: desc.keterangan || '' });
        }
      });

      const sawahWithLoc = sawF.map(f => {
        let { namaKelurahan, namaKecamatan } = findLocation(f, kelF, kecF);
        if (namaKelurahan === '-') {
          const namaNorm = (f.properties?.name || '').trim().toLowerCase();
          const sortedKel = [...ALL_KEL].sort((a, b) => b.length - a.length);
          const matchedKel = sortedKel.find(kel => namaNorm.startsWith(kel.toLowerCase()));
          if (matchedKel) {
            namaKelurahan = matchedKel;
            namaKecamatan = KEL_TO_KEC[matchedKel] || '-';
          }
        }
        return { ...f, properties: { ...f.properties, kelurahan: namaKelurahan, kecamatan: namaKecamatan } };
      });

      setLayers({ kecamatan: kecF, kelurahan: kelF, sawah: sawahWithLoc });
      if (kolamF.length > 0) setKolamBudidaya(kolamF);
      if (nelayanF.length > 0) setNelayanTangkap(nelayanF);
      if (hortiF.length > 0) setHortiKMZ(hortiF);
      if (palawijaF.length > 0) setPalawijaKMZ(palawijaF);
      if (poktanF.length > 0) setPoktanKMZ(poktanF);
      if (warningF.length > 0) setWarningKMZ(warningF);

      if (kecF.length > 0) {
        setTimeout(() => {
          if (!mapRef.current) return;
          try {
            const allFeatures = { type: 'FeatureCollection', features: kecF };
            const bbox = turf.bbox(allFeatures);
            mapRef.current.fitBounds([[bbox[1], bbox[0]], [bbox[3], bbox[2]]], { padding: [32, 32], maxZoom: 13, animate: false });
          } catch (e) { console.warn('fitBounds gagal:', e); }
        }, 300);
      }

      const ids = sawahWithLoc.map(f => f._id);
      const { data, error: supabaseError } = await supabase.from('sawah_status').select('*').in('sawah_id', ids);
      if (!supabaseError && data) {
        const loaded = {};
        data.forEach(row => { loaded[row.sawah_id] = { status: row.status, tanggalTanam: row.tanggal_tanam, varietas: row.varietas, hasilUbinan: row.hasil_ubinan }; });
        setSawahStatus(loaded);
      }
    } catch (e) {
      setError(e.message);
      console.error('KMZ processing error:', e);
    } finally {
      setLoading(false);
    }
  }, [mapRef]);

  const loadFromURL = useCallback(async () => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    setLoading(true);
    try {
      const res = await fetch(KMZ_URL);
      const zip = await JSZip.loadAsync(await res.arrayBuffer());
      const kmlFile = Object.values(zip.files).find(f => f.name.endsWith('.kml'));
      if (kmlFile) await processKML(await kmlFile.async('string'));
    } catch (e) {
      setError(e.message);
      console.error('Auto-load KMZ gagal:', e);
    } finally {
      setLoading(false);
    }
  }, [processKML, mkPin]); // eslint-disable-line

  const loadFromFile = useCallback(async (file) => {
    const fn = file.name.toLowerCase();
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
      if (fn.endsWith('.kml')) {
        reader.onload = async (ev) => { await processKML(ev.target.result); resolve(); };
        reader.readAsText(file);
      } else if (fn.endsWith('.kmz')) {
        reader.onload = async (ev) => {
          const zip = await JSZip.loadAsync(ev.target.result);
          const kmlFile = Object.values(zip.files).find(f => f.name.endsWith('.kml'));
          if (kmlFile) { await processKML(await kmlFile.async('string')); resolve(); }
          else reject(new Error('File KML tidak ditemukan!'));
        };
        reader.readAsArrayBuffer(file);
      } else {
        reject(new Error('Format tidak didukung'));
      }
    });
  }, [processKML]);

  return {
    layers, kolamBudidaya, nelayanTangkap, hortiKMZ, palawijaKMZ, poktanKMZ, warningKMZ,
    sawahStatus, setSawahStatus, loading, error,
    loadFromURL, loadFromFile,
  };
}
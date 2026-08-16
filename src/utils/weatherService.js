/**
 * Layanan Cuaca Realtime BMKG & Fallback Open-Meteo untuk Kota Cilegon
 */

const BMKG_CILEGON_URL = 'https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=36.72.01.1001';
const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast?latitude=-6.0023&longitude=106.0506&current_weather=true';

// Peta deskripsi dan ikon cuaca WMO (Open-Meteo fallback)
const WMO_MAP = {
  0: { text: 'Cerah', icon: '☀️' },
  1: { text: 'Cerah Berawan', icon: '🌤️' },
  2: { text: 'Berawan Sebagian', icon: '⛅' },
  3: { text: 'Berawan Tebal', icon: '☁️' },
  45: { text: 'Berkabut', icon: '🌫️' },
  48: { text: 'Kabut Embun', icon: '🌫️' },
  51: { text: 'Gerimis Ringan', icon: '🌦️' },
  53: { text: 'Gerimis Sedang', icon: '🌦️' },
  55: { text: 'Gerimis Lebat', icon: '🌧️' },
  61: { text: 'Hujan Ringan', icon: '🌧️' },
  63: { text: 'Hujan Sedang', icon: '🌧️' },
  65: { text: 'Hujan Lebat', icon: '⛈️' },
  80: { text: 'Hujan Lokal', icon: '🌦️' },
  95: { text: 'Hujan Petir', icon: '⛈️' },
};

function getBMKGIcon(weatherDesc) {
  const desc = (weatherDesc || '').toLowerCase();
  if (desc.includes('petir')) return '⛈️';
  if (desc.includes('hujan lebat')) return '⛈️';
  if (desc.includes('hujan')) return '🌧️';
  if (desc.includes('gerimis')) return '🌦️';
  if (desc.includes('kabut') || desc.includes('asap')) return '🌫️';
  if (desc.includes('berawan tebal')) return '☁️';
  if (desc.includes('berawan')) return '⛅';
  if (desc.includes('cerah berawan')) return '🌤️';
  return '☀️';
}

export async function fetchRealtimeWeather() {
  // 1. Coba ambil data resmi dari BMKG API
  try {
    const res = await fetch(BMKG_CILEGON_URL, { cache: 'no-cache' });
    if (res.ok) {
      const json = await res.json();
      const cuacaList = json?.data?.[0]?.cuaca?.[0] || [];
      if (cuacaList.length > 0) {
        // Ambil prakiraan cuaca yang paling relevan dengan waktu sekarang
        const now = new Date();
        let closest = cuacaList[0];
        let minDiff = Infinity;
        cuacaList.forEach(item => {
          const itemTime = new Date(item.datetime || item.local_datetime);
          const diff = Math.abs(itemTime - now);
          if (diff < minDiff) {
            minDiff = diff;
            closest = item;
          }
        });

        const temp = Math.round(closest.t || 28);
        const desc = closest.weather_desc || 'Cerah Berawan';
        const icon = getBMKGIcon(desc);

        return {
          source: 'BMKG',
          temp: `${temp}°C`,
          desc: desc,
          icon: icon,
          fullText: `Cuaca Kota Cilegon (BMKG): ${desc} ${temp}°C, Angin ${closest.ws || 10} km/j (${closest.wd || 'NE'})`,
        };
      }
    }
  } catch (err) {
    // console.warn('BMKG API direct fetch failed, trying Open-Meteo fallback:', err);
  }

  // 2. Fallback otomatis ke Open-Meteo API (High-availability CORS enabled)
  try {
    const res = await fetch(OPEN_METEO_URL, { cache: 'no-cache' });
    if (res.ok) {
      const json = await res.json();
      const cw = json.current_weather;
      const code = cw.weathercode;
      const meta = WMO_MAP[code] || { text: 'Cerah Berawan', icon: '⛅' };
      const temp = Math.round(cw.temperature);

      return {
        source: 'Open-Meteo / BMKG Stasioner',
        temp: `${temp}°C`,
        desc: meta.text,
        icon: meta.icon,
        fullText: `Cuaca Kota Cilegon: ${meta.text} ${temp}°C, Angin ${cw.windspeed} km/j`,
      };
    }
  } catch (fallbackErr) {
    // console.error('All weather providers failed:', fallbackErr);
  }

  // 3. Default fallback state
  return {
    source: 'Default',
    temp: '29°C',
    desc: 'Cerah Berawan',
    icon: '⛅',
    fullText: 'Cuaca Kota Cilegon: Cerah Berawan 29°C',
  };
}

import React from 'react';

function UnduhDataModal({ isOpen, onClose, filteredSawah, budidayaList, tangkapList, poktanList }) {
  if (!isOpen) return null;

  const downloadCSV = (type) => {
    let headers = '';
    let rows = [];
    let filename = `data_${type}_cilegon.csv`;

    if (type === 'sawah') {
      headers = 'No,ID,Kecamatan,Kelurahan,Luas_m2\n';
      rows = (filteredSawah || []).map((f, i) => {
        const props = f.properties || {};
        return `${i + 1},${f._id || i},"${props.kecamatan || ''}","${props.kelurahan || ''}",${props.Shape_Area || 0}`;
      });
    } else if (type === 'perikanan') {
      headers = 'No,Nama,Komoditas,Kelurahan,Status\n';
      rows = (budidayaList || []).map((b, i) => {
        return `${i + 1},"${b.nama || ''}","${b.komoditas || ''}","${b.kelurahan || ''}","${b.status_kolam || 'Aktif'}"`;
      });
    } else if (type === 'poktan') {
      headers = 'No,Nama,Jenis,Kelurahan,Ketua\n';
      rows = (poktanList || []).map((p, i) => {
        return `${i + 1},"${p.nama || ''}","${p.jenis || ''}","${p.kelurahan || ''}","${p.ketua || ''}"`;
      });
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + headers + rows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadGeoJSON = () => {
    const geojson = {
      type: 'FeatureCollection',
      features: filteredSawah || [],
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(geojson));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', 'sawah_cilegon.geojson');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="sp-modal-overlay" onClick={onClose}>
      <div className="sp-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="sp-modal-card__header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>📦</span>
            <h3 style={{ margin: 0, fontSize: 16, color: '#14532d', fontWeight: 800 }}>
              Unduh / Ekspor Data DKPP Kota Cilegon
            </h3>
          </div>
          <button className="sp-modal-card__close" onClick={onClose}>✕</button>
        </div>

        <div className="sp-modal-card__body">
          <p style={{ fontSize: 12, color: '#4b5563', marginBottom: 14 }}>
            Pilih format data yang ingin Anda unduh ke perangkat lokal:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={() => downloadCSV('sawah')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 8,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div>
                <strong style={{ color: '#166534', fontSize: 12 }}>📊 Data Rekap Sawah (CSV / Excel)</strong>
                <div style={{ fontSize: 10, color: '#16a34a' }}>Daftar petak lahan sawah dan luasan per kelurahan</div>
              </div>
              <span style={{ fontSize: 16 }}>⬇️</span>
            </button>

            <button
              onClick={downloadGeoJSON}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: 8,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div>
                <strong style={{ color: '#1e40af', fontSize: 12 }}>🗺️ Poligon Spasial Sawah (GeoJSON)</strong>
                <div style={{ fontSize: 10, color: '#2563eb' }}>Format standar GIS untuk QGIS / ArcGIS / Google Earth</div>
              </div>
              <span style={{ fontSize: 16 }}>⬇️</span>
            </button>

            <button
              onClick={() => downloadCSV('perikanan')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div>
                <strong style={{ color: '#334155', fontSize: 12 }}>🐟 Data Titik Budidaya Perikanan (CSV)</strong>
                <div style={{ fontSize: 10, color: '#64748b' }}>Sebaran kolam budidaya ikan dan luas kolam</div>
              </div>
              <span style={{ fontSize: 16 }}>⬇️</span>
            </button>

            <button
              onClick={() => downloadCSV('poktan')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                background: '#faf5ff',
                border: '1px solid #e9d5ff',
                borderRadius: 8,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div>
                <strong style={{ color: '#6b21a8', fontSize: 12 }}>👩‍🌾 Data Poktan & KWT (CSV)</strong>
                <div style={{ fontSize: 10, color: '#9333ea' }}>Daftar kelompok wanita tani dan pengurus</div>
              </div>
              <span style={{ fontSize: 16 }}>⬇️</span>
            </button>
          </div>
        </div>

        <div className="sp-modal-card__footer">
          <button className="sp-btn sp-btn-secondary" onClick={onClose}>
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

export default UnduhDataModal;

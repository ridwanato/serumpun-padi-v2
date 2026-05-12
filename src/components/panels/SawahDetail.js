import React from 'react';
import * as turf from '@turf/turf';
import { STATUS_CONFIG, VARIETAS_CONFIG } from '../../config/komoditas';
import {
  hitungHariTanam,
  hitungStatusOtomatis,
  hitungEstimasiPanen,
  hitungFaseHST,
  hitungProduksi,
  fmtHa,
} from '../../utils/agronomi';

function SawahDetail({
  activeSawah,
  sawahStatus,
  fillOpacity,
  onFillOpacityChange,
  onUpdateStatus,
  onSave,
}) {
  if (!activeSawah) {
    return (
      <div style={{ padding: 16, color: '#999', textAlign: 'center' }}>
        <p>Tidak ada sawah dipilih.</p>
        <p style={{ fontSize: 12 }}>Klik petak sawah di peta.</p>
      </div>
    );
  }

  const nama = activeSawah.properties?.name || activeSawah.properties?.Name || 'Tanpa Nama';
  const kel = activeSawah.properties?.kelurahan || '-';
  const kec = activeSawah.properties?.kecamatan || '-';
  const luas = turf.area(activeSawah);
  const sd = sawahStatus[activeSawah._id] || {};
  const varCfg = VARIETAS_CONFIG[sd.varietas] || VARIETAS_CONFIG.lainnya;
  const umur = varCfg.umur;
  const hari = hitungHariTanam(sd.tanggalTanam);
  const fase = hitungFaseHST(hari, umur);
  const prod = hitungProduksi(luas, sd.hasilUbinan);
  const estPanen = hitungEstimasiPanen(sd.tanggalTanam, umur);

  const curStatus =
    sd.status === 'otomatis' && sd.tanggalTanam
      ? hitungStatusOtomatis(sd.tanggalTanam, umur)
      : sd.status || 'belum';

  const statusCfg = STATUS_CONFIG[curStatus] || STATUS_CONFIG.belum;

  return (
    <div style={{ padding: 12 }}>
      {/* Badge nama + status */}
      <div
        style={{
          background: statusCfg.fillColor,
          border: `2px solid ${statusCfg.color}`,
          borderRadius: 10,
          padding: '10px 14px',
          marginBottom: 12,
          textAlign: 'center',
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 14 }}>{nama}</div>
        <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>{statusCfg.label}</div>
      </div>

      {/* Lokasi & Luas */}
      <div className="sp-info-box">
        <div className="sp-info-box__title">📍 Lokasi & Luas</div>
        <div className="sp-status-row"><span>🏘️ Kelurahan</span><b>{kel}</b></div>
        <div className="sp-status-row"><span>🏛️ Kecamatan</span><b>{kec}</b></div>
        <div className="sp-status-row"><span>📐 Luas</span><b>{fmtHa(luas)} Ha ({luas.toFixed(0)} m²)</b></div>
      </div>

      {/* Transparansi */}
      <div className="sp-info-box">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#666', textTransform: 'uppercase' }}>
            🎨 Transparansi
          </span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#16a34a' }}>
            {Math.round(fillOpacity * 100)}%
          </span>
        </div>
        <input
          type="range" className="sp-slider" min="0" max="1" step="0.05"
          value={fillOpacity} onChange={e => onFillOpacityChange(parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      {/* Status & Varietas */}
      <div className="sp-info-box">
        <div className="sp-info-box__title">🌾 Status & Varietas</div>

        <label style={{ fontSize: 11, color: '#888' }}>Mode Status</label>
        <select className="sp-select" value={sd.status || 'belum'}
          onChange={e => onUpdateStatus(activeSawah._id, 'status', e.target.value)}>
          <option value="otomatis">🤖 Otomatis (dari HST)</option>
          {Object.entries(STATUS_CONFIG).map(([k, c]) => (
            <option key={k} value={k}>{c.label}</option>
          ))}
        </select>

        <label style={{ fontSize: 11, color: '#888', marginTop: 8, display: 'block' }}>Varietas</label>
        <select className="sp-select" value={sd.varietas || 'lainnya'}
          onChange={e => onUpdateStatus(activeSawah._id, 'varietas', e.target.value)}>
          {Object.entries(VARIETAS_CONFIG).map(([k, c]) => (
            <option key={k} value={k}>{c.label} ({c.umur} HST)</option>
          ))}
        </select>

        <label style={{ fontSize: 11, color: '#888', marginTop: 8, display: 'block' }}>Tanggal Tanam</label>
        <input type="date" className="sp-input" value={sd.tanggalTanam || ''}
          onChange={e => {
            onUpdateStatus(activeSawah._id, 'tanggalTanam', e.target.value);
            if (!sd.status || sd.status === 'belum') {
              onUpdateStatus(activeSawah._id, 'status', 'otomatis');
            }
          }} />
      </div>

      {/* Progress HST */}
      {fase && (
        <div className="sp-info-box">
          <div className="sp-info-box__title">📈 Progress HST</div>
          <div className="sp-status-row">
            <span>{fase.icon} Fase {fase.fase}</span>
            <b style={{ color: fase.color }}>{hari} HST / {umur} HST</b>
          </div>
          <div className="sp-progress-wrap" style={{ marginTop: 6 }}>
            <div className="sp-progress-bar"
              style={{ width: `${Math.min(fase.pct, 100)}%`, background: fase.color, height: 8, borderRadius: 4 }} />
          </div>
          <div className="sp-status-row" style={{ marginTop: 8 }}>
            <span>🌾 Est. Panen</span><b>{estPanen}</b>
          </div>
        </div>
      )}

      {/* Estimasi Produksi */}
      <div className="sp-info-box">
        <div className="sp-info-box__title">📊 Estimasi Produksi</div>
        <label style={{ fontSize: 11, color: '#888' }}>Hasil Ubinan (kg/6.25m²)</label>
        <input type="number" className="sp-input" placeholder="cth: 2.5" value={sd.hasilUbinan || ''}
          onChange={e => onUpdateStatus(activeSawah._id, 'hasilUbinan', e.target.value)} />

        {prod && (
          <div style={{ marginTop: 8 }}>
            <div className="sp-prod-box"><span>GKP</span><b>{prod.gkp.toFixed(2)} ton</b></div>
            <div className="sp-prod-box"><span>GKG</span><b>{prod.gkg.toFixed(2)} ton</b></div>
            <div className="sp-prod-box"><span>Beras</span><b>{prod.beras.toFixed(2)} ton</b></div>
            <div className="sp-prod-box"><span>Produktivitas</span><b>{prod.tonHa.toFixed(2)} ton/Ha</b></div>
          </div>
        )}
      </div>

      {/* Tombol Simpan */}
      {onSave && (
        <button
          className="sp-btn sp-btn-primary"
          style={{ width: '100%', marginTop: 4, marginBottom: 8, fontSize: 13, padding: '10px' }}
          onClick={() => onSave(activeSawah, sd)}
        >
          💾 Simpan Status Sawah ke Cloud
        </button>
      )}
    </div>
  );
}

export default SawahDetail;
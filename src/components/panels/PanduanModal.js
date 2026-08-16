import React from 'react';

function PanduanModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="sp-modal-overlay" onClick={onClose}>
      <div className="sp-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="sp-modal-card__header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>📖</span>
            <h3 style={{ margin: 0, fontSize: 16, color: '#14532d', fontWeight: 800 }}>
              Panduan Penggunaan DKPP.INFO (Serumpun Padi v2)
            </h3>
          </div>
          <button className="sp-modal-card__close" onClick={onClose}>✕</button>
        </div>

        <div className="sp-modal-card__body">
          <div className="sp-guide-section">
            <h4 style={{ color: '#166534', margin: '0 0 6px 0', fontSize: 13 }}>🌾 1. Navigasi & Tampilan Peta</h4>
            <p style={{ margin: '0 0 10px 0', color: '#4b5563', fontSize: 12, lineHeight: 1.5 }}>
              Gunakan mouse atau gestur sentuh untuk memperbesar (zoom) dan menggeser (pan) peta.
              Klik ikon pada <strong>Left Icon Rail</strong> atau centang opsi di <strong>Menu Utama</strong> untuk mengaktifkan/menonaktifkan layer komoditas.
            </p>
          </div>

          <div className="sp-guide-section">
            <h4 style={{ color: '#166534', margin: '0 0 6px 0', fontSize: 13 }}>🔍 2. Kotak Pencarian Pintar</h4>
            <p style={{ margin: '0 0 10px 0', color: '#4b5563', fontSize: 12, lineHeight: 1.5 }}>
              Ketik nama kecamatan, kelurahan, nomor petak sawah, kelompok tani, atau komoditas pada kolom pencarian di bagian atas.
              Sistem akan menampilkan daftar rekomendasi tautan secara langsung dan memfokuskan peta ke lokasi terkait saat diklik.
            </p>
          </div>

          <div className="sp-guide-section">
            <h4 style={{ color: '#166534', margin: '0 0 6px 0', fontSize: 13 }}>📊 3. Panel Statistik & Rekap Data</h4>
            <p style={{ margin: '0 0 10px 0', color: '#4b5563', fontSize: 12, lineHeight: 1.5 }}>
              Kartu statistik di sisi kanan merangkum total luasan sawah, estimasi produksi GKG, populasi perikanan, serta omset KWT.
              Klik tombol <em>"Lihat Detail →"</em> pada masing-masing kartu untuk membuka rincian per kelurahan.
            </p>
          </div>

          <div className="sp-guide-section">
            <h4 style={{ color: '#166534', margin: '0 0 6px 0', fontSize: 13 }}>✏️ 4. Gambar & Upload Poligon</h4>
            <p style={{ margin: '0 0 10px 0', color: '#4b5563', fontSize: 12, lineHeight: 1.5 }}>
              Buka menu <strong>"Peta Poligon"</strong> untuk menggambar bidang sawah baru secara manual menggunakan alat poligon, atau gunakan tombol <strong>"Upload KMZ / Shapefile"</strong> untuk mengimpor data spasial GIS.
            </p>
          </div>
        </div>

        <div className="sp-modal-card__footer">
          <button className="sp-btn sp-btn-primary" onClick={onClose}>
            Mengerti & Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

export default PanduanModal;

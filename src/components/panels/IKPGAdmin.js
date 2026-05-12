import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { ALL_KEL } from '../../config/wilayah';
import { getFSVACategory, getBordaDesil, BORDA_LEGEND } from '../../config/ikpg';

function IKPGAdmin({ user, supabase, fsvaData, skpgData, onRefresh }) {
  const [uploadStatus, setUploadStatus] = useState({ fsva: '', skpg: '' });

  const downloadTemplate = (type) => {
    const cols = type === 'fsva'
      ? ['nama_kelurahan', 'kode_kel_bps', 'ikp', 'periode']
      : ['nama_kelurahan', 'gizi_kurang', 'gizi_sangat_kurang', 'gizi_berlebih', 'gizi_normal', 'periode'];
    const rows = ALL_KEL.map(k => {
      const row = {}; cols.forEach(c => { row[c] = c === 'nama_kelurahan' ? k : ''; }); return row;
    });
    const ws = XLSX.utils.json_to_sheet(rows, { header: cols });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, type.toUpperCase());
    XLSX.writeFile(wb, `template_${type}.xlsx`);
  };

  const uploadFSVA = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setUploadStatus(s => ({ ...s, fsva: 'Memproses...' }));
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf); const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws);
      const sorted = [...rows].sort((a, b) => parseFloat(a.ikp || 0) - parseFloat(b.ikp || 0));
      const upsertRows = sorted.map((r, idx) => {
        const ikp = parseFloat(r.ikp || 0);
        const cat = getFSVACategory(ikp);
        return {
          nama_kelurahan: r.nama_kelurahan, kode_kel_bps: r.kode_kel_bps || null,
          ikp, rank_fsva: idx + 1, prioritas_fsva: cat.p, kategori_fsva: cat.k,
          periode: r.periode || '', updated_at: new Date().toISOString(),
        };
      });
      const { error } = await supabase.from('fsva_kelurahan').upsert(upsertRows, { onConflict: 'nama_kelurahan' });
      if (error) throw error;
      if (onRefresh) onRefresh();
      setUploadStatus(s => ({ ...s, fsva: `✅ Berhasil: ${upsertRows.length} kelurahan` }));
    } catch (err) { setUploadStatus(s => ({ ...s, fsva: `❌ Error: ${err.message}` })); }
  };

  const uploadSKPG = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setUploadStatus(s => ({ ...s, skpg: 'Memproses...' }));
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf); const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws);

      const withPrev = rows.map(r => {
        const gk = parseInt(r.gizi_kurang || 0), gsk = parseInt(r.gizi_sangat_kurang || 0);
        const gb = parseInt(r.gizi_berlebih || 0), gn = parseInt(r.gizi_normal || 0);
        const total = gk + gsk + gb + gn;
        const prev = total > 0 ? parseFloat(((gk + gsk) / total * 100).toFixed(2)) : 0;
        const kat = prev > 15 ? 'rentan' : prev >= 10 ? 'waspada' : 'aman';
        return { ...r, gizi_kurang: gk, gizi_sangat_kurang: gsk, gizi_berlebih: gb, gizi_normal: gn, total_balita: total, prevalensi_gizi_buruk: prev, kategori_skpg: kat };
      });

      const sorted = [...withPrev].sort((a, b) => b.prevalensi_gizi_buruk - a.prevalensi_gizi_buruk || (a.nama_kelurahan || '').localeCompare(b.nama_kelurahan || ''));
      const total = sorted.length;

      const withRank = sorted.map((r, idx) => {
        const skpgRank = idx + 1;
        const fsvaRow = fsvaData.find(f => f.nama_kelurahan === r.nama_kelurahan);
        const fsvaRank = fsvaRow?.rank_fsva || null;
        const bordaSum = fsvaRank ? fsvaRank + skpgRank : null;
        const bordaRank = bordaSum ? [...sorted.map((_, i) => {
          const fr = fsvaData.find(f => f.nama_kelurahan === sorted[i].nama_kelurahan);
          return fr?.rank_fsva ? fr.rank_fsva + (i + 1) : null;
        })].filter(Boolean).sort((a, b) => a - b).indexOf(bordaSum) + 1 : null;
        const borda = bordaRank ? getBordaDesil(bordaRank, total) : { d: null, k: null };
        return { ...r, rank_skpg: skpgRank, rank_fsva_ref: fsvaRank, borda_sum: bordaSum, prioritas_borda: borda.d, kategori_borda: borda.k };
      });

      const upsertRows = withRank.map(r => ({
        nama_kelurahan: r.nama_kelurahan, gizi_kurang: r.gizi_kurang, gizi_sangat_kurang: r.gizi_sangat_kurang,
        gizi_berlebih: r.gizi_berlebih, gizi_normal: r.gizi_normal, total_balita: r.total_balita,
        prevalensi_gizi_buruk: r.prevalensi_gizi_buruk, rank_skpg: r.rank_skpg, kategori_skpg: r.kategori_skpg,
        rank_fsva_ref: r.rank_fsva_ref, borda_sum: r.borda_sum, prioritas_borda: r.prioritas_borda,
        kategori_borda: r.kategori_borda, periode: r.periode || '', updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase.from('skpg_kelurahan').upsert(upsertRows, { onConflict: 'nama_kelurahan' });
      if (error) throw error;
      if (onRefresh) onRefresh();

      const top10 = upsertRows.filter(r => r.borda_sum).sort((a, b) => a.borda_sum - b.borda_sum).slice(0, 10);
      setUploadStatus(s => ({ ...s, skpg: `✅ Berhasil: ${upsertRows.length} kelurahan. Top 10: ${top10.map(r => r.nama_kelurahan).join(', ')}` }));
    } catch (err) { setUploadStatus(s => ({ ...s, skpg: `❌ Error: ${err.message}` })); }
  };

  const topBorda = [...(skpgData || [])].filter(r => r.borda_sum).sort((a, b) => a.borda_sum - b.borda_sum).slice(0, 15);

  const getBordaColor = (d) => {
    const colors = ['#7b0000','#b71c1c','#d32f2f','#e57373','#ef9a9a','#a5d6a7','#66bb6a','#43a047','#2e7d32','#1b5e20'];
    return d ? colors[d-1] || '#ccc' : '#ccc';
  };

  const getBordaBg = (d) => {
    const bgs = ['#fde8e8','#fde8e8','#fde8e8','#fef3e2','#fef3e2','#e8f5e9','#e8f5e9','#e8f5e9','#c8e6c9','#c8e6c9'];
    return d ? bgs[d-1] || '#fff' : '#fff';
  };

  return (
    <div style={{ padding: 12 }}>
      {/* Info */}
      <div style={{ marginBottom: 12, padding: '10px 12px', background: 'linear-gradient(135deg,#1b5e20,#2e7d32)', borderRadius: 10, color: '#fff', fontSize: 11 }}>
        Panel ini untuk admin. Upload data FSVA dan SKPG agar layer peta ketahanan pangan aktif. Borda menggunakan <b>Desil</b> (10 level).
      </div>

      {/* Download Template */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>⬇ Download Template</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => downloadTemplate('fsva')} style={{ flex: 1, padding: '8px', background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 8, fontSize: 11, fontWeight: 700, color: '#2e7d32', cursor: 'pointer' }}>
            ⬇ Template FSVA
          </button>
          <button onClick={() => downloadTemplate('skpg')} style={{ flex: 1, padding: '8px', background: '#e3f2fd', border: '1px solid #90caf9', borderRadius: 8, fontSize: 11, fontWeight: 700, color: '#1565c0', cursor: 'pointer' }}>
            ⬇ Template SKPG
          </button>
        </div>
      </div>

      {/* Upload FSVA */}
      <div className="sp-info-box">
        <div className="sp-info-box__title">⬆ Upload FSVA (IKP)</div>
        <input type="file" accept=".xlsx" onChange={uploadFSVA} style={{ fontSize: 11, marginBottom: 6, width: '100%' }} />
        {uploadStatus.fsva && (
          <div style={{ fontSize: 11, padding: '6px 8px', background: uploadStatus.fsva.startsWith('❌') ? '#fde8e8' : '#e8f5e9', borderRadius: 6, color: uploadStatus.fsva.startsWith('❌') ? '#c0392b' : '#2e7d32' }}>
            {uploadStatus.fsva}
          </div>
        )}
        <div style={{ fontSize: 10, color: '#888', marginTop: 4 }}>Data: {(fsvaData || []).length} kelurahan</div>
      </div>

      {/* Upload SKPG */}
      <div className="sp-info-box">
        <div className="sp-info-box__title">⬆ Upload SKPG (Gizi Balita)</div>
        <div style={{ fontSize: 10, color: '#999', marginBottom: 6 }}>Upload FSVA dulu agar Borda dihitung.</div>
        <input type="file" accept=".xlsx" onChange={uploadSKPG} style={{ fontSize: 11, marginBottom: 6, width: '100%' }} />
        {uploadStatus.skpg && (
          <div style={{ fontSize: 11, padding: '6px 8px', background: uploadStatus.skpg.startsWith('❌') ? '#fde8e8' : '#e8f5e9', borderRadius: 6, color: uploadStatus.skpg.startsWith('❌') ? '#c0392b' : '#2e7d32' }}>
            {uploadStatus.skpg}
          </div>
        )}
        <div style={{ fontSize: 10, color: '#888', marginTop: 4 }}>Data: {(skpgData || []).length} kelurahan</div>
      </div>

      {/* Legenda Borda Desil */}
      <div className="sp-info-box">
        <div className="sp-info-box__title">📊 Legenda Borda Desil</div>
        {BORDA_LEGEND.map(([c, l]) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 0', fontSize: 10 }}>
            <span style={{ width: 14, height: 14, borderRadius: 3, background: c, display: 'inline-block', flexShrink: 0 }} />
            <span style={{ color: '#444' }}>{l}</span>
          </div>
        ))}
      </div>

      {/* Top 15 Prioritas */}
      {topBorda.length > 0 && (
        <div className="sp-info-box">
          <div className="sp-info-box__title">🎯 TOP 15 PRIORITAS INTERVENSI (DESIL)</div>
          <table style={{ width: '100%', fontSize: 10, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f3f4f6' }}>
                <th style={{ padding: '5px 6px', textAlign: 'left', fontWeight: 700 }}>Rank</th>
                <th style={{ padding: '5px 6px', textAlign: 'left', fontWeight: 700 }}>Kelurahan</th>
                <th style={{ padding: '5px 6px', textAlign: 'center', fontWeight: 700 }}>Borda</th>
                <th style={{ padding: '5px 6px', textAlign: 'center', fontWeight: 700 }}>Desil</th>
              </tr>
            </thead>
            <tbody>
              {topBorda.map((r, i) => (
                <tr key={i} style={{ background: getBordaBg(r.prioritas_borda), borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '5px 6px', fontWeight: 700 }}>{i + 1}</td>
                  <td style={{ padding: '5px 6px' }}>{r.nama_kelurahan}</td>
                  <td style={{ padding: '5px 6px', textAlign: 'center', fontWeight: 700 }}>{r.borda_sum}</td>
                  <td style={{ padding: '5px 6px', textAlign: 'center' }}>
                    <span style={{
                      background: getBordaColor(r.prioritas_borda), color: '#fff',
                      padding: '1px 6px', borderRadius: 8, fontSize: 9, fontWeight: 700,
                    }}>
                      D{r.prioritas_borda || '?'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default IKPGAdmin;
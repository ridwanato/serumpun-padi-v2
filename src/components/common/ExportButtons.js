import React, { useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

function ExportButtons({ user, fileName, contentRef, excelData, onCustomPdf, onCustomExcel }) {
  const [loading, setLoading] = useState(false);

  const handleExportPDF = async () => {
    if (!user) {
      alert('🔒 Fitur unduh dokumen PDF eksklusif hanya untuk pengguna terdaftar. Silakan login terlebih dahulu melalui menu di pojok kanan atas.');
      return;
    }
    
    setLoading(true);
    try {
      if (onCustomPdf) {
        await onCustomPdf();
      } else {
        if (!contentRef || !contentRef.current) {
          setLoading(false);
          return;
        }
        const element = contentRef.current;
        const originalStyle = element.style.cssText;
        element.style.padding = '20px';
        element.style.background = '#ffffff';
        
        const canvas = await html2canvas(element, { scale: 2, useCORS: true });
        element.style.cssText = originalStyle;

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${fileName}.pdf`);
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Gagal menghasilkan PDF.');
    }
    setLoading(false);
  };

  const handleExportExcel = async () => {
    if (!user) {
      alert('🔒 Fitur unduh dokumen Excel (XLSX) eksklusif hanya untuk pengguna terdaftar. Silakan login terlebih dahulu melalui menu di pojok kanan atas.');
      return;
    }
    
    setLoading(true);
    try {
      if (onCustomExcel) {
        await onCustomExcel();
      } else {
        if (!excelData || excelData.length === 0) {
          alert('Tidak ada data untuk diekspor ke Excel.');
          setLoading(false);
          return;
        }
        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
        XLSX.writeFile(workbook, `${fileName}.xlsx`);
      }
    } catch (error) {
      console.error('Error generating Excel:', error);
      alert('Gagal menghasilkan Excel.');
    }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
      <button
        onClick={handleExportPDF}
        disabled={loading}
        style={{
          flex: 1, padding: '8px 12px', background: '#dc2626', color: '#fff',
          border: 'none', borderRadius: '6px', cursor: 'pointer',
          fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          opacity: loading ? 0.7 : 1
        }}
      >
        {loading ? '⏳ Memproses...' : '📄 Unduh PDF'}
      </button>
      
      <button
        onClick={handleExportExcel}
        style={{
          flex: 1, padding: '8px 12px', background: '#16a34a', color: '#fff',
          border: 'none', borderRadius: '6px', cursor: 'pointer',
          fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
        }}
      >
        📊 Unduh Excel
      </button>
    </div>
  );
}

export default ExportButtons;

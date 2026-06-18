import { jsPDF } from 'jspdf';
import { SurveyResult, SeverityCategory } from './types';
import { DASS_QUESTIONS } from './questions';

// Colors
const COLOR_PRIMARY = { r: 30, g: 41, b: 59 }; // Slate 800
const COLOR_ACCENT = { r: 14, g: 165, b: 233 }; // Sky 500
const COLOR_DARK = { r: 71, g: 85, b: 105 }; // Slate 600

// Category Colors
const getCategoryColor = (category: SeverityCategory) => {
  switch (category) {
    case 'Normal':
      return { r: 34, g: 197, b: 94, hex: '#22c55e' }; // Green
    case 'Ringan':
      return { r: 234, g: 179, b: 8, hex: '#eab308' }; // Gold
    case 'Sedang':
      return { r: 249, g: 115, b: 22, hex: '#f97316' }; // Orange
    case 'Berat':
      return { r: 239, g: 68, b: 68, hex: '#ef4444' }; // Red
    case 'Sangat Berat':
      return { r: 168, g: 85, b: 247, hex: '#a855f7' }; // Purple
    default:
      return { r: 100, g: 116, b: 139, hex: '#64748b' };
  }
};

const getCategoryInterpretation = (dimension: 'Depresi' | 'Kecemasan' | 'Stres', category: SeverityCategory): string => {
  const isHigh = category === 'Berat' || category === 'Sangat Berat';
  if (isHigh) {
    return `Tingkat ${dimension}: ${category}. Disarankan untuk melakukan konsultasi dengan profesional psikolog atau psikiater.`;
  }
  return `Tingkat ${dimension}: ${category}.`;
};

export const exportToPDF = (result: SurveyResult): void => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 15;
  let currentY = 15;

  // Helper functions
  const drawHeader = (pageNumber: number) => {
    // Top banner
    doc.setFillColor(COLOR_PRIMARY.r, COLOR_PRIMARY.g, COLOR_PRIMARY.b);
    doc.rect(0, 0, pageWidth, 24, 'F');

    doc.setFillColor(COLOR_ACCENT.r, COLOR_ACCENT.g, COLOR_ACCENT.b);
    doc.rect(0, 24, pageWidth, 2, 'F');

    // Title
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text('LAPORAN HASIL ASESMEN TES DASS-42', pageWidth / 2, 14, { align: 'center' });

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Halaman ${pageNumber} dari 2`, pageWidth - marginX - 10, 19, { align: 'right' });
  };

  const drawFooter = () => {
    // Divider line
    doc.setDrawColor(203, 213, 225); // Slate 200
    doc.setLineWidth(0.5);
    doc.line(marginX, pageHeight - 15, pageWidth - marginX, pageHeight - 15);

    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.text('Aplikasi Hasil Survei DASS-42 - Rahasia & Terbatas', marginX, pageHeight - 10);
    doc.text(`Waktu Cetak: ${new Date().toLocaleString('id-ID')}`, pageWidth - marginX, pageHeight - 10, { align: 'right' });
  };

  // --- PAGE 1 ---
  drawHeader(1);
  currentY = 38;

  // Section: Informasi Asesmen
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(COLOR_PRIMARY.r, COLOR_PRIMARY.g, COLOR_PRIMARY.b);
  doc.text('I. INFORMASI ASESMEN', marginX, currentY);
  
  // Underline section title
  doc.setDrawColor(COLOR_ACCENT.r, COLOR_ACCENT.g, COLOR_ACCENT.b);
  doc.setLineWidth(0.7);
  doc.line(marginX, currentY + 1.5, marginX + 43, currentY + 1.5);
  currentY += 8;

  // Box content for metadata
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.rect(marginX, currentY, pageWidth - (marginX * 2), 38, 'F');
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.setLineWidth(0.3);
  doc.rect(marginX, currentY, pageWidth - (marginX * 2), 38, 'S');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(COLOR_PRIMARY.r, COLOR_PRIMARY.g, COLOR_PRIMARY.b);

  // Left column information
  doc.text('REKAPITULASI RESPONDEN:', marginX + 5, currentY + 6);
  doc.setFont('Helvetica', 'normal');
  doc.text(`Nama Responden  :  ${result.namaResponden}`, marginX + 5, currentY + 13);
  doc.text(`Umur Responden  :  ${result.umur} Tahun`, marginX + 5, currentY + 20);
  doc.text(`Jenis Kelamin         :  ${result.gender}`, marginX + 5, currentY + 27);
  doc.text(`Asal Ruangan         :  ${result.asalRuangan || '-'}`, marginX + 5, currentY + 34);

  // Right column information
  doc.setFont('Helvetica', 'bold');
  doc.text('METODE ASESMEN:', marginX + 100, currentY + 6);
  doc.setFont('Helvetica', 'normal');
  doc.text(`Metode                 :  Mandiri (DASS-42)`, marginX + 100, currentY + 13);
  doc.text(`Tanggal Tes         :  ${result.tanggal}`, marginX + 100, currentY + 20);
  doc.text(`Referensi             :  Lovibond & Lovibond, 1995`, marginX + 100, currentY + 27);

  currentY += 48;

  // Section: Hasil Skor & Analisis
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(COLOR_PRIMARY.r, COLOR_PRIMARY.g, COLOR_PRIMARY.b);
  doc.text('II. ANALISIS SKOR DEPRESI, KECEMASAN, DAN STRES', marginX, currentY);
  
  doc.setDrawColor(COLOR_ACCENT.r, COLOR_ACCENT.g, COLOR_ACCENT.b);
  doc.setLineWidth(0.7);
  doc.line(marginX, currentY + 1.5, marginX + 102, currentY + 1.5);
  currentY += 8;

  // Render cards for Depresi, Kecemasan, Stres
  const dimensions = [
    { name: 'Depresi', score: result.scoreDepresi, cat: result.kategoriDepresi, maxVal: 42, label: 'DEPRESI' },
    { name: 'Kecemasan', score: result.scoreKecemasan, cat: result.kategoriKecemasan, maxVal: 42, label: 'KECEMASAN' },
    { name: 'Stres', score: result.scoreStres, cat: result.kategoriStres, maxVal: 42, label: 'STRES' }
  ];

  const cardWidth = (pageWidth - (marginX * 2) - 10) / 3;

  dimensions.forEach((dim, idx) => {
    const cardX = marginX + (idx * (cardWidth + 5));
    const catColor = getCategoryColor(dim.cat);

    // Card background
    doc.setFillColor(255, 255, 255);
    doc.rect(cardX, currentY, cardWidth, 40, 'F');
    // Accent top border
    doc.setFillColor(catColor.r, catColor.g, catColor.b);
    doc.rect(cardX, currentY, cardWidth, 4, 'F');
    // Thin gray outline
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.rect(cardX, currentY, cardWidth, 40, 'S');

    // Content
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(COLOR_DARK.r, COLOR_DARK.g, COLOR_DARK.b);
    doc.text(dim.label, cardX + (cardWidth / 2), currentY + 11, { align: 'center' });

    // Big Score
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(COLOR_PRIMARY.r, COLOR_PRIMARY.g, COLOR_PRIMARY.b);
    doc.text(`${dim.score}`, cardX + (cardWidth / 2), currentY + 22, { align: 'center' });

    // Severity Label
    doc.setFillColor(catColor.r, catColor.g, catColor.b);
    // Draw rounded-like box for status
    doc.rect(cardX + 6, currentY + 28, cardWidth - 12, 7, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text(dim.cat, cardX + (cardWidth / 2), currentY + 32.8, { align: 'center' });
  });

  currentY += 48;

  // Section: Detail Interpretasi Klinis
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(COLOR_PRIMARY.r, COLOR_PRIMARY.g, COLOR_PRIMARY.b);
  doc.text('III. INTERPRETASI HASIL DAN REKOMENDASI', marginX, currentY);
  
  doc.setDrawColor(COLOR_ACCENT.r, COLOR_ACCENT.g, COLOR_ACCENT.b);
  doc.setLineWidth(0.7);
  doc.line(marginX, currentY + 1.5, marginX + 80, currentY + 1.5);
  currentY += 8;

  // Render text blocks for interpretations
  dimensions.forEach((dim) => {
    const catColor = getCategoryColor(dim.cat);
    
    // Tiny bullet or indicator color block
    doc.setFillColor(catColor.r, catColor.g, catColor.b);
    doc.rect(marginX, currentY, 3, 10, 'F');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(COLOR_PRIMARY.r, COLOR_PRIMARY.g, COLOR_PRIMARY.b);
    doc.text(`${dim.name} (${dim.cat})`, marginX + 6, currentY + 4);

    const interpretationText = getCategoryInterpretation(dim.name as 'Depresi' | 'Kecemasan' | 'Stres', dim.cat);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(COLOR_DARK.r, COLOR_DARK.g, COLOR_DARK.b);
    
    const lines = doc.splitTextToSize(interpretationText, pageWidth - (marginX * 2) - 10);
    doc.text(lines, marginX + 6, currentY + 10);

    currentY += 12 + (lines.length * 4);
  });

  drawFooter();

  // --- PAGE 2 ---
  doc.addPage();
  drawHeader(2);
  currentY = 38;

  // Section: Rincian Jawaban Responden
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(COLOR_PRIMARY.r, COLOR_PRIMARY.g, COLOR_PRIMARY.b);
  doc.text('IV. LOG DETIL JAWABAN RESPONDEN (Q1 - Q42)', marginX, currentY);
  
  doc.setDrawColor(COLOR_ACCENT.r, COLOR_ACCENT.g, COLOR_ACCENT.b);
  doc.setLineWidth(0.7);
  doc.line(marginX, currentY + 1.5, marginX + 82, currentY + 1.5);
  currentY += 8;

  // Let's print out all 42 answers in a neat compact table.
  // Let's split 42 questions in 2 parallel columns of 21 rows!
  const colWidth = (pageWidth - (marginX * 2) - 8) / 2;
  const colHeight = 6.4;
  const rowCount = 21;

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);

  // Column Headers
  doc.setFillColor(COLOR_PRIMARY.r, COLOR_PRIMARY.g, COLOR_PRIMARY.b);
  doc.rect(marginX, currentY, colWidth, colHeight, 'F');
  doc.text('  No  Pernyataan DASS', marginX, currentY + 4.5);
  doc.text('Skor', marginX + colWidth - 10, currentY + 4.5);

  doc.setFillColor(COLOR_PRIMARY.r, COLOR_PRIMARY.g, COLOR_PRIMARY.b);
  doc.rect(marginX + colWidth + 8, currentY, colWidth, colHeight, 'F');
  doc.text('  No  Pernyataan DASS', marginX + colWidth + 8, currentY + 4.5);
  doc.text('Skor', marginX + colWidth + 8 + colWidth - 10, currentY + 4.5);

  currentY += colHeight;

  for (let i = 0; i < rowCount; i++) {
    const qIdxLeft = i; // 0 to 20
    const qIdxRight = i + rowCount; // 21 to 41

    // Row backgrounds zebra
    const bgOpacity = i % 2 === 0 ? 250 : 241;
    doc.setFillColor(bgOpacity, bgOpacity, bgOpacity);

    // Left Column
    const qLeft = DASS_QUESTIONS[qIdxLeft];
    const scoreLeft = result.jawaban[qLeft.id] ?? 0;
    doc.rect(marginX, currentY, colWidth, colHeight, 'F');
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(COLOR_PRIMARY.r, COLOR_PRIMARY.g, COLOR_PRIMARY.b);
    doc.text(`  ${qLeft.id}. `, marginX, currentY + 4.5);
    
    // Truncate text if too long
    const availableTextWidth = colWidth - 22;
    let textLeft = qLeft.text;
    if (doc.getTextWidth(textLeft) > availableTextWidth) {
      while (doc.getTextWidth(textLeft + '...') > availableTextWidth && textLeft.length > 0) {
        textLeft = textLeft.substring(0, textLeft.length - 1);
      }
      textLeft += '...';
    }
    doc.text(textLeft, marginX + 8, currentY + 4.5);
    
    // Label for question scale (D, A, S)
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7);
    const catCode = qLeft.category === 'Depresi' ? 'D' : qLeft.category === 'Kecemasan' ? 'A' : 'S';
    doc.setTextColor(148, 163, 184);
    doc.text(`[${catCode}]`, marginX + colWidth - 17, currentY + 4.5);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(COLOR_PRIMARY.r, COLOR_PRIMARY.g, COLOR_PRIMARY.b);
    doc.text(`${scoreLeft}`, marginX + colWidth - 7, currentY + 4.5);

    // Right Column
    const qRight = DASS_QUESTIONS[qIdxRight];
    const scoreRight = result.jawaban[qRight.id] ?? 0;
    doc.setFillColor(bgOpacity, bgOpacity, bgOpacity);
    doc.rect(marginX + colWidth + 8, currentY, colWidth, colHeight, 'F');
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(COLOR_PRIMARY.r, COLOR_PRIMARY.g, COLOR_PRIMARY.b);
    doc.text(`  ${qRight.id}. `, marginX + colWidth + 8, currentY + 4.5);

    let textRight = qRight.text;
    if (doc.getTextWidth(textRight) > availableTextWidth) {
      while (doc.getTextWidth(textRight + '...') > availableTextWidth && textRight.length > 0) {
        textRight = textRight.substring(0, textRight.length - 1);
      }
      textRight += '...';
    }
    doc.text(textRight, marginX + colWidth + 16, currentY + 4.5);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7);
    const catCodeRight = qRight.category === 'Depresi' ? 'D' : qRight.category === 'Kecemasan' ? 'A' : 'S';
    doc.setTextColor(148, 163, 184);
    doc.text(`[${catCodeRight}]`, marginX + colWidth + 8 + colWidth - 17, currentY + 4.5);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(COLOR_PRIMARY.r, COLOR_PRIMARY.g, COLOR_PRIMARY.b);
    doc.text(`${scoreRight}`, marginX + colWidth + 8 + colWidth - 7, currentY + 4.5);

    currentY += colHeight;
  }

  // Legend keys below table
  currentY += 3;
  doc.setFont('Helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('*Keterangan Dimensi: [D] Depresi, [A] Kecemasan, [S] Stres. Skor berkisar antara 0 hingga 3.', marginX, currentY);

  currentY += 8;

  // Disclaimer and Signature block side-by-side
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(marginX, currentY, pageWidth - marginX, currentY);

  currentY += 7;

  // Left Disclaimer
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(COLOR_PRIMARY.r, COLOR_PRIMARY.g, COLOR_PRIMARY.b);
  doc.text('DISCLAIMER / BATASAN TANGGUNG JAWAB', marginX, currentY);
  
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  const disclaimerText = 'Instrumen Depresi, Kecemasan, dan Stres (DASS-42) ini adalah alat skrining kesehatan mental yang bersumber dari Lovibond & Lovibond (1995). Hasil dari instrumen ini HANYA merupakan deteksi dini (skrining awal) dari kondisi psikologis individu dan TIDAK memiliki kekuatan diagnosis medis resmi atau konsultasi psikiatri legal. Untuk diagnosis klinis yang akurat, konsultasi wajib dilakukan secara tatap muka fisik langsung dengan dokter spesialis kedokteran jiwa/psikiater maupun psikolog klinis berlisensi resmi.';
  const wrappedDisclaimer = doc.splitTextToSize(disclaimerText, 110);
  doc.text(wrappedDisclaimer, marginX, currentY + 5);

  // Right Signature Block
  const sigX = pageWidth - marginX - colWidth + 10;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(COLOR_PRIMARY.r, COLOR_PRIMARY.g, COLOR_PRIMARY.b);
  doc.text('Responden,', sigX, currentY);

  // Simulated signature line
  doc.setDrawColor(186, 230, 253);
  doc.setLineWidth(0.5);
  doc.line(sigX, currentY + 18, sigX + 50, currentY + 18);

  doc.setFont('Helvetica', 'bold');
  doc.text(result.namaResponden, sigX, currentY + 22);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(COLOR_DARK.r, COLOR_DARK.g, COLOR_DARK.b);
  doc.text('Peserta Asesmen', sigX, currentY + 26);

  drawFooter();

  // Save the PDF
  const safeFilename = `Hasiltes_${result.namaResponden.replace(/[^a-zA-Z0-9]/g, '_')}_DASS42.pdf`;
  doc.save(safeFilename);
};

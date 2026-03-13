/**
 * PDF generator for image clips using jsPDF.
 * Generates clean PDFs from OCR-extracted content.
 * Serverless-compatible (no native dependencies).
 *
 * Korean font (NotoSansKR) is fetched from Google Fonts CDN
 * and cached in memory for reuse across invocations.
 */

export interface PdfTable {
  headers: string[];
  rows: string[][];
}

export interface PdfGenerateInput {
  title: string;
  summary: string;
  fullContent: string;
  tables?: PdfTable[];
  sourceImageUrl?: string;
  metadata?: {
    language?: string;
    documentType?: string;
  };
}

const PAGE_WIDTH = 210; // A4 mm
const MARGIN = 20;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const LINE_HEIGHT = 6;

// NotoSansKR Regular & Bold from Google Fonts (stable gstatic URLs)
const FONT_URLS = {
  regular:
    'https://cdn.jsdelivr.net/gh/spoqa/spoqa-han-sans@latest/Subset/SpoqaHanSansNeo/SpoqaHanSansNeo-Regular.ttf',
  bold:
    'https://cdn.jsdelivr.net/gh/spoqa/spoqa-han-sans@latest/Subset/SpoqaHanSansNeo/SpoqaHanSansNeo-Bold.ttf',
};

// Module-level cache — survives across invocations in the same serverless instance
const fontCache: { regular?: string; bold?: string } = {};

async function loadFont(style: 'regular' | 'bold'): Promise<string> {
  if (fontCache[style]) return fontCache[style];

  const res = await fetch(FONT_URLS[style]);
  if (!res.ok) throw new Error(`Failed to fetch ${style} font: ${res.status}`);

  const arrayBuffer = await res.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  fontCache[style] = base64;
  return base64;
}

/**
 * Generate a PDF buffer from parsed image content.
 * Supports Korean text via SpoqaHanSansNeo font.
 */
export async function generatePdf(input: PdfGenerateInput): Promise<Buffer> {
  const { jsPDF } = await import('jspdf');

  // Load Korean fonts in parallel
  const [regularFont, boldFont] = await Promise.all([
    loadFont('regular'),
    loadFont('bold'),
  ]);

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  // Register Korean font
  doc.addFileToVFS('SpoqaHanSansNeo-Regular.ttf', regularFont);
  doc.addFont('SpoqaHanSansNeo-Regular.ttf', 'SpoqaHanSans', 'normal');
  doc.addFileToVFS('SpoqaHanSansNeo-Bold.ttf', boldFont);
  doc.addFont('SpoqaHanSansNeo-Bold.ttf', 'SpoqaHanSans', 'bold');

  const FONT_NAME = 'SpoqaHanSans';

  let y = MARGIN;

  // ─── Helper: add new page if needed ───────────────────────────
  function checkPageBreak(needed: number) {
    if (y + needed > 280) {
      doc.addPage();
      y = MARGIN;
    }
  }

  // ─── Helper: wrap and write text ──────────────────────────────
  function writeText(
    text: string,
    opts: { fontSize?: number; fontStyle?: string; color?: [number, number, number]; indent?: number } = {}
  ) {
    const { fontSize = 10, fontStyle = 'normal', color = [51, 51, 51], indent = 0 } = opts;
    doc.setFontSize(fontSize);
    doc.setFont(FONT_NAME, fontStyle);
    doc.setTextColor(...color);

    const maxWidth = CONTENT_WIDTH - indent;
    const lines = doc.splitTextToSize(text, maxWidth) as string[];

    for (const line of lines) {
      checkPageBreak(LINE_HEIGHT);
      doc.text(line, MARGIN + indent, y);
      y += LINE_HEIGHT;
    }
  }

  // ─── Title ────────────────────────────────────────────────────
  writeText(input.title, { fontSize: 16, fontStyle: 'bold', color: [26, 26, 26] });
  y += 2;

  // ─── Metadata line ────────────────────────────────────────────
  const metaParts: string[] = [];
  if (input.metadata?.documentType) metaParts.push(`Type: ${input.metadata.documentType}`);
  if (input.metadata?.language) metaParts.push(`Language: ${input.metadata.language}`);
  metaParts.push(`Generated: ${new Date().toLocaleDateString()}`);
  writeText(metaParts.join('  |  '), { fontSize: 8, color: [136, 136, 136] });
  y += 4;

  // ─── Summary box ──────────────────────────────────────────────
  if (input.summary) {
    doc.setFillColor(248, 249, 250);
    doc.setDrawColor(224, 224, 224);

    const summaryLines = doc.splitTextToSize(input.summary, CONTENT_WIDTH - 12) as string[];
    const boxHeight = summaryLines.length * LINE_HEIGHT + 12;
    checkPageBreak(boxHeight);

    doc.roundedRect(MARGIN, y, CONTENT_WIDTH, boxHeight, 2, 2, 'FD');

    y += 5;
    writeText('Summary', { fontSize: 10, fontStyle: 'bold', color: [51, 51, 51], indent: 4 });
    for (const line of summaryLines) {
      doc.setFontSize(9);
      doc.setFont(FONT_NAME, 'normal');
      doc.setTextColor(68, 68, 68);
      doc.text(line, MARGIN + 6, y);
      y += LINE_HEIGHT;
    }
    y += 4;
  }

  // ─── Separator ────────────────────────────────────────────────
  doc.setDrawColor(224, 224, 224);
  doc.setLineWidth(0.3);
  checkPageBreak(8);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += 8;

  // ─── Full content ─────────────────────────────────────────────
  if (input.fullContent) {
    const contentLines = input.fullContent.split('\n');
    for (const line of contentLines) {
      if (!line.trim()) {
        y += 3;
        continue;
      }

      // Skip markdown table lines — structured tables section renders them properly
      if (/^\|/.test(line.trim())) continue;
      if (/^[-| :]+$/.test(line.trim())) continue;

      if (line.startsWith('### ')) {
        y += 2;
        writeText(line.replace(/^### /, ''), { fontSize: 11, fontStyle: 'bold', color: [68, 68, 68] });
        y += 1;
      } else if (line.startsWith('## ')) {
        y += 3;
        writeText(line.replace(/^## /, ''), { fontSize: 13, fontStyle: 'bold', color: [51, 51, 51] });
        y += 2;
      } else if (line.startsWith('# ')) {
        y += 4;
        writeText(line.replace(/^# /, ''), { fontSize: 14, fontStyle: 'bold', color: [26, 26, 26] });
        y += 2;
      } else if (/^[-*] /.test(line)) {
        writeText(`\u2022 ${line.replace(/^[-*] /, '')}`, { indent: 6 });
      } else if (/^\d+\. /.test(line)) {
        writeText(line, { indent: 6 });
      } else {
        writeText(line);
      }
    }
  }

  // ─── Tables ───────────────────────────────────────────────────
  if (input.tables && input.tables.length > 0) {
    y += 6;
    for (const table of input.tables) {
      if (table.headers.length === 0) continue;

      const colCount = table.headers.length;
      const colWidth = CONTENT_WIDTH / colCount;
      const cellPadding = 2;

      checkPageBreak(LINE_HEIGHT * 2);

      // Header row
      doc.setFillColor(240, 240, 240);
      doc.rect(MARGIN, y - 1, CONTENT_WIDTH, LINE_HEIGHT + 2, 'F');
      doc.setFontSize(8);
      doc.setFont(FONT_NAME, 'bold');
      doc.setTextColor(51, 51, 51);

      for (let i = 0; i < colCount; i++) {
        const cellText = table.headers[i] ?? '';
        doc.text(cellText, MARGIN + i * colWidth + cellPadding, y + 3, { maxWidth: colWidth - cellPadding * 2 });
      }
      y += LINE_HEIGHT + 2;

      // Data rows
      doc.setFont(FONT_NAME, 'normal');
      doc.setFontSize(8);
      doc.setTextColor(68, 68, 68);

      for (const row of table.rows) {
        checkPageBreak(LINE_HEIGHT + 1);
        doc.setDrawColor(208, 208, 208);
        doc.line(MARGIN, y - 1, PAGE_WIDTH - MARGIN, y - 1);

        for (let i = 0; i < colCount; i++) {
          const cellText = row[i] ?? '';
          doc.text(cellText, MARGIN + i * colWidth + cellPadding, y + 3, { maxWidth: colWidth - cellPadding * 2 });
        }
        y += LINE_HEIGHT + 1;
      }

      // Bottom border
      doc.line(MARGIN, y - 1, PAGE_WIDTH - MARGIN, y - 1);
      y += 6;
    }
  }

  // ─── Footer ───────────────────────────────────────────────────
  if (input.sourceImageUrl) {
    y += 8;
    doc.setDrawColor(224, 224, 224);
    checkPageBreak(12);
    doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
    y += 4;
    writeText(`Source image: ${input.sourceImageUrl}`, { fontSize: 7, color: [153, 153, 153] });
  }

  // ─── Output ───────────────────────────────────────────────────
  return Buffer.from(doc.output('arraybuffer'));
}

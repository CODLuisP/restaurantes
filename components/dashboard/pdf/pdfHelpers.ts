import type { jsPDF } from 'jspdf';
import type { UserOptions } from 'jspdf-autotable';
import { PDF_COLORS, PDF_FONT, PDF_LAYOUT, type RGB } from './pdfTheme';

/** Mismo formato que la pantalla del dashboard ("S/. 1,234.50"). */
export const pdfMoney = (n: number) =>
  `S/. ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const setFill = (doc: jsPDF, c: RGB) => doc.setFillColor(c[0], c[1], c[2]);
export const setDraw = (doc: jsPDF, c: RGB) => doc.setDrawColor(c[0], c[1], c[2]);
export const setText = (doc: jsPDF, c: RGB) => doc.setTextColor(c[0], c[1], c[2]);

export function setFont(doc: jsPDF, size: number, style: 'normal' | 'bold' | 'italic' = 'normal', color: RGB = PDF_COLORS.textPrimary) {
  doc.setFont(PDF_FONT.family, style);
  doc.setFontSize(size);
  setText(doc, color);
}

/** Recorta un texto a una línea con "…" si no entra en el ancho dado. */
export function fitText(doc: jsPDF, text: string, maxW: number): string {
  if (doc.getTextWidth(text) <= maxW) return text;
  let t = text;
  while (t.length > 1 && doc.getTextWidth(`${t}…`) > maxW) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

export const PANEL_BAR_H = 6.5;

/** Barra de título sólida del panel (texto blanco en mayúsculas). Devuelve el y del contenido. */
export function drawPanelBar(doc: jsPDF, x: number, y: number, w: number, title: string, right?: string): number {
  setFill(doc, PDF_COLORS.brand);
  doc.rect(x, y, w, PANEL_BAR_H, 'F');
  setFont(doc, PDF_FONT.panelTitle, 'bold', PDF_COLORS.white);
  doc.text(title.toUpperCase(), x + 2.5, y + 4.4);
  if (right) doc.text(right, x + w - 2.5, y + 4.4, { align: 'right' });
  return y + PANEL_BAR_H;
}

/** Borde del panel — se dibuja al final, cuando ya se conoce el alto del contenido. */
export function drawPanelFrame(doc: jsPDF, x: number, y: number, w: number, h: number) {
  setDraw(doc, PDF_COLORS.border);
  doc.setLineWidth(0.25);
  doc.rect(x, y, w, h, 'S');
}

export interface PdfKpi {
  label: string;
  value: string;
  sub: string;
  sub2?: string;
  color: string;
}

/** KPI en bloque sólido: etiqueta clara, valor grande en blanco y un detalle abajo. */
export function drawKpiTile(doc: jsPDF, x: number, y: number, w: number, h: number, kpi: PdfKpi) {
  setFill(doc, PDF_COLORS.kpiTile);
  doc.rect(x, y, w, h, 'F');

  const px = x + 3;
  const maxW = w - 6;
  setFont(doc, 6.5, 'bold', PDF_COLORS.kpiLabel);
  doc.text(fitText(doc, kpi.label.toUpperCase(), maxW), px, y + 5.2);
  setFont(doc, PDF_FONT.kpiValue, 'bold', PDF_COLORS.white);
  doc.text(fitText(doc, kpi.value, maxW), px, y + h / 2 + 3.2);
  setFont(doc, 6.3, 'normal', PDF_COLORS.kpiLabel);
  doc.text(fitText(doc, kpi.sub2 ?? kpi.sub, maxW), px, y + h - 2.6);
}

/** Dona de porcentajes dibujada con polígonos (jsPDF no trae arcos rellenos). */
export function drawDonut(doc: jsPDF, cx: number, cy: number, rOut: number, rIn: number, parts: { value: number; color: RGB }[]) {
  const total = parts.reduce((a, p) => a + p.value, 0);
  if (total <= 0) {
    setFill(doc, PDF_COLORS.borderSubtle);
    doc.circle(cx, cy, rOut, 'F');
    setFill(doc, PDF_COLORS.white);
    doc.circle(cx, cy, rIn, 'F');
    return;
  }
  let a0 = -Math.PI / 2;
  parts.forEach(p => {
    if (p.value <= 0) return;
    const a1 = a0 + (p.value / total) * Math.PI * 2;
    const steps = Math.max(2, Math.ceil(((a1 - a0) / (Math.PI * 2)) * 72));
    const pts: [number, number][] = [];
    for (let i = 0; i <= steps; i++) {
      const a = a0 + ((a1 - a0) * i) / steps;
      pts.push([cx + rOut * Math.cos(a), cy + rOut * Math.sin(a)]);
    }
    for (let i = steps; i >= 0; i--) {
      const a = a0 + ((a1 - a0) * i) / steps;
      pts.push([cx + rIn * Math.cos(a), cy + rIn * Math.sin(a)]);
    }
    const deltas = pts.slice(1).map((pt, i) => [pt[0] - pts[i][0], pt[1] - pts[i][1]]);
    setFill(doc, p.color);
    setDraw(doc, PDF_COLORS.white);
    doc.setLineWidth(0.4);
    doc.lines(deltas, pts[0][0], pts[0][1], [1, 1], 'FD', true);
    a0 = a1;
  });
}

/** Tablas de panel: ancho completo, cabecera en verde claro y solo líneas horizontales. */
export const panelTable = (): Partial<UserOptions> => ({
  theme: 'plain',
  styles: {
    font: PDF_FONT.family, fontSize: PDF_FONT.body, textColor: PDF_COLORS.textPrimary,
    cellPadding: { top: 1.3, bottom: 1.3, left: 2.5, right: 2.5 },
    lineColor: PDF_COLORS.borderSubtle, lineWidth: { bottom: 0.2 },
    // Una sola línea por celda: los textos largos se cortan con "…" y la fila no crece,
    // así el cálculo de espacio de la hoja siempre cuadra.
    overflow: 'ellipsize',
  },
  headStyles: { fillColor: PDF_COLORS.brandTint, textColor: PDF_COLORS.brandDark, fontStyle: 'bold', fontSize: 7 },
  footStyles: {
    fillColor: PDF_COLORS.brandTint, textColor: PDF_COLORS.brandDark, fontStyle: 'bold',
    lineColor: PDF_COLORS.brand, lineWidth: { top: 0.4 },
  },
});

/** Pie de página en dos columnas: generado por (izquierda) y emitido (derecha). */
export function drawFooters(doc: jsPDF, partes: [[string, string], [string, string]]) {
  const total = doc.getNumberOfPages();
  const { pageWidth, pageHeight, margin } = PDF_LAYOUT;
  const alinear = ['left', 'right'] as const;
  const anclas = [margin, pageWidth - margin];
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    const y = pageHeight - margin;
    setDraw(doc, PDF_COLORS.border);
    doc.setLineWidth(0.3);
    doc.line(margin, y - 4, pageWidth - margin, y - 4);

    partes.forEach(([k, v], idx) => {
      const valor = idx === 1 && total > 1 ? `${v}  ·  Pág. ${i}/${total}` : v;
      setFont(doc, PDF_FONT.small, 'bold');
      const kw = doc.getTextWidth(k);
      setFont(doc, PDF_FONT.small, 'normal');
      const vw = doc.getTextWidth(valor);
      const x = alinear[idx] === 'left' ? anclas[idx] : anclas[idx] - kw - vw;
      setFont(doc, PDF_FONT.small, 'bold', PDF_COLORS.brandDark);
      doc.text(k, x, y);
      setFont(doc, PDF_FONT.small, 'normal', PDF_COLORS.textPrimary);
      doc.text(valor, x + kw, y);
    });
  }
}

import { jsPDF } from 'jspdf';
import autoTable, { type RowInput, type UserOptions } from 'jspdf-autotable';
import type { DashboardResumenDto, VentasResumenDto, VentaPorHoraDto } from '@/lib/api/dashboard';
import type { VentaDto } from '@/lib/api/ventas';
import { formatMetodoPago } from '@/lib/config/metodos';
import { toFechaParam } from '@/lib/api/reportes';
import { codigoVenta } from '@/lib/ventas/codigoVenta';
import { PDF_COLORS, PDF_FONT, PDF_LAYOUT, METODO_COLOR } from './pdfTheme';
import {
  PANEL_BAR_H, drawFooters, drawKpiTile, drawPanelBar, drawPanelFrame, fitText, panelTable,
  pdfMoney, setDraw, setFill, setFont, type PdfKpi,
} from './pdfHelpers';

/**
 * PDF del Resumen Ejecutivo del dashboard, en una sola hoja A4. No consulta nada:
 * recibe lo que la pantalla ya tiene cargado para la fecha elegida y lo dibuja en
 * vectores (texto y formas nítidas al imprimir, no una captura de pantalla).
 *
 * Distribución: encabezado → 8 KPIs → métodos de pago | ingresos por hora →
 * top categorías | top platos → mozos | resumen del día → (demora) → ventas.
 */
export interface DashboardPdfData {
  fecha: Date;
  esHoy: boolean;
  empresa: { razonSocial: string; nombreComercial?: string | null; ruc: string } | null;
  sucursalNombre?: string | null;
  usuario: string;
  kpis: PdfKpi[];
  ventasDia: VentasResumenDto | null;
  metodosPago: { key: string; monto: number; pct: number }[];
  tipComercial: string | null;
  resumen: DashboardResumenDto | null;
  ventasPorHora: VentaPorHoraDto[];
  ventas: VentaDto[];
}

export function dashboardPdfFileName(data: DashboardPdfData) {
  return `Dashboard_${data.empresa?.ruc ?? 'RestoFly'}_${toFechaParam(data.fecha)}.pdf`;
}

const { margin: M, pageWidth: PW, pageHeight: PH, footerHeight: FH, gap: GAP } = PDF_LAYOUT;
const W = PW - M * 2;
const HALF = (W - GAP) / 2;
const BOTTOM = PH - M - FH;
/**
 * Alto de una fila de tabla con `panelTable` (7.5 pt + padding 1.3 mm arriba/abajo).
 * Las celdas se recortan con "…" (`overflow: 'ellipsize'`), así cada fila mide siempre esto.
 */
const ROW_H = 5.7;
/** Máximo de filas por lista cuando sobra espacio (el backend trae top 5 / top 10). */
const MAX_TOP = 10;
/** Mínimo de filas que se conservan en los tops al recortar por espacio. */
const MIN_TOP = 3;
/** Máximo de mesas en "Demora en cocina". */
const MAX_DEMORA = 5;
/** Alto de un panel con tabla de `filas` filas (barra + cabecera + filas + cierre + separación). */
const altoPanel = (filas: number) => PANEL_BAR_H + ROW_H * (filas + 1) + 1.5 + GAP;
/** Lo mínimo que se reserva para el panel de ventas: barra + cabecera + 1 fila + total. */
const VENTAS_MIN_H = PANEL_BAR_H + ROW_H * 3 + 1.5;

/**
 * Reparte las filas de tops, mozos y demora según el espacio que queda en la hoja,
 * reservando siempre lugar para el panel de ventas. Si no alcanza, recorta en este
 * orden: demora en cocina → tops → mozos (y de último, los tops y la demora del todo).
 */
function repartirFilas(disponible: number, pedido: { top: number; mozos: number; resumen: number; demora: number }) {
  let { top, mozos, demora } = pedido;
  const alto = () =>
    altoPanel(top) + altoPanel(Math.max(mozos, pedido.resumen)) + (demora > 0 ? altoPanel(demora) : 0) + VENTAS_MIN_H;
  while (alto() > disponible) {
    if (demora > 1) demora--;
    else if (top > MIN_TOP) top--;
    else if (mozos > Math.max(MIN_TOP, pedido.resumen)) mozos--;
    else if (demora > 0) demora = 0;
    else if (top > 1) top--;
    else if (mozos > pedido.resumen) mozos--;
    else break;
  }
  return { top, mozos, demora };
}

const vacio = (texto: string, colSpan: number): RowInput[] =>
  [[{ content: texto, colSpan, styles: { halign: 'center', textColor: PDF_COLORS.textSecondary, fontStyle: 'italic' } }]];

const lastY = (doc: jsPDF) => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

/** Tabla a todo el ancho del panel, justo debajo de su barra de título. */
const tablaEnPanel = (x: number, w: number, startY: number): Partial<UserOptions> => ({
  ...panelTable(),
  startY,
  margin: { left: x, right: PW - x - w, bottom: M + FH },
  tableWidth: w,
  // La cabecera no hereda la alineación de `columnStyles`: se la copiamos para que
  // "Monto", "Cant.", etc. queden alineados con sus valores.
  didParseCell: cell => {
    if (cell.section !== 'head') return;
    const colStyles = (cell.table as unknown as { styles: { columnStyles: Record<string, { halign?: 'left' | 'center' | 'right' }> } }).styles.columnStyles;
    const halign = colStyles[cell.column.dataKey]?.halign ?? colStyles[cell.column.index]?.halign;
    if (halign) cell.cell.styles.halign = halign;
  },
});

/** Alto fijo de la fila de gráficos: el espacio libre queda al final para que crezcan las tablas. */
const GRAFICOS_H = 46;

export function buildDashboardPdf(data: DashboardPdfData): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const periodo = data.esHoy ? 'hoy' : 'ese día';

  let y = drawHeader(doc, data);

  // ── 1. KPIs (4 × 2) ──
  const v = data.ventasDia;
  const tiles: PdfKpi[] = [
    ...data.kpis,
    { label: 'Ticket Promedio', value: pdfMoney(v?.ticketPromedio ?? 0), sub: `${v?.cantidadVentas ?? 0} ventas cobradas ${periodo}`, color: '' },
  ].slice(0, 8);
  const tg = 2.5;
  const tileW = (W - tg * 3) / 4;
  const tileH = 19;
  tiles.forEach((k, i) => drawKpiTile(doc, M + (i % 4) * (tileW + tg), y + Math.floor(i / 4) * (tileH + tg), tileW, tileH, k));
  y += tileH * 2 + tg + GAP + 1;

  // ── 2. Métodos de pago | Ingresos por hora ──
  // Métodos de pago 30 % | ingresos por hora 70 % (caben ~12 horas de atención).
  const mpW = (W - GAP) * 0.3;
  const chX = M + mpW + GAP;
  const chW = W - mpW - GAP;
  drawMetodosPago(doc, M, y, mpW, GRAFICOS_H, data, periodo);
  const totalHoras = data.ventasPorHora.reduce((a, d) => a + d.monto, 0);
  const chY = drawPanelBar(doc, chX, y, chW, `Ingresos por hora ${periodo}`, `Total ${pdfMoney(totalHoras)}`);
  drawRevenueChart(doc, chX, chY, chW, y + GRAFICOS_H - chY, data.ventasPorHora);
  drawPanelFrame(doc, chX, y, chW, GRAFICOS_H);
  y += GRAFICOS_H + GAP;

  // Filas de cada lista según el espacio que queda (siempre en una sola hoja).
  const todosCats = data.resumen?.topCategoriasHoy ?? [];
  const todosPlatos = data.resumen?.topProductosHoy ?? [];
  const todosMozos = data.resumen?.rendimientoPorMozo ?? [];
  const todasDemoras = data.esHoy ? data.resumen?.pedidosDemoradosEnCocina ?? [] : [];
  const resumenFilas = resumenDelDia(v);
  const filas = repartirFilas(BOTTOM - y, {
    top: Math.min(MAX_TOP, Math.max(1, todosCats.length, todosPlatos.length)),
    mozos: Math.min(MAX_TOP, Math.max(1, todosMozos.length)),
    resumen: resumenFilas.length,
    demora: Math.min(MAX_DEMORA, todasDemoras.length),
  });

  // ── 3. Top categorías | Top platos ──
  const xDer = M + HALF + GAP;
  const cats = todosCats.slice(0, filas.top);
  const platos = todosPlatos.slice(0, filas.top);
  y = filaDePaneles(doc, y, [
    startY => autoTable(doc, {
      ...tablaEnPanel(M, HALF, startY),
      head: [['#', 'Categoría', 'Monto']],
      body: cats.length ? cats.map((c, i) => [String(i + 1), c.nombre, pdfMoney(c.totalVendido)]) : vacio(`Sin ventas ${periodo}.`, 3),
      columnStyles: { 0: { cellWidth: 9, textColor: PDF_COLORS.textSecondary }, 2: { halign: 'right', cellWidth: 28 } },
    }),
    startY => autoTable(doc, {
      ...tablaEnPanel(xDer, HALF, startY),
      head: [['#', 'Plato', 'Cant.', 'Monto']],
      body: platos.length
        ? platos.map((p, i) => [String(i + 1), p.nombre, String(p.cantidadVendida), pdfMoney(p.totalVendido)])
        : vacio(`Sin ventas ${periodo}.`, 4),
      columnStyles: { 0: { cellWidth: 9, textColor: PDF_COLORS.textSecondary }, 2: { halign: 'center', cellWidth: 14 }, 3: { halign: 'right', cellWidth: 28 } },
    }),
  ], ['Top categorías del día', 'Platos más vendidos']);

  // ── 4. Rendimiento por mozo | Resumen del día ──
  const mozos = todosMozos.slice(0, filas.mozos);
  y = filaDePaneles(doc, y, [
    startY => autoTable(doc, {
      ...tablaEnPanel(M, HALF, startY),
      head: [['#', 'Mozo', 'Mesas', 'Ventas']],
      body: mozos.length
        ? mozos.map((m, i) => [String(i + 1), m.nombre, String(m.cantidadSesiones), pdfMoney(m.totalVentas)])
        : vacio(`Sin datos de mozos ${periodo}.`, 4),
      columnStyles: { 0: { cellWidth: 9, textColor: PDF_COLORS.textSecondary }, 2: { halign: 'center', cellWidth: 14 }, 3: { halign: 'right', cellWidth: 28 } },
    }),
    startY => autoTable(doc, {
      ...tablaEnPanel(xDer, HALF, startY),
      head: [['Concepto', 'Monto']],
      body: resumenFilas,
      columnStyles: { 1: { halign: 'right', cellWidth: 34 } },
    }),
  ], ['Rendimiento por mozo', 'Resumen del día']);

  // ── 5. Demora en cocina (solo en tiempo real) ──
  const demoras = todasDemoras.slice(0, filas.demora);
  if (demoras.length > 0) {
    y = filaDePaneles(doc, y, [
      startY => autoTable(doc, {
        ...tablaEnPanel(M, W, startY),
        head: [['Mesa', 'Pedidos activos', 'Tiempo de espera']],
        body: demoras.map(d => [d.mesa, String(d.cantidadPedidos), formatEspera(d.segundosEspera)]),
        columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right', fontStyle: 'bold' } },
      }),
    ], ['Demora en cocina (al generar el reporte)'], true);
  }

  // ── 6. Ventas del día: se listan las que entran en el espacio restante ──
  drawVentasPanel(doc, y, data, periodo);

  drawFooters(doc, [
    ['Generado por: ', data.usuario],
    ['Emitido: ', new Date().toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })],
  ]);
  return doc;
}

/**
 * Dibuja 1 o 2 paneles lado a lado (barra de título + tabla) y les da el mismo alto.
 * Devuelve el y libre debajo de la fila.
 */
function filaDePaneles(doc: jsPDF, y: number, tablas: ((startY: number) => void)[], titulos: string[], anchoCompleto = false): number {
  const xs = anchoCompleto ? [M] : [M, M + HALF + GAP];
  const w = anchoCompleto ? W : HALF;
  const fines = tablas.map((dibujar, i) => {
    dibujar(drawPanelBar(doc, xs[i], y, w, titulos[i]));
    return lastY(doc);
  });
  const h = Math.max(...fines) + 1.5 - y;
  xs.slice(0, tablas.length).forEach(x => drawPanelFrame(doc, x, y, w, h));
  return y + h + GAP;
}

function resumenDelDia(v: VentasResumenDto | null): RowInput[] {
  if (!v) return vacio('Sin datos.', 2);
  const filas: RowInput[] = [['Ventas brutas', pdfMoney(v.totalVentas)]];
  if (v.ncPeriodo > 0) filas.push(['(-) Notas de crédito del día', { content: pdfMoney(v.ncPeriodo), styles: { textColor: PDF_COLORS.danger } }]);
  if (v.ndPeriodo > 0) filas.push(['(+) Notas de débito del día', pdfMoney(v.ndPeriodo)]);
  if (v.ncAnteriores > 0) filas.push(['NC sobre ventas de otros días', pdfMoney(v.ncAnteriores)]);
  if (v.ndAnteriores > 0) filas.push(['ND sobre ventas de otros días', pdfMoney(v.ndAnteriores)]);
  filas.push(['Nº de ventas cobradas', String(v.cantidadVentas)]);
  filas.push([
    { content: 'VENTAS NETAS', styles: { fontStyle: 'bold', textColor: PDF_COLORS.brandDark, fillColor: PDF_COLORS.brandTint } },
    { content: pdfMoney(v.ventasNetas), styles: { fontStyle: 'bold', textColor: PDF_COLORS.brandDark, fillColor: PDF_COLORS.brandTint } },
  ]);
  return filas;
}

/** Franja verde de marca a todo el ancho: título a la izquierda, empresa a la derecha. */
function drawHeader(doc: jsPDF, data: DashboardPdfData): number {
  setFill(doc, PDF_COLORS.brand);
  doc.rect(0, 0, PW, 28, 'F');
  setFill(doc, PDF_COLORS.brandAccent);
  doc.rect(0, 28, PW, 1, 'F');

  setFont(doc, 18, 'bold', PDF_COLORS.white);
  doc.text('RestoFly', M, 12);
  setFont(doc, 10, 'bold', PDF_COLORS.white);
  doc.text('Resumen Ejecutivo de Ventas', M, 18.5);
  setFont(doc, 7.5, 'normal', PDF_COLORS.brandTint);
  doc.text('Monitoreo de operaciones gastronómicas', M, 23);

  // Fecha seleccionada del reporte, pequeña y al centro de la última fila de la franja.
  const fechaTxt = data.fecha.toLocaleDateString('es-PE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  setFont(doc, 7.5, 'bold', PDF_COLORS.white);
  doc.text(fechaTxt.charAt(0).toUpperCase() + fechaTxt.slice(1), PW / 2, 22.5, { align: 'center' });

  const xR = PW - M;
  setFont(doc, 9.5, 'bold', PDF_COLORS.white);
  doc.text(fitText(doc, data.empresa?.razonSocial ?? '—', 95), xR, 11, { align: 'right' });
  setFont(doc, 8, 'normal', PDF_COLORS.white);
  if (data.empresa?.ruc) doc.text(`RUC ${data.empresa.ruc}`, xR, 16.5, { align: 'right' });
  if (data.sucursalNombre) doc.text(`Sucursal: ${data.sucursalNombre}`, xR, 21.5, { align: 'right' });
  return 33;
}

/**
 * Panel de métodos de pago (alto fijo, 30 % del ancho): una fila por método con su
 * color, nombre, monto y porcentaje; debajo el tip del método que lidera y el total al pie.
 */
function drawMetodosPago(doc: jsPDF, x: number, y: number, w: number, h: number, data: DashboardPdfData, periodo: string) {
  const top = drawPanelBar(doc, x, y, w, 'Métodos de pago');
  drawPanelFrame(doc, x, y, w, h);
  const px = x + 3;
  const iw = w - 6;
  const partes = data.metodosPago.map(m => ({ ...m, color: METODO_COLOR[m.key] ?? PDF_COLORS.otro }));
  const total = partes.reduce((a, p) => a + p.monto, 0);

  if (partes.length === 0) {
    setFont(doc, PDF_FONT.body, 'italic', PDF_COLORS.textSecondary);
    doc.text(`Sin ventas ${periodo}.`, x + w / 2, top + (y + h - top) / 2, { align: 'center' });
    return;
  }

  let cy = top + 5.5;
  partes.slice(0, 5).forEach(p => {
    setFill(doc, p.color);
    doc.rect(px, cy - 2.3, 2.6, 2.6, 'F');
    setFont(doc, PDF_FONT.body, 'bold');
    doc.text(formatMetodoPago(p.key), px + 4, cy);
    setFont(doc, PDF_FONT.body, 'normal', PDF_COLORS.textSecondary);
    doc.text(pdfMoney(p.monto), px + iw - 11, cy, { align: 'right' });
    setFont(doc, PDF_FONT.body, 'bold', PDF_COLORS.brandDark);
    doc.text(`${p.pct}%`, px + iw, cy, { align: 'right' });
    setDraw(doc, PDF_COLORS.borderSubtle);
    doc.setLineWidth(0.2);
    doc.line(px, cy + 1.7, px + iw, cy + 1.7);
    cy += 5.6;
  });

  // Método que lidera (tip comercial) — con 5 métodos no hay espacio y se omite.
  if (data.tipComercial && partes.length <= 4) {
    setFont(doc, 6.5, 'italic', PDF_COLORS.textSecondary);
    const lines = (doc.splitTextToSize(data.tipComercial, iw) as string[]).slice(0, 2);
    doc.text(lines, px, cy + 0.8);
  }

  // Total al pie del panel
  const fy = y + h - 3;
  setDraw(doc, PDF_COLORS.border);
  doc.setLineWidth(0.3);
  doc.line(px, fy - 4, px + iw, fy - 4);
  setFont(doc, 6.8, 'bold', PDF_COLORS.textSecondary);
  doc.text('TOTAL', px, fy);
  setFont(doc, PDF_FONT.body, 'bold', PDF_COLORS.brandDark);
  doc.text(pdfMoney(total), px + iw, fy, { align: 'right' });
}

/** Tope "redondo" del eje Y, divisible en 4 marcas limpias (200 → 0/50/100/150/200). */
const Y_TICKS = 4;
function niceMax(v: number) {
  if (v <= 0) return 40;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / exp;
  const step = [1, 1.2, 1.6, 2, 2.4, 3, 4, 5, 6, 8, 10].find(s => n <= s) ?? 10;
  return step * exp;
}

/**
 * Ingresos por hora (alto fijo): barras finas y claras de fondo y, encima, una línea
 * que une el monto de cada hora para ver la tendencia del día (sube / baja). El monto
 * va sobre cada punto y la hora pico se marca en verde oscuro.
 */
function drawRevenueChart(doc: jsPDF, x: number, y: number, w: number, h: number, datos: VentaPorHoraDto[]) {
  const conMonto = datos.filter(d => d.monto > 0);
  if (conMonto.length === 0) {
    setFont(doc, PDF_FONT.body, 'italic', PDF_COLORS.textSecondary);
    doc.text('Sin ingresos registrados.', x + w / 2, y + h / 2, { align: 'center' });
    return;
  }

  // Horas: de la primera a la última con ventas, completando al menos 8 columnas.
  let hMin = Math.min(...conMonto.map(d => d.hora));
  let hMax = Math.max(...conMonto.map(d => d.hora));
  while (hMax - hMin < 7 && (hMin > 0 || hMax < 23)) {
    if (hMin > 0) hMin--;
    if (hMax - hMin < 7 && hMax < 23) hMax++;
  }
  const porHora = new Map(datos.map(d => [d.hora, d]));
  const serie = Array.from({ length: hMax - hMin + 1 }, (_, i) => {
    const hora = hMin + i;
    return { hora, monto: porHora.get(hora)?.monto ?? 0 };
  });
  const pico = conMonto.reduce((a, d) => (d.monto > a.monto ? d : a));
  const yMax = niceMax(pico.monto * 1.1);
  const hh = (hora: number) => `${String(hora).padStart(2, '0')}:00`;

  // Hora pico, arriba a la izquierda
  setFill(doc, PDF_COLORS.brandDark);
  doc.circle(x + 4.3, y + 3.7, 1.1, 'F');
  setFont(doc, 6.5, 'bold', PDF_COLORS.brandDark);
  doc.text('Hora pico:', x + 6.5, y + 4.7);
  const kw = doc.getTextWidth('Hora pico: ');
  setFont(doc, 6.5, 'normal', PDF_COLORS.textPrimary);
  doc.text(`${hh(pico.hora)} · ${pdfMoney(pico.monto)} · ${pico.cantidad} venta${pico.cantidad === 1 ? '' : 's'}`, x + 6.5 + kw, y + 4.7);

  const ax = x + 14;
  const ay = y + 9.5;
  const aw = w - 14 - 4;
  const ah = h - 9.5 - 6;
  const toY = (val: number) => ay + ah - (val / yMax) * ah;

  for (let i = 0; i <= Y_TICKS; i++) {
    const val = (yMax / Y_TICKS) * i;
    const gy = toY(val);
    setDraw(doc, i === 0 ? PDF_COLORS.border : PDF_COLORS.borderSubtle);
    doc.setLineWidth(i === 0 ? 0.3 : 0.15);
    doc.line(ax, gy, ax + aw, gy);
    setFont(doc, 6, 'normal', PDF_COLORS.textSecondary);
    doc.text(Math.round(val).toLocaleString('es-PE'), ax - 1.5, gy + 0.9, { align: 'right' });
  }

  const slot = aw / serie.length;
  const barW = Math.min(slot * 0.35, 5);
  const px = (i: number) => ax + slot * (i + 0.5);
  const conEtiquetas = serie.length <= 14;

  // Barras finas de fondo
  serie.forEach((p, i) => {
    if (p.monto > 0) {
      const top = toY(p.monto);
      setFill(doc, PDF_COLORS.brandTint);
      setDraw(doc, PDF_COLORS.brandTintBorder);
      doc.setLineWidth(0.2);
      doc.rect(px(i) - barW / 2, top, barW, ay + ah - top, 'FD');
    }
    if (conEtiquetas || i % 2 === 0) {
      setFont(doc, 6, 'normal', PDF_COLORS.textSecondary);
      doc.text(hh(p.hora), px(i), ay + ah + 3.6, { align: 'center' });
    }
  });

  // Línea de tendencia hora a hora
  setDraw(doc, PDF_COLORS.brand);
  doc.setLineWidth(0.6);
  for (let i = 1; i < serie.length; i++) {
    doc.line(px(i - 1), toY(serie[i - 1].monto), px(i), toY(serie[i].monto));
  }
  serie.forEach((p, i) => {
    if (p.monto <= 0) return;
    const esPico = p.hora === pico.hora;
    setFill(doc, esPico ? PDF_COLORS.brandDark : PDF_COLORS.white);
    setDraw(doc, esPico ? PDF_COLORS.brandDark : PDF_COLORS.brand);
    doc.setLineWidth(0.45);
    doc.circle(px(i), toY(p.monto), esPico ? 1.1 : 0.9, 'FD');
    if (conEtiquetas) {
      setFont(doc, 6, 'bold', PDF_COLORS.brandDark);
      doc.text(Math.round(p.monto).toLocaleString('es-PE'), px(i), toY(p.monto) - 1.8, { align: 'center' });
    }
  });
}

/** Tabla de ventas: lista las que caben antes del pie y resume el resto en una fila. */
function drawVentasPanel(doc: jsPDF, y: number, data: DashboardPdfData, periodo: string) {
  const n = data.ventas.length;
  const totalVentas = data.ventas.reduce((a, v) => a + v.total, 0);
  const totalItems = data.ventas.reduce((a, v) => a + v.items.reduce((s, i) => s + i.cantidad, 0), 0);
  const startY = drawPanelBar(doc, M, y, W, `Ventas registradas (POS) · ${n} venta${n === 1 ? '' : 's'} ${periodo}`, `Total ${pdfMoney(totalVentas)}`);

  // Filas que caben antes del pie: se descuentan cabecera y total.
  const filas = Math.max(1, Math.floor((BOTTOM - 2 - startY) / ROW_H) - 2);
  const recortar = n > filas;
  const visibles = recortar ? data.ventas.slice(0, filas - 1) : data.ventas;

  const body: RowInput[] = visibles.map(v => [
    codigoVenta(v),
    new Date(v.pagadoAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
    v.mesaNumero ? `Mesa ${v.mesaNumero}` : '—',
    v.numeroComprobante ?? '—',
    String(v.items.reduce((a, i) => a + i.cantidad, 0)),
    formatMetodoPago(v.metodoPago),
    pdfMoney(v.total),
  ]);
  if (recortar) {
    body.push([{
      content: `… y ${n - visibles.length} ventas más, incluidas en el total. Detalle completo en "Exportar (.XLSX)".`,
      colSpan: 7, styles: { halign: 'center', fontStyle: 'italic', textColor: PDF_COLORS.textSecondary },
    }]);
  }

  autoTable(doc, {
    ...tablaEnPanel(M, W, startY),
    head: [['Código', 'Hora', 'Mesa', 'Comprobante', 'Ítems', 'Método de pago', 'Monto']],
    body: n ? body : vacio(`Todavía no hay ventas cobradas ${periodo}.`, 7),
    foot: n
      ? [[{ content: 'TOTAL', colSpan: 4 }, { content: String(totalItems), styles: { halign: 'center' } }, '', { content: pdfMoney(totalVentas), styles: { halign: 'right' } }]]
      : undefined,
    showFoot: 'lastPage',
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 18 },
      1: { cellWidth: 20 },
      2: { cellWidth: 20 },
      4: { halign: 'center', cellWidth: 14 },
      6: { halign: 'right', fontStyle: 'bold', cellWidth: 28 },
    },
  });
  drawPanelFrame(doc, M, y, W, lastY(doc) + 1.5 - y);
}

function formatEspera(seg: number) {
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return `${m} min ${String(s).padStart(2, '0')} s`;
}

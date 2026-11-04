import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { montoEnLetras } from './montoEnLetras';
import { formatMetodoPago } from '@/lib/config/metodos';

/**
 * PDF de la nota de venta (ticket interno, sin SUNAT). El OSE solo genera PDF de boletas y
 * facturas, así que este se arma en el navegador con la misma estructura que esas: cabecera
 * del negocio + recuadro con RUC/tipo/número, datos del cliente, detalle, importe en letras y
 * totales — pero sin QR ni hash, porque no es un comprobante electrónico.
 *
 * Tamaños: los mismos del selector "Tamaño" de Comprobantes (A4, A5, Ticket 80mm, Ticket 58mm).
 */

export type FormatoNotaVenta = 'A4' | 'A5' | 'Ticket 80mm' | 'Ticket 58mm';

export interface NotaVentaPdfData {
  negocio: { nombre: string; ruc?: string; direccion?: string; logoUrl?: string };
  numero: string;
  /** Fecha en ISO (pagadoAt). */
  fecha: string;
  cliente: { tipoDoc?: string | null; numDoc?: string | null; nombre?: string | null };
  metodoPago: string;
  numeroOperacion?: string | null;
  entidadBancaria?: string | null;
  items: { nombre: string; cantidad: number; precio: number }[];
  subtotal: number;
  igv: number;
  igvPorcentaje: number;
  total: number;
}

type RGB = [number, number, number];
const BRAND: RGB = [0, 117, 66];
const TEXT: RGB = [30, 41, 59];
const MUTED: RGB = [71, 85, 105];
const BORDER: RGB = [203, 213, 225];
const TINT: RGB = [241, 245, 249];

const LEYENDA = 'Nota de venta interna. No es un comprobante de pago electrónico.';
const money = (n: number) => `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const num = (n: number) => n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function font(doc: jsPDF, size: number, style: 'normal' | 'bold' = 'normal', color: RGB = TEXT) {
  doc.setFont('helvetica', style);
  doc.setFontSize(size);
  doc.setTextColor(color[0], color[1], color[2]);
}

function tipoDocLabel(tipo?: string | null) {
  const t = (tipo ?? '').toLowerCase();
  if (t === 'ruc') return 'RUC';
  if (t === 'ce') return 'C.E.';
  return 'DNI';
}

function fechaHora(iso: string) {
  const d = new Date(iso);
  return {
    fecha: d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    hora: d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
  };
}

/** Carga el logo como PNG vía canvas (sirve para cualquier formato, incluido webp). Si tarda o
 *  el servidor no permite CORS, el PDF sale sin logo en vez de fallar o quedarse esperando. */
function cargarLogo(url?: string): Promise<{ data: string; ratio: number } | null> {
  if (!url || typeof window === 'undefined') return Promise.resolve(null);
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const timer = setTimeout(() => resolve(null), 2000);
    img.onload = () => {
      clearTimeout(timer);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d')?.drawImage(img, 0, 0);
        resolve({ data: canvas.toDataURL('image/png'), ratio: img.naturalWidth / img.naturalHeight });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => { clearTimeout(timer); resolve(null); };
    img.src = url;
  });
}

// ── A4 / A5 ──────────────────────────────────────────────────────────────

function renderDocumento(doc: jsPDF, d: NotaVentaPdfData, logo: { data: string; ratio: number } | null) {
  const PW = doc.internal.pageSize.getWidth();
  const PH = doc.internal.pageSize.getHeight();
  /** Escala respecto de A4: en A5 todo se reduce en la misma proporción. */
  const s = PW / 210;
  const M = 12 * s;
  const W = PW - M * 2;
  const { fecha, hora } = fechaHora(d.fecha);

  // ── Cabecera: negocio a la izquierda, recuadro RUC/tipo/número a la derecha ──
  const boxW = 66 * s;
  const boxH = 28 * s;
  const boxX = PW - M - boxW;
  let x = M;
  if (logo) {
    const h = 22 * s;
    const w = Math.min(h * logo.ratio, 40 * s);
    doc.addImage(logo.data, 'PNG', M, M + (boxH - h) / 2, w, w / logo.ratio);
    x = M + w + 4 * s;
  }
  const infoW = boxX - x - 4 * s;
  font(doc, 12 * s, 'bold', BRAND);
  const nombreLineas = doc.splitTextToSize(d.negocio.nombre.toUpperCase(), infoW).slice(0, 2);
  doc.text(nombreLineas, x, M + 6 * s);
  let yInfo = M + 6 * s + nombreLineas.length * 5 * s;
  if (d.negocio.direccion) {
    font(doc, 8 * s, 'normal', MUTED);
    const dir = doc.splitTextToSize(d.negocio.direccion, infoW).slice(0, 3);
    doc.text(dir, x, yInfo);
    yInfo += dir.length * 3.6 * s;
  }

  doc.setDrawColor(BRAND[0], BRAND[1], BRAND[2]);
  doc.setLineWidth(0.6 * s);
  doc.roundedRect(boxX, M, boxW, boxH, 2 * s, 2 * s);
  const cx = boxX + boxW / 2;
  font(doc, 10 * s, 'bold');
  doc.text(`R.U.C. ${d.negocio.ruc ?? '-'}`, cx, M + 8 * s, { align: 'center' });
  doc.setFillColor(BRAND[0], BRAND[1], BRAND[2]);
  doc.rect(boxX, M + 11 * s, boxW, 7 * s, 'F');
  font(doc, 10 * s, 'bold', [255, 255, 255]);
  doc.text('NOTA DE VENTA', cx, M + 15.8 * s, { align: 'center' });
  font(doc, 11 * s, 'bold');
  doc.text(d.numero, cx, M + 24.5 * s, { align: 'center' });

  // ── Datos del cliente y de la venta ──
  let y = Math.max(M + boxH, yInfo) + 6 * s;
  const filas: [string, string, string, string][] = [
    ['Señor(es):', d.cliente.nombre || 'Clientes Varios', 'Fecha de emisión:', fecha],
    [`${tipoDocLabel(d.cliente.tipoDoc)}:`, d.cliente.numDoc || '-', 'Hora:', hora],
    ['Moneda:', 'Soles (PEN)', 'Forma de pago:', `Contado (${formatMetodoPago(d.metodoPago)})`],
  ];
  if (d.numeroOperacion) {
    filas.push(['N° operación:', `${d.numeroOperacion}${d.entidadBancaria ? ` — ${d.entidadBancaria}` : ''}`, '', '']);
  }
  const filaH = 5.5 * s;
  const cliH = filas.length * filaH + 3 * s;
  doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
  doc.setLineWidth(0.3 * s);
  doc.roundedRect(M, y, W, cliH, 1.5 * s, 1.5 * s);
  const col2 = M + W * 0.58;
  filas.forEach(([l1, v1, l2, v2], i) => {
    const fy = y + 5.5 * s + i * filaH;
    font(doc, 8 * s, 'bold', MUTED);
    doc.text(l1, M + 3 * s, fy);
    if (l2) doc.text(l2, col2, fy);
    font(doc, 8 * s, 'normal');
    doc.text(doc.splitTextToSize(v1, col2 - M - 30 * s)[0] ?? '', M + 27 * s, fy);
    if (v2) doc.text(v2, PW - M - 3 * s, fy, { align: 'right' });
  });
  y += cliH + 5 * s;

  // ── Detalle ──
  const igvFactor = 1 + d.igvPorcentaje / 100;
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [['Cant.', 'Unidad', 'Descripción', 'Valor Unit.', 'P. Unit.', 'Importe']],
    body: d.items.map(i => [
      String(i.cantidad), 'UNIDAD', i.nombre.toUpperCase(),
      num(i.precio / igvFactor), num(i.precio), num(i.precio * i.cantidad),
    ]),
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 8 * s, cellPadding: 1.8 * s, textColor: TEXT, lineColor: BORDER, lineWidth: 0.2 * s },
    headStyles: { fillColor: BRAND, textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
    columnStyles: {
      0: { halign: 'center', cellWidth: 14 * s },
      1: { halign: 'center', cellWidth: 18 * s },
      3: { halign: 'right', cellWidth: 22 * s },
      4: { halign: 'right', cellWidth: 22 * s },
      5: { halign: 'right', cellWidth: 24 * s },
    },
  });
  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  // ── Importe en letras ──
  doc.setFillColor(TINT[0], TINT[1], TINT[2]);
  doc.rect(M, y, W, 7 * s, 'F');
  font(doc, 8 * s, 'bold');
  doc.text(`SON: ${montoEnLetras(d.total)}`, M + 3 * s, y + 4.7 * s);
  y += 12 * s;

  // ── Totales (derecha) y leyenda (izquierda) ──
  if (y + 30 * s > PH - M) { doc.addPage(); y = M; }
  const totX = PW - M - 70 * s;
  const totales: [string, string][] = [
    ['Op. Gravada:', money(d.subtotal)],
    [`I.G.V. (${d.igvPorcentaje}%):`, money(d.igv)],
  ];
  totales.forEach(([l, v], i) => {
    font(doc, 8.5 * s, 'normal', MUTED);
    doc.text(l, totX + 3 * s, y + i * 5.5 * s);
    font(doc, 8.5 * s, 'normal');
    doc.text(v, PW - M - 3 * s, y + i * 5.5 * s, { align: 'right' });
  });
  const ty = y + totales.length * 5.5 * s - 1 * s;
  doc.setFillColor(BRAND[0], BRAND[1], BRAND[2]);
  doc.rect(totX, ty, 70 * s, 8 * s, 'F');
  font(doc, 10 * s, 'bold', [255, 255, 255]);
  doc.text('Importe Total:', totX + 3 * s, ty + 5.4 * s);
  doc.text(money(d.total), PW - M - 3 * s, ty + 5.4 * s, { align: 'right' });

  font(doc, 7.5 * s, 'normal', MUTED);
  doc.text(doc.splitTextToSize(LEYENDA, totX - M - 8 * s), M, y);
}

// ── Ticket 80mm / 58mm ───────────────────────────────────────────────────

/** Dibuja el ticket y devuelve hasta dónde llegó, para recortar la página a ese alto exacto. */
function renderTicket(doc: jsPDF, d: NotaVentaPdfData, ancho: number, logo: { data: string; ratio: number } | null): number {
  const angosto = ancho < 70;
  const M = angosto ? 3 : 4;
  const W = ancho - M * 2;
  const cx = ancho / 2;
  const f = angosto ? 0.85 : 1;
  const { fecha, hora } = fechaHora(d.fecha);
  let y = M + 2;

  const linea = () => {
    doc.setLineDashPattern([0.8, 0.8], 0);
    doc.setDrawColor(MUTED[0], MUTED[1], MUTED[2]);
    doc.setLineWidth(0.2);
    doc.line(M, y, ancho - M, y);
    doc.setLineDashPattern([], 0);
    y += 3.5;
  };
  const centrado = (texto: string, size: number, style: 'normal' | 'bold' = 'normal') => {
    font(doc, size * f, style);
    const lineas = doc.splitTextToSize(texto, W);
    doc.text(lineas, cx, y, { align: 'center' });
    y += lineas.length * size * f * 0.42;
  };
  const par = (l: string, v: string, size = 7.5, style: 'normal' | 'bold' = 'normal') => {
    font(doc, size * f, style);
    doc.text(l, M, y);
    doc.text(v, ancho - M, y, { align: 'right' });
    y += size * f * 0.45;
  };

  if (logo) {
    const h = angosto ? 14 : 18;
    const w = Math.min(h * logo.ratio, W * 0.6);
    doc.addImage(logo.data, 'PNG', cx - w / 2, y - 1, w, w / logo.ratio);
    y += w / logo.ratio + 3;
  }
  centrado(d.negocio.nombre.toUpperCase(), 9, 'bold');
  if (d.negocio.ruc) centrado(`R.U.C.: ${d.negocio.ruc}`, 7.5);
  if (d.negocio.direccion) centrado(d.negocio.direccion, 7);
  y += 1;
  linea();
  centrado('NOTA DE VENTA', 9, 'bold');
  centrado(d.numero, 9, 'bold');
  y += 0.5;
  linea();

  font(doc, 7.5 * f);
  const datos = [
    `FECHA: ${fecha}  HORA: ${hora}`,
    `CLIENTE: ${d.cliente.nombre || 'Clientes Varios'}`,
    `${tipoDocLabel(d.cliente.tipoDoc)}: ${d.cliente.numDoc || '-'}`,
    `PAGO: ${formatMetodoPago(d.metodoPago)}`,
  ];
  if (d.numeroOperacion) datos.push(`OPERACIÓN: ${d.numeroOperacion}${d.entidadBancaria ? ` — ${d.entidadBancaria}` : ''}`);
  for (const t of datos) {
    const lineas = doc.splitTextToSize(t, W);
    doc.text(lineas, M, y);
    y += lineas.length * 7.5 * f * 0.42;
  }
  y += 0.5;
  linea();

  // Detalle: descripción en su propia línea y debajo "cant x p.u. ... importe" — así entra
  // completo incluso en 58mm sin recortar nombres de platos.
  par('DESCRIPCIÓN', 'IMPORTE', 7, 'bold');
  y += 0.5;
  for (const i of d.items) {
    font(doc, 7.5 * f, 'bold');
    const lineas = doc.splitTextToSize(i.nombre.toUpperCase(), W);
    doc.text(lineas, M, y);
    y += lineas.length * 7.5 * f * 0.42;
    par(`  ${i.cantidad} x ${num(i.precio)}`, num(i.precio * i.cantidad));
    y += 0.6;
  }
  linea();

  par('OP. GRAVADA:', money(d.subtotal));
  par(`I.G.V. (${d.igvPorcentaje}%):`, money(d.igv));
  y += 0.5;
  par('TOTAL:', money(d.total), 9.5, 'bold');
  y += 1;
  font(doc, 7 * f);
  const son = doc.splitTextToSize(`SON: ${montoEnLetras(d.total)}`, W);
  doc.text(son, M, y);
  y += son.length * 7 * f * 0.42 + 1;
  linea();
  centrado(LEYENDA, 6.5);
  centrado('¡Gracias por su preferencia!', 7.5, 'bold');
  return y + M;
}

// ── API pública ──────────────────────────────────────────────────────────

export async function generarNotaVentaPdf(d: NotaVentaPdfData, formato: FormatoNotaVenta): Promise<Blob> {
  const logo = await cargarLogo(d.negocio.logoUrl);

  if (formato === 'Ticket 80mm' || formato === 'Ticket 58mm') {
    const ancho = formato === 'Ticket 58mm' ? 58 : 80;
    // Primera pasada en una hoja larga solo para medir; luego se dibuja en una de alto exacto.
    const alto = renderTicket(new jsPDF({ unit: 'mm', format: [ancho, 2000] }), d, ancho, logo);
    const doc = new jsPDF({ unit: 'mm', format: [ancho, Math.max(alto, 60)] });
    renderTicket(doc, d, ancho, logo);
    return doc.output('blob');
  }

  const doc = new jsPDF({ unit: 'mm', format: formato === 'A5' ? 'a5' : 'a4' });
  renderDocumento(doc, d, logo);
  return doc.output('blob');
}

/** Genera el PDF y lo abre en una pestaña nueva — mismo comportamiento que el PDF de boletas/facturas. */
export async function abrirNotaVentaPdf(d: NotaVentaPdfData, formato: FormatoNotaVenta) {
  const blob = await generarNotaVentaPdf(d, formato);
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

import ExcelJS from 'exceljs';
import type { VentaDto } from '@/lib/api/ventas';
import type { ProductoVentaDto, KpiVentasDto } from '@/lib/api/reportes';

export const METODO_PAGO_LABEL: Record<string, string> = {
  efectivo: 'Efectivo', tarjeta: 'Tarjeta', yape: 'Yape', plin: 'Plin', otro: 'Otro',
};

export const BRAND = 'FF007542';
export const HEADER = 'FF1E8C45';
export const MONEY = '"S/." #,##0.00';

export interface ContextoExcel {
  /** Quién genera el reporte. */
  generadoPor: string;
  /** Línea de contexto bajo el título: sucursal, rango, usuario… */
  contexto: string;
}

export function descargar(buffer: ExcelJS.Buffer, nombre: string) {
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${nombre}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}

/** Título (fila 1), subtítulo (fila 2) y encabezado de tabla (fila 4) con el estilo común de los reportes. */
export function armarCabecera(sheet: ExcelJS.Worksheet, titulo: string, columnas: string[], ctx: ContextoExcel, resumen: string) {
  const ahora = new Date();
  sheet.mergeCells(1, 1, 1, columnas.length);
  const t = sheet.getCell(1, 1);
  t.value = titulo;
  t.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
  t.alignment = { vertical: 'middle', horizontal: 'left' };
  t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } };
  sheet.getRow(1).height = 28;

  sheet.mergeCells(2, 1, 2, columnas.length);
  const s = sheet.getCell(2, 1);
  s.value =
    `Generado el ${ahora.toLocaleDateString('es-PE')} ${ahora.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}` +
    `  ·  Por: ${ctx.generadoPor}  ·  ${ctx.contexto}  ·  ${resumen}`;
  s.font = { italic: true, size: 10, color: { argb: 'FF64748B' } };

  const header = sheet.getRow(4);
  header.values = columnas;
  header.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });
  header.height = 20;
}

function splitNumero(v: VentaDto): { serie: string; correlativo: string } {
  if (!v.numeroComprobante) return { serie: 'N.VENTA', correlativo: String(v.correlativoTicket ?? v.id) };
  const idx = v.numeroComprobante.indexOf('-');
  if (idx === -1) return { serie: v.numeroComprobante, correlativo: '' };
  return { serie: v.numeroComprobante.slice(0, idx), correlativo: v.numeroComprobante.slice(idx + 1) };
}

const TIPO_LABEL: Record<string, string> = {
  ticket: 'N. Venta', boleta: 'Boleta', factura: 'Factura',
  nota_credito: 'Nota de Crédito', nota_debito: 'Nota de Débito',
};

/** Ventas detalladas del rango. Las notas de crédito se listan en negativo; el bloque de totales usa el mismo
 *  cálculo que la página (`kpi`): las notas que afectan documentos anteriores al rango no ajustan las netas. */
export async function exportVentasDetalladas(ventas: VentaDto[], kpi: KpiVentasDto, ctx: ContextoExcel, nombreArchivo: string) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'RestoFly';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet('Ventas', { views: [{ state: 'frozen', ySplit: 4 }] });

  const columnas = ['Fecha', 'Hora', 'Tipo', 'Serie', 'Correlativo', 'N° Documento', 'Razón Social', 'Cajero', 'Medio de pago', 'Base', 'IGV', 'Importe Total'];
  sheet.columns = [
    { key: 'fecha', width: 12 }, { key: 'hora', width: 9 }, { key: 'tipo', width: 16 },
    { key: 'serie', width: 10 }, { key: 'correlativo', width: 14 }, { key: 'numDoc', width: 14 },
    { key: 'razon', width: 32 }, { key: 'cajero', width: 20 }, { key: 'pago', width: 14 },
    { key: 'base', width: 14 }, { key: 'igv', width: 12 }, { key: 'total', width: 15 },
  ];
  armarCabecera(sheet, 'REPORTE DE VENTAS — RESTOFLY', columnas, ctx, `Total: ${ventas.length} documento${ventas.length === 1 ? '' : 's'}`);

  const signo = (tipo: string) => (tipo === 'nota_credito' ? -1 : 1);
  ventas.forEach((v, idx) => {
    const f = new Date(v.pagadoAt);
    const { serie, correlativo } = splitNumero(v);
    const row = sheet.addRow({
      fecha: f.toLocaleDateString('es-PE'),
      hora: f.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
      tipo: TIPO_LABEL[v.tipoComprobante] ?? v.tipoComprobante,
      serie, correlativo,
      numDoc: v.numDoc || '-',
      razon: v.razonSocial || v.nombreCliente || 'Clientes Varios',
      cajero: v.cajeroNombre ?? '-',
      pago: METODO_PAGO_LABEL[v.metodoPago] ?? v.metodoPago,
      base: signo(v.tipoComprobante) * v.subtotal,
      igv: signo(v.tipoComprobante) * v.igvMonto,
      total: signo(v.tipoComprobante) * v.total,
    });
    (['base', 'igv', 'total'] as const).forEach(k => { row.getCell(k).numFmt = MONEY; });
    row.getCell('total').font = { bold: true };
    row.getCell('correlativo').alignment = { horizontal: 'center' };
    const fondo = v.tipoComprobante === 'nota_credito' ? 'FFE2E8F0' : v.tipoComprobante === 'nota_debito' ? 'FFFFF3E0' : idx % 2 === 1 ? 'FFF8FAFC' : null;
    if (fondo) for (let c = 1; c <= columnas.length; c++) row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fondo } };
  });

  if (ventas.length > 0) {
    // Bloque de totales: brutas − NC + ND del periodo = netas, y las notas anteriores solo como dato.
    const linea = (etiqueta: string, total: number, igv: number, estilo: 'normal' | 'neto' | 'nota') => {
      const row = sheet.addRow({});
      row.height = 20;
      sheet.mergeCells(row.number, 1, row.number, 9);
      row.getCell(1).value = etiqueta;
      row.getCell(1).alignment = { vertical: 'middle', horizontal: 'right' };
      row.getCell('base').value = total - igv;
      row.getCell('igv').value = igv;
      row.getCell('total').value = total;
      (['base', 'igv', 'total'] as const).forEach(k => { row.getCell(k).numFmt = MONEY; });
      for (let c = 1; c <= columnas.length; c++) {
        const cell = row.getCell(c);
        if (estilo === 'neto') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER } };
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        } else if (estilo === 'nota') {
          cell.font = { italic: true, color: { argb: 'FF64748B' } };
        } else {
          cell.font = { bold: true };
        }
      }
    };

    sheet.addRow({}); // respiro
    linea('VENTAS BRUTAS', kpi.totalBruto, kpi.igvBruto, 'normal');
    if (kpi.ncPeriodo > 0) linea('− NOTAS DE CRÉDITO DEL PERÍODO', -kpi.ncPeriodo, -kpi.igvNcPeriodo, 'normal');
    if (kpi.ndPeriodo > 0) linea('+ NOTAS DE DÉBITO DEL PERÍODO', kpi.ndPeriodo, kpi.igvNdPeriodo, 'normal');
    linea('VENTAS NETAS', kpi.totalVentas, kpi.totalIgv, 'neto');
    if (kpi.ncAnteriores > 0) linea('NC de documentos anteriores (no restan)', -kpi.ncAnteriores, 0, 'nota');
    if (kpi.ndAnteriores > 0) linea('ND de documentos anteriores (no suman)', kpi.ndAnteriores, 0, 'nota');
  }

  sheet.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: columnas.length } };
  descargar(await workbook.xlsx.writeBuffer(), nombreArchivo);
}

/** Ranking de productos ya ordenado/limitado por el backend. */
export async function exportTopProductos(productos: ProductoVentaDto[], ctx: ContextoExcel, nombreArchivo: string, orden: 'monto' | 'cantidad') {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'RestoFly';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet('Top Productos', { views: [{ state: 'frozen', ySplit: 4 }] });

  const columnas = ['#', 'Producto', 'Cantidad vendida', 'Total vendido'];
  sheet.columns = [{ key: 'n', width: 6 }, { key: 'nombre', width: 40 }, { key: 'cantidad', width: 18 }, { key: 'total', width: 18 }];
  armarCabecera(sheet, 'TOP PRODUCTOS — RESTOFLY', columnas, ctx,
    `${productos.length} producto${productos.length === 1 ? '' : 's'} · Orden: ${orden === 'monto' ? 'mayor monto' : 'mayor cantidad'}`);

  productos.forEach((p, i) => {
    const row = sheet.addRow({ n: i + 1, nombre: p.productoNombre, cantidad: p.cantidadVendida, total: p.totalVendido });
    row.getCell('total').numFmt = MONEY;
    row.getCell('n').alignment = { horizontal: 'center' };
    row.getCell('cantidad').alignment = { horizontal: 'center' };
    if (i % 2 === 1) for (let c = 1; c <= columnas.length; c++) row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
  });

  descargar(await workbook.xlsx.writeBuffer(), nombreArchivo);
}

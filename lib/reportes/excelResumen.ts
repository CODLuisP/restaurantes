import ExcelJS from 'exceljs';
import type { MedioPagoDto, ClienteResumenDto, ControlCajaTurnoDto } from '@/lib/api/reportes';
import { armarCabecera, descargar, HEADER, MONEY, METODO_PAGO_LABEL, type ContextoExcel } from './excel';

const ZEBRA = 'FFF8FAFC';

/** Filas con zebra + formato de moneda/centrado por clave de columna. */
function rellenarFilas(
  sheet: ExcelJS.Worksheet, filas: Record<string, unknown>[], columnas: number, moneda: string[], centradas: string[] = []
) {
  filas.forEach((f, i) => {
    const row = sheet.addRow(f);
    moneda.forEach(k => { row.getCell(k).numFmt = MONEY; });
    centradas.forEach(k => { row.getCell(k).alignment = { horizontal: 'center' }; });
    if (i % 2 === 1) for (let c = 1; c <= columnas; c++) row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } };
  });
}

function filaTotal(sheet: ExcelJS.Worksheet, columnas: number, moneda: string[], centradas: string[] = []) {
  const row = sheet.lastRow!;
  row.height = 20;
  moneda.forEach(k => { row.getCell(k).numFmt = MONEY; });
  centradas.forEach(k => { row.getCell(k).alignment = { horizontal: 'center' }; });
  for (let c = 1; c <= columnas; c++) {
    const cell = row.getCell(c);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  }
}

/** Medios de pago del rango (sin notas de crédito/débito), con su participación. */
export async function exportMediosPago(medios: MedioPagoDto[], ctx: ContextoExcel, nombreArchivo: string) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'RestoPro';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet('Medios de pago', { views: [{ state: 'frozen', ySplit: 4 }] });

  const columnas = ['Medio de pago', 'Operaciones', 'Total', '% del total'];
  sheet.columns = [{ key: 'medio', width: 24 }, { key: 'cantidad', width: 16 }, { key: 'total', width: 18 }, { key: 'pct', width: 14 }];
  armarCabecera(sheet, 'MEDIOS DE PAGO — RESTOPRO', columnas, ctx, `${medios.length} medio${medios.length === 1 ? '' : 's'}`);

  const totalGeneral = medios.reduce((a, m) => a + m.total, 0);
  rellenarFilas(sheet, medios.map(m => ({
    medio: METODO_PAGO_LABEL[m.medio] ?? m.medio,
    cantidad: m.cantidad,
    total: m.total,
    pct: totalGeneral > 0 ? m.total / totalGeneral : 0,
  })), columnas.length, ['total'], ['cantidad', 'pct']);
  sheet.getColumn('pct').numFmt = '0.0%';

  descargar(await workbook.xlsx.writeBuffer(), nombreArchivo);
}

/** Resumen por cliente (montos netos: las notas de crédito restan). */
export async function exportClientes(clientes: ClienteResumenDto[], ctx: ContextoExcel, nombreArchivo: string) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'RestoPro';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet('Resumen por cliente', { views: [{ state: 'frozen', ySplit: 4 }] });

  const columnas = ['Cliente', 'N° Documento', 'N° Docs', 'Subtotal', 'IGV', 'Total'];
  sheet.columns = [
    { key: 'cliente', width: 40 }, { key: 'numDoc', width: 16 }, { key: 'docs', width: 10 },
    { key: 'subtotal', width: 16 }, { key: 'igv', width: 14 }, { key: 'total', width: 16 },
  ];
  armarCabecera(sheet, 'RESUMEN POR CLIENTE — RESTOPRO', columnas, ctx, `${clientes.length} cliente${clientes.length === 1 ? '' : 's'}`);

  rellenarFilas(sheet, clientes.map(c => ({
    cliente: c.cliente, numDoc: c.numDoc ?? '-', docs: c.documentos, subtotal: c.subtotal, igv: c.igv, total: c.total,
  })), columnas.length, ['subtotal', 'igv', 'total'], ['docs', 'numDoc']);
  sheet.getColumn('total').font = { bold: true };

  if (clientes.length > 0) {
    sheet.addRow({
      cliente: 'TOTAL',
      docs: clientes.reduce((a, c) => a + c.documentos, 0),
      subtotal: clientes.reduce((a, c) => a + c.subtotal, 0),
      igv: clientes.reduce((a, c) => a + c.igv, 0),
      total: clientes.reduce((a, c) => a + c.total, 0),
    });
    filaTotal(sheet, columnas.length, ['subtotal', 'igv', 'total'], ['docs']);
  }

  sheet.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: columnas.length } };
  descargar(await workbook.xlsx.writeBuffer(), nombreArchivo);
}

/** Un turno de caja por fila: ventas por medio de pago, movimientos y efectivo esperado vs. cierre. */
export async function exportControlCaja(turnos: ControlCajaTurnoDto[], ctx: ContextoExcel, nombreArchivo: string) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'RestoPro';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet('Control de caja', { views: [{ state: 'frozen', ySplit: 4 }] });

  const columnas = [
    'Turno', 'Cajero', 'Apertura', 'Cierre', 'Estado', 'Monto apertura', 'Ventas', 'Total ventas',
    'Efectivo', 'Tarjeta', 'Yape', 'Plin', 'Otro', 'Ingresos', 'Egresos', 'Efectivo esperado', 'Monto cierre', 'Diferencia',
  ];
  sheet.columns = [
    { key: 'id', width: 8 }, { key: 'cajero', width: 22 }, { key: 'abierto', width: 18 }, { key: 'cerrado', width: 18 },
    { key: 'estado', width: 11 }, { key: 'apertura', width: 15 }, { key: 'cant', width: 9 }, { key: 'total', width: 15 },
    { key: 'efectivo', width: 13 }, { key: 'tarjeta', width: 13 }, { key: 'yape', width: 13 }, { key: 'plin', width: 13 },
    { key: 'otro', width: 13 }, { key: 'ingresos', width: 13 }, { key: 'egresos', width: 13 },
    { key: 'esperado', width: 17 }, { key: 'cierre', width: 15 }, { key: 'diferencia', width: 14 },
  ];
  armarCabecera(sheet, 'CONTROL DE CAJA — RESTOPRO', columnas, ctx, `${turnos.length} turno${turnos.length === 1 ? '' : 's'}`);

  const fechaHora = (s: string | null) => (s ? new Date(s).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' }) : '-');
  const dinero = ['apertura', 'total', 'efectivo', 'tarjeta', 'yape', 'plin', 'otro', 'ingresos', 'egresos', 'esperado', 'cierre', 'diferencia'];

  // Diferencia solo existe con el turno cerrado: lo contado menos lo que debía haber.
  rellenarFilas(sheet, turnos.map(t => ({
    id: t.turnoId, cajero: t.cajero, abierto: fechaHora(t.abiertoAt), cerrado: fechaHora(t.cerradoAt),
    estado: t.estado === 'abierto' ? 'Abierto' : 'Cerrado', apertura: t.montoApertura, cant: t.cantidadVentas,
    total: t.totalVentas, efectivo: t.totalEfectivo, tarjeta: t.totalTarjeta, yape: t.totalYape, plin: t.totalPlin,
    otro: t.totalOtro, ingresos: t.totalIngresos, egresos: t.totalEgresos, esperado: t.efectivoEsperado,
    cierre: t.montoCierre ?? '', diferencia: t.montoCierre == null ? '' : t.montoCierre - t.efectivoEsperado,
  })), columnas.length, dinero, ['id', 'estado', 'cant']);

  if (turnos.length > 0) {
    const suma = (f: (t: ControlCajaTurnoDto) => number) => turnos.reduce((a, t) => a + f(t), 0);
    sheet.addRow({
      cajero: 'TOTAL',
      cant: suma(t => t.cantidadVentas), total: suma(t => t.totalVentas), efectivo: suma(t => t.totalEfectivo),
      tarjeta: suma(t => t.totalTarjeta), yape: suma(t => t.totalYape), plin: suma(t => t.totalPlin),
      otro: suma(t => t.totalOtro), ingresos: suma(t => t.totalIngresos), egresos: suma(t => t.totalEgresos),
    });
    filaTotal(sheet, columnas.length, dinero, ['cant']);
  }

  descargar(await workbook.xlsx.writeBuffer(), nombreArchivo);
}

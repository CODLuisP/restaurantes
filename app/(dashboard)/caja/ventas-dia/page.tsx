'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSession } from 'next-auth/react';
import ExcelJS from 'exceljs';
import { CalendarClock, ChevronLeft, ChevronRight, Loader2, Receipt, Hash, Wallet, MoreVertical, FileText, Download } from 'lucide-react';
import { useSucursalSelector } from '@/hooks/useSucursalSelector';
import { SucursalSelector } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { getVentas, getVentaById, type VentaDto } from '@/lib/api/ventas';
import { getUsuarios, type Usuario } from '@/lib/api/usuarios';
import { toFechaParam } from '@/lib/api/reportes';
import { getFechaEnvioSunatVisible, formatFechaHora } from '@/lib/facturacion/fechaEnvioSunat';
import { ConvertirTicketModal } from '@/components/caja/ConvertirTicketModal';
import { formatMetodoPago } from '@/lib/config/metodos';

const BRAND_COLOR = 'FF007542';

/** Divide "B001-00000024" en { serie: "B001", correlativo: "00000024" }; los tickets internos
 *  (sin numeroComprobante) usan "N.VENTA" + su correlativo propio, corrido por sucursal. */
function splitNumeroVenta(v: VentaDto): { serie: string; correlativo: string } {
  if (!v.numeroComprobante) return { serie: 'N.VENTA', correlativo: String(v.correlativoTicket ?? v.id) };
  const idx = v.numeroComprobante.indexOf('-');
  if (idx === -1) return { serie: v.numeroComprobante, correlativo: '' };
  return { serie: v.numeroComprobante.slice(0, idx), correlativo: v.numeroComprobante.slice(idx + 1) };
}

async function exportVentasDiaExcel(ventas: VentaDto[], usuario: string, contexto: string) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'RestoFly';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Ventas del Día', { views: [{ state: 'frozen', ySplit: 4 }] });

  const columnas = [
    'Fecha', 'Hora', 'Serie', 'Correlativo', 'N° Documento', 'Razón Social',
    'Base', 'IGV', 'Importe Total', 'Serie Afectada',
  ];
  sheet.columns = [
    { key: 'fecha', width: 12 },
    { key: 'hora', width: 9 },
    { key: 'serie', width: 10 },
    { key: 'correlativo', width: 14 },
    { key: 'numDoc', width: 14 },
    { key: 'razonSocial', width: 32 },
    { key: 'base', width: 14 },
    { key: 'igv', width: 12 },
    { key: 'total', width: 15 },
    { key: 'serieAfectada', width: 16 },
  ];

  // ── Encabezado (título + metadata) ──
  const ahora = new Date();
  sheet.mergeCells(1, 1, 1, columnas.length);
  const tituloCell = sheet.getCell(1, 1);
  tituloCell.value = 'REPORTE DE VENTAS DEL DÍA — RESTOFLY';
  tituloCell.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
  tituloCell.alignment = { vertical: 'middle', horizontal: 'left' };
  tituloCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_COLOR } };
  sheet.getRow(1).height = 28;

  sheet.mergeCells(2, 1, 2, columnas.length);
  const subtituloCell = sheet.getCell(2, 1);
  subtituloCell.value =
    `Generado el ${ahora.toLocaleDateString('es-PE')} ${ahora.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}` +
    `  ·  Por: ${usuario}  ·  ${contexto}  ·  Total: ${ventas.length} venta${ventas.length === 1 ? '' : 's'}`;
  subtituloCell.font = { italic: true, size: 10, color: { argb: 'FF64748B' } };
  subtituloCell.alignment = { vertical: 'middle', horizontal: 'left' };

  // ── Fila 3 en blanco como respiro visual ──

  // ── Encabezado de la tabla ──
  const headerRow = sheet.getRow(4);
  headerRow.values = columnas;
  headerRow.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E8C45' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = { bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } } };
  });
  headerRow.height = 20;

  // ── Filas de datos (ya vienen ordenadas por fecha/hora, más reciente primero) ──
  ventas.forEach((v, idx) => {
    const fecha = new Date(v.pagadoAt);
    const fechaStr = fecha.toLocaleDateString('es-PE');
    const horaStr = fecha.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    const { serie, correlativo } = splitNumeroVenta(v);
    const esNota = v.tipoComprobante === 'nota_credito' || v.tipoComprobante === 'nota_debito';
    // La nota de crédito resta del total, así que se muestra en negativo.
    const signoVisual = v.tipoComprobante === 'nota_credito' ? -1 : 1;

    const row = sheet.addRow({
      fecha: fechaStr,
      hora: horaStr,
      serie,
      correlativo,
      numDoc: v.numDoc || '-',
      razonSocial: v.razonSocial || v.nombreCliente || 'Clientes Varios',
      base: signoVisual * v.subtotal,
      igv: signoVisual * v.igvMonto,
      total: signoVisual * v.total,
      serieAfectada: esNota ? (v.numeroVentaAfectada ?? '') : '',
    });

    row.getCell('base').numFmt = '"S/." #,##0.00';
    row.getCell('igv').numFmt = '"S/." #,##0.00';
    row.getCell('total').numFmt = '"S/." #,##0.00';
    row.getCell('total').font = { bold: true };
    row.getCell('correlativo').alignment = { horizontal: 'center' };
    row.getCell('serieAfectada').alignment = { horizontal: 'center' };

    // Resalta toda la línea según el tipo: nota de crédito en gris, nota de débito en un tono
    // igual de discreto (ámbar claro) — sin tocar el color de letra, solo el fondo.
    const fondoFila = v.tipoComprobante === 'nota_credito'
      ? 'FFE2E8F0'
      : v.tipoComprobante === 'nota_debito'
      ? 'FFFFF3E0'
      : idx % 2 === 1
      ? 'FFF8FAFC'
      : null;
    const colorTexto = v.tipoComprobante === 'nota_credito' ? 'FF475569' : null;

    if (fondoFila) {
      for (let col = 1; col <= columnas.length; col++) {
        const cell = row.getCell(col);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fondoFila } };
        if (colorTexto) cell.font = { ...cell.font, color: { argb: colorTexto } };
      }
    }
  });

  // ── Fila de totales: neta — las notas de débito AUMENTAN el total y las notas de crédito
  // lo DISMINUYEN, igual que en la contabilidad real (tickets, boletas y facturas suman).
  const signo = (tipo: string) => (tipo === 'nota_credito' ? -1 : 1);
  const netoBase = ventas.reduce((acc, v) => acc + signo(v.tipoComprobante) * v.subtotal, 0);
  const netoIgv = ventas.reduce((acc, v) => acc + signo(v.tipoComprobante) * v.igvMonto, 0);
  const netoTotal = ventas.reduce((acc, v) => acc + signo(v.tipoComprobante) * v.total, 0);

  if (ventas.length > 0) {
    const totalRow = sheet.addRow({});
    totalRow.height = 20;
    sheet.mergeCells(totalRow.number, 1, totalRow.number, 6);
    const etiquetaCell = totalRow.getCell(1);
    etiquetaCell.value = 'TOTAL NETO';
    etiquetaCell.alignment = { vertical: 'middle', horizontal: 'right' };

    totalRow.getCell('base').value = netoBase;
    totalRow.getCell('igv').value = netoIgv;
    totalRow.getCell('total').value = netoTotal;
    (['base', 'igv', 'total'] as const).forEach(key => {
      totalRow.getCell(key).numFmt = '"S/." #,##0.00';
    });

    for (let col = 1; col <= columnas.length; col++) {
      const cell = totalRow.getCell(col);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E8C45' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    }
  }

  sheet.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: columnas.length } };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `ventas-dia-${new Date().toISOString().split('T')[0]}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}

const TIPO_LABEL: Record<string, string> = {
  ticket: 'N. Venta',
  boleta: 'Boleta',
  factura: 'Factura',
  nota_credito: 'Nota de Crédito',
  nota_debito: 'Nota de Débito',
};


/** Roles que efectivamente pueden cobrar/atender una venta — excluye cocinero, repartidor, etc. */
const ROLES_VISIBLES = ['admin', 'cajero', 'mozo'];

const money = (n: number) => `S/. ${n.toFixed(2)}`;
const itemsCount = (v: VentaDto) => v.items.reduce((a, i) => a + i.cantidad, 0);
const horaVenta = (v: VentaDto) => new Date(v.pagadoAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
const numeroVenta = (v: VentaDto) => v.numeroComprobante || `N.Venta #${v.correlativoTicket ?? v.id}`;
const fechaLarga = (d: Date) => d.toLocaleDateString('es-PE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

function addDias(d: Date, delta: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + delta);
  return next;
}

export default function VentasDelDiaPage() {
  const { data: session } = useSession();
  const { token, isSuperAdmin, sucursales, sId, selectSucursal } = useSucursalSelector();
  const { triggerToast } = useApp();

  const [dia, setDia] = useState(() => new Date());
  const [cajeroId, setCajeroId] = useState<number | null>(null);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [ventas, setVentas] = useState<VentaDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [convertirVenta, setConvertirVenta] = useState<VentaDto | null>(null);
  const [exportingExcel, setExportingExcel] = useState(false);

  /* Menú de opciones por fila: se renderiza vía portal con posición fija calculada del botón,
     porque el listado vive dentro de contenedores con overflow (scroll + card redondeado) que
     recortarían un menú absoluto normal — y decide abrir hacia arriba si no hay espacio abajo. */
  const [menuAnchor, setMenuAnchor] = useState<{ ventaId: number; top: number; left: number; openUp: boolean } | null>(null);

  useEffect(() => {
    if (!menuAnchor) return;
    const close = () => setMenuAnchor(null);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    window.addEventListener('click', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('click', close);
    };
  }, [menuAnchor]);

  const toggleMenu = (ventaId: number, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (menuAnchor?.ventaId === ventaId) { setMenuAnchor(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    const menuWidth = 224; // w-56
    const menuHeight = 44; // una sola opción
    const margin = 8;
    const openUp = rect.bottom + menuHeight > window.innerHeight;

    // Fixed, no relativo a ningún contenedor con scroll — pero igual se acota a los límites
    // del viewport para que nunca quede (ni parcialmente) fuera de pantalla, sin importar
    // dónde esté el botón que lo abrió.
    const rawTop = openUp ? rect.top - menuHeight - 4 : rect.bottom + 4;
    const rawLeft = rect.right - menuWidth;
    const top = Math.min(Math.max(rawTop, margin), window.innerHeight - menuHeight - margin);
    const left = Math.min(Math.max(rawLeft, margin), window.innerWidth - menuWidth - margin);

    setMenuAnchor({ ventaId, top, left, openUp });
  };

  /* Detalle de pago (Yape/Plin/Tarjeta) de la venta seleccionada — se pide puntual solo al
     abrir el detalle (GET /api/ventas/{id}, ya trae el JOIN a ventas_pago_detalle) en vez de
     traerlo para las N ventas del listado, que no lo necesitan. */
  const [pagoDetalle, setPagoDetalle] = useState<VentaDto | null>(null);
  useEffect(() => {
    if (!token || !selectedId) { setPagoDetalle(null); return; }
    let cancelado = false;
    getVentaById(token, selectedId)
      .then(v => { if (!cancelado) setPagoDetalle(v); })
      .catch(() => { if (!cancelado) setPagoDetalle(null); });
    return () => { cancelado = true; };
  }, [token, selectedId]);

  /* El filtro de "cajero" solo tiene sentido para quienes realmente pueden cobrar/atender —
     se excluyen cocineros, repartidores, etc. */
  useEffect(() => {
    if (!token || !sId) return;
    getUsuarios(token, { sucursalId: sId })
      .then(data => setUsuarios(data.filter(u => ROLES_VISIBLES.includes(u.rolNombre.toLowerCase()))))
      .catch(() => setUsuarios([]));
  }, [token, sId]);

  const cargarVentas = () => {
    if (!token || !sId) return;
    setLoading(true);
    setError(false);
    const fecha = toFechaParam(dia);
    getVentas(token, { sucursalId: sId, fechaInicio: fecha, fechaFin: fecha, cajeroId: cajeroId ?? undefined })
      .then(data => {
        setVentas(data);
        setSelectedId(prev => (data.some(v => v.id === prev) ? prev : (data[0]?.id ?? null)));
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(cargarVentas, [token, sId, dia, cajeroId]);

  const totalVentas = ventas.length;
  const totalMonto = ventas.reduce((a, v) => a + v.total, 0);
  const seleccionada = ventas.find(v => v.id === selectedId) ?? null;

  const handleExportExcel = async () => {
    if (!ventas.length) { triggerToast('No hay ventas para exportar en este día.', 'error'); return; }
    setExportingExcel(true);
    try {
      const usuario = session?.user?.name ?? session?.user?.username ?? 'Usuario';
      const sucursalActual = sucursales.find(s => s.id === sId);
      const cajeroActual = cajeroId ? usuarios.find(u => u.id === cajeroId)?.nombre : null;
      const contexto = [
        `Sucursal: ${sucursalActual ? `${sucursalActual.nombre}${sucursalActual.codEstablecimiento ? ` (${sucursalActual.codEstablecimiento})` : ''}` : 'Todas'}`,
        `Fecha: ${fechaLarga(dia)}`,
        `Cajero: ${cajeroActual ?? 'Todos'}`,
      ].join(' · ');
      await exportVentasDiaExcel(ventas, usuario, contexto);
      triggerToast('Reporte de ventas del día descargado como archivo Excel.', 'success');
    } catch {
      triggerToast('No se pudo generar el archivo Excel.', 'error');
    } finally {
      setExportingExcel(false);
    }
  };

  return (
    <div className="space-y-4 animate-section">
      <div className="flex items-center gap-3">
        <div className="bg-brand p-2.5 rounded-xl shrink-0">
          <CalendarClock className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900">Ventas del Día</h3>
          <p className="text-xs text-slate-500">Detalle de las ventas registradas en el día.</p>
        </div>
      </div>

      {/* Filtros + totales */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <SucursalSelector visible={isSuperAdmin} sucursales={sucursales} sId={sId} onChange={selectSucursal} />

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setDia(d => addDias(d, -1))}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
              aria-label="Día anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <input
              type="date"
              value={toFechaParam(dia)}
              max={toFechaParam(new Date())}
              onChange={e => e.target.value && setDia(new Date(`${e.target.value}T00:00:00`))}
              className="input px-2 py-1.5 text-xs"
            />
            <button
              type="button"
              onClick={() => setDia(d => addDias(d, 1))}
              disabled={toFechaParam(dia) >= toFechaParam(new Date())}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Día siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <select
            value={cajeroId ?? ''}
            onChange={e => setCajeroId(e.target.value ? Number(e.target.value) : null)}
            className="input px-2 py-1.5 text-xs"
          >
            <option value="">Todos los cajeros</option>
            {usuarios.map(u => (
              <option key={u.id} value={u.id}>{u.nombre}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={exportingExcel}
            className="btn-secondary bg-white text-[11px] py-1.5 px-3 disabled:opacity-60"
          >
            {exportingExcel ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Excel
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-1.5">
            <Hash className="h-3.5 w-3.5 text-slate-400" />
            <div className="text-[10px] leading-tight">
              <p className="text-slate-400 uppercase font-bold">Ventas</p>
              <p className="font-mono font-bold text-slate-800 text-xs">{totalVentas}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-1.5">
            <Receipt className="h-3.5 w-3.5 text-brand" />
            <div className="text-[10px] leading-tight">
              <p className="text-slate-400 uppercase font-bold">Total</p>
              <p className="font-mono font-bold text-brand text-xs">{money(totalMonto)}</p>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card-lg p-12 flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 text-brand animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Cargando ventas...</p>
        </div>
      ) : error ? (
        <div className="card-lg p-6 border-rose-200 bg-rose-50">
          <p className="text-sm text-rose-700 font-medium">No se pudieron cargar las ventas. Intenta de nuevo.</p>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-4 items-start">
          {/* Listado */}
          <div className="card-lg flex-1 min-w-0 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-100 text-xs font-bold text-slate-500 capitalize">
              {fechaLarga(dia)}
            </div>
            {ventas.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-12">Sin ventas registradas para este día.</p>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[70vh] overflow-y-auto">
                {ventas.map(v => {
                  const isAnulacion = v.tipoComprobante === 'nota_credito';
                  const isSelected = v.id === selectedId;
                  const esTicket = v.tipoComprobante === 'ticket';
                  return (
                    <div key={v.id} className="relative">
                      <button
                        type="button"
                        onClick={() => setSelectedId(v.id)}
                        className={`w-full grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-4 py-3 text-left transition-colors ${
                          esTicket ? 'pr-10' : ''
                        } ${isSelected ? 'bg-brand/5' : 'hover:bg-slate-50'}`}
                      >
                        <div className="min-w-0">
                          <p className={`text-sm font-bold truncate ${isAnulacion ? 'text-rose-500 line-through' : 'text-slate-800'}`}>
                            {numeroVenta(v)}
                          </p>
                          <p className="text-[10px] text-slate-400">{TIPO_LABEL[v.tipoComprobante] ?? v.tipoComprobante}</p>
                        </div>
                        <span className="text-xs font-mono text-slate-500">{itemsCount(v)}</span>
                        <span className="text-xs font-mono text-slate-500">{horaVenta(v)}</span>
                        <span className={`text-sm font-mono font-bold shrink-0 ${isAnulacion ? 'text-rose-400 line-through' : 'text-slate-800'}`}>
                          {money(v.total)}
                        </span>
                      </button>

                      {esTicket && (
                        <div className="absolute right-1 top-1/2 -translate-y-1/2">
                          <button
                            type="button"
                            onClick={e => toggleMenu(v.id, e)}
                            className="p-1.5 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800"
                            aria-label="Opciones"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Detalle */}
          <div className="w-full lg:w-96 shrink-0">
            {!seleccionada ? (
              <div className="card-lg p-12 flex flex-col items-center justify-center gap-2 text-center">
                <Receipt className="h-8 w-8 text-slate-300" />
                <p className="text-xs text-slate-400">Selecciona una venta para ver el detalle.</p>
              </div>
            ) : (
              <div className="card-lg p-4 space-y-4">
                <div>
                  <p className="text-sm font-bold text-slate-800">{numeroVenta(seleccionada)}</p>
                  <p className="text-[11px] text-slate-500">
                    Fecha: {new Date(seleccionada.pagadoAt).toLocaleString('es-PE')}
                  </p>
                  {(() => {
                    const fechaEnvio = getFechaEnvioSunatVisible(seleccionada.pagadoAt, seleccionada.fechaRegistroFacturacion);
                    return fechaEnvio && (
                      <p className="text-[11px] text-slate-500">
                        Fecha de envío SUNAT: {formatFechaHora(fechaEnvio)}
                      </p>
                    );
                  })()}
                </div>

                <div className="bg-slate-50 rounded-xl border border-slate-100 p-3 space-y-1 text-xs">
                  <p className="text-slate-500">Cajero: <span className="text-slate-700 font-medium">{seleccionada.cajeroNombre ?? '—'}</span></p>
                  <p className="text-slate-500">Cliente: <span className="text-slate-700 font-medium">{seleccionada.razonSocial || seleccionada.nombreCliente || 'Clientes Varios'}</span></p>
                  {seleccionada.mesaNumero != null && (
                    <p className="text-slate-500">Mesa: <span className="text-slate-700 font-medium">{seleccionada.mesaNumero}</span></p>
                  )}
                </div>

                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block mb-2">Artículos</span>
                  <div className="space-y-2">
                    {seleccionada.items.map(item => (
                      <div key={item.id} className="flex justify-between items-center gap-2 text-xs">
                        <span className="text-slate-700 truncate">
                          {item.productoNombre ? (item.varianteNombre ? `${item.productoNombre} (${item.varianteNombre})` : item.productoNombre) : item.comboNombre ?? 'Producto'}
                          {' '}<span className="text-slate-400">x{item.cantidad}</span>
                        </span>
                        <span className="font-mono font-bold text-slate-800 shrink-0">{money(item.precioUnitario * item.cantidad)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-dashed border-slate-200 pt-3 space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span className="flex items-center gap-1.5"><Wallet className="h-3.5 w-3.5 text-slate-400" /> {formatMetodoPago(seleccionada.metodoPago)}</span>
                    <span className="font-mono">{money(seleccionada.total)}</span>
                  </div>
                  {pagoDetalle?.id === seleccionada.id && pagoDetalle.numeroOperacion && (
                    <p className="text-[11px] text-slate-500 pl-5">
                      N° Operación: <span className="font-medium text-slate-700">{pagoDetalle.numeroOperacion}</span>
                      {pagoDetalle.entidadBancaria ? ` — ${pagoDetalle.entidadBancaria}` : ''}
                    </p>
                  )}
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-500">Total</span>
                  <span className="font-mono font-extrabold text-base text-slate-800">{money(seleccionada.total)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {menuAnchor && typeof document !== 'undefined' && createPortal(
        <div
          onClick={e => e.stopPropagation()}
          style={{ position: 'fixed', top: menuAnchor.top, left: menuAnchor.left, width: 224 }}
          className="bg-white rounded-lg border border-slate-200 shadow-lg z-50 py-1 text-left animate-section"
        >
          <button
            type="button"
            onClick={() => {
              const venta = ventas.find(v => v.id === menuAnchor.ventaId) ?? null;
              setConvertirVenta(venta);
              setMenuAnchor(null);
            }}
            className="w-full px-3 py-2 text-[11px] text-slate-700 hover:bg-slate-50 flex items-center gap-2"
          >
            <FileText className="h-3.5 w-3.5 text-slate-400" /> Convertir a boleta/factura
          </button>
        </div>,
        document.body
      )}

      <ConvertirTicketModal
        open={!!convertirVenta}
        venta={convertirVenta}
        token={token}
        onClose={() => setConvertirVenta(null)}
        onConverted={cargarVentas}
        triggerToast={triggerToast}
      />
    </div>
  );
}

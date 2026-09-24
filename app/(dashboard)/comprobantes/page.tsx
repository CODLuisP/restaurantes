'use client';

import { useMemo, useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import ExcelJS from 'exceljs';
import { FileText, Loader2, Download } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useComprobantes } from '@/hooks/useComprobantes';
import { useSucursalSelector } from '@/hooks/useSucursalSelector';
import { SucursalSelector } from '@/components/ui/SucursalSelector';
import {
  downloadXmlBlob,
  downloadCdrBlob,
  downloadPdfBlob,
  reenviarSunat,
  emitirComprobante,
  getComprobanteDetalle,
  getNotasDeVenta,
  getComprobantes,
  type NotaVentaResult,
} from '@/lib/api/comprobantes';
import { getMiEmpresa, type EmpresaDto } from '@/lib/api/empresas';
import ComprobantesFilters from '@/components/comprobantes/ComprobantesFilters';
import ComprobantesTable from '@/components/comprobantes/ComprobantesTable';
import ComprobanteDetailModal from '@/components/comprobantes/ComprobanteDetailModal';
import GenerarNotaModal from '@/components/comprobantes/GenerarNotaModal';
import NewReceiptModal from '@/components/comprobantes/NewReceiptModal';
import MassUploadModal from '@/components/comprobantes/MassUploadModal';
import EmailModal from '@/components/comprobantes/EmailModal';
import WhatsAppModal from '@/components/comprobantes/WhatsAppModal';
import {
  type Comprobante, type TipoComprobante, type FormatoImpresion,
  mapApiToComprobante, normalizeEstadoSunat,
} from '@/components/comprobantes/types';

const ITEMS_PER_PAGE = 50;

const BRAND_COLOR = 'FF007542';
const ES_NOTA = (tipo: TipoComprobante) => tipo === 'NotaCredito' || tipo === 'NotaDebito';

/** Divide "B001-00000024" en { serie: "B001", correlativo: "00000024" }. */
function splitNumero(numero: string): { serie: string; correlativo: string } {
  const idx = numero.indexOf('-');
  if (idx === -1) return { serie: numero, correlativo: '' };
  return { serie: numero.slice(0, idx), correlativo: numero.slice(idx + 1) };
}

async function exportComprobantesExcel(comprobantes: Comprobante[], usuario: string, filtroTxt: string, sucursalTxt: string) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'RestoFly';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Comprobantes', { views: [{ state: 'frozen', ySplit: 4 }] });

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
  tituloCell.value = 'REPORTE DE COMPROBANTES — RESTOFLY';
  tituloCell.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
  tituloCell.alignment = { vertical: 'middle', horizontal: 'left' };
  tituloCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_COLOR } };
  sheet.getRow(1).height = 28;

  sheet.mergeCells(2, 1, 2, columnas.length);
  const subtituloCell = sheet.getCell(2, 1);
  subtituloCell.value =
    `Generado el ${ahora.toLocaleDateString('es-PE')} ${ahora.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}` +
    `  ·  Por: ${usuario}  ·  Sucursal: ${sucursalTxt}  ·  ${filtroTxt}  ·  Total: ${comprobantes.length} comprobante${comprobantes.length === 1 ? '' : 's'}`;
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

  // ── Filas de datos (ya vienen ordenadas por fecha, más reciente primero) ──
  comprobantes.forEach((c, idx) => {
    const [fechaStr, horaStr] = c.fecha.split(' ');
    const { serie, correlativo } = splitNumero(c.numero);
    // La nota de crédito resta del total, así que se muestra en negativo (el formato de
    // moneda antepone el "-" automáticamente para números negativos).
    const signoVisual = c.tipo === 'NotaCredito' ? -1 : 1;

    const row = sheet.addRow({
      fecha: fechaStr ?? '',
      hora: horaStr ?? '',
      serie,
      correlativo,
      numDoc: c.clienteDoc.number,
      razonSocial: c.clienteDoc.name,
      base: signoVisual * c.subtotal,
      igv: signoVisual * c.igv,
      total: signoVisual * c.monto,
      serieAfectada: ES_NOTA(c.tipo) ? (c.numeroVentaAfectada ?? '') : '',
    });

    row.getCell('base').numFmt = '"S/." #,##0.00';
    row.getCell('igv').numFmt = '"S/." #,##0.00';
    row.getCell('total').numFmt = '"S/." #,##0.00';
    row.getCell('total').font = { bold: true };
    row.getCell('correlativo').alignment = { horizontal: 'center' };
    row.getCell('serieAfectada').alignment = { horizontal: 'center' };

    // Resalta toda la línea según el tipo: nota de crédito en gris, nota de débito en un tono
    // igual de discreto (ámbar claro) — sin tocar el color de letra, solo el fondo.
    const fondoFila = c.tipo === 'NotaCredito'
      ? 'FFE2E8F0'
      : c.tipo === 'NotaDebito'
      ? 'FFFFF3E0'
      : idx % 2 === 1
      ? 'FFF8FAFC'
      : null;
    const colorTexto = c.tipo === 'NotaCredito' ? 'FF475569' : null;

    if (fondoFila) {
      for (let col = 1; col <= columnas.length; col++) {
        const cell = row.getCell(col);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fondoFila } };
        if (colorTexto) cell.font = { ...cell.font, color: { argb: colorTexto } };
      }
    }
  });

  // ── Fila de totales: neta, no una simple suma — las notas de débito AUMENTAN el total
  // (intereses/penalidades que se cobran de más) y las notas de crédito lo DISMINUYEN
  // (descuentos/anulaciones), igual que en la contabilidad real.
  const signo = (tipo: TipoComprobante) => (tipo === 'NotaCredito' ? -1 : 1);
  const netoBase = comprobantes.reduce((acc, c) => acc + signo(c.tipo) * c.subtotal, 0);
  const netoIgv = comprobantes.reduce((acc, c) => acc + signo(c.tipo) * c.igv, 0);
  const netoTotal = comprobantes.reduce((acc, c) => acc + signo(c.tipo) * c.monto, 0);

  if (comprobantes.length > 0) {
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

    // Pinta toda la fila de verde (igual que el encabezado), incluida la última columna aunque quede vacía.
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
  link.download = `comprobantes-${new Date().toISOString().split('T')[0]}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function ComprobantesPage() {
  const { data: session } = useSession();
  const { triggerToast, searchQuery } = useApp();
  const { isSuperAdmin, sucursales, sId, selectSucursal } = useSucursalSelector();

  const {
    token,
    comprobantes: apiComprobantes,
    totalCount,
    totalPages,
    currentPage,
    setCurrentPage,
    loading,
    error,
    refetch,
    setSearch,
    filterTipo, setFilterTipo,
    filterEstado, setFilterEstado,
    fechaDesde, setFechaDesde,
    fechaHasta, setFechaHasta,
    ordenarPorCorrelativo, setOrdenarPorCorrelativo,
  } = useComprobantes({ pageSize: ITEMS_PER_PAGE, sucursalIdOverride: sId });

  // Mapea datos de la API al formato que esperan los componentes existentes
  const comprobantes = useMemo(
    () => apiComprobantes.map(mapApiToComprobante),
    [apiComprobantes],
  );

  // Filtros avanzados (monto) se aplican en el cliente sobre la página actual
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [montoMin, setMontoMin] = useState('');
  const [montoMax, setMontoMax] = useState('');

  const filteredComprobantes = useMemo(() => {
    return comprobantes.filter(c => {
      let ok = true;
      if (montoMin && c.monto < parseFloat(montoMin)) ok = false;
      if (montoMax && c.monto > parseFloat(montoMax)) ok = false;
      return ok;
    });
  }, [comprobantes, montoMin, montoMax]);

  const [exportingExcel, setExportingExcel] = useState(false);

  const handleExportExcel = async () => {
    if (!token) return;
    // Superadmin sin sucursal elegida: nada que exportar.
    if (isSuperAdmin && !sId) { triggerToast('Elige una sucursal para exportar.', 'error'); return; }
    setExportingExcel(true);
    try {
      // Trae TODO lo que cumple los filtros actuales (no solo la página visible en pantalla).
      const resultado = await getComprobantes(token, {
        sucursalId: sId ?? undefined,
        tipoComprobante: filterTipo || undefined,
        estadoSunat: filterEstado || undefined,
        fechaInicio: fechaDesde || undefined,
        fechaFin: fechaHasta || undefined,
        search: searchQuery || undefined,
        ordenarPorCorrelativo,
        page: 1,
        pageSize: Math.max(totalCount, 1),
      });
      const todos = resultado.items.map(mapApiToComprobante).filter(c => {
        if (montoMin && c.monto < parseFloat(montoMin)) return false;
        if (montoMax && c.monto > parseFloat(montoMax)) return false;
        return true;
      });

      const partesFiltro: string[] = [];
      partesFiltro.push(filterTipo ? `Tipo: ${filterTipo}` : 'Todos los tipos');
      partesFiltro.push(filterEstado ? `SUNAT: ${filterEstado}` : 'SUNAT: Todos');
      if (fechaDesde || fechaHasta) partesFiltro.push(`Del ${fechaDesde || '...'} al ${fechaHasta || '...'}`);

      const usuario = session?.user?.name ?? session?.user?.username ?? 'Usuario';
      const sucursalActual = sucursales.find(s => s.id === sId);
      const sucursalTxt = sucursalActual
        ? `${sucursalActual.nombre}${sucursalActual.codEstablecimiento ? ` (${sucursalActual.codEstablecimiento})` : ''}`
        : 'Todas';
      await exportComprobantesExcel(todos, usuario, partesFiltro.join(' · '), sucursalTxt);
      triggerToast('Reporte de comprobantes descargado como archivo Excel.', 'success');
    } catch {
      triggerToast('No se pudo generar el archivo Excel.', 'error');
    } finally {
      setExportingExcel(false);
    }
  };

  /** Formato de impresión elegido por comprobante */
  const [comprobanteSizes, setComprobanteSizes] = useState<Record<string, FormatoImpresion>>({});

  const [selectedComprobante, setSelectedComprobante] = useState<Comprobante | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [emailModalData, setEmailModalData] = useState<{ open: boolean; comp: Comprobante | null; email: string }>({
    open: false, comp: null, email: '',
  });
  const [whatsappModalData, setWhatsappModalData] = useState<{ open: boolean; comp: Comprobante | null; phone: string }>({
    open: false, comp: null, phone: '',
  });

  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  /** ventaId con una emisión/reenvío en curso, para deshabilitar el botón y evitar doble clic. */
  const [procesandoId, setProcesandoId] = useState<string | null>(null);
  /** "{ventaId}-{tipo}" de una descarga XML/CDR en curso, para animar el botón mientras espera al backend. */
  const [descargandoKey, setDescargandoKey] = useState<string | null>(null);
  const [notaModalData, setNotaModalData] = useState<{ open: boolean; comp: Comprobante | null; tipoNota: 'credito' | 'debito' }>({
    open: false, comp: null, tipoNota: 'credito',
  });
  const [empresa, setEmpresa] = useState<EmpresaDto | null>(null);

  useEffect(() => {
    const handleCloseMenu = () => setActiveMenuId(null);
    window.addEventListener('click', handleCloseMenu);
    return () => window.removeEventListener('click', handleCloseMenu);
  }, []);

  useEffect(() => {
    if (!token) return;
    getMiEmpresa(token).then(setEmpresa).catch(() => setEmpresa(null));
  }, [token]);

  // El buscador global del topbar también filtra esta vista (cliente, serie o correlativo).
  useEffect(() => {
    setSearch(searchQuery);
  }, [searchQuery, setSearch]);

  // ── Handlers ──────────────────────────────────────────────────────────

  const handleDownload = async (ventaId: string, type: 'PDF' | 'XML' | 'CDR') => {
    if (!token) return;
    const id = parseInt(ventaId);
    const size = comprobanteSizes[
      comprobantes.find(c => c.id === ventaId)?.numero ?? ''
    ] || 'A4';

    const key = `${ventaId}-${type}`;
    setDescargandoKey(key);
    try {
      if (type === 'PDF') {
        const tamano = size === 'Ticket 80mm' ? 'Ticket80mm' : size === 'Ticket 58mm' ? 'Ticket58mm' : size === 'A5' ? 'MediaCarta' : 'A4';
        await downloadPdfBlob(token, id, tamano);
        triggerToast(`Abriendo PDF del comprobante...`, 'info');
      } else if (type === 'XML') {
        await downloadXmlBlob(token, id);
        triggerToast(`XML descargado.`, 'success');
      } else if (type === 'CDR') {
        await downloadCdrBlob(token, id);
        triggerToast(`CDR descargado.`, 'success');
      }
    } catch {
      triggerToast(`No se pudo descargar el ${type}. Verifique que el comprobante fue emitido correctamente.`, 'error');
    } finally {
      setDescargandoKey(null);
    }
  };

  const handleReenviarSunat = async (id: string, num: string) => {
    if (!token || procesandoId) return;
    setProcesandoId(id);
    triggerToast(`Reenviando comprobante ${num} a SUNAT...`, 'info');
    try {
      const result = await reenviarSunat(token, parseInt(id));
      if (result.exitoso) {
        triggerToast(`SUNAT ${normalizeEstadoSunat(result.estadoSunat) === 'Aceptado' ? 'aceptó' : 'procesó'} el comprobante ${num}.`, 'success');
        refetch();
      } else {
        triggerToast(`Error al reenviar: ${result.mensaje}`, 'error');
      }
    } catch {
      triggerToast(`Error de conexión al reenviar a SUNAT.`, 'error');
    } finally {
      setProcesandoId(null);
    }
  };

  const handleEmitir = async (id: string, num: string) => {
    if (!token || procesandoId) return;
    setProcesandoId(id);
    triggerToast(`Emitiendo comprobante ${num}...`, 'info');
    try {
      const result = await emitirComprobante(token, parseInt(id));
      if (result.exitoso) {
        triggerToast(`SUNAT ${normalizeEstadoSunat(result.estadoSunat) === 'Aceptado' ? 'aceptó' : 'procesó'} el comprobante ${result.numeroComprobante ?? num}.`, 'success');
      } else {
        triggerToast(`No se pudo emitir: ${result.mensaje}`, 'error');
      }
      refetch();
    } catch (err) {
      triggerToast(err instanceof Error ? err.message : 'Error de conexión al emitir el comprobante.', 'error');
    } finally {
      setProcesandoId(null);
    }
  };

  const handleGenerarNota = (comp: Comprobante, tipoNota: 'credito' | 'debito') => {
    setNotaModalData({ open: true, comp, tipoNota });
  };

  const handleNotaSuccess = (result: NotaVentaResult) => {
    if (result.exitoso) {
      triggerToast(`Nota ${result.numeroComprobante ?? ''} generada y enviada a SUNAT.`, 'success');
    } else if (result.ventaId) {
      // La nota sí quedó registrada (tiene id local) pero SUNAT la rechazó o quedó pendiente.
      triggerToast(`La nota se registró pero SUNAT respondió: ${result.mensaje ?? 'sin detalle'}.`, 'warning');
    } else {
      // No se llegó a crear nada (validación propia: saldo insuficiente, ítem inválido, etc.).
      triggerToast(result.mensaje ?? 'No se pudo generar la nota.', 'error');
    }
    refetch();
  };

  const handleVerDetalle = async (comp: Comprobante | null) => {
    if (!comp) { setSelectedComprobante(null); return; }
    if (!token) return;
    // Las notas solo pueden afectar boletas/facturas — evita la consulta para el resto.
    const puedeTenerNotas = comp.tipo === 'Boleta' || comp.tipo === 'Factura';
    try {
      const [detalle, notas] = await Promise.all([
        getComprobanteDetalle(token, parseInt(comp.id)),
        puedeTenerNotas ? getNotasDeVenta(token, parseInt(comp.id)) : Promise.resolve([]),
      ]);
      const itemsMapped = detalle.items.map(i => ({
        name: i.productoNombre
          ? (i.varianteNombre ? `${i.productoNombre} (${i.varianteNombre})` : i.productoNombre)
          : i.comboNombre || 'Producto',
        quantity: i.cantidad,
        price: i.precioUnitario,
      }));
      setSelectedComprobante({
        ...comp,
        items: itemsMapped,
        igvPorcentaje: detalle.igvPorcentaje,
        numeroVentaAfectada: detalle.numeroVentaAfectada,
        codMotivo: detalle.codMotivo,
        desMotivo: detalle.desMotivo,
        numeroOperacion: detalle.numeroOperacion,
        entidadBancaria: detalle.entidadBancaria,
        observacionPago: detalle.observacionPago,
        fechaRegistroFacturacion: detalle.fechaRegistroFacturacion,
        notasRelacionadas: notas,
      });
    } catch {
      setSelectedComprobante(comp);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] space-y-5 animate-section">
      {/* ── BARRA SUPERIOR DE HERRAMIENTAS ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="bg-brand p-2 rounded-xl shadow-md">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 leading-tight">Comprobantes Electrónicos</h3>
            <p className="text-[11px] text-slate-500">
              Total listados: {filteredComprobantes.length} de {totalCount} comprobantes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <SucursalSelector visible={isSuperAdmin} sucursales={sucursales} sId={sId} onChange={selectSucursal} />

          <select
            value={filterTipo || 'Todos'}
            onChange={e => setFilterTipo(e.target.value === 'Todos' ? '' : e.target.value)}
            className="input px-3 py-1.5 text-xs"
          >
            <option value="Todos">Todos los tipos</option>
            <option value="Factura">Facturas</option>
            <option value="Boleta">Boletas</option>
          </select>

          <select
            value={filterEstado || 'Todos'}
            onChange={e => setFilterEstado(e.target.value === 'Todos' ? '' : e.target.value)}
            className="input px-3 py-1.5 text-xs"
          >
            <option value="Todos">SUNAT: Todos</option>
            <option value="Aceptado">Aceptado</option>
            <option value="Pendiente">Pendiente</option>
            <option value="Rechazado">Rechazado</option>
            <option value="De Baja">De Baja</option>
          </select>

          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`btn-secondary bg-white text-[11px] py-1.5 px-3 ${showAdvanced ? 'bg-slate-200 border-slate-400' : ''}`}
          >
            Filtros avanzados
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={exportingExcel}
            className="btn-secondary bg-white text-[11px] py-1.5 px-3 disabled:opacity-60"
          >
            {exportingExcel ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Excel
          </button>

        </div>
      </div>

      {isSuperAdmin && !sId ? (
        <div className="card-lg p-12 flex flex-col items-center justify-center gap-2">
          <p className="text-xs text-slate-500">Elige una sucursal para ver sus comprobantes.</p>
        </div>
      ) : (
      <>
      <ComprobantesFilters
        showAdvanced={showAdvanced}
        fechaDesde={fechaDesde} setFechaDesde={setFechaDesde}
        fechaHasta={fechaHasta} setFechaHasta={setFechaHasta}
        montoMin={montoMin} setMontoMin={setMontoMin}
        montoMax={montoMax} setMontoMax={setMontoMax}
      />

      {/* Loading / Error states */}
      {loading && comprobantes.length === 0 && (
        <div className="card-lg p-12 flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 text-brand animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Cargando comprobantes...</p>
        </div>
      )}

      {error && (
        <div className="card-lg p-6 border-rose-200 bg-rose-50">
          <p className="text-sm text-rose-700 font-medium">{error}</p>
          <button onClick={refetch} className="mt-2 btn-secondary text-xs">Reintentar</button>
        </div>
      )}

      {!loading && !error && (
        <ComprobantesTable
          paginatedComprobantes={filteredComprobantes}
          filteredCount={totalCount}
          comprobanteSizes={comprobanteSizes}
          setComprobanteSizes={setComprobanteSizes}
          activeMenuId={activeMenuId}
          setActiveMenuId={setActiveMenuId}
          procesandoId={procesandoId}
          descargandoKey={descargandoKey}
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={ITEMS_PER_PAGE}
          setCurrentPage={setCurrentPage}
          setSelectedComprobante={handleVerDetalle}
          setEmailModalData={setEmailModalData}
          setWhatsappModalData={setWhatsappModalData}
          onDownload={handleDownload}
          onReenviarSunat={handleReenviarSunat}
          onEmitir={handleEmitir}
          onGenerarNota={handleGenerarNota}
          triggerToast={triggerToast}
          usarFacturacionElectronica={empresa?.usarFacturacionElectronica ?? true}
          ordenarPorCorrelativo={ordenarPorCorrelativo}
          onToggleOrdenarPorCorrelativo={() => setOrdenarPorCorrelativo(v => !v)}
        />
      )}

      <ComprobanteDetailModal
        selectedComprobante={selectedComprobante}
        setSelectedComprobante={setSelectedComprobante}
        comprobanteSizes={comprobanteSizes}
        onDownload={handleDownload}
        triggerToast={triggerToast}
        empresa={empresa}
      />

      <GenerarNotaModal
        open={notaModalData.open}
        onClose={() => setNotaModalData({ open: false, comp: null, tipoNota: 'credito' })}
        comprobante={notaModalData.comp}
        tipoNota={notaModalData.tipoNota}
        token={token}
        onSuccess={handleNotaSuccess}
        triggerToast={triggerToast}
      />

      <NewReceiptModal
        open={showNewModal}
        onClose={() => setShowNewModal(false)}
        comprobantesList={comprobantes}
        onSubmit={(comp) => {
          setShowNewModal(false);
          refetch();
          triggerToast(`Comprobante ${comp.numero} emitido.`, 'success');
        }}
      />

      <MassUploadModal
        open={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUploadComplete={(nuevos) => {
          setShowUploadModal(false);
          refetch();
          triggerToast(`${nuevos.length} comprobantes importados correctamente.`, 'success');
        }}
      />

      <EmailModal
        data={emailModalData}
        token={token}
        onClose={() => setEmailModalData({ open: false, comp: null, email: '' })}
        onSuccess={(num, email) => {
          triggerToast(`Comprobante ${num} enviado a ${email}.`, 'success');
        }}
        triggerToast={triggerToast}
      />

      <WhatsAppModal
        data={whatsappModalData}
        token={token}
        onClose={() => setWhatsappModalData({ open: false, comp: null, phone: '' })}
        onSuccess={(num, phone) => {
          triggerToast(`Comprobante ${num} enviado por WhatsApp al ${phone}.`, 'success');
        }}
        triggerToast={triggerToast}
      />
      </>
      )}
    </div>
  );
}

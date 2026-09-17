'use client';

import { useMemo, useState, useEffect } from 'react';
import { FileText, Loader2 } from 'lucide-react';
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

const ITEMS_PER_PAGE = 10;

export default function ComprobantesPage() {
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
    } else {
      triggerToast(`La nota se registró pero SUNAT respondió: ${result.mensaje ?? 'sin detalle'}.`, 'warning');
    }
    refetch();
  };

  const handleVerDetalle = async (comp: Comprobante | null) => {
    if (!comp) { setSelectedComprobante(null); return; }
    if (!token) return;
    try {
      const detalle = await getComprobanteDetalle(token, parseInt(comp.id));
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
      });
    } catch {
      setSelectedComprobante(comp);
    }
  };

  return (
    <div className="space-y-5 animate-section">
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
            className={`btn-secondary text-[11px] py-1.5 px-3 ${showAdvanced ? 'bg-slate-200 border-slate-400' : ''}`}
          >
            Filtros avanzados
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

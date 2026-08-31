'use client';

import { useMemo, useState, useEffect } from 'react';
import { Plus, UploadCloud, FileText, Loader2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useComprobantes } from '@/hooks/useComprobantes';
import {
  getPdfUrl,
  getHtmlUrl,
  getXmlUrl,
  getCdrUrl,
  reenviarSunat,
  getComprobanteDetalle,
} from '@/lib/api/comprobantes';
import ComprobantesFilters from '@/components/comprobantes/ComprobantesFilters';
import ComprobantesTable from '@/components/comprobantes/ComprobantesTable';
import ComprobanteDetailModal from '@/components/comprobantes/ComprobanteDetailModal';
import NewReceiptModal from '@/components/comprobantes/NewReceiptModal';
import MassUploadModal from '@/components/comprobantes/MassUploadModal';
import EmailModal from '@/components/comprobantes/EmailModal';
import WhatsAppModal from '@/components/comprobantes/WhatsAppModal';
import {
  type Comprobante, type TipoComprobante, type FormatoImpresion,
  mapApiToComprobante,
} from '@/components/comprobantes/types';

const ITEMS_PER_PAGE = 10;

export default function ComprobantesPage() {
  const { triggerToast } = useApp();

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
    search, setSearch,
    filterTipo, setFilterTipo,
    filterEstado, setFilterEstado,
    fechaDesde, setFechaDesde,
    fechaHasta, setFechaHasta,
  } = useComprobantes({ pageSize: ITEMS_PER_PAGE });

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

  useEffect(() => {
    const handleCloseMenu = () => setActiveMenuId(null);
    window.addEventListener('click', handleCloseMenu);
    return () => window.removeEventListener('click', handleCloseMenu);
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────

  const handleDownload = async (ventaId: string, type: 'PDF' | 'XML' | 'CDR') => {
    if (!token) return;
    const id = parseInt(ventaId);
    const size = comprobanteSizes[
      comprobantes.find(c => c.id === ventaId)?.numero ?? ''
    ] || 'A4';

    try {
      if (type === 'PDF') {
        const tamano = size === 'Ticket 80mm' ? 'Ticket80mm' : size === 'Ticket 58mm' ? 'Ticket58mm' : size === 'A5' ? 'MediaCarta' : 'A4';
        const url = getPdfUrl(id, tamano);
        window.open(url, '_blank');
        triggerToast(`Abriendo PDF del comprobante...`, 'info');
      } else if (type === 'XML') {
        const url = await getXmlUrl(token, id);
        window.open(url, '_blank');
        triggerToast(`Descargando XML...`, 'info');
      } else if (type === 'CDR') {
        const url = await getCdrUrl(token, id);
        window.open(url, '_blank');
        triggerToast(`Descargando CDR...`, 'info');
      }
    } catch {
      triggerToast(`No se pudo descargar el ${type}. Verifique que el comprobante fue emitido correctamente.`, 'error');
    }
  };

  const handleBaja = (id: string, num: string) => {
    triggerToast(`Funcionalidad de baja para ${num} próximamente disponible.`, 'info');
  };

  const handleReenviarSunat = async (id: string, num: string) => {
    if (!token) return;
    triggerToast(`Reenviando comprobante ${num} a SUNAT...`, 'info');
    try {
      const result = await reenviarSunat(token, parseInt(id));
      if (result.exitoso) {
        triggerToast(`SUNAT ${result.estadoSunat === 'Aceptado' ? 'aceptó' : 'procesó'} el comprobante ${num}.`, 'success');
        refetch();
      } else {
        triggerToast(`Error al reenviar: ${result.mensaje}`, 'error');
      }
    } catch {
      triggerToast(`Error de conexión al reenviar a SUNAT.`, 'error');
    }
  };

  const handleDuplicar = (comp: Comprobante) => {
    triggerToast(`Funcionalidad de duplicar comprobante próximamente disponible.`, 'info');
  };

  const handleEliminar = (id: string, num: string) => {
    triggerToast(`Los comprobantes emitidos no pueden eliminarse del registro.`, 'warning');
  };

  const handleVerDetalle = async (comp: Comprobante | null) => {
    if (!comp) { setSelectedComprobante(null); return; }
    if (!token) return;
    try {
      const detalle = await getComprobanteDetalle(token, parseInt(comp.id));
      const itemsMapped = detalle.items.map(i => ({
        name: i.productoNombre || i.comboNombre || 'Producto',
        quantity: i.cantidad,
        price: i.precioUnitario,
      }));
      setSelectedComprobante({ ...comp, items: itemsMapped });
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

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            className="btn-secondary transition-all hover:bg-slate-200"
          >
            <UploadCloud className="h-4 w-4" /> Carga Masiva
          </button>
          <button
            type="button"
            onClick={() => setShowNewModal(true)}
            className="btn-primary transition-all hover:scale-[1.02]"
          >
            <Plus className="h-4 w-4" /> + Nuevo Comprobante
          </button>
        </div>
      </div>

      <ComprobantesFilters
        search={search} setSearch={setSearch}
        filterTipo={filterTipo as any} setFilterTipo={(v) => setFilterTipo(v === 'Todos' ? '' : v)}
        filterEstado={filterEstado as any} setFilterEstado={(v) => setFilterEstado(v === 'Todos' ? '' : v)}
        showAdvanced={showAdvanced} setShowAdvanced={setShowAdvanced}
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
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={ITEMS_PER_PAGE}
          setCurrentPage={setCurrentPage}
          setSelectedComprobante={handleVerDetalle}
          setEmailModalData={setEmailModalData}
          setWhatsappModalData={setWhatsappModalData}
          onDownload={handleDownload}
          onBaja={handleBaja}
          onReenviarSunat={handleReenviarSunat}
          onDuplicar={handleDuplicar}
          onEliminar={handleEliminar}
          triggerToast={triggerToast}
        />
      )}

      <ComprobanteDetailModal
        selectedComprobante={selectedComprobante}
        setSelectedComprobante={setSelectedComprobante}
        comprobanteSizes={comprobanteSizes}
        onDownload={handleDownload}
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
        onClose={() => setEmailModalData({ open: false, comp: null, email: '' })}
        onSuccess={(num, email) => {
          triggerToast(`Comprobante ${num} enviado a ${email}.`, 'success');
        }}
      />

      <WhatsAppModal
        data={whatsappModalData}
        onClose={() => setWhatsappModalData({ open: false, comp: null, phone: '' })}
        onSuccess={(num, phone) => {
          triggerToast(`Comprobante ${num} enviado por WhatsApp al ${phone}.`, 'success');
        }}
      />
    </div>
  );
}

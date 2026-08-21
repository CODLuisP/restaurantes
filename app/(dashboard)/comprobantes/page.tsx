'use client';

import { useMemo, useState, useEffect } from 'react';
import { Plus, UploadCloud, FileText } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import type { SalesHistory } from '@/types';
import ComprobantesFilters from '@/components/comprobantes/ComprobantesFilters';
import ComprobantesTable from '@/components/comprobantes/ComprobantesTable';
import ComprobanteDetailModal from '@/components/comprobantes/ComprobanteDetailModal';
import NewReceiptModal from '@/components/comprobantes/NewReceiptModal';
import MassUploadModal from '@/components/comprobantes/MassUploadModal';
import EmailModal from '@/components/comprobantes/EmailModal';
import WhatsAppModal from '@/components/comprobantes/WhatsAppModal';
import { INITIAL_MOCK_COMPROBANTES } from '@/components/comprobantes/mockComprobantes';
import {
  type Comprobante, type EstadoSunat, type TipoComprobante, type FormatoImpresion,
  nextNumeroComprobante, nuevoHash,
} from '@/components/comprobantes/types';

const ITEMS_PER_PAGE = 10;

export default function ComprobantesPage() {
  const { salesHistory, triggerToast, addManualSale } = useApp();

  const [comprobantes, setComprobantes] = useState<Comprobante[]>(INITIAL_MOCK_COMPROBANTES);
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState<'Todos' | TipoComprobante>('Todos');
  const [filterEstado, setFilterEstado] = useState<'Todos' | EstadoSunat>('Todos');
  const [showAdvanced, setShowAdvanced] = useState(false);

  /* Filtros avanzados */
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [montoMin, setMontoMin] = useState('');
  const [montoMax, setMontoMax] = useState('');

  const [currentPage, setCurrentPage] = useState(1);

  /** Formato de impresión elegido por comprobante, ej: { 'F001-00015115': 'A4' } */
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

  /* Sincroniza las boletas/facturas reales generadas al cobrar hacia esta lista */
  useEffect(() => {
    if (!salesHistory) return;

    const historyComprobantes: Comprobante[] = salesHistory
      .filter(sale => sale.comprobante && (sale.docType === 'Boleta' || sale.docType === 'Factura'))
      .map(sale => {
        const docNum = sale.comprobante!;
        if (comprobantes.some(c => c.numero === docNum)) return null as any;

        const subtotal = sale.total / 1.18;
        const igv = sale.total - subtotal;

        return {
          id: sale.id,
          fecha: `${new Date().toLocaleDateString('es-PE')} ${sale.time}`,
          tipo: sale.docType as TipoComprobante,
          numero: docNum,
          clienteDoc: {
            type: sale.customerDoc?.type || (sale.docType === 'Factura' ? 'RUC' : 'DNI'),
            number: sale.customerDoc?.number || (sale.docType === 'Factura' ? '20100200301' : '10203040'),
            name: sale.customerDoc?.name || 'CLIENTE GENERAL / PUBLICO EN GENERAL',
          },
          monto: sale.total,
          subtotal,
          igv,
          estadoSunat: 'Aceptado', // Al cobrarse en caja usualmente va aceptado directamente
          correoStatus: 'Pendiente',
          whatsappStatus: 'Pendiente',
          metodoPago: sale.paymentMethod,
          hash: nuevoHash(),
          items: [
            { name: `Consumo de alimentos (${sale.table})`, quantity: sale.itemsCount || 1, price: sale.total / (sale.itemsCount || 1) },
          ],
        };
      })
      .filter(Boolean);

    if (historyComprobantes.length > 0) {
      setComprobantes(prev => [...historyComprobantes, ...prev]);
    }
  }, [salesHistory]);

  /* Cierra el menú contextual de la fila al hacer click fuera */
  useEffect(() => {
    const handleCloseMenu = () => setActiveMenuId(null);
    window.addEventListener('click', handleCloseMenu);
    return () => window.removeEventListener('click', handleCloseMenu);
  }, []);

  const filteredComprobantes = useMemo(() => {
    return comprobantes.filter(c => {
      const query = search.toLowerCase();
      const matchesSearch =
        c.numero.toLowerCase().includes(query) ||
        c.clienteDoc.name.toLowerCase().includes(query) ||
        c.clienteDoc.number.includes(query);

      const matchesTipo = filterTipo === 'Todos' || c.tipo === filterTipo;
      const matchesEstado = filterEstado === 'Todos' || c.estadoSunat === filterEstado;

      /* La fecha del comprobante viene como DD/MM/AAAA HH:MM */
      let matchesFecha = true;
      if (fechaDesde || fechaHasta) {
        const [dStr] = c.fecha.split(' ');
        const [day, month, year] = dStr.split('/').map(Number);
        const compDate = new Date(year, month - 1, day);

        if (fechaDesde) {
          const fromDate = new Date(fechaDesde);
          fromDate.setHours(0, 0, 0, 0);
          if (compDate < fromDate) matchesFecha = false;
        }
        if (fechaHasta) {
          const toDate = new Date(fechaHasta);
          toDate.setHours(23, 59, 59, 999);
          if (compDate > toDate) matchesFecha = false;
        }
      }

      let matchesMonto = true;
      if (montoMin && c.monto < parseFloat(montoMin)) matchesMonto = false;
      if (montoMax && c.monto > parseFloat(montoMax)) matchesMonto = false;

      return matchesSearch && matchesTipo && matchesEstado && matchesFecha && matchesMonto;
    });
  }, [comprobantes, search, filterTipo, filterEstado, fechaDesde, fechaHasta, montoMin, montoMax]);

  const totalPages = Math.ceil(filteredComprobantes.length / ITEMS_PER_PAGE) || 1;
  const paginatedComprobantes = useMemo(() => {
    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredComprobantes.slice(startIdx, startIdx + ITEMS_PER_PAGE);
  }, [filteredComprobantes, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterTipo, filterEstado, fechaDesde, fechaHasta, montoMin, montoMax]);

  const handleDownload = (num: string, type: 'PDF' | 'XML' | 'CDR') => {
    triggerToast(`Descargando archivo ${type} de ${num}...`, 'info');
    setTimeout(() => {
      triggerToast(`${type} de ${num} descargado con éxito.`, 'success');
    }, 800);
  };

  const handleBaja = (id: string, num: string) => {
    setComprobantes(prev => prev.map(c => (c.id === id ? { ...c, estadoSunat: 'De Baja' } : c)));
    triggerToast(`Se ha enviado la comunicación de Baja para ${num}. SUNAT aceptó la baja.`, 'success');
  };

  const handleReenviarSunat = (id: string, num: string) => {
    triggerToast(`Reenviando comprobante ${num} a SUNAT...`, 'info');
    setTimeout(() => {
      setComprobantes(prev => prev.map(c => (c.id === id ? { ...c, estadoSunat: 'Aceptado' } : c)));
      triggerToast(`SUNAT aceptó el comprobante ${num} de forma exitosa.`, 'success');
    }, 1200);
  };

  const handleDuplicar = (comp: Comprobante) => {
    const nextNum = nextNumeroComprobante(comprobantes, comp.tipo);

    const duplicate: Comprobante = {
      ...comp,
      id: `S-${Math.floor(100 + Math.random() * 900)}`,
      fecha: `${new Date().toLocaleDateString('es-PE')} ${new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`,
      numero: nextNum,
      estadoSunat: 'Aceptado',
      correoStatus: 'Pendiente',
      whatsappStatus: 'Pendiente',
      hash: nuevoHash(),
    };

    setComprobantes(prev => [duplicate, ...prev]);

    const sale: SalesHistory = {
      id: duplicate.id,
      time: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
      itemsCount: duplicate.items.reduce((acc, curr) => acc + curr.quantity, 0),
      paymentMethod: duplicate.metodoPago,
      total: duplicate.monto,
      table: 'Copia manual',
      docType: duplicate.tipo,
      comprobante: duplicate.numero,
      waiter: 'Cajero',
      cashier: 'Cajero Principal',
      customerDoc: {
        type: duplicate.clienteDoc.type,
        number: duplicate.clienteDoc.number,
        name: duplicate.clienteDoc.name,
      },
    };
    addManualSale(sale);

    triggerToast(`Comprobante duplicado correctamente como ${nextNum}.`, 'success');
  };

  const handleEliminar = (id: string, num: string) => {
    if (confirm(`¿Estás seguro de eliminar de la lista local el comprobante ${num}?`)) {
      setComprobantes(prev => prev.filter(c => c.id !== id));
      triggerToast(`Comprobante ${num} removido.`, 'info');
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
              Total listados: {filteredComprobantes.length} de {comprobantes.length} comprobantes
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
        filterTipo={filterTipo} setFilterTipo={setFilterTipo}
        filterEstado={filterEstado} setFilterEstado={setFilterEstado}
        showAdvanced={showAdvanced} setShowAdvanced={setShowAdvanced}
        fechaDesde={fechaDesde} setFechaDesde={setFechaDesde}
        fechaHasta={fechaHasta} setFechaHasta={setFechaHasta}
        montoMin={montoMin} setMontoMin={setMontoMin}
        montoMax={montoMax} setMontoMax={setMontoMax}
      />

      <ComprobantesTable
        paginatedComprobantes={paginatedComprobantes}
        filteredCount={filteredComprobantes.length}
        comprobanteSizes={comprobanteSizes}
        setComprobanteSizes={setComprobanteSizes}
        activeMenuId={activeMenuId}
        setActiveMenuId={setActiveMenuId}
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={ITEMS_PER_PAGE}
        setCurrentPage={setCurrentPage}
        setSelectedComprobante={setSelectedComprobante}
        setEmailModalData={setEmailModalData}
        setWhatsappModalData={setWhatsappModalData}
        onDownload={handleDownload}
        onBaja={handleBaja}
        onReenviarSunat={handleReenviarSunat}
        onDuplicar={handleDuplicar}
        onEliminar={handleEliminar}
        triggerToast={triggerToast}
      />

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
          setComprobantes(prev => [comp, ...prev]);
          setShowNewModal(false);
          triggerToast(`Comprobante ${comp.numero} emitido y aceptado por SUNAT.`, 'success');
        }}
      />

      <MassUploadModal
        open={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUploadComplete={(nuevos) => {
          setComprobantes(prev => [...nuevos, ...prev]);
          setShowUploadModal(false);
          triggerToast(`${nuevos.length} comprobantes importados correctamente.`, 'success');
        }}
      />

      <EmailModal
        data={emailModalData}
        onClose={() => setEmailModalData({ open: false, comp: null, email: '' })}
        onSuccess={(num, email) => {
          setComprobantes(prev =>
            prev.map(c => (c.numero === num ? { ...c, correoStatus: 'Enviado', correoDestino: email } : c))
          );
          triggerToast(`Comprobante ${num} enviado a ${email}.`, 'success');
        }}
      />

      <WhatsAppModal
        data={whatsappModalData}
        onClose={() => setWhatsappModalData({ open: false, comp: null, phone: '' })}
        onSuccess={(num, phone) => {
          setComprobantes(prev =>
            prev.map(c => (c.numero === num ? { ...c, whatsappStatus: 'Enviado', whatsappDestino: phone } : c))
          );
          triggerToast(`Comprobante ${num} enviado por WhatsApp al ${phone}.`, 'success');
        }}
      />
    </div>
  );
}

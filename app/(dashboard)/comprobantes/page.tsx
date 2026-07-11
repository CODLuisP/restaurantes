'use client';

import { useMemo, useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Download,
  Mail,
  MessageCircle,
  Eye,
  MoreVertical,
  X,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Trash2,
  Printer,
  UploadCloud,
  FileText,
  Check,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Send,
  User,
  PlusCircle,
  FileSpreadsheet
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Modal } from '@/components/ui';
import { MOCK_PRODUCTS, MOCK_CUSTOMERS } from '@/data/mockData';
import type { SalesHistory, CustomerDoc, DocType, PaymentMethod } from '@/types';
import { QRCodeSVG } from 'qrcode.react';

// Interface local para un Comprobante con campos extendidos para esta vista
interface Comprobante {
  id: string; // ID interno (ej. S-701)
  fecha: string; // DD/MM/AAAA HH:MM
  tipo: 'Boleta' | 'Factura';
  numero: string; // Ej: F001-00015115
  clienteDoc: { type: 'DNI' | 'RUC'; number: string; name: string };
  monto: number;
  igv: number;
  subtotal: number;
  estadoSunat: 'Aceptado' | 'Rechazado' | 'Pendiente' | 'De Baja';
  correoStatus: 'Enviado' | 'Pendiente';
  correoDestino?: string;
  whatsappStatus: 'Enviado' | 'Pendiente';
  whatsappDestino?: string;
  items: { name: string; quantity: number; price: number }[];
  metodoPago: PaymentMethod;
  hash: string;
}

// Datos de comprobantes iniciales basados exactamente en el screenshot del usuario
const INITIAL_MOCK_COMPROBANTES: Comprobante[] = [
  {
    id: 'C-01',
    fecha: '10/07/2026 12:00',
    tipo: 'Factura',
    numero: 'F001-00015115',
    clienteDoc: { type: 'RUC', number: '10105294919', name: 'PANIBRA DE LA CRUZ HUMBERTO' },
    monto: 356.40,
    subtotal: 302.03,
    igv: 54.37,
    estadoSunat: 'Aceptado',
    correoStatus: 'Enviado',
    correoDestino: 'humberto.panibra@gmail.com',
    whatsappStatus: 'Enviado',
    whatsappDestino: '987654321',
    metodoPago: 'Tarjeta',
    hash: '8E4A9F5C1B6D',
    items: [
      { name: 'Arroz con Mariscos Meloso', quantity: 4, price: 42.00 },
      { name: 'Ceviche Clásico Carretillero', quantity: 4, price: 39.50 },
      { name: 'Chicha Morada RestoPro (Jarra 1L)', quantity: 1, price: 18.00 },
      { name: 'Inka Kola Personal Vidrio', quantity: 1, price: 12.40 }
    ]
  },
  {
    id: 'C-02',
    fecha: '10/07/2026 08:10',
    tipo: 'Factura',
    numero: 'F001-00015114',
    clienteDoc: { type: 'RUC', number: '10105294919', name: 'PANIBRA DE LA CRUZ HUMBERTO' },
    monto: 50.00,
    subtotal: 42.37,
    igv: 7.63,
    estadoSunat: 'Aceptado',
    correoStatus: 'Enviado',
    correoDestino: 'humberto.panibra@gmail.com',
    whatsappStatus: 'Enviado',
    whatsappDestino: '987654321',
    metodoPago: 'Yape / Plin',
    hash: '7D3A8F4C0B5D',
    items: [
      { name: 'Ají de Gallina de la Abuela', quantity: 1, price: 34.00 },
      { name: 'Suspiro a la Limeña de la Casa', quantity: 1, price: 16.00 }
    ]
  },
  {
    id: 'C-03',
    fecha: '10/07/2026 07:50',
    tipo: 'Factura',
    numero: 'F001-00015113',
    clienteDoc: { type: 'RUC', number: '20603572425', name: 'CONSTRUCCIONES Y SERVICIOS GENERALES EDMUNDO DARIO E.I.R.L.' },
    monto: 270.00,
    subtotal: 228.81,
    igv: 41.19,
    estadoSunat: 'Aceptado',
    correoStatus: 'Enviado',
    correoDestino: 'contacto@edmundodario.pe',
    whatsappStatus: 'Pendiente',
    metodoPago: 'Tarjeta',
    hash: '6C2A7F3B9A4C',
    items: [
      { name: 'Lomo Saltado con Papas Amarillas', quantity: 6, price: 45.00 }
    ]
  },
  {
    id: 'C-04',
    fecha: '10/07/2026 12:00',
    tipo: 'Factura',
    numero: 'F001-00015112',
    clienteDoc: { type: 'RUC', number: '20612176800', name: 'INVERSIONES LAGUNA & Q S.A.C.' },
    monto: 480.00,
    subtotal: 406.78,
    igv: 73.22,
    estadoSunat: 'Aceptado',
    correoStatus: 'Enviado',
    correoDestino: 'administracion@lagunaq.com',
    whatsappStatus: 'Pendiente',
    metodoPago: 'Tarjeta',
    hash: '5B1A6E2A893B',
    items: [
      { name: 'Tacu Tacu con Lomo al Jugo', quantity: 10, price: 48.00 }
    ]
  },
  {
    id: 'C-05',
    fecha: '10/07/2026 12:00',
    tipo: 'Factura',
    numero: 'F001-00015111',
    clienteDoc: { type: 'RUC', number: '10200591611', name: 'MAYTA GUERRA PRIMITIVO ZACARIAS' },
    monto: 480.00,
    subtotal: 406.78,
    igv: 73.22,
    estadoSunat: 'Aceptado',
    correoStatus: 'Enviado',
    correoDestino: 'primitivo.mayta@outlook.com',
    whatsappStatus: 'Pendiente',
    metodoPago: 'Efectivo',
    hash: '4A0A5D1A782A',
    items: [
      { name: 'Tacu Tacu con Lomo al Jugo', quantity: 10, price: 48.00 }
    ]
  },
  {
    id: 'C-06',
    fecha: '10/07/2026 12:00',
    tipo: 'Factura',
    numero: 'F001-00015110',
    clienteDoc: { type: 'RUC', number: '10106605128', name: 'TUMBAY BRAVO OLIMPIO FRANCISCO' },
    monto: 356.40,
    subtotal: 302.03,
    igv: 54.37,
    estadoSunat: 'Aceptado',
    correoStatus: 'Enviado',
    correoDestino: 'olimpio.tumbay@gmail.com',
    whatsappStatus: 'Pendiente',
    metodoPago: 'Yape / Plin',
    hash: '3F9A4C0B671F',
    items: [
      { name: 'Arroz con Mariscos Meloso', quantity: 4, price: 42.00 },
      { name: 'Ceviche Clásico Carretillero', quantity: 4, price: 39.50 },
      { name: 'Chicha Morada RestoPro (Jarra 1L)', quantity: 1, price: 18.00 },
      { name: 'Inka Kola Personal Vidrio', quantity: 1, price: 12.40 }
    ]
  },
  {
    id: 'C-07',
    fecha: '09/07/2026 12:00',
    tipo: 'Factura',
    numero: 'F001-00015109',
    clienteDoc: { type: 'RUC', number: '20542218356', name: 'EMPRESA DE TRANSPORTES Y SERVICIOS EL AGUILA S.A.C.' },
    monto: 480.00,
    subtotal: 406.78,
    igv: 73.22,
    estadoSunat: 'Aceptado',
    correoStatus: 'Enviado',
    correoDestino: 'facturas@elaguilasac.com',
    whatsappStatus: 'Pendiente',
    metodoPago: 'Tarjeta',
    hash: '2E8A3B9A560E',
    items: [
      { name: 'Tacu Tacu con Lomo al Jugo', quantity: 10, price: 48.00 }
    ]
  },
  {
    id: 'C-08',
    fecha: '09/07/2026 12:00',
    tipo: 'Factura',
    numero: 'F001-00015108',
    clienteDoc: { type: 'RUC', number: '20556143189', name: 'INVERSIONES GENERALES ANFALE E.I.R.L.' },
    monto: 480.00,
    subtotal: 406.78,
    igv: 73.22,
    estadoSunat: 'Aceptado',
    correoStatus: 'Pendiente',
    whatsappStatus: 'Enviado',
    whatsappDestino: '999111222',
    metodoPago: 'Efectivo',
    hash: '1D7A2A89459D',
    items: [
      { name: 'Tacu Tacu con Lomo al Jugo', quantity: 10, price: 48.00 }
    ]
  },
  {
    id: 'C-09',
    fecha: '09/07/2026 04:52',
    tipo: 'Factura',
    numero: 'F001-00015107',
    clienteDoc: { type: 'RUC', number: '20556143189', name: 'INVERSIONES GENERALES ANFALE E.I.R.L.' },
    monto: 290.00,
    subtotal: 245.76,
    igv: 44.24,
    estadoSunat: 'Aceptado',
    correoStatus: 'Enviado',
    correoDestino: 'facturacion@anfale.com.pe',
    whatsappStatus: 'Enviado',
    whatsappDestino: '999111222',
    metodoPago: 'Tarjeta',
    hash: '0C6A1E78348C',
    items: [
      { name: 'Anticuchos de Corazón (2 palos)', quantity: 5, price: 28.50 },
      { name: 'Arroz con Mariscos Meloso', quantity: 3, price: 42.00 },
      { name: 'Chicha Morada RestoPro (Jarra 1L)', quantity: 1, price: 18.00 },
      { name: 'Inka Kola Personal Vidrio', quantity: 1, price: 3.50 }
    ]
  },
  {
    id: 'C-10',
    fecha: '09/07/2026 12:00',
    tipo: 'Factura',
    numero: 'F001-00015106',
    clienteDoc: { type: 'RUC', number: '20522170322', name: 'SERVICENTRO PETRO GAS S.A.C.' },
    monto: 420.00,
    subtotal: 355.93,
    igv: 64.07,
    estadoSunat: 'Aceptado',
    correoStatus: 'Enviado',
    correoDestino: 'administracion@petrogas.pe',
    whatsappStatus: 'Pendiente',
    metodoPago: 'Tarjeta',
    hash: '9B5A0D67237B',
    items: [
      { name: 'Arroz con Mariscos Meloso', quantity: 10, price: 42.00 }
    ]
  },
  {
    id: 'C-11',
    fecha: '09/07/2026 12:00',
    tipo: 'Boleta',
    numero: 'B001-00012200',
    clienteDoc: { type: 'DNI', number: '16765473', name: 'BRAVO RUIZ SONIA DEL ROCIO' },
    monto: 360.00,
    subtotal: 305.08,
    igv: 54.92,
    estadoSunat: 'Aceptado',
    correoStatus: 'Enviado',
    correoDestino: 'sonia.bravo@gmail.com',
    whatsappStatus: 'Pendiente',
    metodoPago: 'Efectivo',
    hash: '8A4A9C56126A',
    items: [
      { name: 'Causa Rellena de Pollo', quantity: 15, price: 24.00 }
    ]
  }
];

export default function ComprobantesPage() {
  const { salesHistory, triggerToast, addManualSale, cashSession } = useApp();

  // Estados locales
  const [comprobantes, setComprobantes] = useState<Comprobante[]>(INITIAL_MOCK_COMPROBANTES);
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState<'Todos' | 'Factura' | 'Boleta'>('Todos');
  const [filterEstado, setFilterEstado] = useState<'Todos' | 'Aceptado' | 'Rechazado' | 'Pendiente' | 'De Baja'>('Todos');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Filtros avanzados
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [montoMin, setMontoMin] = useState('');
  const [montoMax, setMontoMax] = useState('');

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Estado para guardar el formato seleccionado (tamaño) para cada comprobante
  // Ej: { 'F001-00015115': 'A4' }
  const [comprobanteSizes, setComprobanteSizes] = useState<Record<string, 'A4' | 'Ticket 80mm' | 'Ticket 58mm' | 'A5'>>({});

  // Modales
  const [selectedComprobante, setSelectedComprobante] = useState<Comprobante | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Modal de enviar correo / whatsapp
  const [emailModalData, setEmailModalData] = useState<{ open: boolean; comp: Comprobante | null; email: string }>({
    open: false,
    comp: null,
    email: ''
  });
  const [whatsappModalData, setWhatsappModalData] = useState<{ open: boolean; comp: Comprobante | null; phone: string }>({
    open: false,
    comp: null,
    phone: ''
  });

  // Opciones de menú abierto
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Sincronizar las boletas/facturas reales generadas por AppContext a nuestra lista
  useEffect(() => {
    if (!salesHistory) return;

    // Filtrar ventas del historial que tengan número de comprobante y correspondan a Boleta o Factura
    const historyComprobantes: Comprobante[] = salesHistory
      .filter(sale => sale.comprobante && (sale.docType === 'Boleta' || sale.docType === 'Factura'))
      .map(sale => {
        const docNum = sale.comprobante!;
        // Evitar duplicados si ya existe localmente
        const exists = comprobantes.some(c => c.numero === docNum);
        if (exists) return null as any;

        const subtotal = sale.total / 1.18;
        const igv = sale.total - subtotal;
        
        // Simular ítems si vienen vacíos
        const items = [
          { name: `Consumo de alimentos (${sale.table})`, quantity: sale.itemsCount || 1, price: sale.total / (sale.itemsCount || 1) }
        ];

        return {
          id: sale.id,
          fecha: `${new Date().toLocaleDateString('es-PE')} ${sale.time}`,
          tipo: sale.docType as 'Boleta' | 'Factura',
          numero: docNum,
          clienteDoc: {
            type: sale.customerDoc?.type || (sale.docType === 'Factura' ? 'RUC' : 'DNI'),
            number: sale.customerDoc?.number || (sale.docType === 'Factura' ? '20100200301' : '10203040'),
            name: sale.customerDoc?.name || 'CLIENTE GENERAL / PUBLICO EN GENERAL'
          },
          monto: sale.total,
          subtotal,
          igv,
          estadoSunat: 'Aceptado', // Al cobrarse en caja usualmente va aceptado directamente
          correoStatus: 'Pendiente',
          whatsappStatus: 'Pendiente',
          metodoPago: sale.paymentMethod,
          hash: Math.random().toString(36).slice(2, 14).toUpperCase(),
          items
        };
      })
      .filter(Boolean);

    if (historyComprobantes.length > 0) {
      setComprobantes(prev => [...historyComprobantes, ...prev]);
    }
  }, [salesHistory]);

  // Cerrar menú contextual si se hace click fuera
  useEffect(() => {
    const handleCloseMenu = () => setActiveMenuId(null);
    window.addEventListener('click', handleCloseMenu);
    return () => window.removeEventListener('click', handleCloseMenu);
  }, []);

  // Filtrado de comprobantes
  const filteredComprobantes = useMemo(() => {
    return comprobantes.filter(c => {
      // Búsqueda general (cliente, ruc/dni o número de comprobante)
      const query = search.toLowerCase();
      const matchesSearch =
        c.numero.toLowerCase().includes(query) ||
        c.clienteDoc.name.toLowerCase().includes(query) ||
        c.clienteDoc.number.includes(query);

      // Tipo de comprobante
      const matchesTipo = filterTipo === 'Todos' || c.tipo === filterTipo;

      // Estado SUNAT
      const matchesEstado = filterEstado === 'Todos' || c.estadoSunat === filterEstado;

      // Fechas (se asume formato DD/MM/AAAA)
      let matchesFecha = true;
      if (fechaDesde || fechaHasta) {
        // Convertimos fecha del comprobante (DD/MM/AAAA) a objeto Date
        const [dStr, tStr] = c.fecha.split(' ');
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

      // Montos
      let matchesMonto = true;
      if (montoMin && c.monto < parseFloat(montoMin)) matchesMonto = false;
      if (montoMax && c.monto > parseFloat(montoMax)) matchesMonto = false;

      return matchesSearch && matchesTipo && matchesEstado && matchesFecha && matchesMonto;
    });
  }, [comprobantes, search, filterTipo, filterEstado, fechaDesde, fechaHasta, montoMin, montoMax]);

  // Paginación de comprobantes filtrados
  const totalPages = Math.ceil(filteredComprobantes.length / itemsPerPage) || 1;
  const paginatedComprobantes = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredComprobantes.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredComprobantes, currentPage]);

  // Reset de página si cambian filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterTipo, filterEstado, fechaDesde, fechaHasta, montoMin, montoMax]);

  // Manejar descargas simuladas
  const handleDownload = (num: string, type: 'PDF' | 'XML' | 'CDR') => {
    triggerToast(`Descargando archivo ${type} de ${num}...`, 'info');
    setTimeout(() => {
      triggerToast(`${type} de ${num} descargado con éxito.`, 'success');
    }, 800);
  };

  // Comunicar baja ante SUNAT
  const handleBaja = (id: string, num: string) => {
    setComprobantes(prev =>
      prev.map(c => (c.id === id ? { ...c, estadoSunat: 'De Baja' } : c))
    );
    triggerToast(`Se ha enviado la comunicación de Baja para ${num}. SUNAT aceptó la baja.`, 'success');
  };

  // Reenviar a SUNAT (invoices pendientes o rechazados)
  const handleReenviarSunat = (id: string, num: string) => {
    triggerToast(`Reenviando comprobante ${num} a SUNAT...`, 'info');
    setTimeout(() => {
      setComprobantes(prev =>
        prev.map(c => (c.id === id ? { ...c, estadoSunat: 'Aceptado' } : c))
      );
      triggerToast(`SUNAT aceptó el comprobante ${num} de forma exitosa.`, 'success');
    }, 1200);
  };

  // Duplicar comprobante
  const handleDuplicar = (comp: Comprobante) => {
    const serie = comp.tipo === 'Boleta' ? 'B001' : 'F001';
    
    // Obtener siguiente seq
    const numbersOfSerie = comprobantes
      .filter(c => c.tipo === comp.tipo)
      .map(c => {
        const parts = c.numero.split('-');
        return parts.length > 1 ? parseInt(parts[1]) : 0;
      });
    const nextSeq = Math.max(...numbersOfSerie, 0) + 1;
    const nextNum = `${serie}-${String(nextSeq).padStart(6, '0')}`;

    const duplicate: Comprobante = {
      ...comp,
      id: `S-${Math.floor(100 + Math.random() * 900)}`,
      fecha: `${new Date().toLocaleDateString('es-PE')} ${new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`,
      numero: nextNum,
      estadoSunat: 'Aceptado',
      correoStatus: 'Pendiente',
      whatsappStatus: 'Pendiente',
      hash: Math.random().toString(36).slice(2, 14).toUpperCase()
    };

    setComprobantes(prev => [duplicate, ...prev]);

    // Opcionalmente agregar a la caja
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
        name: duplicate.clienteDoc.name
      }
    };
    addManualSale(sale);

    triggerToast(`Comprobante duplicado correctamente como ${nextNum}.`, 'success');
  };

  // Eliminar comprobante localmente
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

      {/* ── FILTROS Y BÚSQUEDA ── */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por cliente, RUC/DNI o nº comprobante..."
              className="input w-full pl-9 pr-3 py-2 text-xs"
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0">Tipo:</span>
            <select
              value={filterTipo}
              onChange={e => setFilterTipo(e.target.value as any)}
              className="input px-3 py-1.5 text-xs font-semibold"
            >
              <option value="Todos">Todos</option>
              <option value="Factura">Facturas</option>
              <option value="Boleta">Boletas</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0">SUNAT:</span>
            <select
              value={filterEstado}
              onChange={e => setFilterEstado(e.target.value as any)}
              className="input px-3 py-1.5 text-xs font-semibold"
            >
              <option value="Todos">Todos</option>
              <option value="Aceptado">Aceptado</option>
              <option value="Pendiente">Pendiente</option>
              <option value="Rechazado">Rechazado</option>
              <option value="De Baja">De Baja</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`btn-secondary text-[11px] py-1.5 px-3 ${showAdvanced ? 'bg-slate-200 border-slate-400' : ''}`}
          >
            Filtros avanzados
          </button>
        </div>

        {/* Panel de Filtros Avanzados */}
        {showAdvanced && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-slate-100 animate-section">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Fecha Desde</label>
              <input
                type="date"
                value={fechaDesde}
                onChange={e => setFechaDesde(e.target.value)}
                className="input w-full px-2 py-1.5 text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Fecha Hasta</label>
              <input
                type="date"
                value={fechaHasta}
                onChange={e => setFechaHasta(e.target.value)}
                className="input w-full px-2 py-1.5 text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Monto Mínimo (S/.)</label>
              <input
                type="number"
                placeholder="0.00"
                value={montoMin}
                onChange={e => setMontoMin(e.target.value)}
                className="input w-full px-2 py-1.5 text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Monto Máximo (S/.)</label>
              <input
                type="number"
                placeholder="1000.00"
                value={montoMax}
                onChange={e => setMontoMax(e.target.value)}
                className="input w-full px-2 py-1.5 text-xs"
              />
            </div>
          </div>
        )}
      </div>

      {/* ── TABLA DE RESULTADOS ── */}
      <div className="card-lg overflow-hidden relative shadow-sm border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 font-bold uppercase tracking-wider text-slate-500 font-sans">
                <th className="px-4 py-3 text-[10px]">Fecha</th>
                <th className="px-4 py-3 text-[10px]">Comprobante</th>
                <th className="px-4 py-3 text-[10px]">Cliente</th>
                <th className="px-4 py-3 text-[10px]">Tamaño</th>
                <th className="px-2 py-3 text-[10px] text-center">PDF</th>
                <th className="px-2 py-3 text-[10px] text-center">XML</th>
                <th className="px-2 py-3 text-[10px] text-center">CDR</th>
                <th className="px-3 py-3 text-[10px] text-center">SUNAT</th>
                <th className="px-2 py-3 text-[10px] text-center">Correo</th>
                <th className="px-2 py-3 text-[10px] text-center">WhatsApp</th>
                <th className="px-3 py-3 text-[10px] text-center">Ver</th>
                <th className="px-3 py-3 text-[10px] text-right">Opciones</th>
              </tr>
            </thead>
            <tbody>
              {paginatedComprobantes.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-12 text-center text-sm text-slate-400">
                    No se encontraron comprobantes emitidos.
                  </td>
                </tr>
              ) : (
                paginatedComprobantes.map(comp => {
                  const size = comprobanteSizes[comp.numero] || 'A4';
                  
                  // Iconos de SUNAT según estado
                  const sunatBadgeColor = {
                    Aceptado: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    Pendiente: 'bg-amber-50 text-amber-700 border-amber-200',
                    Rechazado: 'bg-rose-50 text-rose-700 border-rose-200',
                    'De Baja': 'bg-slate-100 text-slate-600 border-slate-200'
                  }[comp.estadoSunat];

                  const sunatIcon = {
                    Aceptado: <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />,
                    Pendiente: <Clock className="h-3 w-3 text-amber-600 shrink-0 animate-pulse" />,
                    Rechazado: <AlertTriangle className="h-3 w-3 text-rose-600 shrink-0" />,
                    'De Baja': <X className="h-3 w-3 text-slate-500 shrink-0" />
                  }[comp.estadoSunat];

                  // Colores de correo y whatsapp
                  const correoIsEnviado = comp.correoStatus === 'Enviado';
                  const whatsappIsEnviado = comp.whatsappStatus === 'Enviado';

                  return (
                    <tr
                      key={comp.numero}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition-colors"
                    >
                      {/* Fecha */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-slate-600 font-medium">
                        {comp.fecha.split(' ')[0]}
                        <span className="block text-[10px] text-slate-400 font-normal">{comp.fecha.split(' ')[1]}</span>
                      </td>

                      {/* Comprobante */}
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-800">{comp.numero}</div>
                        <div className="text-[10px] text-slate-400">
                          {comp.tipo} - <span className="font-semibold text-slate-600">S/ {comp.monto.toFixed(2)}</span>
                        </div>
                      </td>

                      {/* Cliente */}
                      <td className="px-4 py-3.5 max-w-[220px]">
                        <div className="text-[10px] font-mono text-slate-500 font-semibold">
                          {comp.clienteDoc.number}
                        </div>
                        <div className="font-semibold text-slate-700 truncate" title={comp.clienteDoc.name}>
                          {comp.clienteDoc.name}
                        </div>
                      </td>

                      {/* Tamaño */}
                      <td className="px-4 py-3.5">
                        <select
                          value={size}
                          onChange={e => {
                            const newSize = e.target.value as any;
                            setComprobanteSizes(prev => ({ ...prev, [comp.numero]: newSize }));
                            triggerToast(`Formato de impresión para ${comp.numero} cambiado a ${newSize}`, 'info');
                          }}
                          className="input px-2 py-1 text-[11px] font-medium border-slate-200"
                        >
                          <option value="A4">A4</option>
                          <option value="Ticket 80mm">Ticket 80</option>
                          <option value="Ticket 58mm">Ticket 58</option>
                          <option value="A5">A5</option>
                        </select>
                      </td>

                      {/* PDF */}
                      <td className="px-2 py-3.5 text-center">
                        <button
                          onClick={() => handleDownload(comp.numero, 'PDF')}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-colors"
                          title="Descargar PDF"
                        >
                          <FileText className="h-4 w-4" />
                        </button>
                      </td>

                      {/* XML */}
                      <td className="px-2 py-3.5 text-center">
                        <button
                          onClick={() => handleDownload(comp.numero, 'XML')}
                          className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 border border-transparent hover:border-emerald-100 transition-colors"
                          title="Descargar XML"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                      </td>

                      {/* CDR */}
                      <td className="px-2 py-3.5 text-center">
                        <button
                          onClick={() => handleDownload(comp.numero, 'CDR')}
                          className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 transition-colors"
                          title="Descargar CDR"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                      </td>

                      {/* Estado SUNAT */}
                      <td className="px-3 py-3.5 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${sunatBadgeColor}`}>
                          {sunatIcon}
                          {comp.estadoSunat}
                        </span>
                      </td>

                      {/* Correo */}
                      <td className="px-2 py-3.5 text-center relative">
                        <button
                          onClick={() => setEmailModalData({ open: true, comp, email: comp.correoDestino || '' })}
                          className={`p-1.5 rounded-lg border transition-all ${
                            correoIsEnviado 
                              ? 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100' 
                              : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100 border-transparent'
                          }`}
                          title={correoIsEnviado ? `Enviado a ${comp.correoDestino}` : 'Enviar por Correo'}
                        >
                          <Mail className="h-4 w-4" />
                          {correoIsEnviado && (
                            <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                            </span>
                          )}
                        </button>
                        {correoIsEnviado && (
                          <div className="text-[8px] text-blue-600 font-semibold mt-0.5">Enviado</div>
                        )}
                      </td>

                      {/* WhatsApp */}
                      <td className="px-2 py-3.5 text-center relative">
                        <button
                          onClick={() => setWhatsappModalData({ open: true, comp, phone: comp.whatsappDestino || '' })}
                          className={`p-1.5 rounded-lg border transition-all ${
                            whatsappIsEnviado 
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100' 
                              : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100 border-transparent'
                          }`}
                          title={whatsappIsEnviado ? `Enviado a +51 ${comp.whatsappDestino}` : 'Enviar por WhatsApp'}
                        >
                          <MessageCircle className="h-4 w-4" />
                          {whatsappIsEnviado && (
                            <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                          )}
                        </button>
                        {whatsappIsEnviado && (
                          <div className="text-[8px] text-emerald-600 font-semibold mt-0.5">Enviado</div>
                        )}
                      </td>

                      {/* Botón Ver */}
                      <td className="px-3 py-3.5 text-center">
                        <button
                          onClick={() => setSelectedComprobante(comp)}
                          className="btn-ghost py-1 px-2.5 text-[11px] font-semibold"
                        >
                          <Eye className="h-3.5 w-3.5" /> Ver
                        </button>
                      </td>

                      {/* Opciones Avanzadas de fila */}
                      <td className="px-3 py-3.5 text-right relative">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setActiveMenuId(activeMenuId === comp.numero ? null : comp.numero);
                          }}
                          className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>

                        {/* Menú desplegable flotante */}
                        {activeMenuId === comp.numero && (
                          <div
                            onClick={e => e.stopPropagation()}
                            className="absolute right-3 mt-1 w-48 bg-white rounded-lg border border-slate-200 shadow-lg z-30 py-1 text-left animate-section"
                          >
                            {comp.estadoSunat === 'Aceptado' && (
                              <button
                                onClick={() => {
                                  handleBaja(comp.id, comp.numero);
                                  setActiveMenuId(null);
                                }}
                                className="w-full px-3 py-2 text-[11px] text-slate-700 hover:bg-slate-50 hover:text-rose-600 flex items-center gap-2 border-b border-slate-100"
                              >
                                <Trash2 className="h-3.5 w-3.5 text-slate-400" /> Dar de Baja SUNAT
                              </button>
                            )}

                            {(comp.estadoSunat === 'Pendiente' || comp.estadoSunat === 'Rechazado') && (
                              <button
                                onClick={() => {
                                  handleReenviarSunat(comp.id, comp.numero);
                                  setActiveMenuId(null);
                                }}
                                className="w-full px-3 py-2 text-[11px] text-emerald-700 hover:bg-emerald-50 flex items-center gap-2 border-b border-slate-100"
                              >
                                <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Enviar a SUNAT
                              </button>
                            )}

                            <button
                              onClick={() => {
                                handleDuplicar(comp);
                                setActiveMenuId(null);
                              }}
                              className="w-full px-3 py-2 text-[11px] text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                            >
                              <PlusCircle className="h-3.5 w-3.5 text-slate-400" /> Duplicar Comprobante
                            </button>

                            <button
                              onClick={() => {
                                handleDownload(comp.numero, 'PDF');
                                handleDownload(comp.numero, 'XML');
                                handleDownload(comp.numero, 'CDR');
                                setActiveMenuId(null);
                              }}
                              className="w-full px-3 py-2 text-[11px] text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                            >
                              <Download className="h-3.5 w-3.5 text-slate-400" /> Descargar Todo (ZIP)
                            </button>

                            <button
                              onClick={() => {
                                handleEliminar(comp.id, comp.numero);
                                setActiveMenuId(null);
                              }}
                              className="w-full px-3 py-2 text-[11px] text-rose-600 hover:bg-rose-50 flex items-center gap-2 border-t border-slate-100"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Eliminar Registro
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── PAGINACIÓN ── */}
        <div className="bg-slate-50 px-4 py-3 flex items-center justify-between border-t border-slate-200">
          <div className="text-[11px] text-slate-500 font-semibold">
            Mostrando registros del <span className="font-bold text-slate-800">{Math.min((currentPage - 1) * itemsPerPage + 1, filteredComprobantes.length)}</span> al{' '}
            <span className="font-bold text-slate-800">{Math.min(currentPage * itemsPerPage, filteredComprobantes.length)}</span> de{' '}
            <span className="font-bold text-slate-800">{filteredComprobantes.length}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-1 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-[11px] text-slate-600 font-bold px-2 py-1 bg-white border border-slate-200 rounded">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>


      {/* ═══════════════════════════════════════════════════════════════
         MODALES Y VENTANAS EMERGENTES
         ═══════════════════════════════════════════════════════════════ */}

      {/* 1. MODAL DETALLE DE COMPROBANTE (VER) */}
      <Modal
        open={!!selectedComprobante}
        onClose={() => setSelectedComprobante(null)}
        title={`Visualizar Comprobante: ${selectedComprobante?.numero}`}
        subtitle={`${selectedComprobante?.tipo} Electrónica · S/ ${selectedComprobante?.monto.toFixed(2)}`}
        size="lg"
        fullHeight={true}
        footer={
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Formato:</span>
              <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                {comprobanteSizes[selectedComprobante?.numero || ''] || 'A4'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  triggerToast('Imprimiendo comprobante en impresora predeterminada...', 'info');
                }}
                className="btn-secondary py-1.5 px-3 flex items-center gap-1 text-[11px]"
              >
                <Printer className="h-3.5 w-3.5" /> Imprimir
              </button>
              <button
                onClick={() => handleDownload(selectedComprobante!.numero, 'PDF')}
                className="btn-primary py-1.5 px-3 flex items-center gap-1 text-[11px]"
              >
                <Download className="h-3.5 w-3.5" /> Descargar PDF
              </button>
              <button
                onClick={() => setSelectedComprobante(null)}
                className="btn-secondary py-1.5 px-3 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                Cerrar
              </button>
            </div>
          </div>
        }
      >
        {selectedComprobante && (
          <div className="flex justify-center p-3 bg-slate-100 rounded-xl max-h-[60vh] overflow-y-auto">
            {/* Formato Ticket (80mm o 58mm) */}
            {((comprobanteSizes[selectedComprobante.numero] || 'A4') === 'Ticket 80mm' || 
              (comprobanteSizes[selectedComprobante.numero] || 'A4') === 'Ticket 58mm') ? (
              <div 
                className={`bg-white p-6 shadow-sm border border-slate-200 font-mono text-slate-800 text-[11px] leading-tight select-text ${
                  (comprobanteSizes[selectedComprobante.numero] || 'A4') === 'Ticket 58mm' ? 'w-[230px]' : 'w-[300px]'
                }`}
              >
                {/* Logo y Encabezado de Ticket */}
                <div className="text-center space-y-1 mb-4">
                  <div className="font-bold text-sm tracking-wider">RESTOPRO PERÚ S.A.C.</div>
                  <div>R.U.C.: 20601234567</div>
                  <div>Av. Javier Prado Este 1234, San Isidro, Lima</div>
                  <div>Telf: (01) 444-5555</div>
                  <div className="border-b border-dashed border-slate-400 py-1"></div>
                </div>

                {/* Info Comprobante */}
                <div className="space-y-1 mb-3">
                  <div className="font-bold text-center text-xs tracking-wider">
                    {selectedComprobante.tipo.toUpperCase()} ELECTRÓNICA
                  </div>
                  <div className="font-bold text-center text-xs">{selectedComprobante.numero}</div>
                  <div className="border-b border-dashed border-slate-400 py-1"></div>
                  <div>FECHA: {selectedComprobante.fecha}</div>
                  <div>CAJA: 01 (PRINCIPAL)</div>
                  <div>CAJERO: Administrador</div>
                  <div>MÉTODO: {selectedComprobante.metodoPago}</div>
                  <div>CLIENTE: {selectedComprobante.clienteDoc.name}</div>
                  <div>{selectedComprobante.clienteDoc.type}: {selectedComprobante.clienteDoc.number}</div>
                  <div className="border-b border-dashed border-slate-400 py-1"></div>
                </div>

                {/* Ítems del Ticket */}
                <table className="w-full mb-3 text-[10px]">
                  <thead>
                    <tr className="border-b border-dashed border-slate-400 font-bold text-left">
                      <th className="pb-1">DESCRIPCIÓN</th>
                      <th className="pb-1 text-center">CANT</th>
                      <th className="pb-1 text-right">P.U.</th>
                      <th className="pb-1 text-right">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedComprobante.items.map((item, idx) => (
                      <tr key={idx} className="border-b border-slate-100 last:border-0">
                        <td className="py-1 uppercase max-w-[120px] truncate">{item.name}</td>
                        <td className="py-1 text-center">{item.quantity}</td>
                        <td className="py-1 text-right">{item.price.toFixed(2)}</td>
                        <td className="py-1 text-right">{(item.quantity * item.price).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totales del Ticket */}
                <div className="border-t border-dashed border-slate-400 pt-2 space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span>OP. GRAVADA:</span>
                    <span>S/ {selectedComprobante.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>I.G.V. (18%):</span>
                    <span>S/ {selectedComprobante.igv.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-xs pt-1 border-t border-slate-200">
                    <span>TOTAL COMPRA:</span>
                    <span>S/ {selectedComprobante.monto.toFixed(2)}</span>
                  </div>
                  <div className="border-b border-dashed border-slate-400 py-1"></div>
                </div>

                {/* Firma Digital y QR */}
                <div className="flex flex-col items-center justify-center pt-3 text-center space-y-2">
                  <div className="bg-white p-1 border border-slate-200 rounded">
                    <QRCodeSVG 
                      value={`20601234567|${selectedComprobante.tipo === 'Boleta' ? '03' : '01'}|${selectedComprobante.numero.split('-')[0]}|${selectedComprobante.numero.split('-')[1]}|${selectedComprobante.igv.toFixed(2)}|${selectedComprobante.monto.toFixed(2)}|${selectedComprobante.fecha.split(' ')[0]}|${selectedComprobante.clienteDoc.type === 'RUC' ? '6' : '1'}|${selectedComprobante.clienteDoc.number}`}
                      size={80}
                      level="M"
                    />
                  </div>
                  <div className="text-[9px] text-slate-500 font-mono">
                    HASH: {selectedComprobante.hash}
                  </div>
                  <div className="text-[9px] text-slate-400 mt-2 font-sans font-semibold">
                    Representación impresa de la {selectedComprobante.tipo} Electrónica. Autorizado mediante resolución de SUNAT.
                  </div>
                </div>
              </div>
            ) : (
              /* Formato Documento (A4 o A5) */
              <div className="bg-white p-8 shadow-sm border border-slate-200 text-slate-800 font-sans text-xs w-[540px] select-text">
                {/* Cabecera A4 */}
                <div className="grid grid-cols-2 gap-4 pb-6 border-b border-slate-200">
                  <div className="space-y-1">
                    <div className="text-base font-bold text-brand uppercase tracking-wide">RESTOPRO PERÚ S.A.C.</div>
                    <div className="text-[10px] text-slate-500">
                      Servicios de Restaurantes y Concesionarios<br />
                      Av. Javier Prado Este 1234, San Isidro, Lima<br />
                      Telf: (01) 444-5555 · ventas@restopro.pe
                    </div>
                  </div>
                  <div className="border-2 border-brand p-3 rounded-lg text-center bg-slate-50 flex flex-col justify-center">
                    <div className="text-xs font-bold text-brand font-mono">R.U.C. 20601234567</div>
                    <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wide mt-1">
                      {selectedComprobante.tipo === 'Factura' ? 'FACTURA ELECTRÓNICA' : 'BOLETA DE VENTA ELECTRÓNICA'}
                    </div>
                    <div className="text-sm font-extrabold text-slate-900 font-mono mt-1">
                      {selectedComprobante.numero}
                    </div>
                  </div>
                </div>

                {/* Info Cliente A4 */}
                <div className="grid grid-cols-2 gap-4 py-4 border-b border-slate-100">
                  <div className="space-y-1">
                    <div className="flex"><span className="font-bold text-slate-500 w-24">Adquiriente:</span> <span className="font-semibold text-slate-800">{selectedComprobante.clienteDoc.name}</span></div>
                    <div className="flex">
                      <span className="font-bold text-slate-500 w-24">{selectedComprobante.clienteDoc.type}:</span> 
                      <span className="font-mono">{selectedComprobante.clienteDoc.number}</span>
                    </div>
                    <div className="flex"><span className="font-bold text-slate-500 w-24">Dirección:</span> <span className="text-slate-600">Lima, Perú</span></div>
                  </div>
                  <div className="space-y-1 text-right">
                    <div><span className="font-bold text-slate-500">Fecha de Emisión:</span> <span className="font-medium text-slate-800">{selectedComprobante.fecha}</span></div>
                    <div><span className="font-bold text-slate-500">Moneda:</span> <span className="font-medium text-slate-800">Soles (PEN)</span></div>
                    <div><span className="font-bold text-slate-500">Forma de Pago:</span> <span className="font-medium text-slate-800">Contado ({selectedComprobante.metodoPago})</span></div>
                  </div>
                </div>

                {/* Tabla de ítems A4 */}
                <table className="w-full my-6">
                  <thead>
                    <tr className="border-b border-slate-300 text-left bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="px-2 py-2">Ítem</th>
                      <th className="px-2 py-2">Descripción</th>
                      <th className="px-2 py-2 text-center">Cant.</th>
                      <th className="px-2 py-2 text-right">Valor Unit.</th>
                      <th className="px-2 py-2 text-right">Importe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedComprobante.items.map((item, idx) => (
                      <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                        <td className="px-2 py-2 font-mono text-[10px] text-slate-400">{String(idx + 1).padStart(2, '0')}</td>
                        <td className="px-2 py-2 font-semibold text-slate-700 uppercase">{item.name}</td>
                        <td className="px-2 py-2 text-center">{item.quantity}</td>
                        <td className="px-2 py-2 text-right">{(item.price / 1.18).toFixed(2)}</td>
                        <td className="px-2 py-2 text-right">{(item.quantity * item.price).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pie y Resumen de Totales A4 */}
                <div className="grid grid-cols-12 gap-4 border-t border-slate-200 pt-4">
                  <div className="col-span-8 flex gap-4 items-center">
                    <div className="bg-white p-1.5 border border-slate-200 rounded shrink-0">
                      <QRCodeSVG 
                        value={`20601234567|${selectedComprobante.tipo === 'Boleta' ? '03' : '01'}|${selectedComprobante.numero.split('-')[0]}|${selectedComprobante.numero.split('-')[1]}|${selectedComprobante.igv.toFixed(2)}|${selectedComprobante.monto.toFixed(2)}|${selectedComprobante.fecha.split(' ')[0]}|${selectedComprobante.clienteDoc.type === 'RUC' ? '6' : '1'}|${selectedComprobante.clienteDoc.number}`}
                        size={90}
                        level="M"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="text-[9px] font-mono text-slate-500">
                        Representación impresa de la {selectedComprobante.tipo} Electrónica.<br />
                        Consulte en el portal: <span className="underline">https://restopro.pe/consultas</span><br />
                        Código Hash: <span className="font-bold">{selectedComprobante.hash}</span>
                      </div>
                    </div>
                  </div>
                  <div className="col-span-4 space-y-1.5 text-right font-medium">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Op. Gravada:</span>
                      <span className="font-mono text-slate-700">S/ {selectedComprobante.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">I.G.V. (18%):</span>
                      <span className="font-mono text-slate-700">S/ {selectedComprobante.igv.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-brand font-bold text-xs pt-1.5 border-t border-slate-200">
                      <span>Importe Total:</span>
                      <span className="font-mono">S/ {selectedComprobante.monto.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* 2. MODAL PARA EMITIR NUEVO COMPROBANTE MANUALLY */}
      <NewReceiptModal
        open={showNewModal}
        onClose={() => setShowNewModal(false)}
        onSubmit={newComp => {
          // Agregar a nuestro listado local de comprobantes
          setComprobantes(prev => [newComp, ...prev]);

          // Agregar al historial global en AppContext
          const sale: SalesHistory = {
            id: newComp.id,
            time: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
            itemsCount: newComp.items.reduce((acc, curr) => acc + curr.quantity, 0),
            paymentMethod: newComp.metodoPago,
            total: newComp.monto,
            table: 'Emisión Directa',
            docType: newComp.tipo,
            comprobante: newComp.numero,
            waiter: 'Cajero',
            cashier: 'Cajero Principal',
            customerDoc: {
              type: newComp.clienteDoc.type,
              number: newComp.clienteDoc.number,
              name: newComp.clienteDoc.name
            }
          };
          addManualSale(sale);

          triggerToast(`Comprobante ${newComp.numero} emitido correctamente ante SUNAT.`, 'success');
          setShowNewModal(false);
        }}
        comprobantesList={comprobantes}
      />

      {/* 3. MODAL DE CARGA MASIVA */}
      <MassUploadModal
        open={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUploadComplete={newComps => {
          setComprobantes(prev => [...newComps, ...prev]);
          triggerToast(`Carga masiva finalizada. Se importaron ${newComps.length} comprobantes.`, 'success');
          setShowUploadModal(false);
        }}
      />

      {/* 4. MODAL ENVIAR CORREO */}
      <EmailModal
        data={emailModalData}
        onClose={() => setEmailModalData({ open: false, comp: null, email: '' })}
        onSuccess={(num, targetEmail) => {
          setComprobantes(prev =>
            prev.map(c => (c.numero === num ? { ...c, correoStatus: 'Enviado', correoDestino: targetEmail } : c))
          );
          triggerToast(`Comprobante ${num} enviado con éxito a ${targetEmail}.`, 'success');
        }}
      />

      {/* 5. MODAL ENVIAR WHATSAPP */}
      <WhatsAppModal
        data={whatsappModalData}
        onClose={() => setWhatsappModalData({ open: false, comp: null, phone: '' })}
        onSuccess={(num, targetPhone) => {
          setComprobantes(prev =>
            prev.map(c => (c.numero === num ? { ...c, whatsappStatus: 'Enviado', whatsappDestino: targetPhone } : c))
          );
          triggerToast(`Mensaje con link del comprobante ${num} enviado por WhatsApp a +51 ${targetPhone}.`, 'success');
        }}
      />

    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SUBCOMPONENTE: MODAL DE NUEVO COMPROBANTE
// ═══════════════════════════════════════════════════════════════════════════
interface NewReceiptModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (comp: Comprobante) => void;
  comprobantesList: Comprobante[];
}

function NewReceiptModal({ open, onClose, onSubmit, comprobantesList }: NewReceiptModalProps) {
  const [tipo, setTipo] = useState<'Boleta' | 'Factura'>('Boleta');
  const [clientSelection, setClientSelection] = useState<'existente' | 'nuevo'>('existente');
  const [selectedCustId, setSelectedCustId] = useState('');
  
  // Datos de cliente nuevo
  const [clientDocType, setClientDocType] = useState<'DNI' | 'RUC'>('DNI');
  const [clientNumber, setClientNumber] = useState('');
  const [clientName, setClientName] = useState('');

  // Ítems seleccionados
  const [selectedItems, setSelectedItems] = useState<{ productId: string; quantity: number; price: number }[]>([
    { productId: '', quantity: 1, price: 0 }
  ]);

  const [metodoPago, setMetodoPago] = useState<PaymentMethod>('Efectivo');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Al cambiar el tipo de comprobante, ajustar el tipo de documento del cliente por defecto
  useEffect(() => {
    setClientDocType(tipo === 'Factura' ? 'RUC' : 'DNI');
  }, [tipo]);

  // Obtener datos del cliente actual
  const currentClient = useMemo(() => {
    if (clientSelection === 'existente') {
      const cust = MOCK_CUSTOMERS.find(c => c.id === selectedCustId);
      if (cust) {
        // Simular tipo e identificación del cliente de la base de datos
        // Ya que MOCK_CUSTOMERS no tiene RUC, estimamos en base a longitud o creamos uno
        const isRuc = cust.nombre.toUpperCase().includes('S.A.C.') || cust.nombre.toUpperCase().includes('E.I.R.L.');
        return {
          name: cust.nombre,
          type: isRuc ? 'RUC' as const : 'DNI' as const,
          number: isRuc ? '2060' + Math.floor(1000000 + Math.random() * 9000000) : '4' + Math.floor(1000000 + Math.random() * 9000000)
        };
      }
    }
    return { name: clientName, type: clientDocType, number: clientNumber };
  }, [clientSelection, selectedCustId, clientName, clientDocType, clientNumber]);

  // Cálculos de montos
  const calculatedTotals = useMemo(() => {
    let subtotalTotal = 0;
    selectedItems.forEach(item => {
      const p = MOCK_PRODUCTS.find(prod => prod.id === item.productId);
      if (p) {
        subtotalTotal += item.quantity * (item.price || p.price);
      }
    });

    const subtotal = subtotalTotal / 1.18;
    const igv = subtotalTotal - subtotal;

    return {
      total: subtotalTotal,
      subtotal,
      igv
    };
  }, [selectedItems]);

  const handleAddItem = () => {
    setSelectedItems(prev => [...prev, { productId: '', quantity: 1, price: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (selectedItems.length > 1) {
      setSelectedItems(prev => prev.filter((_, idx) => idx !== index));
    }
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    setSelectedItems(prev =>
      prev.map((item, idx) => {
        if (idx === index) {
          const updated = { ...item, [field]: value };
          // Si cambia el producto, auto-completar el precio unitario
          if (field === 'productId') {
            const p = MOCK_PRODUCTS.find(prod => prod.id === value);
            if (p) updated.price = p.price;
          }
          return updated;
        }
        return item;
      })
    );
  };

  const handleEmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones básicas
    if (!currentClient.name.trim()) {
      alert('Debe ingresar o seleccionar un cliente.');
      return;
    }
    if (tipo === 'Factura' && currentClient.number.length !== 11) {
      alert('El RUC para una Factura debe tener exactamente 11 dígitos.');
      return;
    }
    if (tipo === 'Boleta' && currentClient.number && currentClient.number.length !== 8) {
      alert('El DNI para una Boleta debe tener exactamente 8 dígitos.');
      return;
    }

    const validItems = selectedItems.filter(i => i.productId);
    if (validItems.length === 0) {
      alert('Debe agregar al menos un producto válido al comprobante.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Simular llamada al endpoint de facturación /api/emitir-comprobante
      const reqBody = {
        docType: tipo,
        total: calculatedTotals.total,
        customer: {
          type: currentClient.type,
          number: currentClient.number,
          name: currentClient.name
        },
        items: validItems.map(i => {
          const prod = MOCK_PRODUCTS.find(p => p.id === i.productId)!;
          return {
            name: prod.name,
            quantity: i.quantity,
            price: i.price || prod.price
          };
        })
      };

      const res = await fetch('/api/emitir-comprobante', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqBody)
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'error_api');
      }

      // Generar serie correlativa
      const serie = tipo === 'Boleta' ? 'B001' : 'F001';
      const numbersOfSerie = comprobantesList
        .filter(c => c.tipo === tipo)
        .map(c => {
          const parts = c.numero.split('-');
          return parts.length > 1 ? parseInt(parts[1]) : 0;
        });
      const nextSeq = Math.max(...numbersOfSerie, 0) + 1;
      const docNum = `${serie}-${String(nextSeq).padStart(6, '0')}`;

      const newComp: Comprobante = {
        id: `S-${Math.floor(100 + Math.random() * 900)}`,
        fecha: `${new Date().toLocaleDateString('es-PE')} ${new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`,
        tipo,
        numero: docNum,
        clienteDoc: {
          type: currentClient.type,
          number: currentClient.number,
          name: currentClient.name.toUpperCase()
        },
        monto: calculatedTotals.total,
        subtotal: calculatedTotals.subtotal,
        igv: calculatedTotals.igv,
        estadoSunat: 'Aceptado',
        correoStatus: 'Pendiente',
        whatsappStatus: 'Pendiente',
        metodoPago,
        hash: data.hash || Math.random().toString(36).slice(2, 14).toUpperCase(),
        items: validItems.map(i => {
          const prod = MOCK_PRODUCTS.find(p => p.id === i.productId)!;
          return {
            name: prod.name,
            quantity: i.quantity,
            price: i.price || prod.price
          };
        })
      };

      onSubmit(newComp);
      
      // Limpiar formulario
      setSelectedCustId('');
      setClientNumber('');
      setClientName('');
      setSelectedItems([{ productId: '', quantity: 1, price: 0 }]);
    } catch (err: any) {
      console.error(err);
      alert('Error al emitir comprobante electrónico ante SUNAT. Verifique la clave SOL o los datos tributarios del cliente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Emitir Nuevo Comprobante Electrónico`}
      subtitle="Generación directa de boletas y facturas conectada con la SUNAT"
      size="lg"
      fullHeight={true}
    >
      <form onSubmit={handleEmit} className="space-y-4">
        {/* Tipo y Método */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tipo de Comprobante</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTipo('Boleta')}
                className={`flex-1 py-2 text-center rounded-lg border text-xs font-bold transition-colors ${
                  tipo === 'Boleta' 
                    ? 'bg-brand/10 border-brand text-brand' 
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                🧾 Boleta de Venta
              </button>
              <button
                type="button"
                onClick={() => setTipo('Factura')}
                className={`flex-1 py-2 text-center rounded-lg border text-xs font-bold transition-colors ${
                  tipo === 'Factura' 
                    ? 'bg-brand/10 border-brand text-brand' 
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                🏢 Factura Comercial
              </button>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Método de Pago</label>
            <select
              value={metodoPago}
              onChange={e => setMetodoPago(e.target.value as PaymentMethod)}
              className="input w-full px-3 py-2 text-xs font-semibold animate-none"
            >
              <option value="Efectivo">💵 Efectivo (Contado)</option>
              <option value="Tarjeta">💳 Tarjeta Crédito/Débito</option>
              <option value="Yape / Plin">📱 Yape / Plin</option>
            </select>
          </div>
        </div>

        {/* Datos del Cliente */}
        <div className="border border-slate-200 rounded-xl p-3.5 space-y-3.5 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <h5 className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Datos del Adquiriente (Cliente)</h5>
            <div className="flex gap-2 text-[10px] font-semibold">
              <button
                type="button"
                onClick={() => setClientSelection('existente')}
                className={`px-2 py-0.5 rounded-full ${clientSelection === 'existente' ? 'bg-brand text-white' : 'bg-slate-200 text-slate-600'}`}
              >
                Buscar CRM
              </button>
              <button
                type="button"
                onClick={() => setClientSelection('nuevo')}
                className={`px-2 py-0.5 rounded-full ${clientSelection === 'nuevo' ? 'bg-brand text-white' : 'bg-slate-200 text-slate-600'}`}
              >
                Ingreso Manual
              </button>
            </div>
          </div>

          {clientSelection === 'existente' ? (
            <div>
              <label className="block text-[10px] text-slate-500 uppercase mb-1">Seleccionar Cliente del CRM</label>
              <select
                value={selectedCustId}
                onChange={e => setSelectedCustId(e.target.value)}
                className="input w-full px-3 py-2 text-xs"
                required={clientSelection === 'existente'}
              >
                <option value="">-- Buscar por Nombre en CRM --</option>
                {MOCK_CUSTOMERS.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} (Último pedido: {c.ultimaCompra})
                  </option>
                ))}
              </select>
              {selectedCustId && (
                <div className="mt-2 text-[10px] text-slate-500 font-medium font-sans">
                  {currentClient.type}: <span className="font-mono text-slate-700 font-bold">{currentClient.number}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-3">
                <label className="block text-[10px] text-slate-500 uppercase mb-1">Doc</label>
                <select
                  value={clientDocType}
                  onChange={e => setClientDocType(e.target.value as any)}
                  className="input w-full px-2 py-2 text-xs"
                >
                  <option value="DNI">DNI</option>
                  <option value="RUC">RUC</option>
                </select>
              </div>
              <div className="col-span-4">
                <label className="block text-[10px] text-slate-500 uppercase mb-1">Nº Documento</label>
                <input
                  type="text"
                  maxLength={clientDocType === 'RUC' ? 11 : 8}
                  placeholder={clientDocType === 'RUC' ? '20601234567' : '10203040'}
                  value={clientNumber}
                  onChange={e => setClientNumber(e.target.value.replace(/\D/g, ''))}
                  className="input w-full px-2 py-2 text-xs font-mono"
                  required={clientSelection === 'nuevo'}
                />
              </div>
              <div className="col-span-5">
                <label className="block text-[10px] text-slate-500 uppercase mb-1">Nombre / Razón Social</label>
                <input
                  type="text"
                  placeholder="PANIBRA SAC"
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  className="input w-full px-3 py-2 text-xs"
                  required={clientSelection === 'nuevo'}
                />
              </div>
            </div>
          )}
        </div>

        {/* Productos e Ítems */}
        <div className="border border-slate-200 rounded-xl p-3.5 space-y-3.5 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <h5 className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Conceptos / Líneas de Venta</h5>
            <button
              type="button"
              onClick={handleAddItem}
              className="text-[10px] text-brand font-bold flex items-center gap-1 bg-white hover:bg-brand/5 border border-brand/20 px-2 py-0.5 rounded transition-all"
            >
              + Agregar Concepto
            </button>
          </div>

          <div className="max-h-[160px] overflow-y-auto space-y-2 pr-1">
            {selectedItems.map((item, idx) => {
              const currentProd = MOCK_PRODUCTS.find(p => p.id === item.productId);
              return (
                <div key={idx} className="flex gap-2 items-center">
                  <div className="flex-1">
                    <select
                      value={item.productId}
                      onChange={e => handleItemChange(idx, 'productId', e.target.value)}
                      className="input w-full px-2 py-1.5 text-[11px]"
                      required
                    >
                      <option value="">-- Seleccionar Plato / Bebida --</option>
                      {MOCK_PRODUCTS.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} - S/ {p.price.toFixed(2)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-16">
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={e => handleItemChange(idx, 'quantity', parseInt(e.target.value) || 1)}
                      className="input w-full px-2 py-1.5 text-[11px] text-center"
                      title="Cantidad"
                    />
                  </div>
                  <div className="w-20">
                    <input
                      type="number"
                      step="0.01"
                      value={item.price || (currentProd?.price ?? 0)}
                      onChange={e => handleItemChange(idx, 'price', parseFloat(e.target.value) || 0)}
                      className="input w-full px-2 py-1.5 text-[11px] text-right font-mono"
                      title="Precio Unitario"
                    />
                  </div>
                  <div className="w-24 text-right font-mono font-semibold text-slate-800 text-[11px] px-2">
                    S/ {((item.quantity || 0) * (item.price || currentProd?.price || 0)).toFixed(2)}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    disabled={selectedItems.length <= 1}
                    className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 disabled:opacity-30 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Totales y Emisión */}
        <div className="grid grid-cols-12 gap-4 border-t border-slate-200 pt-4 items-center">
          <div className="col-span-8 flex justify-start gap-4 text-[10px] font-bold text-slate-500 font-mono">
            <div>SUBTOTAL: <span className="text-slate-800 text-xs">S/ {calculatedTotals.subtotal.toFixed(2)}</span></div>
            <div>I.G.V. (18%): <span className="text-slate-800 text-xs">S/ {calculatedTotals.igv.toFixed(2)}</span></div>
            <div>TOTAL COMPROBANTE: <span className="text-brand text-sm font-extrabold">S/ {calculatedTotals.total.toFixed(2)}</span></div>
          </div>
          <div className="col-span-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary py-2 px-3 text-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary py-2 px-4 text-xs font-bold flex items-center justify-center gap-1.5 min-w-[120px]"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Emitiendo...
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" /> Emitir SUNAT
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SUBCOMPONENTE: MODAL DE CARGA MASIVA (Drag and Drop XML)
// ═══════════════════════════════════════════════════════════════════════════
interface MassUploadModalProps {
  open: boolean;
  onClose: () => void;
  onUploadComplete: (newComps: Comprobante[]) => void;
}

function MassUploadModal({ open, onClose, onUploadComplete }: MassUploadModalProps) {
  const [progress, setProgress] = useState(-1); // -1: no cargando, 0-100: cargando
  const [loadedFiles, setLoadedFiles] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState('');

  const simulateUpload = () => {
    setLoadedFiles(['invoice_2026_01.xml', 'invoice_2026_02.xml', 'invoice_2026_03.xml', 'invoice_2026_04.xml', 'invoice_2026_05.xml']);
    setProgress(0);
    setCurrentStep('Leyendo firmas de archivos XML...');

    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            // Generar 5 comprobantes simulados
            const now = new Date();
            const dateStr = `${now.toLocaleDateString('es-PE')} ${now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`;
            const comps: Comprobante[] = [
              {
                id: 'M-1',
                fecha: dateStr,
                tipo: 'Factura',
                numero: 'F001-00015120',
                clienteDoc: { type: 'RUC', number: '20102030405', name: 'CORPORACION TEXTIL DEL SUR S.A.C.' },
                monto: 1500.00,
                subtotal: 1271.19,
                igv: 228.81,
                estadoSunat: 'Aceptado',
                correoStatus: 'Pendiente',
                whatsappStatus: 'Pendiente',
                metodoPago: 'Tarjeta',
                hash: 'FAB76A52C098',
                items: [{ name: 'Catering corporativo RestoPro', quantity: 1, price: 1500.00 }]
              },
              {
                id: 'M-2',
                fecha: dateStr,
                tipo: 'Factura',
                numero: 'F001-00015119',
                clienteDoc: { type: 'RUC', number: '20509080706', name: 'CONSTRUCTORA SAN GABRIEL S.A.' },
                monto: 890.00,
                subtotal: 754.24,
                igv: 135.76,
                estadoSunat: 'Aceptado',
                correoStatus: 'Pendiente',
                whatsappStatus: 'Pendiente',
                metodoPago: 'Tarjeta',
                hash: 'EAB65A41B087',
                items: [{ name: 'Almuerzos Ejecutivos Premium', quantity: 20, price: 44.50 }]
              },
              {
                id: 'M-3',
                fecha: dateStr,
                tipo: 'Boleta',
                numero: 'B001-00012205',
                clienteDoc: { type: 'DNI', number: '10987654', name: 'ALVARADO MEDINA CARLOS ENRIQUE' },
                monto: 110.00,
                subtotal: 93.22,
                igv: 16.78,
                estadoSunat: 'Aceptado',
                correoStatus: 'Pendiente',
                whatsappStatus: 'Pendiente',
                metodoPago: 'Efectivo',
                hash: 'DAB54A30A076',
                items: [
                  { name: 'Ceviche Clásico Carretillero', quantity: 2, price: 39.50 },
                  { name: 'Chicha Morada RestoPro (Jarra 1L)', quantity: 1, price: 18.00 },
                  { name: 'Suspiro a la Limeña de la Casa', quantity: 1, price: 16.00 }
                ]
              },
              {
                id: 'M-4',
                fecha: dateStr,
                tipo: 'Boleta',
                numero: 'B001-00012204',
                clienteDoc: { type: 'DNI', number: '20304050', name: 'GUERRERO QUISPE ELENA ISABEL' },
                monto: 68.00,
                subtotal: 57.63,
                igv: 10.37,
                estadoSunat: 'Aceptado',
                correoStatus: 'Pendiente',
                whatsappStatus: 'Pendiente',
                metodoPago: 'Yape / Plin',
                hash: 'CAB43A209065',
                items: [
                  { name: 'Ají de Gallina de la Abuela', quantity: 2, price: 34.00 }
                ]
              },
              {
                id: 'M-5',
                fecha: dateStr,
                tipo: 'Boleta',
                numero: 'B001-00012203',
                clienteDoc: { type: 'DNI', number: '09887766', name: 'LOPEZ VALENCIA JULIO CESAR' },
                monto: 96.50,
                subtotal: 81.78,
                igv: 14.72,
                estadoSunat: 'Aceptado',
                correoStatus: 'Pendiente',
                whatsappStatus: 'Pendiente',
                metodoPago: 'Efectivo',
                hash: 'BAB32A108054',
                items: [
                  { name: 'Lomo Saltado con Papas Amarillas', quantity: 2, price: 45.00 },
                  { name: 'Inka Kola Personal Vidrio', quantity: 1, price: 6.50 }
                ]
              }
            ];

            onUploadComplete(comps);
            setProgress(-1);
            setLoadedFiles([]);
          }, 800);
          return 100;
        }

        const nextVal = p + 20;
        if (nextVal === 40) setCurrentStep('Validando certificados digitales con el OSE...');
        if (nextVal === 80) setCurrentStep('Transmitiendo a SUNAT y registrando CDR...');
        return nextVal;
      });
    }, 400);
  };

  return (
    <Modal
      open={open}
      onClose={progress === -1 ? onClose : () => {}}
      title="Carga Masiva de XML (Comprobantes)"
      subtitle="Sube comprobantes emitidos en otros sistemas de facturación para guardarlos en RestoPro"
      size="md"
      fullHeight={false}
    >
      <div className="space-y-4">
        {progress === -1 ? (
          <div 
            onClick={simulateUpload}
            className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50 hover:bg-slate-100 hover:border-brand cursor-pointer transition-all flex flex-col items-center justify-center space-y-3 group"
          >
            <div className="bg-brand/10 p-4 rounded-full group-hover:scale-110 transition-transform">
              <UploadCloud className="h-8 w-8 text-brand" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-700">Arrastra archivos XML o haz click para explorar</p>
              <p className="text-[10px] text-slate-400 mt-1">Soporta múltiples archivos XML oficiales validados por SUNAT</p>
            </div>
          </div>
        ) : (
          <div className="border border-slate-200 rounded-xl p-6 bg-white space-y-4">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
              <span className="flex items-center gap-1.5"><FileSpreadsheet className="h-4 w-4 text-brand animate-pulse" /> {currentStep}</span>
              <span>{progress}%</span>
            </div>

            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div 
                className="bg-brand h-full rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>

            <div className="text-[10px] text-slate-400 max-h-[100px] overflow-y-auto font-mono space-y-1">
              {loadedFiles.map((file, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>{file}</span>
                  {progress >= (idx + 1) * 20 ? (
                    <span className="text-emerald-600 font-bold flex items-center gap-0.5"><Check className="h-3 w-3" /> OK</span>
                  ) : (
                    <span className="text-slate-400">Procesando...</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={progress !== -1}
            className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SUBCOMPONENTE: MODAL REENVIAR POR EMAIL
// ═══════════════════════════════════════════════════════════════════════════
interface EmailModalProps {
  data: { open: boolean; comp: Comprobante | null; email: string };
  onClose: () => void;
  onSuccess: (num: string, email: string) => void;
}

function EmailModal({ data, onClose, onSuccess }: EmailModalProps) {
  const [emailInput, setEmailInput] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (data.email) setEmailInput(data.email);
    else setEmailInput('');
  }, [data.email]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;

    setSending(true);
    setTimeout(() => {
      setSending(false);
      onSuccess(data.comp!.numero, emailInput);
      onClose();
    }, 1000);
  };

  return (
    <Modal
      open={data.open}
      onClose={onClose}
      title="Enviar Comprobante por Correo"
      subtitle={`Comprobante: ${data.comp?.numero}`}
      size="sm"
      fullHeight={false}
    >
      <form onSubmit={handleSend} className="space-y-4">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Correo Electrónico del Destinatario</label>
          <input
            type="email"
            value={emailInput}
            onChange={e => setEmailInput(e.target.value)}
            placeholder="ejemplo@correo.com"
            className="input w-full px-3 py-2 text-xs"
            required
            disabled={sending}
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={sending || !emailInput.trim()}
            className="btn-primary py-1.5 px-4 text-xs font-bold flex items-center gap-1 disabled:opacity-50"
          >
            {sending ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Enviando...
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" /> Enviar Correo
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SUBCOMPONENTE: MODAL REENVIAR POR WHATSAPP
// ═══════════════════════════════════════════════════════════════════════════
interface WhatsAppModalProps {
  data: { open: boolean; comp: Comprobante | null; phone: string };
  onClose: () => void;
  onSuccess: (num: string, phone: string) => void;
}

function WhatsAppModal({ data, onClose, onSuccess }: WhatsAppModalProps) {
  const [phoneInput, setPhoneInput] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (data.phone) setPhoneInput(data.phone);
    else setPhoneInput('');
  }, [data.phone]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneInput.trim()) return;

    setSending(true);
    setTimeout(() => {
      setSending(false);
      onSuccess(data.comp!.numero, phoneInput);
      onClose();
    }, 1000);
  };

  return (
    <Modal
      open={data.open}
      onClose={onClose}
      title="Enviar Comprobante por WhatsApp"
      subtitle={`Comprobante: ${data.comp?.numero}`}
      size="sm"
      fullHeight={false}
    >
      <form onSubmit={handleSend} className="space-y-4">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Número Celular de Envío</label>
          <div className="flex gap-2 items-center">
            <span className="text-slate-400 text-xs font-bold font-mono px-2 py-1.5 bg-slate-100 rounded border border-slate-200 select-none">
              +51 (PE)
            </span>
            <input
              type="tel"
              maxLength={9}
              value={phoneInput}
              onChange={e => setPhoneInput(e.target.value.replace(/\D/g, ''))}
              placeholder="987654321"
              className="input w-full px-3 py-2 text-xs font-mono"
              required
              disabled={sending}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={sending || phoneInput.length !== 9}
            className="btn-primary py-1.5 px-4 text-xs font-bold flex items-center gap-1 disabled:opacity-50 bg-emerald-600 hover:bg-emerald-700"
          >
            {sending ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Enviando...
              </>
            ) : (
              <>
                <MessageCircle className="h-3.5 w-3.5" /> Enviar WhatsApp
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

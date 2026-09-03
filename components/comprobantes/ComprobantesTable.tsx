'use client';

import {
  AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Clock, Download, Eye,
  FileText, Mail, MessageCircle, MoreVertical, PlusCircle, MinusCircle, RefreshCw, Send, Trash2, X,
} from 'lucide-react';
import { TIPO_COMPROBANTE_LABEL, type Comprobante, type FormatoImpresion } from './types';

interface ComprobantesTableProps {
  paginatedComprobantes: Comprobante[];
  filteredCount: number;
  comprobanteSizes: Record<string, FormatoImpresion>;
  setComprobanteSizes: React.Dispatch<React.SetStateAction<Record<string, FormatoImpresion>>>;
  activeMenuId: string | null;
  setActiveMenuId: (id: string | null) => void;
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  setSelectedComprobante: (comp: Comprobante | null) => void;
  setEmailModalData: (data: { open: boolean; comp: Comprobante | null; email: string }) => void;
  setWhatsappModalData: (data: { open: boolean; comp: Comprobante | null; phone: string }) => void;
  onDownload: (num: string, type: 'PDF' | 'XML' | 'CDR') => void;
  onBaja: (id: string, num: string) => void;
  onReenviarSunat: (id: string, num: string) => void;
  onEmitir: (id: string, num: string) => void;
  onGenerarNota: (comp: Comprobante, tipoNota: 'credito' | 'debito') => void;
  onDuplicar: (comp: Comprobante) => void;
  onEliminar: (id: string, num: string) => void;
  triggerToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

/** Tabla de comprobantes emitidos con acciones por fila y paginación. */
export default function ComprobantesTable({
  paginatedComprobantes, filteredCount, comprobanteSizes, setComprobanteSizes,
  activeMenuId, setActiveMenuId, currentPage, totalPages, itemsPerPage, setCurrentPage,
  setSelectedComprobante, setEmailModalData, setWhatsappModalData,
  onDownload, onBaja, onReenviarSunat, onEmitir, onGenerarNota, onDuplicar, onEliminar, triggerToast,
}: ComprobantesTableProps) {
  return (
    <>
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
                  const esTicket = !comp.tieneSunat;
                  const esNota = comp.tipo === 'NotaCredito' || comp.tipo === 'NotaDebito';
                  const nuncaEmitido = !esTicket && !comp.comprobanteIdExterno;

                  // Iconos de SUNAT según estado
                  const sunatBadgeColor = comp.estadoSunat ? ({
                    Aceptado: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    Pendiente: 'bg-amber-50 text-amber-700 border-amber-200',
                    Rechazado: 'bg-rose-50 text-rose-700 border-rose-200',
                    'De Baja': 'bg-slate-100 text-slate-600 border-slate-200'
                  } as Record<string, string>)[comp.estadoSunat] : 'bg-slate-50 text-slate-400 border-slate-100';

                  const sunatIcon = comp.estadoSunat ? ({
                    Aceptado: <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />,
                    Pendiente: <Clock className="h-3 w-3 text-amber-600 shrink-0 animate-pulse" />,
                    Rechazado: <AlertTriangle className="h-3 w-3 text-rose-600 shrink-0" />,
                    'De Baja': <X className="h-3 w-3 text-slate-500 shrink-0" />
                  } as Record<string, React.ReactNode>)[comp.estadoSunat] : null;

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
                          {TIPO_COMPROBANTE_LABEL[comp.tipo]} - <span className="font-semibold text-slate-600">S/ {comp.monto.toFixed(2)}</span>
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
                          onClick={() => onDownload(comp.id, 'PDF')}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-colors"
                          title="Descargar PDF"
                        >
                          <FileText className="h-4 w-4" />
                        </button>
                      </td>

                      {/* XML */}
                      <td className="px-2 py-3.5 text-center">
                        <button
                          onClick={() => !esTicket && onDownload(comp.id, 'XML')}
                          disabled={esTicket}
                          className={`p-1.5 rounded-lg border border-transparent transition-colors ${
                            esTicket
                              ? 'text-slate-300 cursor-not-allowed'
                              : 'text-emerald-600 hover:bg-emerald-50 hover:border-emerald-100'
                          }`}
                          title={esTicket ? 'No disponible para tickets' : 'Descargar XML'}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                      </td>

                      {/* CDR */}
                      <td className="px-2 py-3.5 text-center">
                        <button
                          onClick={() => !esTicket && onDownload(comp.id, 'CDR')}
                          disabled={esTicket}
                          className={`p-1.5 rounded-lg border border-transparent transition-colors ${
                            esTicket
                              ? 'text-slate-300 cursor-not-allowed'
                              : 'text-indigo-600 hover:bg-indigo-50 hover:border-indigo-100'
                          }`}
                          title={esTicket ? 'No disponible para tickets' : 'Descargar CDR'}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                      </td>

                      {/* Estado SUNAT */}
                      <td className="px-3 py-3.5 text-center whitespace-nowrap">
                        {esTicket ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold bg-slate-50 text-slate-400 border-slate-100">
                            — N/A
                          </span>
                        ) : (
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${sunatBadgeColor}`}>
                            {sunatIcon}
                            {comp.estadoSunat}
                          </span>
                        )}
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
                            {!esTicket && comp.estadoSunat === 'Aceptado' && (
                              <button
                                onClick={() => {
                                  onBaja(comp.id, comp.numero);
                                  setActiveMenuId(null);
                                }}
                                className="w-full px-3 py-2 text-[11px] text-slate-700 hover:bg-slate-50 hover:text-rose-600 flex items-center gap-2 border-b border-slate-100"
                              >
                                <Trash2 className="h-3.5 w-3.5 text-slate-400" /> Dar de Baja SUNAT
                              </button>
                            )}

                            {nuncaEmitido && (
                              <button
                                onClick={() => {
                                  onEmitir(comp.id, comp.numero);
                                  setActiveMenuId(null);
                                }}
                                className="w-full px-3 py-2 text-[11px] text-emerald-700 hover:bg-emerald-50 flex items-center gap-2 border-b border-slate-100"
                              >
                                <Send className="h-3.5 w-3.5" /> Reintentar emisión
                              </button>
                            )}

                            {!esTicket && !nuncaEmitido && comp.estadoSunat === 'Pendiente' && (
                              <button
                                onClick={() => {
                                  onReenviarSunat(comp.id, comp.numero);
                                  setActiveMenuId(null);
                                }}
                                className="w-full px-3 py-2 text-[11px] text-emerald-700 hover:bg-emerald-50 flex items-center gap-2 border-b border-slate-100"
                              >
                                <RefreshCw className="h-3.5 w-3.5" /> Enviar a SUNAT
                              </button>
                            )}

                            {!esTicket && !esNota && comp.estadoSunat === 'Aceptado' && (
                              <>
                                <button
                                  onClick={() => {
                                    onGenerarNota(comp, 'credito');
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full px-3 py-2 text-[11px] text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-b border-slate-100"
                                >
                                  <MinusCircle className="h-3.5 w-3.5 text-slate-400" /> Generar Nota de Crédito
                                </button>
                                <button
                                  onClick={() => {
                                    onGenerarNota(comp, 'debito');
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full px-3 py-2 text-[11px] text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-b border-slate-100"
                                >
                                  <PlusCircle className="h-3.5 w-3.5 text-slate-400" /> Generar Nota de Débito
                                </button>
                              </>
                            )}

                            <button
                              onClick={() => {
                                onDuplicar(comp);
                                setActiveMenuId(null);
                              }}
                              className="w-full px-3 py-2 text-[11px] text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                            >
                              <PlusCircle className="h-3.5 w-3.5 text-slate-400" /> Duplicar Comprobante
                            </button>

                            {!esTicket && (
                              <button
                                onClick={() => {
                                  onDownload(comp.id, 'PDF');
                                  onDownload(comp.id, 'XML');
                                  onDownload(comp.id, 'CDR');
                                  setActiveMenuId(null);
                                }}
                                className="w-full px-3 py-2 text-[11px] text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                              >
                                <Download className="h-3.5 w-3.5 text-slate-400" /> Descargar Todo (ZIP)
                              </button>
                            )}

                            <button
                              onClick={() => {
                                onEliminar(comp.id, comp.numero);
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
            Mostrando registros del <span className="font-bold text-slate-800">{Math.min((currentPage - 1) * itemsPerPage + 1, filteredCount)}</span> al{' '}
            <span className="font-bold text-slate-800">{Math.min(currentPage * itemsPerPage, filteredCount)}</span> de{' '}
            <span className="font-bold text-slate-800">{filteredCount}</span>
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
    </>
  );
}

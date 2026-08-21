'use client';

import { Download, Printer } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Modal } from '@/components/ui';
import type { Comprobante, FormatoImpresion } from './types';

interface ComprobanteDetailModalProps {
  selectedComprobante: Comprobante | null;
  setSelectedComprobante: (comp: Comprobante | null) => void;
  comprobanteSizes: Record<string, FormatoImpresion>;
  onDownload: (num: string, type: 'PDF' | 'XML' | 'CDR') => void;
  triggerToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

/** Vista previa imprimible del comprobante seleccionado, con su QR y detalle de ítems. */
export default function ComprobanteDetailModal({
  selectedComprobante, setSelectedComprobante, comprobanteSizes, onDownload, triggerToast,
}: ComprobanteDetailModalProps) {
  return (
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
                onClick={() => onDownload(selectedComprobante!.numero, 'PDF')}
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

  );
}

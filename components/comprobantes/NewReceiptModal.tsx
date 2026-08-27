'use client';

import { useState, useMemo, useEffect } from 'react';
import { RefreshCw, Send, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui';
import { MOCK_PRODUCTS, MOCK_CUSTOMERS } from '@/data/mockData';
import type { PaymentMethod } from '@/types';
import { type Comprobante, nextNumeroComprobante, nuevoHash } from './types';

interface NewReceiptModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (comp: Comprobante) => void;
  comprobantesList: Comprobante[];
}

export default function NewReceiptModal({ open, onClose, onSubmit, comprobantesList }: NewReceiptModalProps) {
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

      const docNum = nextNumeroComprobante(comprobantesList, tipo);

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
        hash: data.hash || nuevoHash(),
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

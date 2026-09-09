'use client';

import { useEffect, useState } from 'react';
import { CalendarClock, ChevronLeft, ChevronRight, Loader2, Receipt, Hash, Wallet } from 'lucide-react';
import { useSucursalSelector } from '@/hooks/useSucursalSelector';
import { SucursalSelector } from '@/components/ui';
import { getVentas, type VentaDto } from '@/lib/api/ventas';
import { getUsuarios, type Usuario } from '@/lib/api/usuarios';
import { toFechaParam } from '@/lib/api/reportes';

const TIPO_LABEL: Record<string, string> = {
  ticket: 'N. Venta',
  boleta: 'Boleta',
  factura: 'Factura',
  nota_credito: 'Nota de Crédito',
  nota_debito: 'Nota de Débito',
};

const METODO_PAGO_LABEL: Record<string, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  yape: 'Yape',
  plin: 'Plin',
  otro: 'Otro',
};

/** Roles que efectivamente pueden cobrar/atender una venta — excluye cocinero, repartidor, etc. */
const ROLES_VISIBLES = ['admin', 'cajero', 'mozo'];

const money = (n: number) => `S/. ${n.toFixed(2)}`;
const itemsCount = (v: VentaDto) => v.items.reduce((a, i) => a + i.cantidad, 0);
const horaVenta = (v: VentaDto) => new Date(v.pagadoAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
const fechaLarga = (d: Date) => d.toLocaleDateString('es-PE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

function addDias(d: Date, delta: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + delta);
  return next;
}

export default function VentasDelDiaPage() {
  const { token, isSuperAdmin, sucursales, sId, selectSucursal } = useSucursalSelector();

  const [dia, setDia] = useState(() => new Date());
  const [cajeroId, setCajeroId] = useState<number | null>(null);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [ventas, setVentas] = useState<VentaDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  /* El filtro de "cajero" solo tiene sentido para quienes realmente pueden cobrar/atender —
     se excluyen cocineros, repartidores, etc. */
  useEffect(() => {
    if (!token || !sId) return;
    getUsuarios(token, { sucursalId: sId })
      .then(data => setUsuarios(data.filter(u => ROLES_VISIBLES.includes(u.rolNombre.toLowerCase()))))
      .catch(() => setUsuarios([]));
  }, [token, sId]);

  useEffect(() => {
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
  }, [token, sId, dia, cajeroId]);

  const totalVentas = ventas.length;
  const totalMonto = ventas.reduce((a, v) => a + v.total, 0);
  const seleccionada = ventas.find(v => v.id === selectedId) ?? null;

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
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedId(v.id)}
                      className={`w-full grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-4 py-3 text-left transition-colors ${
                        isSelected ? 'bg-brand/5' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className={`text-sm font-bold truncate ${isAnulacion ? 'text-rose-500 line-through' : 'text-slate-800'}`}>
                          {v.numeroComprobante || `Venta #${v.id}`}
                        </p>
                        <p className="text-[10px] text-slate-400">{TIPO_LABEL[v.tipoComprobante] ?? v.tipoComprobante}</p>
                      </div>
                      <span className="text-xs font-mono text-slate-500">{itemsCount(v)}</span>
                      <span className="text-xs font-mono text-slate-500">{horaVenta(v)}</span>
                      <span className={`text-sm font-mono font-bold shrink-0 ${isAnulacion ? 'text-rose-400 line-through' : 'text-slate-800'}`}>
                        {money(v.total)}
                      </span>
                    </button>
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
                  <p className="text-sm font-bold text-slate-800">{seleccionada.numeroComprobante || `Venta #${seleccionada.id}`}</p>
                  <p className="text-[11px] text-slate-500">
                    {TIPO_LABEL[seleccionada.tipoComprobante] ?? seleccionada.tipoComprobante} · {new Date(seleccionada.pagadoAt).toLocaleString('es-PE')}
                  </p>
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
                        <span className="text-slate-700 truncate">{item.productoNombre ?? item.comboNombre ?? 'Producto'} <span className="text-slate-400">x{item.cantidad}</span></span>
                        <span className="font-mono font-bold text-slate-800 shrink-0">{money(item.precioUnitario * item.cantidad)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-dashed border-slate-200 pt-3 space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span className="flex items-center gap-1.5"><Wallet className="h-3.5 w-3.5 text-slate-400" /> {METODO_PAGO_LABEL[seleccionada.metodoPago] ?? seleccionada.metodoPago}</span>
                    <span className="font-mono">{money(seleccionada.total)}</span>
                  </div>
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
    </div>
  );
}

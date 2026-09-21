'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { FileSpreadsheet, ListOrdered, Wallet, Users, Landmark } from 'lucide-react';
import { Modal, Input, Select, Button } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { getVentas } from '@/lib/api/ventas';
import {
  getRankingProductos, getReporteVentasPeriodo, getReporteClientes, getReporteControlCaja, toFechaParam,
} from '@/lib/api/reportes';
import type { Usuario } from '@/lib/api/usuarios';
import { exportVentasDetalladas, exportTopProductos } from '@/lib/reportes/excel';
import { exportMediosPago, exportClientes, exportControlCaja } from '@/lib/reportes/excelResumen';
import { PERIODOS, rangoPeriodo, type PeriodoRapido } from '@/lib/reportes/periodos';

interface Props {
  open: boolean;
  onClose: () => void;
  token: string | undefined;
  sucursalId: number | null;
  sucursalNombre: string;
  usuarios: Usuario[];
  /** Valores con los que se abre: los filtros vigentes de la página. */
  desdeInicial: string;
  hastaInicial: string;
  usuarioInicial: number | null;
}

type Reporte = 'ventas' | 'productos' | 'medios' | 'clientes' | 'caja';

export function ReportesExcelModal({
  open, onClose, token, sucursalId, sucursalNombre, usuarios, desdeInicial, hastaInicial, usuarioInicial,
}: Props) {
  const { data: session } = useSession();
  const { triggerToast } = useApp();

  const [desde, setDesde] = useState(desdeInicial);
  const [hasta, setHasta] = useState(hastaInicial);
  const [usuarioId, setUsuarioId] = useState<number | null>(usuarioInicial);
  const [limite, setLimite] = useState('');
  const [orden, setOrden] = useState<'monto' | 'cantidad'>('monto');
  const [nombreArchivo, setNombreArchivo] = useState('');
  const [generando, setGenerando] = useState<Reporte | null>(null);

  // Al abrir, arranca con los filtros vigentes de la página.
  useEffect(() => {
    if (!open) return;
    setDesde(desdeInicial);
    setHasta(hastaInicial);
    setUsuarioId(usuarioInicial);
  }, [open, desdeInicial, hastaInicial, usuarioInicial]);

  const aplicarPeriodo = (p: PeriodoRapido) => {
    const r = rangoPeriodo(p);
    setDesde(r.desde);
    setHasta(r.hasta);
  };

  const limpiar = () => {
    const r = rangoPeriodo('mes');
    setDesde(r.desde);
    setHasta(r.hasta);
    setUsuarioId(null);
    setLimite('');
    setOrden('monto');
    setNombreArchivo('');
  };

  const usuarioNombre = usuarioId ? usuarios.find(u => u.id === usuarioId)?.nombre : null;
  const rangoValido = !!desde && !!hasta && desde <= hasta;

  const contexto = `Sucursal: ${sucursalNombre}  ·  ${desde} al ${hasta}  ·  Usuario: ${usuarioNombre ?? 'Todos'}`;
  const nombreFinal = (base: string) =>
    (nombreArchivo.trim() || `${base}-${desde}-a-${hasta}`).replace(/[\\/:*?"<>|]/g, '-');

  const generar = async (tipo: Reporte) => {
    if (!token || !sucursalId || !rangoValido) return;
    setGenerando(tipo);
    try {
      const generadoPor = session?.user?.name ?? 'Usuario';
      const ctx = { generadoPor, contexto };
      const filtros = { sucursalId, fechaInicio: desde, fechaFin: hasta, usuarioId: usuarioId ?? undefined };
      const lim = limite.trim() === '' ? 0 : Math.max(0, parseInt(limite, 10) || 0); // vacío = sin límite
      const vacio = (msg: string) => triggerToast(msg, 'error');

      if (tipo === 'ventas') {
        // Los totales del Excel salen del mismo cálculo que la página (ventas netas por periodo), no de
        // sumar las filas, para que ambos coincidan siempre.
        const [ventas, { actual }] = await Promise.all([
          getVentas(token, { sucursalId, fechaInicio: desde, fechaFin: hasta, cajeroId: usuarioId ?? undefined }),
          getReporteVentasPeriodo(token, filtros),
        ]);
        if (!ventas.length) return vacio('No hay ventas en el rango seleccionado.');
        await exportVentasDetalladas(ventas, actual, ctx, nombreFinal('ventas'));
      } else if (tipo === 'productos') {
        const { top } = await getRankingProductos(token, { ...filtros, limite: lim, orden });
        if (!top.length) return vacio('No hay ventas de productos en el rango seleccionado.');
        await exportTopProductos(top, ctx, nombreFinal('top-productos'), orden);
      } else if (tipo === 'medios') {
        const { mediosPago } = await getReporteVentasPeriodo(token, filtros);
        if (!mediosPago.length) return vacio('No hay pagos en el rango seleccionado.');
        await exportMediosPago(mediosPago, ctx, nombreFinal('medios-de-pago'));
      } else if (tipo === 'clientes') {
        const clientes = await getReporteClientes(token, { ...filtros, limite: lim });
        if (!clientes.length) return vacio('No hay ventas en el rango seleccionado.');
        await exportClientes(clientes, ctx, nombreFinal('resumen-clientes'));
      } else {
        const turnos = await getReporteControlCaja(token, filtros);
        if (!turnos.length) return vacio('No hay turnos de caja en el rango seleccionado.');
        await exportControlCaja(turnos, ctx, nombreFinal('control-de-caja'));
      }
      triggerToast('Reporte descargado como archivo Excel.', 'success');
    } catch {
      triggerToast('No se pudo generar el archivo Excel.', 'error');
    } finally {
      setGenerando(null);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Generar reportes Excel"
      subtitle="Configura los filtros y descarga el reporte."
      footer={
        <>
          <Button variant="ghost" onClick={limpiar} className="mr-auto">Limpiar filtros</Button>
          <Button variant="secondary" onClick={onClose}>Cerrar</Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Periodo rápido arriba del todo: es lo primero que se elige */}
        <div className="flex flex-wrap gap-1.5">
          {PERIODOS.map(p => {
            const r = rangoPeriodo(p.key);
            const activo = r.desde === desde && r.hasta === hasta;
            return (
              <button key={p.key} type="button" onClick={() => aplicarPeriodo(p.key)}
                className={`text-[11px] font-semibold px-3 py-1 rounded-full transition-colors cursor-pointer ${activo ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {p.label}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input label="Desde" type="date" value={desde} max={hasta || toFechaParam(new Date())} onChange={e => setDesde(e.target.value)} />
          <Input label="Hasta" type="date" value={hasta} min={desde} max={toFechaParam(new Date())} onChange={e => setHasta(e.target.value)} />
          <Select label="Usuario" value={usuarioId ?? ''} onChange={e => setUsuarioId(e.target.value ? Number(e.target.value) : null)}>
            <option value="">Todos los usuarios</option>
            {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input label="Nombre del archivo (opcional)" placeholder="Ej: ventas-mayo-2026" value={nombreArchivo} onChange={e => setNombreArchivo(e.target.value)} />
          <Input label="Límite (opcional)" type="number" min={1} placeholder="Sin límite" value={limite} onChange={e => setLimite(e.target.value)} hint="Top productos y clientes" />
          <Select label="Ordenar productos por" value={orden} onChange={e => setOrden(e.target.value as 'monto' | 'cantidad')}>
            <option value="monto">Mayor monto</option>
            <option value="cantidad">Mayor cantidad</option>
          </Select>
        </div>

        {!rangoValido && <p className="text-[11px] text-rose-500 font-medium">Elige un rango de fechas válido.</p>}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {([
            { key: 'ventas', icon: <FileSpreadsheet className="h-5 w-5 text-brand" />, titulo: 'Ventas detalladas', desc: 'Un comprobante por fila, con IGV y total neto' },
            { key: 'productos', icon: <ListOrdered className="h-5 w-5 text-brand" />, titulo: 'Top productos', desc: 'Ranking por cantidad o monto' },
            { key: 'medios', icon: <Wallet className="h-5 w-5 text-brand" />, titulo: 'Medios de pago', desc: 'Efectivo, tarjeta, Yape, Plin y su peso' },
            { key: 'clientes', icon: <Users className="h-5 w-5 text-brand" />, titulo: 'Resumen por cliente', desc: 'Documentos, subtotal, IGV y total por cliente' },
            { key: 'caja', icon: <Landmark className="h-5 w-5 text-brand" />, titulo: 'Control de caja', desc: 'Un turno por fila: cobros, movimientos y cierre' },
          ] as const).map(r => (
            <button
              key={r.key}
              type="button"
              disabled={!rangoValido || generando !== null}
              onClick={() => generar(r.key)}
              className="card p-4 flex flex-col items-center gap-1.5 text-center hover:border-brand transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {generando === r.key ? <span className="h-5 w-5 rounded-full border-2 border-brand border-t-transparent animate-spin" /> : r.icon}
              <span className="text-xs font-bold text-slate-800">{r.titulo}</span>
              <span className="text-[10px] text-slate-500">{r.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}

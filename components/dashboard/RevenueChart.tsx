'use client';

import { useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { TooltipContentProps } from 'recharts';
import type { VentaPorHoraDto } from '@/lib/api/dashboard';

const LINE_COLOR = '#007542'; // --color-brand

const money = (n: number) => `S/. ${n.toFixed(2)}`;

interface HourPoint {
  hour: string;
  monto: number;
}

/** Ingresos cobrados hoy, acumulados por hora (un solo turno). */
function buildHourlySeries(ventasPorHora: VentaPorHoraDto[]): HourPoint[] {
  const porHora: Record<number, number> = {};
  for (const v of ventasPorHora) porHora[v.hora] = v.monto;

  const horaActual = new Date().getHours();
  const horas = ventasPorHora.map(v => v.hora);
  const primeraHora = horas.length ? Math.min(...horas) : 8;
  const ultimaHora = Math.max(horaActual, ...horas, primeraHora);

  let acumulado = 0;
  const points: HourPoint[] = [];
  for (let h = primeraHora; h <= ultimaHora; h++) {
    acumulado += porHora[h] ?? 0;
    points.push({ hour: `${String(h).padStart(2, '0')}:00`, monto: Math.round(acumulado * 100) / 100 });
  }
  return points;
}

function ChartTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-xs min-w-[130px]">
      <p className="text-[10px] font-mono text-slate-400 mb-1">{label}</p>
      <span className="font-mono font-bold text-slate-800">{money(Number(payload[0]?.value ?? 0))}</span>
    </div>
  );
}

export default function RevenueChart({ ventasPorHora }: { ventasPorHora: VentaPorHoraDto[] }) {
  const data = useMemo(() => buildHourlySeries(ventasPorHora), [ventasPorHora]);
  const last = data[data.length - 1];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4 text-[10px]">
        <span className="flex items-center gap-1.5 text-slate-700 font-medium">
          <span className="h-2 w-2 rounded-full inline-block" style={{ backgroundColor: LINE_COLOR }} />
          Acumulado hoy <span className="font-mono font-bold text-slate-800">{money(last?.monto ?? 0)}</span>
        </span>
      </div>

      <div className="h-44">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[11px] text-slate-400">
            Todavía no hay ventas cobradas hoy.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="ingresosFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={LINE_COLOR} stopOpacity={0.14} />
                  <stop offset="100%" stopColor={LINE_COLOR} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="hour"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                interval="preserveStartEnd"
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                tickFormatter={(v: number) => `S/.${v}`}
                width={54}
              />
              <Tooltip content={ChartTooltip} cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }} />
              <Area
                type="monotone"
                dataKey="monto"
                name="Ingresos"
                stroke={LINE_COLOR}
                strokeWidth={2}
                fill="url(#ingresosFill)"
                dot={false}
                activeDot={{ r: 4, stroke: '#fff', strokeWidth: 2, fill: LINE_COLOR }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

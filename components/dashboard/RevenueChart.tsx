'use client';

import { useMemo } from 'react';
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { TooltipContentProps } from 'recharts';
import type { SalesHistory } from '@/types';

/* Colores de marca (design-tokens.css) — validados con el script de paleta:
   CVD ΔE 24.3–26.4 (objetivo ≥12), contraste ≥3:1 sobre superficie blanca. */
const DIA_COLOR = '#007542';   // --color-brand
const NOCHE_COLOR = '#3AA346'; // --color-brand-subtle

const START_HOUR = 9;
const END_HOUR_CAP = 23;

const money = (n: number) => `S/. ${n.toFixed(2)}`;

interface HourPoint {
  hour: string;
  dia: number;
  noche: number;
}

/** Ingresos cobrados, acumulados por hora, separados por turno día/noche. */
function buildHourlySeries(sales: SalesHistory[]): HourPoint[] {
  const endHour = Math.min(END_HOUR_CAP, Math.max(START_HOUR, new Date().getHours()));

  const diaByHour: Record<number, number> = {};
  const nocheByHour: Record<number, number> = {};
  for (const s of sales) {
    const h = parseInt(s.time.split(':')[0], 10);
    if (Number.isNaN(h)) continue;
    const bucket = h >= 6 && h < 18 ? diaByHour : nocheByHour;
    bucket[h] = (bucket[h] ?? 0) + s.total;
  }

  let diaCum = 0;
  let nocheCum = 0;
  const points: HourPoint[] = [];
  for (let h = START_HOUR; h <= endHour; h++) {
    diaCum += diaByHour[h] ?? 0;
    nocheCum += nocheByHour[h] ?? 0;
    points.push({
      hour: `${String(h).padStart(2, '0')}:00`,
      dia: Math.round(diaCum * 100) / 100,
      noche: Math.round(nocheCum * 100) / 100,
    });
  }
  return points;
}

function ChartTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-xs min-w-[150px]">
      <p className="text-[10px] font-mono text-slate-400 mb-1.5">{label}</p>
      <div className="space-y-1">
        {payload.map(entry => (
          <div key={entry.dataKey ? String(entry.dataKey) : entry.name} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-slate-500">
              <span className="inline-block w-2.5 h-0.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
              {entry.name}
            </span>
            <span className="font-mono font-bold text-slate-800">{money(Number(entry.value ?? 0))}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RevenueChart({ salesHistory }: { salesHistory: SalesHistory[] }) {
  const data = useMemo(() => buildHourlySeries(salesHistory), [salesHistory]);
  const last = data[data.length - 1];

  return (
    <div className="space-y-2">
      {/* Leyenda con el valor acumulado en vivo (etiqueta directa al final de la curva) */}
      <div className="flex items-center gap-4 text-[10px]">
        <span className="flex items-center gap-1.5 text-slate-700 font-medium">
          <span className="h-2 w-2 rounded-full inline-block" style={{ backgroundColor: DIA_COLOR }} />
          Turno Día <span className="font-mono font-bold text-slate-800">{money(last?.dia ?? 0)}</span>
        </span>
        <span className="flex items-center gap-1.5 text-slate-700 font-medium">
          <span className="h-2 w-2 rounded-full inline-block border-2 border-dashed" style={{ borderColor: NOCHE_COLOR }} />
          Turno Noche <span className="font-mono font-bold text-slate-800">{money(last?.noche ?? 0)}</span>
        </span>
      </div>

      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="diaFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={DIA_COLOR} stopOpacity={0.14} />
                <stop offset="100%" stopColor={DIA_COLOR} stopOpacity={0} />
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
              dataKey="dia"
              name="Turno Día"
              stroke={DIA_COLOR}
              strokeWidth={2}
              fill="url(#diaFill)"
              dot={false}
              activeDot={{ r: 4, stroke: '#fff', strokeWidth: 2, fill: DIA_COLOR }}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="noche"
              name="Turno Noche"
              stroke={NOCHE_COLOR}
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
              activeDot={{ r: 4, stroke: '#fff', strokeWidth: 2, fill: NOCHE_COLOR }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

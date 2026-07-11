export type Segment = 'Nuevo' | 'Ocasional' | 'Frecuente' | 'Fiel' | 'VIP';

export const SEGMENTS: { key: Segment; label: string; range: string; min: number; max: number }[] = [
  { key: 'Nuevo',     label: 'Nuevo',     range: '1 pedidos',  min: 0,  max: 0 },
  { key: 'Ocasional', label: 'Ocasional', range: '2-3 pedidos', min: 1,  max: 2 },
  { key: 'Frecuente', label: 'Frecuente', range: '4-6 pedidos', min: 3,  max: 5 },
  { key: 'Fiel',      label: 'Fiel',      range: '7-10 pedidos', min: 6,  max: 9 },
  { key: 'VIP',       label: 'VIP',       range: '10+ pedidos', min: 10, max: Infinity },
];

export function getSegment(compras: number): Segment {
  return (SEGMENTS.find(s => compras >= s.min && compras <= s.max) ?? SEGMENTS[0]).key;
}

export const SEGMENT_COLORS: Record<Segment, { text: string; bg: string; bar: string; dot: string }> = {
  Nuevo:     { text: 'text-slate-600',   bg: 'bg-slate-100',   bar: 'bg-slate-400',   dot: 'bg-slate-400' },
  Ocasional: { text: 'text-blue-600',    bg: 'bg-blue-50',     bar: 'bg-blue-500',    dot: 'bg-blue-500' },
  Frecuente: { text: 'text-orange-600',  bg: 'bg-orange-50',   bar: 'bg-orange-500',  dot: 'bg-orange-500' },
  Fiel:      { text: 'text-violet-600',  bg: 'bg-violet-50',   bar: 'bg-violet-500',  dot: 'bg-violet-500' },
  VIP:       { text: 'text-rose-600',    bg: 'bg-rose-50',     bar: 'bg-rose-500',    dot: 'bg-rose-500' },
};

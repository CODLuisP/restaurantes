export const money = (n: number) => `S/. ${n.toFixed(2)}`;

export const fmtTime = (iso?: string) =>
  iso ? new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '—';

export const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

/** Formato compacto para la tabla de historial: "8/7, 10:47 p. m." */
export const fmtShort = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}, ${fmtTime(iso)}`;
};

export const todayStr = () => new Date().toISOString().slice(0, 10);

export const daysAgoStr = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

export type QuickRange = 'hoy' | '7d' | '30d';
export type View = 'cajas' | 'historial';

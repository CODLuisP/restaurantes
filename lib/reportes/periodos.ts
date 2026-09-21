import { toFechaParam } from '@/lib/api/reportes';

export type PeriodoRapido = 'hoy' | 'semana' | 'mes' | 'anio';

export const PERIODOS: { key: PeriodoRapido; label: string }[] = [
  { key: 'hoy', label: 'Hoy' },
  { key: 'semana', label: 'Esta semana' },
  { key: 'mes', label: 'Este mes' },
  { key: 'anio', label: 'Este año' },
];

/** Rango [desde, hasta] en horario local, siempre terminando hoy. La semana arranca en lunes. */
export function rangoPeriodo(periodo: PeriodoRapido): { desde: string; hasta: string } {
  const hoy = new Date();
  let desde = new Date(hoy);
  if (periodo === 'semana') {
    const diasDesdeLunes = (hoy.getDay() + 6) % 7;
    desde = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - diasDesdeLunes);
  } else if (periodo === 'mes') {
    desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  } else if (periodo === 'anio') {
    desde = new Date(hoy.getFullYear(), 0, 1);
  }
  return { desde: toFechaParam(desde), hasta: toFechaParam(hoy) };
}

/** yyyy-MM-dd → Date local (evita el corrimiento de zona horaria de `new Date('yyyy-MM-dd')`). */
export function parseFecha(f: string): Date {
  const [y, m, d] = f.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Cantidad de días del rango, ambos extremos incluidos. */
export function diasEnRango(desde: string, hasta: string): number {
  return Math.round((parseFecha(hasta).getTime() - parseFecha(desde).getTime()) / 86_400_000) + 1;
}

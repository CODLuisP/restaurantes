export type DayKey = 'lun' | 'mar' | 'mie' | 'jue' | 'vie' | 'sab' | 'dom';

export interface DayRange { from: string; to: string }
export interface DaySchedule { enabled: boolean; ranges: DayRange[] }

export const DAY_LABELS: Record<DayKey, string> = {
  lun: 'Lunes', mar: 'Martes', mie: 'Miércoles', jue: 'Jueves', vie: 'Viernes', sab: 'Sábado', dom: 'Domingo',
};
export const DAY_ORDER: DayKey[] = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'];

const DEFAULT_RANGE: DayRange = { from: '09:00', to: '22:00' };

export function makeDefaultSchedule(): Record<DayKey, DaySchedule> {
  return {
    lun: { enabled: true, ranges: [{ ...DEFAULT_RANGE }] },
    mar: { enabled: true, ranges: [{ ...DEFAULT_RANGE }] },
    mie: { enabled: true, ranges: [{ ...DEFAULT_RANGE }] },
    jue: { enabled: true, ranges: [{ ...DEFAULT_RANGE }] },
    vie: { enabled: true, ranges: [{ ...DEFAULT_RANGE }] },
    sab: { enabled: true, ranges: [{ ...DEFAULT_RANGE }] },
    dom: { enabled: false, ranges: [{ ...DEFAULT_RANGE }] },
  };
}

export function normalizeSchedule(schedule?: Partial<Record<DayKey, Partial<DaySchedule>>>): Record<DayKey, DaySchedule> {
  const base = makeDefaultSchedule();

  return DAY_ORDER.reduce((acc, key) => {
    const day = schedule?.[key];
    acc[key] = {
      enabled: typeof day?.enabled === 'boolean' ? day.enabled : base[key].enabled,
      ranges: Array.isArray(day?.ranges) && day.ranges.length > 0
        ? day.ranges.map(range => ({ from: range?.from ?? '', to: range?.to ?? '' }))
        : base[key].ranges.map(range => ({ ...range })),
    };
    return acc;
  }, {} as Record<DayKey, DaySchedule>);
}

/** Convierte JS Date#getDay() (0 = domingo) a nuestra clave de día. */
export const JS_DAY_TO_KEY: DayKey[] = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab'];

export function getTodayDayKey(now = new Date()): DayKey {
  return JS_DAY_TO_KEY[now.getDay()];
}

/** true si, según el horario configurado, el negocio está abierto en este momento. */
export function isOpenNow(schedule: Record<DayKey, DaySchedule>, now = new Date()): boolean {
  const day = schedule[getTodayDayKey(now)];
  if (!day?.enabled) return false;
  const mins = now.getHours() * 60 + now.getMinutes();
  return day.ranges.some(r => {
    if (!r.from || !r.to) return false;
    const [fh, fm] = r.from.split(':').map(Number);
    const [th, tm] = r.to.split(':').map(Number);
    return mins >= fh * 60 + fm && mins <= th * 60 + tm;
  });
}

/** Extrae metadatos adicionales guardados junto con horariosJson (_cartaActiva, _destacados, _mostrarDireccionMenu, _ubicacionDireccion). */
export function parseCartaMetaFromHorarios(horariosJson?: string | null): {
  cartaActiva: boolean;
  destacados: number[];
  mostrarDireccionMenu?: boolean;
  ubicacionDireccion?: string;
} {
  if (!horariosJson) return { cartaActiva: true, destacados: [] };
  try {
    const parsed = JSON.parse(horariosJson);
    const cartaActiva = typeof parsed?._cartaActiva === 'boolean' ? parsed._cartaActiva : true;
    const destacados = Array.isArray(parsed?._destacados)
      ? parsed._destacados.filter((n: unknown): n is number => typeof n === 'number')
      : [];
    const mostrarDireccionMenu =
      typeof parsed?._mostrarDireccionMenu === 'boolean' ? parsed._mostrarDireccionMenu : undefined;
    const ubicacionDireccion =
      typeof parsed?._ubicacionDireccion === 'string' ? parsed._ubicacionDireccion : undefined;
    return { cartaActiva, destacados, mostrarDireccionMenu, ubicacionDireccion };
  } catch {
    return { cartaActiva: true, destacados: [] };
  }
}

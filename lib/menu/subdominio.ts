/**
 * Subdominios de la carta pública: cada empresa puede tener su dirección propia,
 * p. ej. https://paikos.restofly.com.pe/menu. Lo usan el middleware (edge), las páginas del
 * menú (servidor) y la pestaña "QR y Link de la Carta" (cliente), así que no depende de nada más.
 */

/** Dominio principal del sistema (sin "www" ni puerto). Vacío en desarrollo: se usa *.localhost. */
export const DOMINIO_BASE = (process.env.NEXT_PUBLIC_DOMINIO_BASE ?? '')
  .trim()
  .toLowerCase()
  .replace(/^https?:\/\//, '')
  .replace(/^\.+|[./]+$/g, '');

export const SUBDOMINIO_MIN = 3;
export const SUBDOMINIO_MAX = 40;

/** Nombres que el sistema usa o podría usar; ninguna empresa puede tomarlos. */
const RESERVADOS = new Set([
  'www', 'app', 'api', 'admin', 'panel', 'dashboard', 'login', 'registro', 'menu', 'carta',
  'mail', 'correo', 'smtp', 'ftp', 'cdn', 'static', 'assets', 'img', 'imagenes',
  'blog', 'ayuda', 'soporte', 'help', 'docs', 'status', 'dev', 'test', 'demo', 'staging',
  'restofly', 'superadmin',
]);

/** "Paikos Chicken S.R.L." → "paikos-chicken-srl": sugerencia a partir del nombre del negocio. */
export function sugerirSubdominio(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[.']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SUBDOMINIO_MAX)
    .replace(/-+$/, '');
}

/** Devuelve el motivo por el que no sirve, o null si es válido. */
export function validarSubdominio(valor: string): string | null {
  if (valor.length < SUBDOMINIO_MIN) return `Usa al menos ${SUBDOMINIO_MIN} caracteres.`;
  if (valor.length > SUBDOMINIO_MAX) return `Usa como máximo ${SUBDOMINIO_MAX} caracteres.`;
  if (!/^[a-z0-9-]+$/.test(valor)) return 'Solo letras minúsculas sin tildes, números y guiones.';
  if (valor.startsWith('-') || valor.endsWith('-')) return 'No puede empezar ni terminar con guion.';
  if (valor.includes('--')) return 'No uses dos guiones seguidos.';
  if (RESERVADOS.has(valor)) return 'Ese nombre está reservado por el sistema. Elige otro.';
  return null;
}

/**
 * Subdominio de empresa al que apunta un host ("paikos.restofly.com.pe" o, en desarrollo,
 * "paikos.localhost:3000"). null si es el dominio principal, "www", otro dominio o un nombre reservado.
 */
export function subdominioDeHost(host: string | null | undefined): string | null {
  const nombre = (host ?? '').toLowerCase().replace(/:\d+$/, '');
  let sub: string | null = null;
  if (DOMINIO_BASE && nombre.endsWith(`.${DOMINIO_BASE}`)) sub = nombre.slice(0, -(DOMINIO_BASE.length + 1));
  else if (nombre.endsWith('.localhost')) sub = nombre.slice(0, -'.localhost'.length);
  if (!sub || sub.includes('.')) return null;
  return validarSubdominio(sub) ? null : sub;
}

/**
 * Parte fija de la dirección después del subdominio, según dónde corre el sistema:
 * ".restofly.com.pe" en producción o ".localhost:3000" en desarrollo. null si no se puede armar
 * (sin dominio configurado y fuera de localhost): entonces se usa el enlace con ?sucursalId.
 */
export function sufijoDominio(origen: string): { protocolo: string; sufijo: string } | null {
  if (DOMINIO_BASE) return { protocolo: 'https:', sufijo: `.${DOMINIO_BASE}` };
  try {
    const url = new URL(origen);
    if (url.hostname === 'localhost' || url.hostname.endsWith('.localhost')) {
      return { protocolo: url.protocol, sufijo: `.localhost${url.port ? `:${url.port}` : ''}` };
    }
  } catch { /* origen inválido */ }
  return null;
}

/**
 * Enlace público de la carta. Con subdominio: https://paikos.restofly.com.pe/menu (se agrega
 * ?sucursalId solo si la empresa tiene varias sucursales). Sin subdominio: {origen}/menu?sucursalId=N.
 */
export function urlMenuPublico({ origen, subdominio, sucursalId, variasSucursales }: {
  origen: string;
  subdominio?: string | null;
  sucursalId?: number | null;
  variasSucursales: boolean;
}): string {
  const dominio = subdominio ? sufijoDominio(origen) : null;
  if (subdominio && dominio) {
    const base = `${dominio.protocolo}//${subdominio}${dominio.sufijo}/menu`;
    return variasSucursales && sucursalId ? `${base}?sucursalId=${sucursalId}` : base;
  }
  const base = `${origen}/menu`;
  return sucursalId ? `${base}?sucursalId=${sucursalId}` : base;
}

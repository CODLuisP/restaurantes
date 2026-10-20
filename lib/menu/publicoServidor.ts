import type { Metadata } from 'next';
import type { ConfiguracionPublicaDto, MesaPublicaDto, SucursalPublicaDto } from '@/lib/api/publico';

/**
 * Lecturas de la API pública hechas desde el servidor de Next (páginas del menú): con ellas se
 * arma el título y el ícono de la pestaña antes de que cargue la página, y así también salen
 * en la vista previa al compartir el enlace por WhatsApp.
 */

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5004';
/** Un logo o nombre recién cambiado se ve en la pestaña en menos de un minuto. */
const SEGUNDOS_CACHE = 60;

/** Lo que devuelve GET /api/publico/resolver?subdominio=… (ver docs/backend-subdominio-menu.md). */
export interface SubdominioResuelto {
  empresaId?: number;
  /** Sucursal que se muestra cuando el enlace no indica una (la principal). */
  sucursalId: number;
  sucursales?: { id: number; nombre?: string | null }[];
  nombreComercial?: string | null;
  razonSocial?: string | null;
  logoUrl?: string | null;
}

/** Datos de la empresa que la API pública puede incluir junto a la sucursal. */
type SucursalConEmpresa = SucursalPublicaDto & {
  nombreComercial?: string | null;
  razonSocial?: string | null;
  empresaNombre?: string | null;
};

async function obtener<T>(ruta: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${ruta}`, { next: { revalidate: SEGUNDOS_CACHE } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (err) {
    console.warn(`[Menú público] No se pudo leer ${ruta}:`, err);
    return null;
  }
}

export function resolverSubdominio(subdominio: string) {
  return obtener<SubdominioResuelto>(`/api/publico/resolver?subdominio=${encodeURIComponent(subdominio)}`);
}

export function obtenerMesaPublica(token: string) {
  return obtener<MesaPublicaDto>(`/api/publico/mesas/${encodeURIComponent(token)}`);
}

/**
 * Sucursal que debe mostrar /menu. Con subdominio, la del enlace solo se acepta si es de esa
 * empresa (si no, cualquiera podría ver otra carta bajo el subdominio ajeno).
 * `null` = el subdominio no existe.
 */
export async function sucursalDelMenu(subdominio: string | undefined, sucursalId: number | undefined) {
  if (!subdominio) return { sucursalId, empresa: null };
  const empresa = await resolverSubdominio(subdominio);
  if (!empresa?.sucursalId) return null;
  const propia = sucursalId && empresa.sucursales?.some(s => s.id === sucursalId);
  return { sucursalId: propia ? sucursalId : empresa.sucursalId, empresa };
}

/** Título, ícono y vista previa de la pestaña con el nombre y el logo del negocio. */
export async function metadataDelMenu(
  sucursalId: number | undefined,
  empresa: SubdominioResuelto | null = null,
  detalle?: string,
): Promise<Metadata> {
  if (!sucursalId) return { title: 'Carta digital' };

  const [sucursal, config] = await Promise.all([
    obtener<SucursalConEmpresa>(`/api/publico/sucursal?sucursalId=${sucursalId}`),
    obtener<ConfiguracionPublicaDto>(`/api/publico/configuracion?sucursalId=${sucursalId}`),
  ]);

  const nombre = [
    empresa?.nombreComercial, sucursal?.nombreComercial, sucursal?.empresaNombre,
    empresa?.razonSocial, sucursal?.razonSocial, sucursal?.nombre,
  ].map(v => v?.trim()).find(Boolean) ?? 'Carta digital';
  const titulo = detalle ? `${nombre} · ${detalle}` : nombre;
  const logo = config?.logoUrl?.trim() || empresa?.logoUrl?.trim() || null;
  const descripcion = config?.descripcionCorta?.trim() || `Mira la carta de ${nombre} y haz tu pedido.`;

  return {
    title: titulo,
    description: descripcion,
    ...(logo ? { icons: { icon: logo, shortcut: logo, apple: logo } } : {}),
    openGraph: {
      title: titulo,
      description: descripcion,
      type: 'website',
      ...(logo ? { images: [{ url: logo }] } : {}),
    },
  };
}

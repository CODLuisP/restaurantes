import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PublicMenu from '@/components/menu/PublicMenu';
import { metadataDelMenu, sucursalDelMenu } from '@/lib/menu/publicoServidor';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** `subdominio` lo agrega el middleware cuando se entra por paikos.restofly.com.pe/menu. */
async function leerParametros(searchParams: Props['searchParams']) {
  const sp = await searchParams;
  const texto = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
  const id = Number(texto(sp.sucursalId));
  return sucursalDelMenu(texto(sp.subdominio), Number.isInteger(id) && id > 0 ? id : undefined);
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const datos = await leerParametros(searchParams);
  if (!datos) return { title: 'Carta no encontrada' };
  return metadataDelMenu(datos.sucursalId, datos.empresa);
}

export default async function MenuPublico({ searchParams }: Props) {
  const datos = await leerParametros(searchParams);
  if (!datos) notFound();
  return <PublicMenu sucursalId={datos.sucursalId} />;
}

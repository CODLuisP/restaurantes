import type { Metadata } from 'next';
import MenuMesa from './MenuMesa';
import { metadataDelMenu, obtenerMesaPublica } from '@/lib/menu/publicoServidor';

type Props = { params: Promise<{ mesaId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { mesaId } = await params;
  const mesa = await obtenerMesaPublica(mesaId);
  return metadataDelMenu(mesa?.sucursalId, null, mesa?.numero ? `Mesa ${mesa.numero}` : undefined);
}

export default async function MenuPublicoMesa({ params }: Props) {
  const { mesaId } = await params;
  return <MenuMesa mesaId={mesaId} />;
}

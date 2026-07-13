'use client';

import { use } from 'react';
import PublicMenu from '@/components/menu/PublicMenu';

export default function MenuPublicoMesa({ params }: { params: Promise<{ mesaId: string }> }) {
  const { mesaId } = use(params);
  const mesaLabel = mesaId.replace(/^t/i, 'Mesa ');
  return <PublicMenu mesaLabel={mesaLabel} />;
}

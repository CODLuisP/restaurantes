'use client';

import { use, useState, useEffect } from 'react';
import PublicMenu from '@/components/menu/PublicMenu';
import { getMesaPublica } from '@/lib/api/publico';

export default function MenuPublicoMesa({ params }: { params: Promise<{ mesaId: string }> }) {
  const { mesaId } = use(params);
  const mesaLabel = mesaId.replace(/^t/i, 'Mesa ');
  const [sucursalId, setSucursalId] = useState<number | undefined>(undefined);

  useEffect(() => {
    getMesaPublica(mesaId)
      .then(data => { if (data?.sucursalId) setSucursalId(data.sucursalId); })
      .catch(() => {});
  }, [mesaId]);

  return <PublicMenu mesaLabel={mesaLabel} sucursalId={sucursalId} />;
}

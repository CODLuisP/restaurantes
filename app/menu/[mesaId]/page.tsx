'use client';

import { use, useState, useEffect } from 'react';
import PublicMenu from '@/components/menu/PublicMenu';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5004';

export default function MenuPublicoMesa({ params }: { params: Promise<{ mesaId: string }> }) {
  const { mesaId } = use(params);
  const mesaLabel = mesaId.replace(/^t/i, 'Mesa ');
  const [sucursalId, setSucursalId] = useState<number | undefined>(undefined);

  useEffect(() => {
    fetch(`${API_URL}/api/publico/mesas/${mesaId}`)
      .then(r => r.json())
      .then(data => { if (data?.sucursalId) setSucursalId(data.sucursalId); })
      .catch(() => {});
  }, [mesaId]);

  return <PublicMenu mesaLabel={mesaLabel} sucursalId={sucursalId} />;
}

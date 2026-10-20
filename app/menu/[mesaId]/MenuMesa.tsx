'use client';

import { useState, useEffect } from 'react';
import PublicMenu from '@/components/menu/PublicMenu';
import { getMesaPublica } from '@/lib/api/publico';

export default function MenuMesa({ mesaId }: { mesaId: string }) {
  const [sucursalId, setSucursalId] = useState<number | undefined>(undefined);
  const [mesaLabel, setMesaLabel] = useState(mesaId.replace(/^t/i, 'Mesa '));

  useEffect(() => {
    getMesaPublica(mesaId)
      .then(data => {
        if (data?.sucursalId) setSucursalId(data.sucursalId);
        if (data?.numero) setMesaLabel(`Mesa ${data.numero}`);
      })
      .catch(() => {});
  }, [mesaId]);

  return <PublicMenu mesaLabel={mesaLabel} mesaToken={mesaId} sucursalId={sucursalId} />;
}

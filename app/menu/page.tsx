'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PublicMenu from '@/components/menu/PublicMenu';

function MenuContent() {
  const params = useSearchParams();
  const sid = params.get('sucursalId');
  const sucursalId = sid ? Number(sid) : undefined;
  return <PublicMenu sucursalId={sucursalId} />;
}

export default function MenuPublico() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f9fafb]" />}>
      <MenuContent />
    </Suspense>
  );
}

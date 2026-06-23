'use client';

import Link from 'next/link';
import { Bookmark } from 'lucide-react';
import { useApp } from '@/context/AppContext';

interface StubPageProps {
  section: string;
}

export default function StubPage({ section }: StubPageProps) {
  const { triggerToast } = useApp();

  return (
    <div className="card-lg p-10 text-center space-y-4 max-w-xl mx-auto my-12 animate-section">
      <div className="p-3 bg-brand/5 text-brand w-max mx-auto rounded-full">
        <Bookmark className="h-8 w-8 stroke-[1.5]" />
      </div>
      <div>
        <h4 className="text-lg font-bold text-slate-800 capitalize">{section} — Módulo Diseñado</h4>
        <p className="text-xs text-slate-500 mt-1">
          Esta vista ha sido diseñada y estructurada formalmente en el mapa de navegación SaaS Corporativo RestoPro Perú.
        </p>
      </div>
      <div className="bg-slate-50 p-4 rounded-xl text-left border border-slate-200">
        <p className="text-xs text-slate-700 leading-relaxed">
          Para interactuar con el comportamiento lógico del restaurante, navega hacia el{' '}
          <strong>Punto de Venta (POS)</strong> para insertar pedidos, <strong>Mesas</strong> para alternar
          el mapa de salón de comensales, o el KDS de <strong>Cocina</strong> para arrastrar comandas en el
          Kanban interactivo.
        </p>
      </div>
      <Link
        href="/pos"
        onClick={() => triggerToast('Redirigido a Punto de Venta', 'success')}
        className="text-xs font-bold text-brand hover:underline"
      >
        Ir al Punto de Venta (POS) →
      </Link>
    </div>
  );
}

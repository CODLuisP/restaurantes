'use client';

import Link from 'next/link';
import { Truck, Grid, ShoppingBag, Bike, Check, ArrowRight } from 'lucide-react';
import { Toggle } from '@/components/ui';
import { useDeliveryMethods, type DeliveryMethodKey } from '@/context/DeliveryMethodsContext';

interface MethodMeta {
  key: DeliveryMethodKey;
  title: string;
  description: string;
  icon: React.ElementType;
  features: string[];
  tone: {
    ring: string;
    tint: string;
    iconBg: string;
    iconBgOff: string;
  };
  footer?: React.ReactNode;
}

const TONES = {
  emerald: { ring: 'ring-emerald-500/40 border-emerald-200', tint: 'bg-emerald-50/60', iconBg: 'bg-emerald-500 text-white', iconBgOff: 'bg-slate-200 text-slate-400' },
  amber:   { ring: 'ring-amber-500/40 border-amber-200',     tint: 'bg-amber-50/60',   iconBg: 'bg-amber-500 text-white',   iconBgOff: 'bg-slate-200 text-slate-400' },
  sky:     { ring: 'ring-sky-500/40 border-sky-200',         tint: 'bg-sky-50/60',     iconBg: 'bg-sky-500 text-white',     iconBgOff: 'bg-slate-200 text-slate-400' },
};

const METHODS: MethodMeta[] = [
  {
    key: 'mesa',
    title: 'En mesa',
    description: 'El comensal pide y consume dentro de tu local.',
    icon: Grid,
    features: ['El mozo toma el pedido desde el Comandero', 'El consumo se acumula hasta cobrarlo en Caja'],
    tone: TONES.emerald,
  },
  {
    key: 'llevar',
    title: 'Para llevar',
    description: 'El cliente pide y pasa a recoger su pedido.',
    icon: ShoppingBag,
    features: ['No requiere dirección ni zona de cobertura', 'Ideal para pedidos por teléfono o mostrador'],
    tone: TONES.amber,
  },
  {
    key: 'delivery',
    title: 'Delivery',
    description: 'Le llevas el pedido a la puerta del cliente.',
    icon: Bike,
    features: ['Usa las zonas de entrega que configures', 'Se registra con dirección en el Comandero'],
    tone: TONES.sky,
    footer: (
      <Link
        href="/configuracion/negocio?tab=areas-entrega"
        className="flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline"
      >
        Configurar zonas de entrega <ArrowRight className="h-3 w-3" />
      </Link>
    ),
  },
];

export default function MetodosEntregaPage() {
  const { methods, setMethodEnabled } = useDeliveryMethods();
  const enabledCount = METHODS.filter(m => methods[m.key].enabled).length;

  return (
    <div className="space-y-6 animate-section">
      {/* Header */}
      <div className="flex items-center gap-3 pb-1">
        <div className="bg-brand p-2.5 rounded-xl shrink-0">
          <Truck className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900">Métodos de Entrega</h3>
          <p className="text-xs text-slate-500">
            Elige cómo pueden pedir tus clientes.{' '}
            <span className="font-semibold text-brand">{enabledCount} de {METHODS.length}</span> canales activos.
          </p>
        </div>
      </div>

      {/* Tarjetas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {METHODS.map(m => {
          const enabled = methods[m.key].enabled;
          const Icon = m.icon;
          return (
            <div
              key={m.key}
              className={`card-lg p-6 flex flex-col transition-all duration-200 border-2 ${
                enabled ? `${m.tone.ring} ${m.tone.tint} shadow-md` : 'border-slate-200 bg-white'
              }`}
            >
              {/* Ícono + estado */}
              <div className="flex items-start justify-between gap-3">
                <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 transition-colors duration-200 ${
                  enabled ? m.tone.iconBg : m.tone.iconBgOff
                }`}>
                  <Icon className="h-7 w-7" />
                </div>
                <span className={`shrink-0 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${
                  enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${enabled ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                  {enabled ? 'Activo' : 'Inactivo'}
                </span>
              </div>

              {/* Título + descripción */}
              <h4 className="text-base font-bold text-slate-800 mt-4">{m.title}</h4>
              <p className="text-xs text-slate-500 mt-1">{m.description}</p>

              {/* Features */}
              <ul className="space-y-1.5 mt-4 flex-1">
                {m.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-[11px] text-slate-600 leading-relaxed">
                    <Check className="h-3.5 w-3.5 text-brand shrink-0 mt-0.5" /> {f}
                  </li>
                ))}
              </ul>

              {m.footer && <div className="mt-3">{m.footer}</div>}

              {/* Switch */}
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-200/70">
                <span className="text-xs font-semibold text-slate-700">Disponible para clientes</span>
                <Toggle checked={enabled} onChange={v => setMethodEnabled(m.key, v)} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

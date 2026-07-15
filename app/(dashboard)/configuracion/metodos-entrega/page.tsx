'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Truck, Check, ArrowRight } from 'lucide-react';
import { Toggle } from '@/components/ui';
import { useDeliveryMethods, type DeliveryMethodKey } from '@/context/DeliveryMethodsContext';

interface MethodMeta {
  key: DeliveryMethodKey;
  title: string;
  description: string;
  image: string;
  imageRatio: number;
  features: string[];
  tone: {
    accent: string;
    accentSoft: string;
  };
  footer?: React.ReactNode;
}

const TONES = {
  emerald: { accent: 'bg-emerald-500', accentSoft: 'bg-emerald-50 text-emerald-700' },
  amber:   { accent: 'bg-amber-500',   accentSoft: 'bg-amber-50 text-amber-700' },
  sky:     { accent: 'bg-sky-500',     accentSoft: 'bg-sky-50 text-sky-700' },
};

const METHODS: MethodMeta[] = [
  {
    key: 'mesa',
    title: 'En mesa',
    description: 'El comensal pide y consume dentro de tu local.',
    image: '/metodos-entrega/mesa.png',
    imageRatio: 754 / 1002,
    features: ['El mozo toma el pedido desde el Comandero', 'El consumo se acumula hasta cobrarlo en Caja'],
    tone: TONES.emerald,
  },
  {
    key: 'llevar',
    title: 'Para llevar',
    description: 'El cliente pide y pasa a recoger su pedido.',
    image: '/metodos-entrega/llevar.png',
    imageRatio: 480 / 951,
    features: ['No requiere dirección ni zona de cobertura', 'Ideal para pedidos por teléfono o mostrador'],
    tone: TONES.amber,
  },
  {
    key: 'delivery',
    title: 'Delivery',
    description: 'Le llevas el pedido a la puerta del cliente.',
    image: '/metodos-entrega/delivery.png',
    imageRatio: 565 / 963,
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
        {METHODS.map(m => {
          const enabled = methods[m.key].enabled;
          return (
            <div
              key={m.key}
              className={`group relative overflow-visible rounded-2xl border bg-white p-5 pr-32 flex flex-col ${
                enabled
                  ? 'border-slate-200 shadow-md'
                  : 'border-slate-200 shadow-sm grayscale-[35%] opacity-80 hover:opacity-100 hover:grayscale-0 transition-[opacity,filter] duration-300'
              }`}
            >
              {/* Personaje asomando por el costado derecho, mismo alto real en las tres cards */}
              <div
                style={{ aspectRatio: m.imageRatio }}
                className="pointer-events-none select-none absolute -right-1 top-[5%] bottom-[5%] z-10 transition-transform duration-300 ease-out group-hover:-translate-y-1 group-hover:scale-[1.08]"
              >
                <Image
                  src={m.image}
                  alt={m.title}
                  fill
                  sizes="140px"
                  className="object-contain object-bottom drop-shadow-xl"
                  priority={false}
                />
              </div>

              {/* Estado */}
              <div className="flex items-center justify-between gap-3">
                <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${
                  enabled ? m.tone.accentSoft : 'bg-slate-100 text-slate-500'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${enabled ? m.tone.accent : 'bg-slate-400'}`} />
                  {enabled ? 'Activo' : 'Inactivo'}
                </span>
              </div>

              {/* Título + descripción */}
              <h4 className="text-base font-bold text-slate-800 mt-3">{m.title}</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-[8.5rem]">{m.description}</p>

              {/* Features */}
              <ul className="space-y-1.5 mt-4 max-w-[9rem]">
                {m.features.map(f => (
                  <li key={f} className="flex items-start gap-1.5 text-[11px] text-slate-600 leading-relaxed">
                    <Check className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${enabled ? 'text-brand' : 'text-slate-300'}`} /> {f}
                  </li>
                ))}
              </ul>

              {m.footer && <div className="mt-3">{m.footer}</div>}

              {/* Switch, siempre pegado al fondo de la card */}
              <div className="flex items-center gap-3 pt-4 mt-auto border-t border-slate-200/70">
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

'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Truck, Check, ArrowRight } from 'lucide-react';
import { Toggle, Button, SucursalSelector } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { useSucursalSelector } from '@/hooks/useSucursalSelector';
import { getConfiguracion, updateConfiguracion } from '@/lib/api/configuracion';

type DeliveryMethodKey = 'mesa' | 'llevar' | 'delivery';

interface DeliveryMethods {
  mesa: { enabled: boolean };
  llevar: { enabled: boolean };
  delivery: { enabled: boolean };
}

const DEFAULTS: DeliveryMethods = {
  mesa: { enabled: true },
  llevar: { enabled: true },
  delivery: { enabled: false },
};

const TONES = {
  emerald: { accent: 'bg-emerald-500', accentSoft: 'bg-emerald-50 text-emerald-700' },
  amber: { accent: 'bg-amber-500', accentSoft: 'bg-amber-50 text-amber-700' },
  sky: { accent: 'bg-sky-500', accentSoft: 'bg-sky-50 text-sky-700' },
};

const METHODS = [
  { key: 'mesa' as DeliveryMethodKey, title: 'En mesa', description: 'El comensal pide y consume dentro de tu local.', image: '/metodos-entrega/mesa.png', imageRatio: 754 / 1002, features: ['El mozo toma el pedido desde el Comandero', 'El consumo se acumula hasta cobrarlo en Caja'], tone: TONES.emerald },
  { key: 'llevar' as DeliveryMethodKey, title: 'Para llevar', description: 'El cliente pide y pasa a recoger su pedido.', image: '/metodos-entrega/llevar.png', imageRatio: 480 / 951, features: ['No requiere dirección ni zona de cobertura', 'Ideal para pedidos por teléfono o mostrador'], tone: TONES.amber },
  { key: 'delivery' as DeliveryMethodKey, title: 'Delivery', description: 'Le llevas el pedido a la puerta del cliente.', image: '/metodos-entrega/delivery.png', imageRatio: 565 / 963, features: ['Usa las zonas de entrega que configures', 'Se registra con dirección en el Comandero'], tone: TONES.sky, footer: (<Link href="/configuracion/negocio?tab=areas-entrega" className="flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline">Configurar zonas de entrega <ArrowRight className="h-3 w-3" /></Link>) },
];

export default function MetodosEntregaPage() {
  const { triggerToast } = useApp();
  const { token, isSuperAdmin, sucursales, sId, selectSucursal } = useSucursalSelector();

  const [methods, setMethods] = useState<DeliveryMethods>(DEFAULTS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token || !sId) return;
    getConfiguracion(token, sId).then(c => {
      if (c.metodosEntregaJson) {
        try { setMethods({ ...DEFAULTS, ...JSON.parse(c.metodosEntregaJson) }); } catch { setMethods(DEFAULTS); }
      } else setMethods(DEFAULTS);
    }).catch(() => setMethods(DEFAULTS));
  }, [token, sId]);

  const save = async (updated: DeliveryMethods) => {
    if (!token || !sId) return;
    setSaving(true);
    try {
      const actual = await getConfiguracion(token, sId);
      await updateConfiguracion(token, sId, {
        igvPorcentaje: actual.igvPorcentaje, monedaSimbolo: actual.monedaSimbolo, logoUrl: actual.logoUrl,
        metodosEntregaJson: JSON.stringify(updated),
        instagram: actual.instagram, facebook: actual.facebook, tiktok: actual.tiktok,
        sitioWeb: actual.sitioWeb, reviewsLink: actual.reviewsLink,
      });
      triggerToast('Métodos de entrega guardados.', 'success');
    } catch { triggerToast('Error al guardar', 'error'); }
    finally { setSaving(false); }
  };

  const setMethodEnabled = (key: DeliveryMethodKey, enabled: boolean) => {
    setMethods(prev => ({ ...prev, [key]: { enabled } }));
  };

  const enabledCount = METHODS.filter(m => methods[m.key].enabled).length;

  return (
    <div className="space-y-6">
      <SucursalSelector visible={isSuperAdmin} sucursales={sucursales} sId={sId} onChange={selectSucursal} />

      <div className="flex items-center gap-3 pb-1">
        <div className="bg-brand p-2.5 rounded-xl shrink-0"><Truck className="h-5 w-5 text-white" /></div>
        <div><h3 className="text-xl font-bold text-slate-900">Métodos de Entrega</h3><p className="text-xs text-slate-500"><span className="font-semibold text-brand">{enabledCount} de {METHODS.length}</span> canales activos.</p></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
        {METHODS.map(m => {
          const enabled = methods[m.key].enabled;
          return (
            <div key={m.key} className={`group relative overflow-visible rounded-2xl border bg-white p-5 pr-32 flex flex-col ${enabled ? 'border-slate-200 shadow-md' : 'border-slate-200 shadow-sm grayscale-35 opacity-80 hover:opacity-100 hover:grayscale-0 transition-[opacity,filter] duration-300'}`}>
              <div style={{ aspectRatio: m.imageRatio }} className="pointer-events-none select-none absolute -right-1 top-[5%] bottom-[5%] z-10 transition-transform duration-300 ease-out group-hover:-translate-y-1 group-hover:scale-[1.08]">
                <Image src={m.image} alt={m.title} fill sizes="140px" className="object-contain object-bottom drop-shadow-xl" priority={false} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${enabled ? m.tone.accentSoft : 'bg-slate-100 text-slate-500'}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${enabled ? m.tone.accent : 'bg-slate-400'}`} />{enabled ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              <h4 className="text-base font-bold text-slate-800 mt-3">{m.title}</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-34">{m.description}</p>
              <ul className="space-y-1.5 mt-4 max-w-36">
                {m.features.map(f => <li key={f} className="flex items-start gap-1.5 text-[11px] text-slate-600 leading-relaxed"><Check className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${enabled ? 'text-brand' : 'text-slate-300'}`} /> {f}</li>)}
              </ul>
              {m.footer && <div className="mt-3">{m.footer}</div>}
              <div className="flex items-center gap-3 pt-4 mt-auto border-t border-slate-200/70">
                <span className="text-xs font-semibold text-slate-700">Disponible para clientes</span>
                <Toggle checked={enabled} onChange={v => setMethodEnabled(m.key, v)} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={() => save(methods)} disabled={saving}>{saving ? 'Guardando...' : 'Guardar cambios'}</Button>
      </div>
    </div>
  );
}

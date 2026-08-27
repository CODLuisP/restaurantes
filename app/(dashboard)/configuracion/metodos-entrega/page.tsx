'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Truck, Check, ArrowRight, Utensils, ShoppingBag } from 'lucide-react';
import { Toggle, Button, SucursalSelector, Spinner } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { useSucursalSelector } from '@/hooks/useSucursalSelector';
import { getConfiguracion, updateConfiguracion } from '@/lib/api/configuracion';
import { DEFAULT_METODOS_ENTREGA, parseMetodosEntrega, type MetodosEntrega } from '@/lib/config/metodos';

type DeliveryMethodKey = 'mesa' | 'llevar' | 'delivery';
type DeliveryMethods = MetodosEntrega;
const DEFAULTS = DEFAULT_METODOS_ENTREGA;

const METHODS = [
  {
    key: 'mesa' as DeliveryMethodKey,
    title: 'En mesa',
    subtitle: 'Consumo en local',
    description: 'El comensal pide y consume dentro de tu restaurante.',
    icon: Utensils,
    image: '/metodos-entrega/mesa.png',
    features: ['Atención por mozo', 'Acumulación de pedido hasta el cobro'],
  },
  {
    key: 'llevar' as DeliveryMethodKey,
    title: 'Para llevar',
    subtitle: 'Recojo en tienda',
    description: 'El cliente realiza su pedido y pasa a recogerlo.',
    icon: ShoppingBag,
    image: '/metodos-entrega/llevar.png',
    features: ['Sin costo de envío', 'Ideal para pedidos por teléfono o web'],
  },
  {
    key: 'delivery' as DeliveryMethodKey,
    title: 'Delivery',
    subtitle: 'Envío a domicilio',
    description: 'Entrega de pedidos a la ubicación del cliente.',
    icon: Truck,
    image: '/metodos-entrega/delivery.png',
    features: ['Tarifas por zona de cobertura', 'Registro de dirección de entrega'],
    action: (
      <Link href="/configuracion/negocio?tab=areas-entrega" className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline pt-1">
        Configurar zonas de entrega <ArrowRight className="h-3 w-3" />
      </Link>
    ),
  },
];

export default function MetodosEntregaPage() {
  const { triggerToast, refreshNegocioConfig } = useApp();
  const { token, isSuperAdmin, sucursales, sId, selectSucursal } = useSucursalSelector();

  const [methods, setMethods] = useState<DeliveryMethods>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !sId) return;
    setLoading(true);
    getConfiguracion(token, sId).then(c => {
      setMethods(parseMetodosEntrega(c.metodosEntregaJson));
    }).catch(() => setMethods(DEFAULTS)).finally(() => setLoading(false));
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
      refreshNegocioConfig();
    } catch { triggerToast('Error al guardar', 'error'); }
    finally { setSaving(false); }
  };

  const setMethodEnabled = (key: DeliveryMethodKey, enabled: boolean) => {
    setMethods(prev => ({ ...prev, [key]: { enabled } }));
  };

  const enabledCount = METHODS.filter(m => methods[m.key].enabled).length;

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <SucursalSelector visible={isSuperAdmin} sucursales={sucursales} sId={sId} onChange={selectSucursal} />

      {/* Header */}
      <div className="flex items-center gap-3 pb-1">
        <div className="bg-brand p-2.5 rounded-xl shrink-0"><Truck className="h-5 w-5 text-white" /></div>
        <div>
          <h3 className="text-xl font-bold text-slate-900">Métodos de Entrega</h3>
          <p className="text-xs text-slate-500">
            {loading ? (
              <span className="animate-pulse bg-slate-200 h-3 w-32 inline-block rounded" />
            ) : (
              <><span className="font-semibold text-brand">{enabledCount} de {METHODS.length}</span> canales de entrega activos.</>
            )}
          </p>
        </div>
      </div>

      {/* Cards 3-Column Compact Grid o Skeletons */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl border border-slate-100 p-4 space-y-3 animate-pulse">
              <div className="h-28 w-full rounded-xl bg-slate-100" />
              <div className="h-4 w-24 bg-slate-100 rounded" />
              <div className="h-3 w-full bg-slate-100 rounded" />
              <div className="h-3 w-2/3 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
        {METHODS.map(m => {
          const enabled = methods[m.key].enabled;
          const Icon = m.icon;
          return (
            <div
              key={m.key}
              className={`bg-white rounded-xl border p-4 flex flex-col justify-between transition-all duration-200 ${
                enabled ? 'border-slate-200/90 shadow-2xs hover:shadow-sm' : 'border-slate-100 opacity-60 bg-slate-50/50'
              }`}
            >
              <div className="space-y-2.5">
                {/* Banner superior con la ilustración 3D completa (sin cortes) y Toggle */}
                <div className="h-28 w-full rounded-xl bg-slate-50/80 p-2 flex items-center justify-center border border-slate-100 relative overflow-hidden">
                  <img src={m.image} alt={m.title} className="h-full w-full object-contain drop-shadow-md" />
                  <div className="absolute top-2.5 right-2.5">
                    <Toggle checked={enabled} onChange={v => setMethodEnabled(m.key, v)} />
                  </div>
                </div>

                {/* Título y Estado */}
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-slate-800">{m.title}</h4>
                  <span className={`text-[9px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${enabled ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                    {enabled ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 leading-snug">{m.description}</p>

                {/* Features */}
                <ul className="space-y-1 pt-1 border-t border-slate-100">
                  {m.features.map(f => (
                    <li key={f} className="flex items-start gap-1.5 text-[10px] text-slate-600 leading-tight">
                      <Check className={`h-3 w-3 shrink-0 mt-0.5 ${enabled ? 'text-emerald-600' : 'text-slate-300'}`} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {m.action && <div className="pt-2 border-t border-slate-100 mt-2">{m.action}</div>}
            </div>
          );
        })}
      </div>
      )}

      {/* Botón Guardar Cambios */}
      <div className="flex justify-end pt-2">
        <Button onClick={() => save(methods)} disabled={saving} size="md">
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </div>
    </div>
  );
}

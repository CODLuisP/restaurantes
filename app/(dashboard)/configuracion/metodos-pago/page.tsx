'use client';

import { useState, useEffect } from 'react';
import { Wallet, Banknote, CreditCard, Smartphone, Landmark, QrCode, CheckCircle2, Settings2, ImageOff, Check } from 'lucide-react';
import { Toggle, Input, Button, SucursalSelector, Spinner } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { useSucursalSelector } from '@/hooks/useSucursalSelector';
import { getConfiguracion, updateConfiguracion } from '@/lib/api/configuracion';
import { DEFAULT_METODOS_PAGO, parseMetodosPago, type MetodosPago } from '@/lib/config/metodos';
import QrPosterModal from '@/components/configuracion/metodos-pago/QrPosterModal';

type MethodBrand = 'efectivo' | 'tarjeta' | 'yape' | 'plin' | 'transferencia';
type PaymentMethods = MetodosPago;
const DEFAULTS = DEFAULT_METODOS_PAGO;

export default function MetodosPagoPage() {
  const { triggerToast, refreshNegocioConfig } = useApp();
  const { token, isSuperAdmin, sucursales, sId, selectSucursal } = useSucursalSelector();

  const [methods, setMethods] = useState<PaymentMethods>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [posterBrand, setPosterBrand] = useState<'yape' | 'plin' | null>(null);

  const bizName = sucursales.find(s => s.id === sId)?.nombre ?? '';

  useEffect(() => {
    if (!token || !sId) return;
    setLoading(true);
    getConfiguracion(token, sId).then(c => {
      setMethods(parseMetodosPago(c.metodosPagoJson));
    }).catch(() => setMethods(DEFAULTS)).finally(() => setLoading(false));
  }, [token, sId]);

  const save = async (updated: PaymentMethods) => {
    if (!token || !sId) return;
    setSaving(true);
    try {
      const actual = await getConfiguracion(token, sId);
      await updateConfiguracion(token, sId, {
        igvPorcentaje: actual.igvPorcentaje, monedaSimbolo: actual.monedaSimbolo, logoUrl: actual.logoUrl,
        metodosPagoJson: JSON.stringify(updated),
        instagram: actual.instagram, facebook: actual.facebook, tiktok: actual.tiktok,
        sitioWeb: actual.sitioWeb, reviewsLink: actual.reviewsLink,
      });
      triggerToast('Métodos de pago guardados.', 'success');
      refreshNegocioConfig();
    } catch { triggerToast('Error al guardar', 'error'); }
    finally { setSaving(false); }
  };

  const updateMethod = (brand: MethodBrand, changes: Record<string, any>) => {
    setMethods(prev => ({ ...prev, [brand]: { ...(prev[brand] as any), ...changes } }));
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <SucursalSelector visible={isSuperAdmin} sucursales={sucursales} sId={sId} onChange={selectSucursal} />

      {/* Header */}
      <div className="flex items-center gap-3 pb-1">
        <div className="bg-brand p-2.5 rounded-xl shrink-0"><Wallet className="h-5 w-5 text-white" /></div>
        <div>
          <h3 className="text-xl font-bold text-slate-900">Métodos de Pago</h3>
          <p className="text-xs text-slate-500">Configura los canales de pago disponibles para tus clientes en el menú.</p>
        </div>
      </div>

      {/* Cards Single Column Layout o Skeletons */}
      {loading ? (
        <div className="space-y-2.5 w-full">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="bg-white rounded-xl border border-slate-100 p-3 h-18 flex items-center gap-3 animate-pulse">
              <div className="h-12 w-16 bg-slate-100 rounded-xl shrink-0" />
              <div className="space-y-1.5 flex-1">
                <div className="h-4 w-32 bg-slate-100 rounded" />
                <div className="h-3 w-48 bg-slate-100 rounded" />
              </div>
              <div className="h-6 w-11 bg-slate-100 rounded-full shrink-0" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2.5 w-full">
        {/* 1. EFECTIVO */}
        <MethodCard
          brand="efectivo"
          title="Pago en Efectivo"
          description="Acepta pagos en efectivo al momento de la entrega o directamente en caja."
          enabled={methods.efectivo.enabled}
          onToggle={v => updateMethod('efectivo', { enabled: v })}
        />

        {/* 2. TARJETA */}
        <MethodCard
          brand="tarjeta"
          title="Tarjeta de Débito / Crédito"
          description="Acepta tarjetas Visa, Mastercard, American Express y Diners mediante POS o pasarela."
          enabled={methods.tarjeta.enabled}
          onToggle={v => updateMethod('tarjeta', { enabled: v })}
        />

        {/* 3. YAPE */}
        <MethodCard
          brand="yape"
          title="Yape (BCP)"
          description="Transferencias instantáneas por escaneo de código QR o número telefónico."
          enabled={methods.yape.enabled}
          onToggle={v => updateMethod('yape', { enabled: v })}
          extraDetails={
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${methods.yape.qrImage ? 'text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200' : 'text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200'}`}>
              {methods.yape.qrImage ? <CheckCircle2 className="h-3 w-3" /> : <QrCode className="h-3 w-3" />}
              {methods.yape.qrImage ? 'QR Cargado' : 'Falta QR'}
            </span>
          }
          actionButton={
            <button
              onClick={() => setPosterBrand('yape')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors shrink-0 cursor-pointer"
            >
              <Settings2 className="h-3 w-3" />
              {methods.yape.qrImage ? 'Editar QR' : 'Configurar QR'}
            </button>
          }
        />

        {/* 4. PLIN */}
        <MethodCard
          brand="plin"
          title="Plin (BBVA / Interbank)"
          description="Billetera digital interbancaria para pagos rápidos desde múltiples bancos."
          enabled={methods.plin.enabled}
          onToggle={v => updateMethod('plin', { enabled: v })}
          extraDetails={
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${methods.plin.qrImage ? 'text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200' : 'text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200'}`}>
              {methods.plin.qrImage ? <CheckCircle2 className="h-3 w-3" /> : <QrCode className="h-3 w-3" />}
              {methods.plin.qrImage ? 'QR Cargado' : 'Falta QR'}
            </span>
          }
          actionButton={
            <button
              onClick={() => setPosterBrand('plin')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors shrink-0 cursor-pointer"
            >
              <Settings2 className="h-3 w-3" />
              {methods.plin.qrImage ? 'Editar QR' : 'Configurar QR'}
            </button>
          }
        />

        {/* 5. TRANSFERENCIA */}
        <MethodCard
          brand="transferencia"
          title="Transferencia Bancaria"
          description="Para pagos corporativos o de alto valor mediante depósito en cuenta o CCI."
          enabled={methods.transferencia.enabled}
          onToggle={v => updateMethod('transferencia', { enabled: v })}
          expandableContent={
            methods.transferencia.enabled && (
              <div className="pt-2.5 mt-2.5 border-t border-slate-100 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Input label="Banco" value={methods.transferencia.bankName} onChange={e => updateMethod('transferencia', { bankName: e.target.value })} placeholder="Ej: BCP" />
                  <Input label="N° Cuenta" value={methods.transferencia.accountNumber} onChange={e => updateMethod('transferencia', { accountNumber: e.target.value })} placeholder="191-1234567" />
                </div>
                <Input label="CCI" value={methods.transferencia.cci} onChange={e => updateMethod('transferencia', { cci: e.target.value })} placeholder="002-191-001234567" />
              </div>
            )
          }
        />
      </div>
      )}

      {/* Botón Guardar Cambios */}
      <div className="flex justify-end pt-2">
        <Button onClick={() => save(methods)} disabled={saving} size="md">
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </div>

      {/* Modales de Cartel QR */}
      <QrPosterModal open={posterBrand === 'yape'} onClose={() => setPosterBrand(null)} brand="yape" bizName={bizName} config={methods.yape} onUpdateConfig={changes => updateMethod('yape', changes)} />
      <QrPosterModal open={posterBrand === 'plin'} onClose={() => setPosterBrand(null)} brand="plin" bizName={bizName} config={methods.plin} onUpdateConfig={changes => updateMethod('plin', changes)} />
    </div>
  );
}

/** Componente de Tarjeta Horizontal Compacta */
function MethodCard({
  brand,
  title,
  description,
  enabled,
  onToggle,
  extraDetails,
  actionButton,
  expandableContent,
}: {
  brand: MethodBrand;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  extraDetails?: React.ReactNode;
  actionButton?: React.ReactNode;
  expandableContent?: React.ReactNode;
}) {
  return (
    <div className={`bg-white rounded-xl border p-3 sm:px-4 sm:py-3 transition-all duration-200 ${enabled ? 'border-slate-200/90 shadow-2xs hover:shadow-sm' : 'border-slate-100 opacity-60 bg-slate-50/50'}`}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Izquierda: Thumbnail + Info */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="h-12 w-16 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200/80 shadow-2xs relative">
            <img src={`/metodos-pago/${brand}.jpeg`} alt={title} className="h-full w-full object-cover" />
          </div>

          <div className="space-y-0.5 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs sm:text-sm font-bold text-slate-800">{title}</h4>
              <span className={`text-[9px] px-2 py-0.2 rounded-full font-bold uppercase tracking-wider ${enabled ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                {enabled ? 'Activo' : 'Inactivo'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-snug">{description}</p>
            {extraDetails}
          </div>
        </div>

        {/* Derecha: Botón de acción + Toggle */}
        <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
          {actionButton}
          <Toggle checked={enabled} onChange={onToggle} />
        </div>
      </div>

      {/* Contenido expandible si aplica */}
      {expandableContent}
    </div>
  );
}

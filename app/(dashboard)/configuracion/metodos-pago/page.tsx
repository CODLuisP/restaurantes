'use client';

import { useState, useEffect } from 'react';
import { Wallet, Banknote, CreditCard, Smartphone, Landmark, QrCode, CheckCircle2, Settings2, ImageOff } from 'lucide-react';
import { Toggle, Input, Button, SucursalSelector } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { useSucursalSelector } from '@/hooks/useSucursalSelector';
import { getConfiguracion, updateConfiguracion } from '@/lib/api/configuracion';
import QrPosterModal from '@/components/configuracion/metodos-pago/QrPosterModal';

type MethodBrand = 'efectivo' | 'tarjeta' | 'yape' | 'plin' | 'transferencia';

interface PaymentMethods {
  efectivo: { enabled: boolean };
  tarjeta: { enabled: boolean };
  yape: { enabled: boolean; qrImage: string; holderName: string; phone: string };
  plin: { enabled: boolean; qrImage: string; holderName: string; phone: string };
  transferencia: { enabled: boolean; bankName: string; accountNumber: string; cci: string };
}

const DEFAULTS: PaymentMethods = {
  efectivo: { enabled: true },
  tarjeta: { enabled: true },
  yape: { enabled: false, qrImage: '', holderName: '', phone: '' },
  plin: { enabled: false, qrImage: '', holderName: '', phone: '' },
  transferencia: { enabled: false, bankName: '', accountNumber: '', cci: '' },
};

export default function MetodosPagoPage() {
  const { triggerToast } = useApp();
  const { token, isSuperAdmin, sucursales, sId, selectSucursal } = useSucursalSelector();

  const [methods, setMethods] = useState<PaymentMethods>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [posterBrand, setPosterBrand] = useState<'yape' | 'plin' | null>(null);

  const bizName = sucursales.find(s => s.id === sId)?.nombre ?? '';

  useEffect(() => {
    if (!token || !sId) return;
    getConfiguracion(token, sId).then(c => {
      if (c.metodosPagoJson) {
        try { setMethods({ ...DEFAULTS, ...JSON.parse(c.metodosPagoJson) }); } catch { setMethods(DEFAULTS); }
      } else setMethods(DEFAULTS);
    }).catch(() => setMethods(DEFAULTS));
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
    } catch { triggerToast('Error al guardar', 'error'); }
    finally { setSaving(false); }
  };

  const updateMethod = (brand: MethodBrand, changes: Record<string, any>) => {
    setMethods(prev => ({ ...prev, [brand]: { ...(prev[brand] as any), ...changes } }));
  };

  return (
    <div className="space-y-6">
      <SucursalSelector visible={isSuperAdmin} sucursales={sucursales} sId={sId} onChange={selectSucursal} />

      <div className="flex items-center gap-3 pb-1">
        <div className="bg-brand p-2.5 rounded-xl shrink-0"><Wallet className="h-5 w-5 text-white" /></div>
        <div><h3 className="text-xl font-bold text-slate-900">Métodos de Pago</h3><p className="text-xs text-slate-500">Elige cómo pueden pagarte tus clientes.</p></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <SimpleMethodCard brand="efectivo" icon={<Banknote className="h-5 w-5" />} title="Efectivo" description="Pago en efectivo al entregar o en caja." enabled={methods.efectivo.enabled} onToggle={v => updateMethod('efectivo', { enabled: v })} />
        <SimpleMethodCard brand="tarjeta" icon={<CreditCard className="h-5 w-5" />} title="Tarjeta" description="Visa, Mastercard, American Express." enabled={methods.tarjeta.enabled} onToggle={v => updateMethod('tarjeta', { enabled: v })} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        <QrMethodCard brand="yape" icon={<Smartphone className="h-5 w-5" />} title="Yape" description="Tus clientes escanean tu QR de Yape." enabled={methods.yape.enabled} holderName={methods.yape.holderName} phone={methods.yape.phone} qrImage={methods.yape.qrImage} onToggle={v => updateMethod('yape', { enabled: v })} onConfigure={() => setPosterBrand('yape')} />
        <QrMethodCard brand="plin" icon={<Smartphone className="h-5 w-5" />} title="Plin" description="Tus clientes escanean tu QR de Plin." enabled={methods.plin.enabled} holderName={methods.plin.holderName} phone={methods.plin.phone} qrImage={methods.plin.qrImage} onToggle={v => updateMethod('plin', { enabled: v })} onConfigure={() => setPosterBrand('plin')} />

        <div className="card-lg overflow-hidden md:col-span-2 xl:col-span-1">
          <BrandCoverHeader brand="transferencia" icon={<Landmark className="h-5 w-5" />} title="Transferencia" enabled={methods.transferencia.enabled} onToggle={v => updateMethod('transferencia', { enabled: v })} />
          <div className="p-5 space-y-4">
            <p className="text-xs text-slate-500 -mt-2">Para pedidos grandes o clientes empresa.</p>
            {methods.transferencia.enabled && (
              <div className="space-y-3 pt-1 border-t border-slate-100">
                <div className="flex gap-3">
                  <div className="w-2/5"><Input label="Banco" value={methods.transferencia.bankName} onChange={e => updateMethod('transferencia', { bankName: e.target.value })} placeholder="Ej: BCP" /></div>
                  <div className="flex-1"><Input label="Número de cuenta" value={methods.transferencia.accountNumber} onChange={e => updateMethod('transferencia', { accountNumber: e.target.value })} placeholder="191-1234567-0-89" /></div>
                </div>
                <Input label="CCI" value={methods.transferencia.cci} onChange={e => updateMethod('transferencia', { cci: e.target.value })} placeholder="002-191-001234567089-12" />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={() => save(methods)} disabled={saving}>{saving ? 'Guardando...' : 'Guardar cambios'}</Button>
      </div>

      <QrPosterModal open={posterBrand === 'yape'} onClose={() => setPosterBrand(null)} brand="yape" bizName={bizName} config={methods.yape} onUpdateConfig={changes => updateMethod('yape', changes)} />
      <QrPosterModal open={posterBrand === 'plin'} onClose={() => setPosterBrand(null)} brand="plin" bizName={bizName} config={methods.plin} onUpdateConfig={changes => updateMethod('plin', changes)} />
    </div>
  );
}

function BrandCoverHeader({ brand, icon, title, enabled, onToggle }: { brand: MethodBrand; icon: React.ReactNode; title: string; enabled: boolean; onToggle: (v: boolean) => void }) {
  return (
    <div className="relative h-24 bg-cover bg-center" style={{ backgroundImage: `url(/metodos-pago/${brand}.jpeg)` }}>
      <div className="absolute inset-0 bg-black/55" />
      <div className="relative h-full flex items-center justify-between px-4">
        <div className="flex items-center gap-2.5 min-w-0"><div className="h-10 w-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-white shrink-0">{icon}</div><h4 className="text-sm font-bold text-white truncate">{title}</h4></div>
        <Toggle checked={enabled} onChange={onToggle} />
      </div>
    </div>
  );
}

function SimpleMethodCard({ brand, icon, title, description, enabled, onToggle }: { brand: MethodBrand; icon: React.ReactNode; title: string; description: string; enabled: boolean; onToggle: (v: boolean) => void }) {
  return <div className="card-lg overflow-hidden"><BrandCoverHeader brand={brand} icon={icon} title={title} enabled={enabled} onToggle={onToggle} /><div className="p-5"><p className="text-xs text-slate-500">{description}</p></div></div>;
}

function QrMethodCard({ brand, icon, title, description, enabled, holderName, phone, qrImage, onToggle, onConfigure }: { brand: 'yape' | 'plin'; icon: React.ReactNode; title: string; description: string; enabled: boolean; holderName: string; phone: string; qrImage: string; onToggle: (v: boolean) => void; onConfigure: () => void }) {
  const configured = !!qrImage;
  return (
    <div className="card-lg overflow-hidden">
      <BrandCoverHeader brand={brand} icon={icon} title={title} enabled={enabled} onToggle={onToggle} />
      <div className="p-5 space-y-4">
        <p className="text-xs text-slate-500 -mt-2">{description}</p>
        <div className="flex items-center gap-3 pt-1 border-t border-slate-100">
          <div className="h-12 w-12 rounded-lg overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
            {configured ? <img src={qrImage} alt={`QR de ${title}`} className="h-full w-full object-contain p-1" /> : <ImageOff className="h-4 w-4 text-slate-300" />}
          </div>
          <div className="min-w-0 flex-1">
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide ${configured ? 'text-emerald-600' : 'text-amber-600'}`}>{configured ? <CheckCircle2 className="h-3 w-3" /> : <QrCode className="h-3 w-3" />}{configured ? 'QR configurado' : 'Falta cargar tu QR'}</span>
            <p className="text-[11px] text-slate-500 truncate">{holderName || phone ? `${holderName || 'Sin nombre'}${phone ? ` · ${phone}` : ''}` : 'Sin datos del titular'}</p>
          </div>
        </div>
        <button onClick={onConfigure} className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"><Settings2 className="h-3.5 w-3.5" /> {configured ? 'Editar cartel de cobro' : 'Configurar cartel de cobro'}</button>
      </div>
    </div>
  );
}

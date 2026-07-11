'use client';

import { useState } from 'react';
import {
  Wallet, Banknote, CreditCard, Smartphone, Landmark,
  QrCode, CheckCircle2, Settings2, ImageOff,
} from 'lucide-react';
import { Toggle, Input } from '@/components/ui';
import { usePaymentMethods } from '@/context/PaymentMethodsContext';
import QrPosterModal from '@/components/configuracion/metodos-pago/QrPosterModal';

export default function MetodosPagoPage() {
  const { methods, updateMethod } = usePaymentMethods();
  const [posterBrand, setPosterBrand] = useState<'yape' | 'plin' | null>(null);

  return (
    <div className="space-y-6 animate-section">
      {/* Header */}
      <div className="flex items-center gap-3 pb-1">
        <div className="bg-brand p-2.5 rounded-xl shrink-0">
          <Wallet className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900">Métodos de Pago</h3>
          <p className="text-xs text-slate-500">Elige cómo pueden pagarte tus clientes y genera tus carteles de cobro para Yape y Plin.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {/* ── Efectivo ── */}
        <SimpleMethodCard
          icon={<Banknote className="h-5 w-5" />}
          tone="emerald"
          title="Efectivo"
          description="Pago en efectivo al momento de entregar el pedido o en caja."
          enabled={methods.efectivo.enabled}
          onToggle={v => updateMethod('efectivo', { enabled: v })}
        />

        {/* ── Tarjeta ── */}
        <SimpleMethodCard
          icon={<CreditCard className="h-5 w-5" />}
          tone="sky"
          title="Tarjeta"
          description="Visa, Mastercard y American Express, vía POS físico o link de pago."
          enabled={methods.tarjeta.enabled}
          onToggle={v => updateMethod('tarjeta', { enabled: v })}
        />

        {/* ── Yape ── */}
        <QrMethodCard
          brand="yape"
          icon={<Smartphone className="h-5 w-5" />}
          tone="violet"
          title="Yape"
          description="Tus clientes escanean tu QR real de Yape para pagarte al instante."
          enabled={methods.yape.enabled}
          holderName={methods.yape.holderName}
          phone={methods.yape.phone}
          qrImage={methods.yape.qrImage}
          onToggle={v => updateMethod('yape', { enabled: v })}
          onConfigure={() => setPosterBrand('yape')}
        />

        {/* ── Plin ── */}
        <QrMethodCard
          brand="plin"
          icon={<Smartphone className="h-5 w-5" />}
          tone="teal"
          title="Plin"
          description="Tus clientes escanean tu QR real de Plin para pagarte al instante."
          enabled={methods.plin.enabled}
          holderName={methods.plin.holderName}
          phone={methods.plin.phone}
          qrImage={methods.plin.qrImage}
          onToggle={v => updateMethod('plin', { enabled: v })}
          onConfigure={() => setPosterBrand('plin')}
        />

        {/* ── Transferencia bancaria ── */}
        <div className="card-lg p-5 space-y-4 md:col-span-2 xl:col-span-1">
          <div className="flex items-start gap-3.5">
            <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0 bg-amber-50 text-amber-600">
              <Landmark className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-bold text-slate-800">Transferencia bancaria</h4>
                <Toggle checked={methods.transferencia.enabled} onChange={v => updateMethod('transferencia', { enabled: v })} />
              </div>
              <p className="text-xs text-slate-500 mt-1">Para pedidos grandes o clientes empresa.</p>
            </div>
          </div>

          {methods.transferencia.enabled && (
            <div className="space-y-3 pt-1 border-t border-slate-100">
              <Input
                label="Banco"
                value={methods.transferencia.bankName}
                onChange={e => updateMethod('transferencia', { bankName: e.target.value })}
                placeholder="Ej: BCP"
              />
              <Input
                label="Número de cuenta"
                value={methods.transferencia.accountNumber}
                onChange={e => updateMethod('transferencia', { accountNumber: e.target.value })}
                placeholder="191-1234567-0-89"
              />
              <Input
                label="CCI"
                value={methods.transferencia.cci}
                onChange={e => updateMethod('transferencia', { cci: e.target.value })}
                placeholder="002-191-001234567089-12"
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Modales de cartel QR ── */}
      <QrPosterModal open={posterBrand === 'yape'} onClose={() => setPosterBrand(null)} brand="yape" />
      <QrPosterModal open={posterBrand === 'plin'} onClose={() => setPosterBrand(null)} brand="plin" />
    </div>
  );
}

/* ── Tarjeta simple: activar / desactivar ── */
const TONES: Record<string, string> = {
  emerald: 'bg-emerald-50 text-emerald-600',
  sky:     'bg-sky-50 text-sky-600',
  violet:  'bg-violet-100 text-violet-700',
  teal:    'bg-teal-100 text-teal-700',
};

function SimpleMethodCard({
  icon, tone, title, description, enabled, onToggle,
}: {
  icon: React.ReactNode;
  tone: string;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <div className="card-lg p-5">
      <div className="flex items-start gap-3.5">
        <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${TONES[tone]}`}>{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-bold text-slate-800">{title}</h4>
            <Toggle checked={enabled} onChange={onToggle} />
          </div>
          <p className="text-xs text-slate-500 mt-1">{description}</p>
        </div>
      </div>
    </div>
  );
}

/* ── Tarjeta Yape/Plin: activar + configurar cartel con QR propio ── */
function QrMethodCard({
  brand, icon, tone, title, description, enabled, holderName, phone, qrImage, onToggle, onConfigure,
}: {
  brand: 'yape' | 'plin';
  icon: React.ReactNode;
  tone: string;
  title: string;
  description: string;
  enabled: boolean;
  holderName: string;
  phone: string;
  qrImage: string;
  onToggle: (v: boolean) => void;
  onConfigure: () => void;
}) {
  const configured = !!qrImage;

  return (
    <div className="card-lg p-5 space-y-4">
      <div className="flex items-start gap-3.5">
        <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${TONES[tone]}`}>{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-bold text-slate-800">{title}</h4>
            <Toggle checked={enabled} onChange={onToggle} />
          </div>
          <p className="text-xs text-slate-500 mt-1">{description}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-1 border-t border-slate-100">
        <div className="h-12 w-12 rounded-lg overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
          {configured ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrImage} alt={`QR de ${title}`} className="h-full w-full object-contain p-1" />
          ) : (
            <ImageOff className="h-4 w-4 text-slate-300" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide ${configured ? 'text-emerald-600' : 'text-amber-600'}`}>
            {configured ? <CheckCircle2 className="h-3 w-3" /> : <QrCode className="h-3 w-3" />}
            {configured ? 'QR configurado' : 'Falta cargar tu QR'}
          </span>
          <p className="text-[11px] text-slate-500 truncate">
            {holderName || phone ? `${holderName || 'Sin nombre'}${phone ? ` · ${phone}` : ''}` : 'Sin datos del titular'}
          </p>
        </div>
      </div>

      <button
        onClick={onConfigure}
        className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
      >
        <Settings2 className="h-3.5 w-3.5" /> {configured ? 'Editar cartel de cobro' : 'Configurar cartel de cobro'}
      </button>
    </div>
  );
}

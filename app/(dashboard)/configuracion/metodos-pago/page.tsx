'use client';

import { useState } from 'react';
import {
  Wallet, Banknote, CreditCard, Smartphone, Landmark,
  QrCode, CheckCircle2, Settings2, ImageOff,
} from 'lucide-react';
import { Toggle, Input } from '@/components/ui';
import { usePaymentMethods } from '@/context/PaymentMethodsContext';
import QrPosterModal from '@/components/configuracion/metodos-pago/QrPosterModal';

type MethodBrand = 'efectivo' | 'tarjeta' | 'yape' | 'plin' | 'transferencia';

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

      {/* ── Sin configuración: solo activar/desactivar ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <SimpleMethodCard
          brand="efectivo"
          icon={<Banknote className="h-5 w-5" />}
          title="Efectivo"
          description="Pago en efectivo al momento de entregar el pedido o en caja."
          enabled={methods.efectivo.enabled}
          onToggle={v => updateMethod('efectivo', { enabled: v })}
        />

        <SimpleMethodCard
          brand="tarjeta"
          icon={<CreditCard className="h-5 w-5" />}
          title="Tarjeta"
          description="Visa, Mastercard y American Express, vía POS físico o link de pago."
          enabled={methods.tarjeta.enabled}
          onToggle={v => updateMethod('tarjeta', { enabled: v })}
        />
      </div>

      {/* ── Requieren configuración ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {/* ── Yape ── */}
        <QrMethodCard
          brand="yape"
          icon={<Smartphone className="h-5 w-5" />}
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
        <div className="card-lg overflow-hidden md:col-span-2 xl:col-span-1">
          <BrandCoverHeader
            brand="transferencia"
            icon={<Landmark className="h-5 w-5" />}
            title="Transferencia bancaria"
            enabled={methods.transferencia.enabled}
            onToggle={v => updateMethod('transferencia', { enabled: v })}
          />
          <div className="p-5 space-y-4">
            <p className="text-xs text-slate-500 -mt-2">Para pedidos grandes o clientes empresa.</p>

            {methods.transferencia.enabled && (
              <div className="space-y-3 pt-1 border-t border-slate-100">
                <div className="flex gap-3">
                  <div className="w-2/5">
                    <Input
                      label="Banco"
                      value={methods.transferencia.bankName}
                      onChange={e => updateMethod('transferencia', { bankName: e.target.value })}
                      placeholder="Ej: BCP"
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      label="Número de cuenta"
                      value={methods.transferencia.accountNumber}
                      onChange={e => updateMethod('transferencia', { accountNumber: e.target.value })}
                      placeholder="191-1234567-0-89"
                    />
                  </div>
                </div>
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
      </div>

      {/* ── Modales de cartel QR ── */}
      <QrPosterModal open={posterBrand === 'yape'} onClose={() => setPosterBrand(null)} brand="yape" />
      <QrPosterModal open={posterBrand === 'plin'} onClose={() => setPosterBrand(null)} brand="plin" />
    </div>
  );
}

/* ── Portada compartida: ilustración de la marca + ícono + nombre + activar/desactivar ── */
function BrandCoverHeader({
  brand, icon, title, enabled, onToggle,
}: {
  brand: MethodBrand;
  icon: React.ReactNode;
  title: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <div
      className="relative h-24 bg-cover bg-center"
      style={{ backgroundImage: `url(/metodos-pago/${brand}.jpeg)` }}
    >
      <div className="absolute inset-0 bg-black/55" />
      <div className="relative h-full flex items-center justify-between px-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-white shrink-0">
            {icon}
          </div>
          <h4 className="text-sm font-bold text-white truncate">{title}</h4>
        </div>
        <Toggle checked={enabled} onChange={onToggle} />
      </div>
    </div>
  );
}

/* ── Tarjeta simple: activar / desactivar ── */
function SimpleMethodCard({
  brand, icon, title, description, enabled, onToggle,
}: {
  brand: MethodBrand;
  icon: React.ReactNode;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <div className="card-lg overflow-hidden">
      <BrandCoverHeader brand={brand} icon={icon} title={title} enabled={enabled} onToggle={onToggle} />
      <div className="p-5">
        <p className="text-xs text-slate-500">{description}</p>
      </div>
    </div>
  );
}

/* ── Tarjeta Yape/Plin: activar + configurar cartel con QR propio ── */
function QrMethodCard({
  brand, icon, title, description, enabled, holderName, phone, qrImage, onToggle, onConfigure,
}: {
  brand: 'yape' | 'plin';
  icon: React.ReactNode;
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
    <div className="card-lg overflow-hidden">
      <BrandCoverHeader brand={brand} icon={icon} title={title} enabled={enabled} onToggle={onToggle} />

      <div className="p-5 space-y-4">
        <p className="text-xs text-slate-500 -mt-2">{description}</p>

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
    </div>
  );
}

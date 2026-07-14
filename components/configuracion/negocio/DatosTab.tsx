'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Pencil, Printer } from 'lucide-react';
import { Input, Toggle } from '@/components/ui';
import { useBusiness, type PaperSize } from '@/context/BusinessContext';
import LogoCropModal from './LogoCropModal';

const DESC_CORTA_MAX = 200;
const DESC_LARGA_MAX = 500;

const PAPER_SIZES: { id: PaperSize; label: string }[] = [
  { id: '58mm',          label: '58 mm' },
  { id: '80mm',          label: '80 mm' },
  { id: 'personalizado', label: 'Personalizado' },
];

/** Encabezado de sección: separa grupos de campos con una línea, sin cajas de fondo. */
function SectionHeader({ icon, title, description }: { icon?: React.ReactNode; title: string; description?: string }) {
  return (
    <div className="pt-6 border-t border-slate-100">
      <p className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
        {icon}
        {title}
      </p>
      {description && <p className="text-[11px] text-slate-500 mt-1">{description}</p>}
    </div>
  );
}

export default function DatosTab() {
  const { business, updateBusiness } = useBusiness();
  const [subdominio, setSubdominio] = useState('');
  const [descCorta, setDescCorta] = useState('');
  const [descLarga, setDescLarga] = useState('');
  const [tipoNegocio, setTipoNegocio] = useState('Restaurante');
  const [numeroPrincipal, setNumeroPrincipal] = useState('');
  const [numeroPedidos, setNumeroPedidos] = useState('');
  const [email, setEmail] = useState('');
  const [autoAceptar, setAutoAceptar] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoSource, setLogoSource] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoSource(URL.createObjectURL(file));
    setCropOpen(true);
    e.target.value = '';
  };

  const handleCropApply = (dataUrl: string) => {
    updateBusiness({ logo: dataUrl });
    setCropOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Logo del negocio */}
      <div className="space-y-1.5">
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Logo del negocio</label>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => logoInputRef.current?.click()}
            className="group/logo relative h-20 w-20 shrink-0 rounded-xl overflow-hidden border-2 border-dashed border-slate-200 hover:border-brand bg-slate-50 flex items-center justify-center transition-colors"
          >
            {business.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={business.logo} alt="Logo del negocio" className="h-full w-full object-contain p-1.5" />
            ) : (
              <ImagePlus className="h-6 w-6 text-slate-300" />
            )}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/logo:opacity-100 transition-opacity flex items-center justify-center">
              <Pencil className="h-4 w-4 text-white" />
            </div>
          </button>
          <div className="space-y-1">
            <button type="button" onClick={() => logoInputRef.current?.click()} className="btn-secondary">
              <ImagePlus className="h-3.5 w-3.5" /> {business.logo ? 'Cambiar logo' : 'Subir logo'}
            </button>
            <p className="text-[11px] text-slate-500">PNG o JPG. Podrás recortarlo y elegir el formato después de subirlo.</p>
          </div>
        </div>
        <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoSelect} className="hidden" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Nombre del negocio *"
          value={business.name}
          onChange={e => updateBusiness({ name: e.target.value })}
          placeholder="Nombre de tu restaurante"
        />
        <div>
          <Input
            label="Subdominio"
            value={subdominio}
            onChange={e => setSubdominio(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            placeholder="mi-restaurante"
          />
          <p className="text-[11px] text-slate-500 mt-1">
            Tu menú estará en:{' '}
            <span className="text-brand font-medium">
              https://{subdominio || 'tu-subdominio'}.gomenu.cl
            </span>
          </p>
        </div>
      </div>

      {/* Contacto */}
      <SectionHeader
        title="Contacto"
        description="Cómo te llaman, te escriben y hacen pedidos tus clientes."
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Input
          label="Número principal"
          value={numeroPrincipal}
          onChange={e => setNumeroPrincipal(e.target.value.replace(/[^\d ()+-]/g, ''))}
          placeholder="+51 999 999 999"
          inputMode="tel"
        />
        <div>
          <Input
            label="Número para pedidos"
            value={numeroPedidos}
            onChange={e => setNumeroPedidos(e.target.value.replace(/[^\d ()+-]/g, ''))}
            placeholder="+51 999 999 999"
            inputMode="tel"
          />
          <p className="text-[11px] text-slate-500 mt-1">
            El que verán tus clientes para llamar o escribir y hacer pedidos.
          </p>
        </div>
        <Input
          label="Email de contacto"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="contacto@turestaurante.pe"
        />
      </div>

      {/* Identificación (SUNAT) */}
      <SectionHeader
        title="Identificación"
        description="RUC, razón social y ubicación — se usan para emitir boletas/facturas y aparecen en tu carta digital."
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Input
          label="RUC"
          value={business.ruc}
          onChange={e => updateBusiness({ ruc: e.target.value.replace(/\D/g, '').slice(0, 11) })}
          placeholder="20123456789"
          inputMode="numeric"
          maxLength={11}
        />
        <Input
          label="Razón social"
          value={business.razonSocial}
          onChange={e => updateBusiness({ razonSocial: e.target.value })}
          placeholder="Ej: Restopro Perú S.A.C."
        />
        <Input
          label="Ubicación / Dirección"
          value={business.address}
          onChange={e => updateBusiness({ address: e.target.value })}
          placeholder="Ej: Av. Larco 345, Miraflores, Lima"
        />
      </div>

      {/* Presencia digital */}
      <SectionHeader title="Presencia digital" />

      <div className="space-y-1">
        <Input
          label="Descripción corta"
          value={descCorta}
          onChange={e => setDescCorta(e.target.value.slice(0, DESC_CORTA_MAX))}
          placeholder="Breve descripción para SEO y listados..."
        />
        <p className="text-right text-[11px] text-slate-400">{descCorta.length}/{DESC_CORTA_MAX}</p>
      </div>

      <div className="space-y-1">
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          Descripción completa
        </label>
        <textarea
          value={descLarga}
          onChange={e => setDescLarga(e.target.value.slice(0, DESC_LARGA_MAX))}
          placeholder="Describe tu negocio en detalle..."
          rows={4}
          className="input w-full px-3 py-2 resize-none"
        />
        <p className="text-right text-[11px] text-slate-400">{descLarga.length}/{DESC_LARGA_MAX}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Tipo de negocio
          </label>
          <select
            value={tipoNegocio}
            onChange={e => setTipoNegocio(e.target.value)}
            className="input w-full px-3 py-2"
          >
            <option>Restaurante</option>
            <option>Cafetería</option>
            <option>Bar</option>
            <option>Food Truck</option>
            <option>Pastelería</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Printer className="h-3.5 w-3.5 text-slate-400" /> Tamaño de papel
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {PAPER_SIZES.map(s => {
              const active = business.paperSize === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => updateBusiness({ paperSize: s.id })}
                  className={`px-2 py-2 rounded-lg border text-[11px] font-semibold transition-colors ${
                    active
                      ? 'bg-brand text-white border-brand'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
          {business.paperSize === 'personalizado' && (
            <div className="flex items-center gap-2 pt-1">
              <input
                type="number"
                min={20}
                max={210}
                value={business.paperSizeCustomMm}
                onChange={e => updateBusiness({ paperSizeCustomMm: Number(e.target.value) || 0 })}
                className="input w-full px-3 py-1.5 text-xs"
              />
              <span className="text-[11px] text-slate-500 shrink-0">mm de ancho</span>
            </div>
          )}
        </div>
      </div>

      <div className="pt-6 border-t border-slate-100 space-y-5">
        <Toggle
          checked={autoAceptar}
          onChange={setAutoAceptar}
          label="Auto-aceptar pedidos"
          hint="Los pedidos online se confirman automáticamente sin intervención manual. Desactívalo si quieres revisar cada pedido antes de aceptarlo."
        />
      </div>

      <LogoCropModal
        open={cropOpen}
        source={logoSource}
        onClose={() => setCropOpen(false)}
        onApply={handleCropApply}
      />
    </div>
  );
}

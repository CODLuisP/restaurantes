'use client';

import { useRef, useState } from 'react';
import { Eye, EyeOff, FileCheck2, KeyRound, Receipt, ShieldCheck, Upload } from 'lucide-react';
import { Input, Toggle } from '@/components/ui';
import { useBusiness, type IgvType } from '@/context/BusinessContext';

const IGV_TYPES: { id: IgvType; label: string; hint: string }[] = [
  { id: 'Gravado',   label: 'Gravado (18%)', hint: 'Operación afecta al IGV — el caso más común.' },
  { id: 'Exonerado', label: 'Exonerado',     hint: 'Operación exonerada del IGV (ej: zonas con beneficio tributario).' },
  { id: 'Inafecto',  label: 'Inafecto',      hint: 'Operación no gravada por naturaleza (fuera del ámbito del IGV).' },
];

const fmtDate = (iso: string) =>
  iso ? new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const ESTILOS_COMIDA = [
  'Comida chilena', 'Comida italiana', 'Comida mexicana', 'Comida peruana',
  'Comida japonesa', 'Comida china', 'Comida rápida', 'Comida saludable',
  'Comida vegana', 'Variada', 'Otra',
];

const DESC_CORTA_MAX = 200;
const DESC_LARGA_MAX = 500;

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
  const [estilos, setEstilos] = useState<string[]>([]);
  const [autoAceptar, setAutoAceptar] = useState(false);
  const [preciosOtrasMonedas, setPreciosOtrasMonedas] = useState(false);
  const [showClaveSol, setShowClaveSol] = useState(false);

  const certInputRef = useRef<HTMLInputElement>(null);

  const toggleEstilo = (estilo: string) => {
    setEstilos(prev =>
      prev.includes(estilo) ? prev.filter(e => e !== estilo) : [...prev, estilo]
    );
  };

  const handleCertUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const issued = new Date();
    const expires = new Date(issued);
    expires.setFullYear(expires.getFullYear() + 1);
    updateBusiness({
      certFileName: file.name,
      certIssuedAt: issued.toISOString(),
      certExpiresAt: expires.toISOString(),
    });
    e.target.value = '';
  };

  /* Vigencia del certificado */
  const hasCert = !!business.certFileName;
  const now = Date.now();
  const expiresAt = business.certExpiresAt ? new Date(business.certExpiresAt).getTime() : 0;
  const issuedAt = business.certIssuedAt ? new Date(business.certIssuedAt).getTime() : 0;
  const daysRemaining = hasCert ? Math.ceil((expiresAt - now) / 86_400_000) : 0;
  const totalDays = hasCert ? Math.max(1, Math.round((expiresAt - issuedAt) / 86_400_000)) : 1;
  const progress = hasCert ? Math.min(100, Math.max(0, ((totalDays - daysRemaining) / totalDays) * 100)) : 0;
  const certStatus =
    daysRemaining < 0 ? 'expired' : daysRemaining <= 30 ? 'warning' : 'healthy';
  const certColors = {
    healthy: { text: 'text-emerald-600', bar: 'bg-emerald-500' },
    warning: { text: 'text-amber-600', bar: 'bg-amber-500' },
    expired: { text: 'text-rose-600', bar: 'bg-rose-500' },
  }[certStatus];

  return (
    <div className="space-y-6">
      <Input
        label="Nombre del negocio *"
        value={business.name}
        onChange={e => updateBusiness({ name: e.target.value })}
        placeholder="Nombre de tu restaurante"
      />

      {/* Datos tributarios (SUNAT) */}
      <SectionHeader
        title="Datos tributarios"
        description="Se usan para emitir boletas y facturas, y aparecen en tu carta digital."
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="RUC"
          value={business.ruc}
          onChange={e => updateBusiness({ ruc: e.target.value.replace(/\D/g, '').slice(0, 11) })}
          placeholder="20123456789"
          inputMode="numeric"
        />
        <Input
          label="Razón social"
          value={business.razonSocial}
          onChange={e => updateBusiness({ razonSocial: e.target.value })}
          placeholder="Ej: Restopro Perú S.A.C."
        />
      </div>
      <Input
        label="Dirección"
        value={business.address}
        onChange={e => updateBusiness({ address: e.target.value })}
        placeholder="Ej: Av. Larco 345, Miraflores, Lima"
      />

      {/* Credenciales SOL */}
      <SectionHeader
        icon={<KeyRound className="h-3.5 w-3.5 text-slate-400" />}
        title="Credenciales SOL"
        description="Usuario y clave del portal SUNAT Operaciones en Línea, usados para enviar tus comprobantes."
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Usuario SOL"
          value={business.solUser}
          onChange={e => updateBusiness({ solUser: e.target.value })}
          placeholder="20123456789MODDATOS"
        />
        <div className="space-y-1">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Clave SOL
          </label>
          <div className="relative">
            <input
              type={showClaveSol ? 'text' : 'password'}
              value={business.solPassword}
              onChange={e => updateBusiness({ solPassword: e.target.value })}
              placeholder="••••••••"
              className="input w-full pl-3 pr-9 py-2"
            />
            <button
              type="button"
              onClick={() => setShowClaveSol(v => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label={showClaveSol ? 'Ocultar clave' : 'Mostrar clave'}
            >
              {showClaveSol ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          Tipo de IGV por defecto
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {IGV_TYPES.map(t => {
            const active = business.igvType === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => updateBusiness({ igvType: t.id })}
                title={t.hint}
                className={`text-left px-3 py-2 rounded-lg border text-xs font-semibold transition-colors ${
                  active
                    ? 'bg-brand text-white border-brand'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-slate-500">
          {IGV_TYPES.find(t => t.id === business.igvType)?.hint}
        </p>
      </div>

      {/* Certificado digital */}
      <SectionHeader
        icon={<Receipt className="h-3.5 w-3.5 text-slate-400" />}
        title="Certificado Digital (.pfx o .p12)"
        description="Validación y vigencia del certificado usado para firmar tus comprobantes electrónicos."
      />

      {hasCert ? (
        <>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
              <span className="text-slate-500">Vigencia</span>
              <span className={certColors.text}>
                {daysRemaining >= 0 ? `${daysRemaining} días restantes` : `Vencido hace ${Math.abs(daysRemaining)} días`}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div className={`h-full rounded-full ${certColors.bar}`} style={{ width: `${progress}%` }} />
            </div>
            <p className="text-[11px] text-slate-400">
              {fmtDate(business.certIssuedAt)} → {fmtDate(business.certExpiresAt)}
            </p>
          </div>

          <div className="space-y-1.5 text-xs">
            {[
              { label: 'RUC', value: business.ruc || '—' },
              { label: 'Tipo', value: 'PFX / P12' },
            ].map(row => (
              <div key={row.label} className="flex justify-between py-1 border-b border-slate-50 last:border-b-0">
                <span className="text-slate-500">{row.label}</span>
                <span className="font-semibold text-slate-800">{row.value}</span>
              </div>
            ))}
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Archivo</span>
              <span className="font-semibold text-emerald-600 flex items-center gap-1">
                <FileCheck2 className="h-3.5 w-3.5" /> {business.certFileName}
              </span>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-200 py-6 text-center space-y-1.5">
          <ShieldCheck className="h-6 w-6 text-slate-300 mx-auto" />
          <p className="text-xs text-slate-400">Aún no has subido tu certificado digital.</p>
        </div>
      )}

      <button type="button" onClick={() => certInputRef.current?.click()} className="btn-secondary w-full justify-center">
        <Upload className="h-3.5 w-3.5" /> {hasCert ? 'Actualizar Certificado' : 'Subir Certificado'}
      </button>
      <input ref={certInputRef} type="file" accept=".pfx,.p12" onChange={handleCertUpload} className="hidden" />

      {/* Presencia digital */}
      <SectionHeader title="Presencia digital" />

      <div className="space-y-1">
        <Input
          label="Subdominio"
          value={subdominio}
          onChange={e => setSubdominio(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
          placeholder="mi-restaurante"
        />
        <p className="text-[11px] text-slate-500">
          Tu menú estará en:{' '}
          <span className="text-brand font-medium">
            https://{subdominio || 'tu-subdominio'}.gomenu.cl
          </span>
        </p>
      </div>

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

      <div className="w-full sm:w-1/2">
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

      <div className="space-y-2">
        <div>
          <p className="text-sm font-medium text-slate-800">Estilos de comida</p>
          <p className="text-[11px] text-slate-500">Selecciona todos los que apliquen</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {ESTILOS_COMIDA.map(estilo => {
            const active = estilos.includes(estilo);
            return (
              <button
                key={estilo}
                type="button"
                onClick={() => toggleEstilo(estilo)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                  active
                    ? 'bg-brand text-white border-brand'
                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                }`}
              >
                {estilo}
              </button>
            );
          })}
        </div>
      </div>

      <div className="pt-6 border-t border-slate-100 space-y-5">
        <Toggle
          checked={autoAceptar}
          onChange={setAutoAceptar}
          label="Auto-aceptar pedidos"
          hint="Los pedidos online se confirman automáticamente sin intervención manual. Desactívalo si quieres revisar cada pedido antes de aceptarlo."
        />
        <Toggle
          checked={preciosOtrasMonedas}
          onChange={setPreciosOtrasMonedas}
          label="Precios de referencia en otras monedas"
          hint="Muestra a tus clientes una referencia del precio en otra moneda (ej: Bs., USD). La tasa se configura manualmente."
        />
      </div>
    </div>
  );
}

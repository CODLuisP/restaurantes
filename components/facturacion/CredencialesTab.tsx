'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Eye, EyeOff, KeyRound, Building2, Radio, Truck, ChevronDown, ImagePlus, Pencil, ShieldAlert, RefreshCw, CheckCircle2, CalendarClock, AlertTriangle } from 'lucide-react';
import { Input, Button, Spinner, Alert, Badge, Modal } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { getEmpresaFacturacion, updateEmpresaFacturacion, updateLogoFacturacion, generarApiKeyFacturacion, type EmpresaFacturacion } from '@/lib/api/facturacion';
import type { EmpresaDto } from '@/lib/api/empresas';
import { ApiError } from '@/lib/api/client';
import LogoCropModal from '@/components/configuracion/negocio/LogoCropModal';

function SectionHeader({ icon, title, description, noBorder }: { icon?: React.ReactNode; title: string; description?: string; noBorder?: boolean }) {
  return (
    <div className={noBorder ? '' : 'pt-2 border-t border-slate-100'}>
      <p className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">{icon}{title}</p>
      {description && <p className="text-[11px] text-slate-500 mt-1">{description}</p>}
    </div>
  );
}

const DIAS_VIGENCIA = 365;

function formatFecha(fecha: Date): string {
  return new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }).format(fecha);
}

/** Tarjeta de vigencia de la API key, con el mismo diseño que la del certificado digital:
 * ícono + estado, barra que se va llenando y rango de fechas. Ideatec no nos da la fecha de
 * inicio de la key, así que se estima como vencimiento - 1 año (así se genera siempre). */
function VigenciaApiKey({ venceEn, isSuperAdmin, onRenovar }: { venceEn: string; isSuperAdmin: boolean; onRenovar: () => void }) {
  const hasta = new Date(venceEn);
  const desde = new Date(hasta);
  desde.setFullYear(desde.getFullYear() - 1);

  const diasRestantes = Math.ceil((hasta.getTime() - Date.now()) / 86_400_000);
  const progreso = Math.min(100, Math.max(0, ((DIAS_VIGENCIA - diasRestantes) / DIAS_VIGENCIA) * 100));
  const vencida = diasRestantes < 0;
  const porVencer = !vencida && diasRestantes <= 30;
  const barColor = vencida ? 'bg-rose-500' : porVencer ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className="p-5 rounded-xl border border-slate-200 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0 bg-brand/10 text-brand">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">API Key de facturación</p>
            <p className="text-[11px] text-slate-500">Autentica tus comprobantes ante el proveedor de facturación</p>
          </div>
        </div>
        {isSuperAdmin && (
          <Button onClick={onRenovar} icon={<RefreshCw className="h-3.5 w-3.5" />} size="sm">
            Renovar API Key
          </Button>
        )}
      </div>

      <div className="space-y-4 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
          <span className="text-xs font-semibold text-slate-700">API Key activa</span>
        </div>

        <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
              <CalendarClock className="h-3.5 w-3.5" /> Vigencia
            </span>
            <span className={`text-[11px] font-bold ${vencida ? 'text-rose-600' : porVencer ? 'text-amber-600' : 'text-emerald-600'}`}>
              {vencida ? 'Vencida' : `Vence en ${diasRestantes} día${diasRestantes === 1 ? '' : 's'}`}
            </span>
          </div>
          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${progreso}%` }} />
          </div>
          <p className="text-[11px] text-slate-500">{formatFecha(desde)} &rarr; {formatFecha(hasta)}</p>
        </div>

        {(vencida || porVencer) && (
          <Alert variant={vencida ? 'danger' : 'warning'} icon={<AlertTriangle className="h-4 w-4 shrink-0" />}>
            {vencida
              ? 'La API key venció. No podrás emitir comprobantes hasta renovarla.'
              : `La API key vence pronto (${diasRestantes} días). Renuévala antes de que expire.`}
          </Alert>
        )}
      </div>
    </div>
  );
}

interface CredencialesTabProps {
  empresa: EmpresaDto | null;
  isSuperAdmin: boolean;
  onApiKeyGenerada: () => void;
}

export default function CredencialesTab({ empresa: empresaLocal, isSuperAdmin, onApiKeyGenerada }: CredencialesTabProps) {
  const { data: session } = useSession();
  const token = session?.accessToken;
  const { triggerToast } = useApp();

  const [empresa, setEmpresa] = useState<EmpresaFacturacion | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [genModalOpen, setGenModalOpen] = useState(false);
  const [codigoConfirmacion, setCodigoConfirmacion] = useState('');
  const [generando, setGenerando] = useState(false);

  const [environment, setEnvironment] = useState<'produccion' | 'beta'>('produccion');
  const [solUsuario, setSolUsuario] = useState('');
  const [solClave, setSolClave] = useState('');
  const [showSolClave, setShowSolClave] = useState(false);
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [greOpen, setGreOpen] = useState(false);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');

  const [logoBase64, setLogoBase64] = useState('');
  const [logoSource, setLogoSource] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [savingLogo, setSavingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Sin API key todavía no hay nada que pedirle a Ideatec: se muestra el botón de generar
    // en vez de intentar la consulta (que fallaría con "no tiene api_key_facturacion configurada").
    if (!token || !empresaLocal?.tieneApiKeyFacturacion) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    getEmpresaFacturacion(token)
      .then(e => {
        setEmpresa(e);
        setEnvironment(e.environment === 'beta' ? 'beta' : 'produccion');
        setSolUsuario(e.solUsuario ?? '');
        setSolClave(e.solClave ?? '');
        setTelefono(e.telefono ?? '');
        setEmail(e.email ?? '');
        setClientId(e.clientId ?? '');
        setClientSecret(e.clientSecret ?? '');
        setLogoBase64(e.logoBase64 ?? '');
      })
      .catch(() => setError('No se pudo cargar la configuración SUNAT.'))
      .finally(() => setLoading(false));
  }, [token, empresaLocal?.tieneApiKeyFacturacion]);

  const handleGenerarApiKey = async () => {
    if (!token || !codigoConfirmacion.trim()) return;
    setGenerando(true);
    try {
      const res = await generarApiKeyFacturacion(token, codigoConfirmacion.trim());
      triggerToast(res.mensaje || 'API key generada correctamente.', 'success');
      setGenModalOpen(false);
      setCodigoConfirmacion('');
      onApiKeyGenerada();
    } catch (err) {
      triggerToast(err instanceof ApiError ? err.message : 'No se pudo generar la API key.', 'error');
    } finally {
      setGenerando(false);
    }
  };

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    try {
      await updateEmpresaFacturacion(token, {
        environment,
        solUsuario: solUsuario.trim(),
        solClave: solClave.trim(),
        telefono: telefono.trim(),
        email: email.trim(),
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim(),
      });
      triggerToast('Configuración SUNAT guardada.', 'success');
    } catch (err) {
      triggerToast(err instanceof ApiError ? err.message : 'No se pudo guardar.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoSource(URL.createObjectURL(file));
    setCropOpen(true);
    e.target.value = '';
  };

  const handleCropApply = async (dataUrl: string) => {
    if (!token) return;
    setSavingLogo(true);
    try {
      await updateLogoFacturacion(token, dataUrl);
      setLogoBase64(dataUrl);
      triggerToast('Logo de SUNAT actualizado.', 'success');
    } catch (err) {
      triggerToast(err instanceof ApiError ? err.message : 'No se pudo actualizar el logo.', 'error');
    } finally {
      setSavingLogo(false);
      setCropOpen(false);
    }
  };

  const logoSrc = logoBase64 ? (logoBase64.startsWith('data:') ? logoBase64 : `data:image/png;base64,${logoBase64}`) : '';

  if (loading) {
    return (
      <div className="py-16 flex flex-col items-center justify-center gap-3">
        <Spinner size="lg" />
        <p className="text-xs font-semibold text-slate-600">Cargando credenciales SUNAT...</p>
      </div>
    );
  }

  const confirmModal = (
    <Modal
      open={genModalOpen}
      onClose={() => !generando && setGenModalOpen(false)}
      title={empresaLocal?.tieneApiKeyFacturacion ? '¿Renovar API Key?' : '¿Generar API Key?'}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={() => setGenModalOpen(false)} disabled={generando}>Cancelar</Button>
          <Button onClick={handleGenerarApiKey} loading={generando} disabled={!codigoConfirmacion.trim()}>
            {generando ? 'Generando...' : 'Confirmar'}
          </Button>
        </>
      }
    >
      <p className="mb-3">
        {empresaLocal?.tieneApiKeyFacturacion
          ? 'Esto reemplazará la API key actual por una nueva, válida por 1 año más.'
          : 'Esto generará una nueva API key en el proveedor de facturación, válida por 1 año.'}{' '}
        Ingresa el código de confirmación para continuar.
      </p>
      <Input
        label="Código de confirmación"
        value={codigoConfirmacion}
        onChange={e => setCodigoConfirmacion(e.target.value)}
        placeholder="Código de confirmación"
        autoFocus
      />
    </Modal>
  );

  if (error) {
    return (
      <div className="py-10">
        <Alert variant="danger" title="No se pudo cargar">{error}</Alert>
      </div>
    );
  }

  if (!empresaLocal?.tieneApiKeyFacturacion) {
    return (
      <div className="py-10 px-4">
        <Alert variant="warning" title="Falta la API Key de facturación" icon={<ShieldAlert className="h-4 w-4 shrink-0" />}>
          La empresa ya está sincronizada con SUNAT, pero todavía no tiene una API Key para poder emitir comprobantes.
        </Alert>
        <div className="flex justify-end pt-4">
          {isSuperAdmin ? (
            <Button icon={<KeyRound className="h-3.5 w-3.5" />} onClick={() => setGenModalOpen(true)}>
              Generar API Key
            </Button>
          ) : (
            <p className="text-xs text-slate-500">Solo un superadmin puede generar la API Key de facturación.</p>
          )}
        </div>
        {confirmModal}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {empresaLocal.apiKeyFacturacionVenceEn && (
        <VigenciaApiKey
          venceEn={empresaLocal.apiKeyFacturacionVenceEn}
          isSuperAdmin={isSuperAdmin}
          onRenovar={() => setGenModalOpen(true)}
        />
      )}
      <SectionHeader icon={<ImagePlus className="h-3.5 w-3.5 text-slate-400" />} title="Logo en comprobantes SUNAT" description="Independiente del logo de Información del negocio: solo afecta lo que Ideatec imprime en tus PDF/tickets." noBorder />
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => logoInputRef.current?.click()}
          disabled={savingLogo}
          className="group/logo relative h-20 w-20 shrink-0 rounded-xl overflow-hidden border-2 border-dashed border-slate-200 hover:border-brand bg-slate-50 flex items-center justify-center transition-colors"
        >
          {savingLogo ? (
            <Spinner size="sm" />
          ) : logoSrc ? (
            <img src={logoSrc} alt="Logo SUNAT" className="h-full w-full object-contain p-1.5 rounded-lg" referrerPolicy="no-referrer" />
          ) : (
            <ImagePlus className="h-5 w-5 text-slate-300" />
          )}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/logo:opacity-100 flex items-center justify-center transition-opacity rounded-lg">
            <Pencil className="h-4 w-4 text-white" />
          </div>
        </button>
        <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoSelect} className="hidden" />
      </div>

      <SectionHeader icon={<Building2 className="h-3.5 w-3.5 text-slate-400" />} title="Identificación tributaria" description="Datos registrados en SUNAT para tu empresa." />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="RUC" value={empresa?.ruc ?? ''} disabled hint="El RUC no puede modificarse." />
        <Input label="Razón social" value={empresa?.razonSocial ?? ''} disabled hint="Se obtiene de SUNAT." />
      </div>

      <SectionHeader icon={<Radio className="h-3.5 w-3.5 text-slate-400" />} title="Entorno de operación" description="Define si trabajas en producción real o en pruebas con SUNAT." />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setEnvironment('produccion')}
          className={`p-3 rounded-xl border text-left transition-colors ${environment === 'produccion' ? 'border-brand bg-brand/5' : 'border-slate-200 hover:bg-slate-50'}`}
        >
          <p className="text-sm font-semibold text-slate-800">Producción</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Comprobantes reales enviados a SUNAT</p>
        </button>
        <button
          type="button"
          onClick={() => setEnvironment('beta')}
          className={`p-3 rounded-xl border text-left transition-colors ${environment === 'beta' ? 'border-brand bg-brand/5' : 'border-slate-200 hover:bg-slate-50'}`}
        >
          <p className="text-sm font-semibold text-slate-800">Beta / Homologación</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Ambiente de pruebas de SUNAT</p>
        </button>
      </div>

      <SectionHeader icon={<KeyRound className="h-3.5 w-3.5 text-slate-400" />} title="Credenciales SOL" description="Usuario y clave de SUNAT Operaciones en Línea, necesarios para enviar Facturas, Boletas y Notas." />
      <Alert variant="info">
        Las credenciales SOL las obtienes en{' '}
        <a href="https://www.sunat.gob.pe" target="_blank" rel="noreferrer" className="font-semibold underline">sunat.gob.pe → Operaciones en Línea (SOL)</a>.
      </Alert>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Usuario SOL" value={solUsuario} onChange={e => setSolUsuario(e.target.value)} placeholder="RUC + usuario SOL" hint="Formato Perú: RUC + nombre de usuario SOL registrado en SUNAT." />
        <div className="relative">
          <Input label="Clave SOL" type={showSolClave ? 'text' : 'password'} value={solClave} onChange={e => setSolClave(e.target.value)} placeholder="••••••••" hint="Clave de acceso a los servicios en línea de SUNAT." />
          <button type="button" onClick={() => setShowSolClave(v => !v)} className="absolute right-3 top-7.5 text-slate-400 hover:text-slate-600">
            {showSolClave ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="pt-2 border-t border-slate-100">
        <button type="button" onClick={() => setGreOpen(v => !v)} className="w-full flex items-center justify-between py-1.5">
          <div className="flex items-center gap-1.5">
            <Truck className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Guía de Remisión Electrónica</span>
            {(clientId || clientSecret) && <Badge variant="success" size="sm">Configurado</Badge>}
          </div>
          <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${greOpen ? 'rotate-180' : ''}`} />
        </button>
        <p className="text-[11px] text-slate-500 mb-3">Client ID y Client Secret requeridos solo si vas a emitir Guías de Remisión Electrónicas.</p>
        {greOpen && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Client ID" value={clientId} onChange={e => setClientId(e.target.value)} placeholder="Client ID SUNAT GRE" />
            <Input label="Client Secret" type="password" value={clientSecret} onChange={e => setClientSecret(e.target.value)} placeholder="Client Secret SUNAT GRE" />
          </div>
        )}
      </div>

      <SectionHeader icon={<Building2 className="h-3.5 w-3.5 text-slate-400" />} title="Datos de contacto" description="Se usan para notificaciones y envío de comprobantes." />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Teléfono" value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="999 888 777" />
        <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="contacto@empresa.com" />
      </div>

      <div className="flex justify-end pt-4">
        <Button onClick={handleSave} loading={saving}>{saving ? 'Guardando...' : 'Guardar configuración SUNAT'}</Button>
      </div>

      <LogoCropModal open={cropOpen} onClose={() => setCropOpen(false)} source={logoSource} onApply={handleCropApply} />
      {confirmModal}
    </div>
  );
}

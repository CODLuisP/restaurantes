'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Eye, EyeOff, KeyRound, Building2, Radio, Truck, ChevronDown } from 'lucide-react';
import { Input, Button, Spinner, Alert, Badge } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { getEmpresaFacturacion, updateEmpresaFacturacion, type EmpresaFacturacion } from '@/lib/api/facturacion';
import { ApiError } from '@/lib/api/client';

function SectionHeader({ icon, title, description, noBorder }: { icon?: React.ReactNode; title: string; description?: string; noBorder?: boolean }) {
  return (
    <div className={noBorder ? '' : 'pt-2 border-t border-slate-100'}>
      <p className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">{icon}{title}</p>
      {description && <p className="text-[11px] text-slate-500 mt-1">{description}</p>}
    </div>
  );
}

export default function CredencialesTab() {
  const { data: session } = useSession();
  const token = session?.accessToken;
  const { triggerToast } = useApp();

  const [empresa, setEmpresa] = useState<EmpresaFacturacion | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [environment, setEnvironment] = useState<'produccion' | 'beta'>('produccion');
  const [solUsuario, setSolUsuario] = useState('');
  const [solClave, setSolClave] = useState('');
  const [showSolClave, setShowSolClave] = useState(false);
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [greOpen, setGreOpen] = useState(false);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');

  useEffect(() => {
    if (!token) return;
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
      })
      .catch(() => setError('No se pudo cargar la configuración SUNAT.'))
      .finally(() => setLoading(false));
  }, [token]);

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

  if (loading) {
    return (
      <div className="py-16 flex flex-col items-center justify-center gap-3">
        <Spinner size="lg" />
        <p className="text-xs font-semibold text-slate-600">Cargando credenciales SUNAT...</p>
      </div>
    );
  }

  if (error) {
    return <div className="py-10"><Alert variant="danger" title="No se pudo cargar">{error}</Alert></div>;
  }

  return (
    <div className="space-y-4">
      <SectionHeader icon={<Building2 className="h-3.5 w-3.5 text-slate-400" />} title="Identificación tributaria" description="Datos registrados en SUNAT para tu empresa." noBorder />
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
    </div>
  );
}

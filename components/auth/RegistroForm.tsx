'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2, User, Lock, Mail, MapPin, Search, Loader2, AlertCircle,
  CheckCircle2, Utensils, Copy, Check,
} from 'lucide-react';
import { registrarEmpresa, type RegistroResultDto } from '@/lib/api/registro';
import { ApiError } from '@/lib/api/client';

interface FormState {
  nombreEmpresa: string;
  ruc: string;
  direccion: string;
  nombreAdmin: string;
  email: string;
  username: string;
  password: string;
  confirmarPassword: string;
}

const EMPTY_FORM: FormState = {
  nombreEmpresa: '', ruc: '', direccion: '', nombreAdmin: '', email: '', username: '', password: '', confirmarPassword: '',
};

function Field({
  label, icon, children,
}: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</div>
        {children}
      </div>
    </div>
  );
}

const inputClass = 'w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-colors';

/** Fila usuario/contraseña con botón "copiar", para la pantalla de resultado. */
function CredentialRow({ label, value }: { label: string; value: string }) {
  const [copiado, setCopiado] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch { /* clipboard no disponible: el usuario igual puede seleccionar el texto a mano */ }
  };
  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <span className="text-[11px] text-gray-500">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-xs font-semibold text-gray-800 bg-white border border-gray-200 rounded px-2 py-1">{value}</span>
        <button type="button" onClick={handleCopy} className="text-gray-400 hover:text-brand p-1" aria-label={`Copiar ${label}`}>
          {copiado ? <Check className="w-3.5 h-3.5 text-brand" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}

export default function RegistroForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [consultando, setConsultando] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resultado, setResultado] = useState<RegistroResultDto | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(f => ({ ...f, [key]: value }));
    if (errorMessage) setErrorMessage(null);
  };

  const handleConsultarRuc = async () => {
    if (form.ruc.length !== 11) { setErrorMessage('Ingresa un RUC de 11 dígitos para consultarlo.'); return; }
    setConsultando(true);
    try {
      const res = await fetch('/api/consultar-ruc', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ruc: form.ruc }) });
      const data = await res.json();
      if (!data.success) { setErrorMessage(data.error || 'RUC no encontrado.'); return; }
      setForm(f => ({
        ...f,
        nombreEmpresa: f.nombreEmpresa || data.data.nombre_o_razon_social || '',
        direccion: data.data.direccion || f.direccion,
      }));
    } catch {
      setErrorMessage('Error al consultar el RUC.');
    } finally {
      setConsultando(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!form.nombreEmpresa.trim()) { setErrorMessage('Ingresa el nombre de tu negocio.'); return; }
    if (form.ruc.length !== 11) { setErrorMessage('El RUC debe tener 11 dígitos.'); return; }
    if (!form.nombreAdmin.trim()) { setErrorMessage('Ingresa tu nombre.'); return; }
    if (!form.username.trim()) { setErrorMessage('Elige un nombre de usuario.'); return; }
    if (form.password.length < 6) { setErrorMessage('La contraseña debe tener al menos 6 caracteres.'); return; }
    if (form.password !== form.confirmarPassword) { setErrorMessage('Las contraseñas no coinciden.'); return; }

    setLoading(true);
    try {
      const result = await registrarEmpresa({
        nombreEmpresa: form.nombreEmpresa.trim(),
        ruc: form.ruc.trim(),
        direccion: form.direccion.trim() || undefined,
        nombreAdmin: form.nombreAdmin.trim(),
        email: form.email.trim() || undefined,
        username: form.username.trim(),
        password: form.password,
      });
      setResultado(result);
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'No se pudo completar el registro. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (resultado) {
    return (
      <div className="min-h-screen w-full bg-[#FCFDFC] flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center space-y-5">
          <div className="mx-auto w-14 h-14 rounded-full bg-brand/10 text-brand flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">¡{resultado.empresaNombre} está listo!</h2>
            <p className="text-xs text-gray-500 mt-1">
              Guarda estas credenciales — no se van a volver a mostrar. Puedes sincronizar la facturación electrónica más adelante, ya dentro del sistema.
            </p>
          </div>

          <div className="text-left bg-gray-50 rounded-xl p-4 space-y-1">
            <p className="text-[11px] font-bold text-gray-700 uppercase tracking-wide mb-1">Usuario administrador (uso diario)</p>
            <CredentialRow label="Usuario" value={resultado.usernameAdmin} />
            <CredentialRow label="Contraseña" value={form.password} />
          </div>

          <div className="text-left bg-gray-50 rounded-xl p-4 space-y-1">
            <p className="text-[11px] font-bold text-gray-700 uppercase tracking-wide mb-1">Superadmin (acceso total, todas las sucursales)</p>
            <CredentialRow label="Usuario" value={resultado.usernameSuperAdmin} />
            <CredentialRow label="Contraseña" value={`super${form.password}`} />
            <CredentialRow label="PIN" value="1234" />
          </div>

          <button
            onClick={() => router.push('/')}
            className="w-full bg-brand hover:bg-brand-hover text-white py-2.5 px-4 rounded-lg font-medium text-xs transition-all shadow-md"
          >
            Ir a iniciar sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#FCFDFC] text-gray-800 flex items-center justify-center p-6 relative overflow-hidden selection:bg-brand selection:text-white">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--tw-gradient-stops))] from-brand/5 via-transparent to-transparent pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="flex items-center gap-2.5 mb-6 justify-center">
          <div className="w-9 h-9 rounded-lg bg-brand flex items-center justify-center">
            <Utensils className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-tight leading-none text-gray-900">RestoPro Perú</h1>
            <span className="text-[10px] text-gray-500 font-mono tracking-widest uppercase">Peru SaaS POS</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
          <div className="mb-6">
            <span className="text-xs font-bold text-brand uppercase tracking-wider inline-block mb-2">Nuevo negocio</span>
            <h2 className="text-xl font-medium text-gray-900 tracking-tight">Crea tu cuenta</h2>
            <p className="text-xs text-gray-500 mt-1">
              Lo mínimo para empezar a operar. La facturación electrónica (SUNAT) se activa después, ya dentro del sistema.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 rounded text-xs text-red-700 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div><p className="font-semibold">Atención</p><p className="opacity-90">{errorMessage}</p></div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">RUC</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text" inputMode="numeric" maxLength={11} placeholder="20123456789"
                    value={form.ruc} onChange={e => set('ruc', e.target.value.replace(/\D/g, ''))}
                    className={inputClass}
                  />
                </div>
                <button
                  type="button" onClick={handleConsultarRuc} disabled={consultando || form.ruc.length !== 11}
                  className="shrink-0 px-3 rounded-lg border border-gray-200 text-gray-500 hover:text-brand hover:border-brand disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  aria-label="Consultar RUC"
                >
                  {consultando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Field label="Nombre del negocio" icon={<Building2 className="w-4 h-4" />}>
              <input type="text" placeholder="Ej: Paykos Chicken" value={form.nombreEmpresa}
                onChange={e => set('nombreEmpresa', e.target.value)} className={inputClass} />
            </Field>

            <Field label="Dirección (opcional)" icon={<MapPin className="w-4 h-4" />}>
              <input type="text" placeholder="Av. Ejemplo 123, Lima" value={form.direccion}
                onChange={e => set('direccion', e.target.value)} className={inputClass} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Tu nombre" icon={<User className="w-4 h-4" />}>
                <input type="text" placeholder="Jorge Muñoz" value={form.nombreAdmin}
                  onChange={e => set('nombreAdmin', e.target.value)} className={inputClass} />
              </Field>
              <Field label="Email (opcional)" icon={<Mail className="w-4 h-4" />}>
                <input type="email" placeholder="tu@correo.com" value={form.email}
                  onChange={e => set('email', e.target.value)} className={inputClass} />
              </Field>
            </div>

            <Field label="Usuario" icon={<User className="w-4 h-4" />}>
              <input type="text" placeholder="jorgemunoz" value={form.username} autoComplete="username"
                onChange={e => set('username', e.target.value.trim())} className={inputClass} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Contraseña" icon={<Lock className="w-4 h-4" />}>
                <input type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={form.password} autoComplete="new-password"
                  onChange={e => set('password', e.target.value)} className={inputClass} />
              </Field>
              <Field label="Confirmar" icon={<Lock className="w-4 h-4" />}>
                <input type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={form.confirmarPassword} autoComplete="new-password"
                  onChange={e => set('confirmarPassword', e.target.value)} className={inputClass} />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-[11px] text-gray-500 -mt-2">
              <input type="checkbox" checked={showPassword} onChange={e => setShowPassword(e.target.checked)} className="rounded border-gray-300" />
              Mostrar contraseñas
            </label>

            <button type="submit" disabled={loading}
              className="w-full mt-2 bg-brand hover:bg-brand-hover text-white py-2.5 px-4 rounded-lg font-medium text-xs transition-all duration-150 focus:ring-4 focus:ring-brand/20 flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:bg-gray-300 disabled:cursor-not-allowed">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creando tu cuenta...</> : 'Crear cuenta'}
            </button>

            <p className="text-center text-[11px] text-gray-400">
              ¿Ya tienes cuenta?{' '}
              <button type="button" onClick={() => router.push('/')} className="text-brand hover:underline font-medium">
                Inicia sesión
              </button>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

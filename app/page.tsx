'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Store, Eye, EyeOff, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => router.push('/dashboard'), 800);
  };

  return (
    <div className="min-h-screen bg-surface-page flex">

      {/* ── Panel izquierdo — Brand ─────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand-dark via-brand to-brand-medium flex-col justify-between p-12 relative overflow-hidden">
        {/* Decoración de fondo */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full translate-y-1/3 -translate-x-1/3" />
        </div>

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="bg-white/15 p-2.5 rounded-xl border border-white/20">
            <Store className="h-7 w-7 text-brand-accent" />
          </div>
          <div>
            <h1 className="font-bold text-2xl text-white tracking-tight leading-none">RestoPro</h1>
            <span className="text-[11px] text-white/60 font-mono tracking-widest uppercase">Peru SaaS POS</span>
          </div>
        </div>

        {/* Copy central */}
        <div className="relative space-y-6">
          <div className="space-y-3">
            <h2 className="text-4xl font-bold text-white leading-tight tracking-tight">
              Gestiona tu<br />restaurante<br />desde cualquier lugar.
            </h2>
            <p className="text-white/60 text-sm leading-relaxed max-w-sm">
              POS, cocina, inventario, mesas y reportes — todo en una sola plataforma diseñada para Lima y todo el Perú.
            </p>
          </div>

          {/* Stats */}
          <div className="flex gap-8">
            {[
              { value: '+1,200', label: 'Restaurantes' },
              { value: '99.9%', label: 'Uptime' },
              { value: 'Lima', label: 'Soporte local' },
            ].map(s => (
              <div key={s.label}>
                <p className="text-xl font-bold text-white font-mono">{s.value}</p>
                <p className="text-[10px] text-white/50 uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer brand */}
        <div className="relative flex items-center gap-2">
          <div className="flex flex-col w-1 h-7 rounded-full overflow-hidden shrink-0">
            <div className="bg-[#D91B5C] h-1/3" />
            <div className="bg-white h-1/3" />
            <div className="bg-[#D91B5C] h-1/3" />
          </div>
          <p className="text-[10px] text-white/40 font-mono">
            RUC: 20123456789 — RestoPro Perú S.A.C.
          </p>
        </div>
      </div>

      {/* ── Panel derecho — Formulario ──────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Logo mobile */}
        <div className="lg:hidden flex items-center gap-2 mb-10">
          <div className="bg-brand p-2 rounded-xl">
            <Store className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-lg text-slate-800">RestoPro</span>
        </div>

        <div className="w-full max-w-sm space-y-8">
          {/* Heading */}
          <div>
            <h3 className="text-2xl font-bold text-slate-800 tracking-tight">Bienvenido de nuevo</h3>
            <p className="text-sm text-slate-500 mt-1">Ingresa tus credenciales para continuar.</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-600">
                Correo electrónico
              </label>
              <input
                type="email"
                placeholder="usuario@restopro.pe"
                className="input w-full px-4 py-3 text-sm"
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-600">
                  Contraseña
                </label>
                <button type="button" className="text-[11px] text-brand hover:underline font-medium">
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="input w-full px-4 py-3 pr-11 text-sm"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword
                    ? <EyeOff className="h-4 w-4" />
                    : <Eye     className="h-4 w-4" />
                  }
                </button>
              </div>
            </div>

            {/* Remember */}
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 accent-brand"
              />
              <span className="text-xs text-slate-600">Mantener sesión iniciada</span>
            </label>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3 text-sm"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Ingresando…
                </>
              ) : (
                <>
                  Ingresar al sistema
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">o accede con</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* SSO button */}
          <button
            type="button"
            className="btn-secondary w-full justify-center py-2.5 text-xs"
            onClick={() => {}}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuar con Google Workspace
          </button>

          {/* Footer */}
          <p className="text-center text-[10px] text-slate-400">
            ¿No tienes una cuenta?{' '}
            <button type="button" className="text-brand hover:underline font-semibold">
              Solicitar acceso
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

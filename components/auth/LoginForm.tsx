'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User, Lock, Eye, EyeOff, Loader2, AlertCircle,
  Utensils, Layers, ChefHat, Smartphone,
  Clock, MapPin, CreditCard, TrendingUp, Delete,
} from 'lucide-react';

export default function LoginForm() {
  const router = useRouter();

  const [loginMethod, setLoginMethod] = useState<'password' | 'pin'>('password');
  const [username, setUsername]       = useState('');
  const [password, setPassword]       = useState('');
  const [pin, setPin]                 = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading]     = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [time, setTime]               = useState('');

  useEffect(() => {
    const update = () =>
      setTime(new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  const handlePinKeyPress = (digit: string) => {
    if (pin.length < 6) setPin(prev => prev + digit);
  };
  const handlePinBackspace = () => setPin(prev => prev.slice(0, -1));
  const handleClearPin     = () => setPin('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!username.trim()) {
      setErrorMessage('Por favor, ingrese su usuario.');
      return;
    }
    if (loginMethod === 'password' && !password) {
      setErrorMessage('Por favor, ingrese su clave de acceso.');
      return;
    }
    if (loginMethod === 'pin' && pin.length < 4) {
      setErrorMessage('El PIN operativo debe constar de al menos 4 dígitos.');
      return;
    }

    setIsLoading(true);

    // No incluir la clave si no aplica: signIn() serializa las credenciales como
    // URLSearchParams, y ahí `undefined` se convierte en el string literal "undefined"
    // (no se omite), lo que rompía la validación en el backend.
    const credentials: Record<string, string> = { username: username.trim() };
    if (loginMethod === 'password') credentials.password = password;
    else credentials.pin = pin;

    const result = await signIn('credentials', { ...credentials, redirect: false });

    setIsLoading(false);

    if (!result || result.error) {
      setErrorMessage('Usuario o clave incorrectos. Verifique sus credenciales con administración.');
      if (loginMethod === 'pin') setPin('');
      return;
    }

    router.push('/dashboard');
    router.refresh();
  };

  return (
    <div className="min-h-screen w-full bg-[#FCFDFC] text-gray-800 flex flex-col justify-between relative overflow-x-hidden selection:bg-brand selection:text-white">

      {/* Fondo grid sutil */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--tw-gradient-stops))] from-brand/5 via-transparent to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#eef4f1_1px,transparent_1px),linear-gradient(to_bottom,#eef4f1_1px,transparent_1px)] bg-size-[4rem_4rem] mask-[radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none opacity-40" />

      <div className="w-full grow grid md:grid-cols-12 relative z-10 min-h-screen">

        {/* ── Panel izquierdo — oculto en mobile ──────── */}
        <div className="hidden md:flex md:col-span-6 bg-brand-deeper text-white flex-col justify-between relative overflow-hidden md:min-h-screen">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/fondologin.jpg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-overlay pointer-events-none" />
          {/* Semicírculos en esquinas */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-0 right-0 w-86 h-86 bg-white/35 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-54 h-54 bg-white/40 rounded-full translate-y-1/3 -translate-x-1/3" />
          </div>

          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,#58BB43_2px,transparent_2px)] bg-size-[24px_24px]" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-brand opacity-40 blur-3xl pointer-events-none" />
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-brand-subtle opacity-30 blur-2xl pointer-events-none" />

          <div className="relative z-10 px-10 lg:px-16 flex flex-col justify-center h-full gap-6 lg:gap-8 py-12">

            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/20">
                <Utensils className="w-5 h-5 text-brand-accent" />
              </div>
              <span className="font-semibold tracking-wider text-sm uppercase text-emerald-100">RestoPro Perú</span>
            </div>

            <div>
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight leading-none mb-3">
                Gestión gastronómica inteligente.
              </h1>
              <p className="text-sm font-light text-gray-100 leading-relaxed">
                Optimice mesas, comandas, facturación electrónica SUNAT y existencias de cocina en tiempo real.
              </p>
            </div>

            <div className="pt-6 pb-4 border-t border-white/15">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <span className="text-[10px] uppercase tracking-widest block mb-0.5 opacity-70">Sede Operacional</span>
                  <span className="text-xs font-medium flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-brand-accent" /> Lima, Perú
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-widest block mb-0.5 opacity-70">Hora Local (PET)</span>
                  <span className="text-xs font-mono font-medium flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-brand-accent" /> {time || '08:15 AM'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { Icon: Layers,     title: 'Mesas & Comandas Digitales',  desc: 'Envío inmediato a barra e impresoras de cocina con estados de preparación automatizados.' },
                  { Icon: CreditCard, title: 'Facturación & Caja Integrada', desc: 'Emisión instantánea de Boletas, Facturas y notas de crédito homologadas directamente con SUNAT.' },
                  { Icon: ChefHat,    title: 'Control de Insumos & Recetas', desc: 'Sustracción automatizada de insumos según comanda enviada para evitar quiebres de cocina.' },
                  { Icon: TrendingUp, title: 'Métricas & Reportes de Venta', desc: 'Análisis pormenorizado de platos más rentables, mermas registradas e ingresos por turno de mozos.' },
                ].map(({ Icon, title, desc }) => (
                  <div key={title} className="p-2.5 bg-[#386641]/65 rounded-lg border border-white/10 flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5 text-brand-accent shrink-0" />
                      <span className="text-[12px] font-semibold text-gray-100 leading-tight">{title}</span>
                    </div>
                    <p className="text-[10px] text-gray-100  leading-snug">{desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-[10px] text-emerald-100/60 font-mono flex justify-between items-center">
              <span>PLATAFORMA V4.2.1</span>
              <span>EFICIENCIA OPERATIVA</span>
            </div>

          </div>
        </div>

        {/* ── Panel derecho — Formulario ───────────────── */}
        <div className="col-span-12 md:col-span-6 p-6 sm:p-10 md:p-12 lg:p-16 flex flex-col justify-center bg-white min-h-screen">
          <div className="w-full max-w-md mx-auto">

            {/* Brand header — solo mobile */}
            <div className="flex md:hidden items-center gap-2.5 mb-8 justify-center">
              <div className="w-9 h-9 rounded-lg bg-brand flex items-center justify-center">
                <Utensils className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-base tracking-tight leading-none text-gray-900">RestoPro Perú</h1>
                <span className="text-[10px] text-gray-500 font-mono tracking-widest uppercase">Peru SaaS POS</span>
              </div>
            </div>

            <AnimatePresence mode="wait">

              <motion.div
                key="form-container"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
              >
                  <div className="mb-6">
                    <span className="text-xs font-bold text-brand  py-0.5 rounded-full uppercase tracking-wider inline-block mb-2">
                      Acceso Autorizado
                    </span>
                    <h2 className="text-2xl font-medium text-gray-900 tracking-tight">
                      Ingreso al Sistema
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">
                      Seleccione su método de autenticación corporativa para iniciar turno.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 bg-gray-100 p-1 rounded-lg mb-6">
                    <button type="button" onClick={() => { setLoginMethod('password'); setErrorMessage(null); }}
                      className={`py-1.5 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-2 ${loginMethod === 'password' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>
                      <User className="w-3.5 h-3.5" /> Credenciales
                    </button>
                    <button type="button" onClick={() => { setLoginMethod('pin'); setErrorMessage(null); }}
                      className={`py-1.5 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-2 ${loginMethod === 'pin' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>
                      <Smartphone className="w-3.5 h-3.5" /> PIN Rápido (Salón/Caja)
                    </button>
                  </div>

                  {errorMessage && (
                    <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 rounded text-xs text-red-700 flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <div><p className="font-semibold">Atención</p><p className="opacity-90">{errorMessage}</p></div>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Usuario</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input type="text" placeholder="usuario" value={username} autoComplete="username"
                          onChange={e => { setUsername(e.target.value); if (errorMessage) setErrorMessage(null); }}
                          className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-colors" />
                      </div>
                    </div>

                    {loginMethod === 'password' ? (
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-xs font-medium text-gray-600">Contraseña</label>
                          <button type="button"
                            onClick={() => alert('Se ha enviado una solicitud a sistemas para restablecer la contraseña. Revise su bandeja de entrada.')}
                            className="text-[11px] text-brand hover:text-brand-hover hover:underline transition-all">
                            ¿Olvidó su clave?
                          </button>
                        </div>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input type={showPassword ? 'text' : 'password'} placeholder="••••••••••••" value={password} autoComplete="current-password"
                            onChange={e => { setPassword(e.target.value); if (errorMessage) setErrorMessage(null); }}
                            className="w-full pl-9 pr-10 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-colors" />
                          <button type="button" onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="text-center">
                          <label className="block text-xs font-medium text-gray-500 mb-1">Ingrese su código PIN Operativo</label>
                          <div className="flex justify-center gap-2 my-2.5">
                            {Array.from({ length: Math.max(pin.length, 4) }).map((_, i) => (
                              <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${pin[i] ? 'bg-brand border-brand scale-110' : 'bg-gray-100 border-gray-300'}`} />
                            ))}
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
                          {['1','2','3','4','5','6','7','8','9'].map(d => (
                            <button key={d} type="button"
                              onClick={() => { handlePinKeyPress(d); if (errorMessage) setErrorMessage(null); }}
                              className="py-2 text-base font-semibold bg-gray-50 hover:bg-brand/10 hover:text-brand border border-gray-200 rounded-lg transition-colors active:scale-95">
                              {d}
                            </button>
                          ))}
                          <button type="button" onClick={handleClearPin}
                            className="py-2 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors active:scale-95">
                            Limpiar
                          </button>
                          <button type="button" onClick={() => { handlePinKeyPress('0'); if (errorMessage) setErrorMessage(null); }}
                            className="py-2 text-base font-semibold bg-gray-50 hover:bg-brand/10 hover:text-brand border border-gray-200 rounded-lg transition-colors active:scale-95">
                            0
                          </button>
                          <button type="button" onClick={handlePinBackspace}
                            className="py-2 text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors active:scale-95 flex items-center justify-center">
                            <Delete className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    <button type="submit" disabled={isLoading}
                      className="w-full mt-4 bg-brand hover:bg-brand-hover text-white py-2.5 px-4 rounded-lg font-medium text-xs transition-all duration-150 focus:ring-4 focus:ring-brand/20 flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:bg-gray-300 disabled:cursor-not-allowed">
                      {isLoading
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Iniciando sesión en RestoPro...</>
                        : 'Comenzar Turno de Trabajo'}
                    </button>
                  </form>
                </motion.div>

            </AnimatePresence>
          </div>
        </div>

      </div>
    </div>
  );
}

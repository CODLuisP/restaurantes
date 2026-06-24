'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  User, Lock, Eye, EyeOff, Loader2, AlertCircle,
  Utensils, Layers, ChefHat, Smartphone,
  CheckCircle2, LogOut, Clock, MapPin,
  CreditCard, Grid, TrendingUp, Delete,
} from 'lucide-react';

interface RolePreset {
  id: string;
  name: string;
  role: string;
  email: string;
  pin: string;
  description: string;
  accent: string;
  station: string;
  pendingTasks: number;
}

export default function Login() {
  const router = useRouter();

  const [loginMethod, setLoginMethod] = useState<'email' | 'pin'>('email');
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [pin, setPin]                 = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading]     = useState(false);
  const [isSuccess, setIsSuccess]     = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rememberMe, setRememberMe]   = useState(true);
  const [selectedRole, setSelectedRole] = useState<RolePreset | null>(null);
  const [time, setTime]               = useState('');

  const roles: RolePreset[] = [
    { id: 'admin',  name: 'Carlos Cabrera', role: 'Administrador General',  email: 'carlos.cabrera@restopro.pe', pin: '1092', description: 'Control de caja, facturación electrónica, stock e insumos.',            accent: '#007542', station: 'Mesa de Control Central',     pendingTasks: 3 },
    { id: 'mozo',   name: 'Lucía Mendoza',  role: 'Personal de Salón',      email: 'lucia.mendoza@restopro.pe',  pin: '2540', description: 'Gestión ágil de mesas, comandas rápidas y atención sincronizada.', accent: '#1E8C45', station: 'Terraza Principal y Salón A', pendingTasks: 4 },
    { id: 'cajero', name: 'Miguel Prado',   role: 'Cajero / Facturación',   email: 'miguel.prado@restopro.pe',   pin: '4480', description: 'Cierres de caja, boletas/facturas (SUNAT) y métodos de pago.',     accent: '#3AA346', station: 'Módulo de Caja Principal',    pendingTasks: 1 },
    { id: 'chef',   name: 'Elena Quispe',   role: 'Jefa de Cocina',         email: 'elena.quispe@restopro.pe',   pin: '0887', description: 'Cola de platos en tiempo real, recetas y control de mermas.',     accent: '#58BB43', station: 'Cocina Caliente & Fría',      pendingTasks: 7 },
  ];

  useEffect(() => {
    const update = () =>
      setTime(new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  const handlePinKeyPress = (digit: string) => {
    if (pin.length < 4) setPin(prev => prev + digit);
  };
  const handlePinBackspace = () => setPin(prev => prev.slice(0, -1));
  const handleClearPin     = () => setPin('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (loginMethod === 'email') {
      if (!email.trim())        { setErrorMessage('Por favor, ingrese su correo electrónico institucional.'); return; }
      if (!password)            { setErrorMessage('Por favor, ingrese su clave de acceso obligatoria.'); return; }
      if (!email.includes('@')) { setErrorMessage('Formato de correo electrónico inválido.'); return; }
    } else {
      if (pin.length < 4)       { setErrorMessage('El PIN operativo debe constar de 4 dígitos exactos.'); return; }
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      if (loginMethod === 'email') {
        const match = roles.find(r => r.email.toLowerCase() === email.toLowerCase());
        setSelectedRole(match ?? {
          id: 'custom',
          name: email.split('@')[0].replace('.', ' ').toUpperCase(),
          role: 'Personal Autorizado',
          email,
          pin: '9999',
          description: 'Acceso a terminal operacional de restaurant.',
          accent: '#007542',
          station: 'Estación de Servicios',
          pendingTasks: 0,
        });
        setIsSuccess(true);
      } else {
        const match = roles.find(r => r.pin === pin);
        if (match) { setSelectedRole(match); setIsSuccess(true); }
        else        { setErrorMessage('PIN de acceso incorrecto. Verifique sus credenciales con administración.'); setPin(''); }
      }
    }, 1200);
  };

  const handleLogout = () => {
    setIsSuccess(false);
    setPin('');
    setPassword('');
    setErrorMessage(null);
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
          <img src="/restaurant-bg.jpg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-15 mix-blend-overlay pointer-events-none" />
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
              <p className="text-sm font-light text-emerald-100/80 leading-relaxed">
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
                  <div key={title} className="p-2.5 bg-white/5 rounded-lg border border-white/10 flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5 text-brand-accent shrink-0" />
                      <span className="text-[12px] font-semibold text-gray-100 leading-tight">{title}</span>
                    </div>
                    <p className="text-[10px] text-emerald-50 opacity-65 leading-snug">{desc}</p>
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

              {!isSuccess ? (
                <motion.div
                  key="form-container"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="mb-6">
                    <span className="text-xs font-bold text-brand bg-brand/10 px-2.5 py-0.5 rounded-full uppercase tracking-wider inline-block mb-2">
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
                    <button type="button" onClick={() => { setLoginMethod('email'); setErrorMessage(null); }}
                      className={`py-1.5 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-2 ${loginMethod === 'email' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>
                      <User className="w-3.5 h-3.5" /> Email Institucional
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
                    {loginMethod === 'email' ? (
                      <div className="space-y-3.5">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Correo Electrónico</label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input type="email" placeholder="usuario@restopro.pe" value={email}
                              onChange={e => { setEmail(e.target.value); if (errorMessage) setErrorMessage(null); }}
                              className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-colors" />
                          </div>
                        </div>
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
                            <input type={showPassword ? 'text' : 'password'} placeholder="••••••••••••" value={password}
                              onChange={e => { setPassword(e.target.value); if (errorMessage) setErrorMessage(null); }}
                              className="w-full pl-9 pr-10 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-colors" />
                            <button type="button" onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="text-center">
                          <label className="block text-xs font-medium text-gray-500 mb-1">Ingrese su código PIN Operativo (4 dígitos)</label>
                          <div className="flex justify-center gap-3.5 my-2.5">
                            {[0,1,2,3].map(i => (
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

                    {loginMethod === 'email' && (
                      <div className="flex items-center justify-between pt-0.5">
                        <label className="flex items-center gap-2 select-none cursor-pointer">
                          <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)}
                            className="rounded border-gray-300 text-brand focus:ring-brand w-4 h-4" />
                          <span className="text-xs text-gray-500 font-normal">Siguiente turno recordado</span>
                        </label>
                        <span className="text-[10px] text-gray-400 font-medium">Estación de trabajo segura</span>
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

              ) : (
                <motion.div key="success-container" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="text-center py-4">
                  <div className="w-16 h-16 rounded-full bg-brand/10 text-brand flex items-center justify-center mx-auto mb-4 border-2 border-brand-accent/20">
                    <CheckCircle2 className="w-9 h-9" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 leading-tight">Sesión Iniciada con Éxito</h3>
                  <p className="text-xs text-gray-500 mt-1.5 max-w-sm mx-auto">
                    Bienvenido al sistema gastronómico. Su turno operativo de hoy ha sido registrado ante la SUNAT.
                  </p>

                  <div className="my-6 bg-gray-50 p-5 rounded-xl border border-gray-100 text-left max-w-md mx-auto space-y-4">
                    <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                      <div className="w-10 h-10 rounded-full bg-brand text-white flex items-center justify-center font-bold text-sm tracking-widest shadow-inner">
                        {selectedRole?.name.split(' ').map(n => n[0]).join('') ?? 'EM'}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900">{selectedRole?.name ?? 'Inquilino'}</h4>
                        <p className="text-xs text-gray-500">{selectedRole?.role ?? 'Personal de Turno'}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-white p-2.5 rounded border border-gray-100">
                        <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wide">Estación Actual</span>
                        <span className="font-semibold text-gray-800">{selectedRole?.station ?? 'Estación de Trabajo'}</span>
                      </div>
                      <div className="bg-white p-2.5 rounded border border-gray-100">
                        <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wide">Tareas Prioritarias</span>
                        <span className="font-semibold text-brand-deeper flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping" />
                          {selectedRole?.pendingTasks ?? 0} Incidentes / Tareas
                        </span>
                      </div>
                      <div className="bg-white p-2.5 rounded border border-gray-100">
                        <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wide">Venta Promedio Sede</span>
                        <span className="font-semibold text-brand-subtle">S/. 12,450.00</span>
                      </div>
                      <div className="bg-white p-2.5 rounded border border-gray-100">
                        <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wide">Estado Enlace SUNAT</span>
                        <span className="font-semibold text-green-700 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Sincronizado
                        </span>
                      </div>
                    </div>
                    <div className="pt-2">
                      <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider mb-2">Características en su cuenta:</span>
                      <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                        <div className="px-2 py-1 bg-brand/5 text-brand rounded font-medium border border-brand/10 text-center">Mesas & Salones</div>
                        <div className="px-2 py-1 bg-brand-hover/5 text-brand-hover rounded font-medium border border-brand-hover/10 text-center">Comandas & Kitchen</div>
                        <div className="px-2 py-1 bg-brand-subtle/5 text-brand-subtle rounded font-medium border border-brand-subtle/10 text-center">Factura SUNAT</div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 max-w-xs mx-auto">
                    <button onClick={() => router.push('/dashboard')}
                      className="w-full bg-brand hover:bg-brand-hover text-white py-2 px-4 rounded-lg font-medium text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow">
                      <Grid className="w-3.5 h-3.5" /> Abrir Cockpit de Servicios
                    </button>
                    <button onClick={handleLogout}
                      className="w-full bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 py-1.5 px-4 rounded-lg font-medium text-xs transition-all flex items-center justify-center gap-2 cursor-pointer">
                      <LogOut className="w-3.5 h-3.5" /> Cerrar Sesión Corriente
                    </button>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>

      </div>
    </div>
  );
}

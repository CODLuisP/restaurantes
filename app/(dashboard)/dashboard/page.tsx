'use client';

import { DollarSign, TrendingUp, ShoppingCart, Utensils, Users, FileText, Sparkles } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export default function DashboardPage() {
  const { kpiStats, salesHistory, triggerToast } = useApp();

  return (
    <div className="space-y-5 animate-section">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-800 tracking-tight">Resumen Ejecutivo de Ventas</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Monitoreo en tiempo real de operaciones gastronómicas — RestoPro Perú.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-lg">
          <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 pulse-active" />
          <span className="text-[10px] font-semibold text-[#007542] font-mono">POS EN SINCRO: ONLINE</span>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Ventas del Día',   value: `S/. ${kpiStats.ventasDia.toFixed(2)}`,      icon: DollarSign,   color: '#007542', sub: '+14.2% vs ayer S/. 710' },
          { label: 'Ventas del Mes',   value: `S/. ${kpiStats.ventasMes.toFixed(2)}`,      icon: TrendingUp,   color: '#1E8C45', sub: '+8.1% — Meta: S/. 90k' },
          { label: 'Pedidos Activos',  value: `${kpiStats.pedidosActivos}`,                 icon: ShoppingCart, color: '#3AA346', sub: '1 preparado en cocina' },
          { label: 'Ticket Promedio',  value: `S/. ${kpiStats.ticketPromedio.toFixed(2)}`,  icon: Utensils,     color: '#58BB43', sub: 'Sobre ventas reales' },
          { label: 'Clientes CRM',     value: `${kpiStats.clientesAtendidos}`,              icon: Users,        color: '#1E8C45', sub: '+5 nuevos esta semana' },
        ].map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <div key={i} className="bg-slate-200 border border-slate-300/80 px-4 py-3 rounded-xl shadow-xs hover:shadow-md transition-all group duration-300">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[10px] font-bold tracking-wider uppercase">{kpi.label}</span>
                <Icon className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" style={{ color: kpi.color }} />
              </div>
              <p className="text-base font-bold text-slate-800 mt-1.5 font-mono">{kpi.value}</p>
              <p className="text-[10px] text-slate-400 mt-1">{kpi.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Revenue chart */}
        <div className="bg-slate-200 border border-slate-300/80 p-4 rounded-xl shadow-xs lg:col-span-8 space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-slate-300">
            <div>
              <h4 className="text-xs font-semibold text-slate-800">Curva de Ingresos Diarios (S/.)</h4>
              <p className="text-[10px] text-slate-500 mt-0.5">Dinámica semanal de ventas corporativas del local</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 bg-[#007542] rounded-full inline-block" />
              <span className="text-[10px] text-slate-700 font-medium">Turno Día</span>
              <span className="h-2 w-2 bg-[#58BB43] rounded-full inline-block ml-2" />
              <span className="text-[10px] text-slate-700 font-medium">Turno Noche</span>
            </div>
          </div>
          <div className="h-48 relative flex items-end pt-4 bg-slate-100/60 rounded-lg p-3">
            <div className="absolute inset-x-0 top-0 h-full flex flex-col justify-between pointer-events-none opacity-40">
              <div className="border-b border-slate-350 w-full text-[9px] font-mono text-slate-505">S/. 1200</div>
              <div className="border-b border-slate-350 w-full text-[9px] font-mono text-slate-550">S/. 800</div>
              <div className="border-b border-slate-350 w-full text-[9px] font-mono text-slate-550">S/. 400</div>
              <div className="w-full text-[9px] font-mono text-slate-500">S/. 0</div>
            </div>
            <svg viewBox="0 0 700 200" className="w-full h-full z-10 select-none overflow-visible">
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#007542" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#007542" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d="M 10,180 L 10,150 Q 110,60 210,120 T 410,50 T 610,30 L 690,20 L 690,190 Z" fill="url(#chartGrad)" />
              <path d="M 10,150 Q 110,60 210,120 T 410,50 T 610,30 L 690,20" fill="none" stroke="#007542" strokeWidth="3.5" strokeLinecap="round" />
              <path d="M 10,170 Q 100,120 200,140 T 400,90 T 600,60 L 690,40" fill="none" stroke="#58BB43" strokeWidth="2.5" strokeDasharray="4 4" strokeLinecap="round" />
              <circle cx="210" cy="120" r="5" fill="#007542" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="410" cy="50"  r="5" fill="#007542" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="610" cy="30"  r="5" fill="#007542" stroke="#FFFFFF" strokeWidth="2" />
            </svg>
          </div>
          <div className="grid grid-cols-7 text-center text-[10px] font-mono text-slate-500">
            {['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'].map(d => (
              <span key={d}>{d}</span>
            ))}
          </div>
        </div>

        {/* Payment methods */}
        <div className="bg-slate-200 border border-slate-300/80 p-4 rounded-xl shadow-xs lg:col-span-4 space-y-3">
          <div>
            <h4 className="text-xs font-semibold text-slate-800">Métodos de Pago</h4>
            <p className="text-[10px] text-slate-500 mt-0.5">Preferencia de pago de clientes RestoPro</p>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Yape / Plin (QR Digital)', pct: 52, color: 'bg-emerald-500' },
              { label: 'Tarjeta de Crédito/Débito', pct: 38, color: 'bg-[#007542]' },
              { label: 'Efectivo Físico (Soles)',   pct: 10, color: 'bg-amber-500' },
            ].map(m => (
              <div key={m.label}>
                <div className="flex justify-between text-[11px] text-slate-700 font-medium mb-1">
                  <span>{m.label}</span>
                  <span className="font-mono">{m.pct}%</span>
                </div>
                <div className="h-1.5 bg-slate-300 rounded-full overflow-hidden">
                  <div className={`h-full ${m.color} rounded-full`} style={{ width: `${m.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="bg-[#007542]/10 border border-[#007542]/20 p-3 rounded-lg space-y-1">
            <p className="text-[11px] font-semibold text-[#007542] flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 shrink-0" /> Tip Comercial
            </p>
            <p className="text-[10px] text-slate-600 leading-snug">
              Yape y Plin lideran los cobros digitales hoy. Promueve postres con banners QR directos.
            </p>
          </div>
        </div>
      </div>

      {/* Sales history */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h4 className="text-xs font-semibold text-gray-800">Ventas Recientes Registradas (POS)</h4>
            <p className="text-[10px] text-gray-400">Historial transaccional activo de la sesión actual</p>
          </div>
          <button
            onClick={() => triggerToast('Generador de PDF simulado ejecutado.', 'success')}
            className="text-[11px] text-[#007542] border border-[#007542]/20 hover:bg-emerald-50 px-2.5 py-1 rounded-lg font-medium flex items-center gap-1.5 transition-colors"
          >
            <FileText className="h-3 w-3" /> Exportar (.CSV)
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              <tr>
                <th className="p-3">Código</th>
                <th className="p-3">Hora en Lima</th>
                <th className="p-3">Mesa Destino</th>
                <th className="p-3">Nº Items</th>
                <th className="p-3">Método de Pago</th>
                <th className="p-3 text-right">Monto Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {salesHistory.map(item => (
                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-3 font-mono font-semibold text-gray-800">{item.id}</td>
                  <td className="p-3 text-gray-500">{item.time}</td>
                  <td className="p-3">
                    <span className="bg-gray-100 px-2 py-0.5 rounded font-medium">{item.table}</span>
                  </td>
                  <td className="p-3 font-mono">{item.itemsCount}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                      item.paymentMethod === 'Yape / Plin'
                        ? 'bg-emerald-100 text-emerald-800'
                        : item.paymentMethod === 'Tarjeta'
                        ? 'bg-[#007542]/10 text-[#007542]'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {item.paymentMethod}
                    </span>
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-gray-900">
                    S/. {item.total.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

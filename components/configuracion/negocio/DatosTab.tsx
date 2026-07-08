'use client';

import { useState } from 'react';
import { Input, Toggle } from '@/components/ui';

const ESTILOS_COMIDA = [
  'Comida chilena', 'Comida italiana', 'Comida mexicana', 'Comida peruana',
  'Comida japonesa', 'Comida china', 'Comida rápida', 'Comida saludable',
  'Comida vegana', 'Variada', 'Otra',
];

const DESC_CORTA_MAX = 200;
const DESC_LARGA_MAX = 500;

export default function DatosTab() {
  const [nombre, setNombre] = useState('');
  const [subdominio, setSubdominio] = useState('');
  const [descCorta, setDescCorta] = useState('');
  const [descLarga, setDescLarga] = useState('');
  const [tipoNegocio, setTipoNegocio] = useState('Restaurante');
  const [estilos, setEstilos] = useState<string[]>([]);
  const [autoAceptar, setAutoAceptar] = useState(false);
  const [preciosOtrasMonedas, setPreciosOtrasMonedas] = useState(false);

  const toggleEstilo = (estilo: string) => {
    setEstilos(prev =>
      prev.includes(estilo) ? prev.filter(e => e !== estilo) : [...prev, estilo]
    );
  };

  return (
    <div className="space-y-6">
      <Input
        label="Nombre del negocio *"
        value={nombre}
        onChange={e => setNombre(e.target.value)}
        placeholder="Nombre de tu restaurante"
      />

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

      <div className="pt-2 border-t border-slate-150 space-y-5">
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

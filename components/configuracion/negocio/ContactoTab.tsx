'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Toggle } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';

function PhoneField({
  label,
  hint,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  label?: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={disabled}
          className={`flex items-center gap-1.5 px-3 rounded-xl border border-slate-300 bg-slate-100 text-xs font-semibold text-slate-700 shrink-0 ${
            disabled ? 'opacity-60 cursor-not-allowed' : 'hover:bg-slate-200'
          }`}
        >
          <span className="text-[10px] font-bold text-slate-400">PE</span>
          +51
          <ChevronDown className="h-3 w-3 text-slate-400" />
        </button>
        <input
          type="tel"
          value={value}
          disabled={disabled}
          onChange={e => onChange(e.target.value.replace(/[^0-9\s]/g, ''))}
          placeholder={placeholder}
          className={`input w-full px-3 py-2 ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
        />
      </div>
      {hint && <p className="text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}

export default function ContactoTab() {
  const { currentUser } = useAuth();

  const [telefono, setTelefono] = useState('');
  const [usarMismoNumero, setUsarMismoNumero] = useState(false);
  const [whatsapp, setWhatsapp] = useState('');
  const [representante, setRepresentante] = useState('');

  return (
    <div className="space-y-6">
      <PhoneField
        label="Teléfono principal *"
        hint="Número sin código de país, solo dígitos"
        value={telefono}
        onChange={setTelefono}
        placeholder="912 903 340"
      />

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            WhatsApp para pedidos
          </label>
          <Toggle
            checked={usarMismoNumero}
            onChange={v => { setUsarMismoNumero(v); if (v) setWhatsapp(telefono); }}
            label="Usar mismo número"
          />
        </div>
        <PhoneField
          value={usarMismoNumero ? telefono : whatsapp}
          onChange={setWhatsapp}
          placeholder="912345678"
          disabled={usarMismoNumero}
        />
      </div>

      <div className="space-y-1">
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          Email de contacto
        </label>
        <input
          type="email"
          value={currentUser?.email ?? ''}
          disabled
          className="input w-full px-3 py-2 opacity-60 cursor-not-allowed"
        />
        <p className="text-[11px] text-slate-500">
          Este es el email de tu cuenta. Para cambiarlo, ve a la configuración de tu cuenta.
        </p>
      </div>

      <div className="space-y-1">
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          Nombre del representante
        </label>
        <input
          type="text"
          value={representante}
          onChange={e => setRepresentante(e.target.value)}
          placeholder="Nombre de la persona de contacto"
          className="input w-full px-3 py-2"
        />
        <p className="text-[11px] text-slate-500">Opcional. Persona responsable del negocio.</p>
      </div>
    </div>
  );
}

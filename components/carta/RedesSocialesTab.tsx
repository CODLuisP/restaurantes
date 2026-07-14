'use client';

import { useState } from 'react';
import { Globe, Star, Check, ChevronRight } from 'lucide-react';
import { useRedesSociales } from '@/context/RedesSocialesContext';

type SocialKey = 'instagram' | 'facebook' | 'tiktok' | 'sitio';

const SOCIALS: {
  key: SocialKey;
  name: string;
  prefix: '@' | 'url';
  placeholder: string;
  badge: React.ReactNode;
}[] = [
  {
    key: 'instagram', name: 'Instagram', prefix: '@', placeholder: 'tu_usuario',
    badge: (
      <span className="h-8 w-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/svgs/redes/instagram-icon.svg" alt="Instagram" className="h-4 w-4" />
      </span>
    ),
  },
  {
    key: 'facebook', name: 'Facebook', prefix: 'url', placeholder: 'https://www.facebook.com/tu-negocio',
    badge: (
      <span className="h-8 w-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/svgs/redes/facebook-icon.svg" alt="Facebook" className="h-4 w-4" />
      </span>
    ),
  },
  {
    key: 'tiktok', name: 'TikTok', prefix: '@', placeholder: 'tu_usuario',
    badge: (
      <span className="h-8 w-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/svgs/redes/tiktok-icon-dark.svg" alt="TikTok" className="h-4 w-4" />
      </span>
    ),
  },
  {
    key: 'sitio', name: 'Sitio Web', prefix: 'url', placeholder: 'https://tu-sitio.com',
    badge: (
      <span className="h-8 w-8 rounded-lg bg-brand flex items-center justify-center text-white shrink-0">
        <Globe className="h-4 w-4" />
      </span>
    ),
  },
];

export default function RedesSocialesTab() {
  const { redes, updateRedes } = useRedesSociales();
  const [showHelp, setShowHelp] = useState(false);

  const values: Record<SocialKey, string> = {
    instagram: redes.instagram, facebook: redes.facebook, tiktok: redes.tiktok, sitio: redes.sitio,
  };
  const connectedCount = Object.values(values).filter(v => v.trim() !== '').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">Conecta tus redes sociales para mostrarlas en tu menú</p>
        {connectedCount > 0 && (
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-brand/10 text-brand shrink-0">
            {connectedCount} conectada{connectedCount === 1 ? '' : 's'}
          </span>
        )}
      </div>

      <div className="space-y-3">
        {SOCIALS.map(social => {
          const value = values[social.key];
          const filled = value.trim() !== '';
          return (
            <div
              key={social.key}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                filled ? 'bg-brand/5 border-brand/30' : 'border-slate-200'
              }`}
            >
              {social.badge}
              {social.prefix === '@' && <span className="text-slate-400 text-sm shrink-0">@</span>}
              <input
                type="text"
                value={value}
                onChange={e => updateRedes({ [social.key]: e.target.value })}
                placeholder={social.placeholder}
                className="flex-1 min-w-0 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
              />
              {filled && <Check className="h-4 w-4 text-brand shrink-0" />}
            </div>
          );
        })}
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
        <p className="text-[11px] text-slate-600">
          <strong className="text-slate-700">Tip:</strong> Para Instagram y TikTok solo ingresa tu
          nombre de usuario sin el @. Para Facebook y Sitio Web, pega la URL completa.
        </p>
      </div>

      <div className="pt-4 border-t border-slate-150 space-y-3">
        <div className="flex items-start gap-3">
          <span className="h-8 w-8 rounded-lg bg-amber-400 flex items-center justify-center text-white shrink-0">
            <Star className="h-4 w-4 fill-white" />
          </span>
          <div>
            <p className="text-sm font-medium text-slate-800">Reseñas de Google</p>
            <p className="text-[11px] text-slate-500">
              Agrega tu link de reseñas y aparecerá un botón en el email de pedido entregado
            </p>
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Link de reseñas de Google
          </label>
          <input
            type="text"
            value={redes.reviewsLink}
            onChange={e => updateRedes({ reviewsLink: e.target.value })}
            placeholder="https://g.page/r/XXXXXXXXX/review"
            className="input w-full px-3 py-2"
          />
        </div>

        <button
          type="button"
          onClick={() => setShowHelp(v => !v)}
          className="flex items-center gap-1 text-[11px] font-medium text-brand hover:underline"
        >
          <ChevronRight className={`h-3 w-3 transition-transform ${showHelp ? 'rotate-90' : ''}`} />
          ¿Cómo obtengo mi link de reseñas?
        </button>
        {showHelp && (
          <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
            En Google Maps, busca tu negocio → toca &quot;Compartir&quot; → &quot;Pedir reseñas&quot; → copia el link generado.
          </p>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Globe, Star, Check, ChevronRight } from 'lucide-react';

type SocialKey = 'instagram' | 'facebook' | 'tiktok' | 'x' | 'sitio';

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
      <span className="h-8 w-8 rounded-lg bg-gradient-to-br from-fuchsia-500 via-pink-500 to-amber-400 flex items-center justify-center text-white">
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M12 2.2c2.7 0 3 0 4 .05 1 .05 1.7.2 2.3.45.6.25 1.1.55 1.6 1.05.5.5.8 1 1.05 1.6.25.6.4 1.3.45 2.3.05 1 .05 1.3.05 4s0 3-.05 4c-.05 1-.2 1.7-.45 2.3a4.6 4.6 0 0 1-1.05 1.6 4.6 4.6 0 0 1-1.6 1.05c-.6.25-1.3.4-2.3.45-1 .05-1.3.05-4 .05s-3 0-4-.05c-1-.05-1.7-.2-2.3-.45a4.6 4.6 0 0 1-1.6-1.05 4.6 4.6 0 0 1-1.05-1.6c-.25-.6-.4-1.3-.45-2.3-.05-1-.05-1.3-.05-4s0-3 .05-4c.05-1 .2-1.7.45-2.3.25-.6.55-1.1 1.05-1.6a4.6 4.6 0 0 1 1.6-1.05c.6-.25 1.3-.4 2.3-.45 1-.05 1.3-.05 4-.05zM12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 8.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4zm5.2-8.4a1.17 1.17 0 1 1 0-2.34 1.17 1.17 0 0 1 0 2.34z"/></svg>
      </span>
    ),
  },
  {
    key: 'facebook', name: 'Facebook', prefix: 'url', placeholder: 'https://www.facebook.com/tu-negocio',
    badge: (
      <span className="h-8 w-8 rounded-lg bg-[#1877F2] flex items-center justify-center text-white">
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M13.5 21v-7.5H16l.4-3H13.5V8.4c0-.87.24-1.46 1.5-1.46H16.5V4.35C16.24 4.32 15.36 4.25 14.33 4.25c-2.15 0-3.62 1.31-3.62 3.72v2.53H8.25v3h2.46V21h2.79z"/></svg>
      </span>
    ),
  },
  {
    key: 'tiktok', name: 'TikTok', prefix: '@', placeholder: 'tu_usuario',
    badge: (
      <span className="h-8 w-8 rounded-lg bg-black flex items-center justify-center text-white">
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M16.5 3c.3 1.9 1.6 3.4 3.5 3.7v2.6c-1.3 0-2.5-.4-3.5-1.1v6.4a5.4 5.4 0 1 1-5.4-5.4c.2 0 .4 0 .6.03v2.7a2.7 2.7 0 1 0 1.9 2.6V3h2.9z"/></svg>
      </span>
    ),
  },
  {
    key: 'x', name: 'X', prefix: '@', placeholder: 'tu_usuario',
    badge: (
      <span className="h-8 w-8 rounded-lg bg-black flex items-center justify-center text-white">
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M4 3h3.6l4 5.5L16.2 3H20l-6.4 8.2L20.3 21h-3.6l-4.3-5.9L7 21H3.3l6.8-8.7L4 3z"/></svg>
      </span>
    ),
  },
  {
    key: 'sitio', name: 'Sitio Web', prefix: 'url', placeholder: 'https://tu-sitio.com',
    badge: (
      <span className="h-8 w-8 rounded-lg bg-brand flex items-center justify-center text-white">
        <Globe className="h-4 w-4" />
      </span>
    ),
  },
];

export default function RedesSocialesTab() {
  const [values, setValues] = useState<Record<SocialKey, string>>({
    instagram: '', facebook: '', tiktok: '', x: '', sitio: '',
  });
  const [reviewsLink, setReviewsLink] = useState('');
  const [showHelp, setShowHelp] = useState(false);

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
                onChange={e => setValues(v => ({ ...v, [social.key]: e.target.value }))}
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
          <strong className="text-slate-700">Tip:</strong> Para Instagram, TikTok y X solo ingresa tu
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
            value={reviewsLink}
            onChange={e => setReviewsLink(e.target.value)}
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

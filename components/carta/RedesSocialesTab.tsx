'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Globe, Star, Check, ChevronRight } from 'lucide-react';
import { Button, Select } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { getConfiguracion, updateConfiguracion } from '@/lib/api/configuracion';
import { getSucursales } from '@/lib/api/sucursales';

type SocialKey = 'instagram' | 'facebook' | 'tiktok' | 'sitioWeb';

const SOCIALS: { key: SocialKey; name: string; prefix: '@' | 'url'; placeholder: string; badge: React.ReactNode }[] = [
  { key: 'instagram', name: 'Instagram', prefix: '@', placeholder: 'tu_usuario', badge: (<span className="h-8 w-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center shrink-0"><img src="/svgs/redes/instagram-icon.svg" alt="Instagram" className="h-4 w-4" /></span>) },
  { key: 'facebook', name: 'Facebook', prefix: 'url', placeholder: 'https://www.facebook.com/tu-negocio', badge: (<span className="h-8 w-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center shrink-0"><img src="/svgs/redes/facebook-icon.svg" alt="Facebook" className="h-4 w-4" /></span>) },
  { key: 'tiktok', name: 'TikTok', prefix: '@', placeholder: 'tu_usuario', badge: (<span className="h-8 w-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center shrink-0"><img src="/svgs/redes/tiktok-icon-dark.svg" alt="TikTok" className="h-4 w-4" /></span>) },
  { key: 'sitioWeb', name: 'Sitio Web', prefix: 'url', placeholder: 'https://tu-sitio.com', badge: (<span className="h-8 w-8 rounded-lg bg-brand flex items-center justify-center text-white shrink-0"><Globe className="h-4 w-4" /></span>) },
];

export default function RedesSocialesTab() {
  const { data: session } = useSession();
  const { triggerToast } = useApp();
  const token = session?.accessToken;
  const isSuperAdmin = session?.user?.role === 'superadmin';

  const [sucursales, setSucursales] = useState<{ id: number; nombre: string }[]>([]);
  const [sId, setSId] = useState<number | null>(null);
  const [form, setForm] = useState({ instagram: '', facebook: '', tiktok: '', sitioWeb: '', reviewsLink: '' });
  const [showHelp, setShowHelp] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    getSucursales(token).then(lista => {
      const activas = lista.filter(s => s.activo);
      setSucursales(activas.map(s => ({ id: s.id, nombre: s.nombre })));
      const id = session?.user?.sucursalId ?? activas[0]?.id;
      if (id) { setSId(id); load(id); }
    }).catch(() => {});
  }, [token]);

  const load = (id: number) => {
    if (!token) return;
    getConfiguracion(token, id).then(c => setForm({
      instagram: c.instagram ?? '', facebook: c.facebook ?? '', tiktok: c.tiktok ?? '',
      sitioWeb: c.sitioWeb ?? '', reviewsLink: c.reviewsLink ?? '',
    })).catch(() => setForm({ instagram: '', facebook: '', tiktok: '', sitioWeb: '', reviewsLink: '' }));
  };

  const handleSave = async () => {
    if (!token || !sId) return;
    setSaving(true);
    try {
      let igv = 18, moneda = 'S/.'; let logo: string | null = null;
      try { const c = await getConfiguracion(token, sId); igv = c.igvPorcentaje; moneda = c.monedaSimbolo; logo = c.logoUrl ?? null; } catch {}
      await updateConfiguracion(token, sId, {
        igvPorcentaje: igv, monedaSimbolo: moneda, logoUrl: logo,
        instagram: form.instagram, facebook: form.facebook, tiktok: form.tiktok,
        sitioWeb: form.sitioWeb, reviewsLink: form.reviewsLink,
      });
      triggerToast('Redes sociales guardadas.', 'success');
    } catch { triggerToast('Error al guardar', 'error'); }
    finally { setSaving(false); }
  };

  const values: Record<SocialKey, string> = { instagram: form.instagram, facebook: form.facebook, tiktok: form.tiktok, sitioWeb: form.sitioWeb };
  const connectedCount = Object.values(values).filter(v => v.trim() !== '').length;

  return (
    <div className="space-y-6">
      {isSuperAdmin && sucursales.length > 0 && (
        <div className="flex justify-end">
          <Select value={sId ?? ''} onChange={e => { const id = Number(e.target.value); setSId(id); load(id); }}>
            {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </Select>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">Conecta tus redes sociales para mostrarlas en tu menú</p>
        {connectedCount > 0 && <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-brand/10 text-brand shrink-0">{connectedCount} conectada{connectedCount === 1 ? '' : 's'}</span>}
      </div>

      <div className="space-y-3">
        {SOCIALS.map(social => {
          const value = values[social.key];
          const filled = value.trim() !== '';
          return (
            <div key={social.key} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${filled ? 'bg-brand/5 border-brand/30' : 'border-slate-200'}`}>
              {social.badge}
              {social.prefix === '@' && <span className="text-slate-400 text-sm shrink-0">@</span>}
              <input type="text" value={value} onChange={e => setForm(f => ({ ...f, [social.key]: e.target.value }))} placeholder={social.placeholder} className="flex-1 min-w-0 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none" />
              {filled && <Check className="h-4 w-4 text-brand shrink-0" />}
            </div>
          );
        })}
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
        <p className="text-[11px] text-slate-600"><strong className="text-slate-700">Tip:</strong> Para Instagram y TikTok solo ingresa tu nombre de usuario sin el @. Para Facebook y Sitio Web, pega la URL completa.</p>
      </div>

      <div className="pt-4 border-t border-slate-150 space-y-3">
        <div className="flex items-start gap-3">
          <span className="h-8 w-8 rounded-lg bg-amber-400 flex items-center justify-center text-white shrink-0"><Star className="h-4 w-4 fill-white" /></span>
          <div><p className="text-sm font-medium text-slate-800">Reseñas de Google</p><p className="text-[11px] text-slate-500">Agrega tu link de reseñas y aparecerá un botón en el email de pedido entregado</p></div>
        </div>
        <input type="text" value={form.reviewsLink} onChange={e => setForm(f => ({ ...f, reviewsLink: e.target.value }))} placeholder="https://g.page/r/XXXXXXXXX/review" className="input w-full px-3 py-2" />
        <button type="button" onClick={() => setShowHelp(v => !v)} className="flex items-center gap-1 text-[11px] font-medium text-brand hover:underline">
          <ChevronRight className={`h-3 w-3 transition-transform ${showHelp ? 'rotate-90' : ''}`} /> ¿Cómo obtengo mi link de reseñas?
        </button>
        {showHelp && <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">En Google Maps, busca tu negocio → toca "Compartir" → "Pedir reseñas" → copia el link generado.</p>}
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar cambios'}</Button>
      </div>
    </div>
  );
}

'use client';

import type { ReactNode } from 'react';
import { ExternalLink, Globe, Info, Menu } from 'lucide-react';

export interface RedesSocialesState {
  instagram: string;
  facebook: string;
  tiktok: string;
  sitio: string;
  reviewsLink: string;
}

export type EnlaceTipo =
  | 'whatsapp'
  | 'menu'
  | 'instagram'
  | 'facebook'
  | 'tiktok'
  | 'externo'
  | 'delivery';

export interface EnlaceItem {
  id: string;
  tipo: EnlaceTipo;
  titulo: string;
  valor: string;
  activo: boolean;
}

export interface SocialLink {
  id?: string;
  tipo?: EnlaceTipo;
  href: string;
  label: string;
  subtitle?: string;
  icon: ReactNode;
  iconBoxBg?: string;
  badgeBg?: string;
}

const ICON_SIZE = 'h-5 w-5';

/** Deja solo el usuario: acepta "@mi_negocio", "instagram.com/mi_negocio" o la URL completa. */
export function usuarioSocial(valor: string): string {
  return valor
    .trim()
    .replace(/^https?:\/\/(www\.)?/i, '')
    .replace(/^(instagram\.com|tiktok\.com)\//i, '')
    .replace(/^@+/, '')
    .split(/[/?#]/)[0]
    .trim();
}

/** Asegura que un enlace tenga protocolo: "www.mi-sitio.com" → "https://www.mi-sitio.com". */
export function enlaceWeb(valor: string): string {
  const v = valor.trim();
  if (!v) return '';
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

/** Formatea teléfono para mostrar con código de país (+51 por defecto si tiene 9 dígitos). */
export function formatWhatsappNumber(raw?: string | null): string {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return '';
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return '';
  if (trimmed.startsWith('+')) return `+${digits}`;
  if (digits.length === 9 && digits.startsWith('9')) return `+51${digits}`;
  if (digits.length === 11 && digits.startsWith('51')) return `+${digits}`;
  return `+${digits}`;
}

export function getEnlaceVisuals(tipo: EnlaceTipo): {
  typeName: string;
  iconBoxBg: string;
  badgeBg: string;
  icon: ReactNode;
} {
  switch (tipo) {
    case 'whatsapp':
      return {
        typeName: 'WhatsApp',
        iconBoxBg: 'bg-emerald-50 text-emerald-600',
        badgeBg: 'bg-emerald-50 text-emerald-600',
        // eslint-disable-next-line @next/next/no-img-element
        icon: <img src="/svgs/redes/whatsapp-icon.svg" alt="WhatsApp" className={ICON_SIZE} />,
      };
    case 'menu':
      return {
        typeName: 'Menú',
        iconBoxBg: 'bg-purple-50 text-purple-600',
        badgeBg: 'bg-purple-50 text-purple-600',
        icon: <Menu className={`${ICON_SIZE} text-purple-600`} />,
      };
    case 'instagram':
      return {
        typeName: 'Instagram',
        iconBoxBg: 'bg-pink-50 text-pink-600',
        badgeBg: 'bg-pink-50 text-pink-600',
        // eslint-disable-next-line @next/next/no-img-element
        icon: <img src="/svgs/redes/instagram-icon.svg" alt="Instagram" className={ICON_SIZE} />,
      };
    case 'facebook':
      return {
        typeName: 'Facebook',
        iconBoxBg: 'bg-blue-50 text-blue-600',
        badgeBg: 'bg-blue-50 text-blue-600',
        // eslint-disable-next-line @next/next/no-img-element
        icon: <img src="/svgs/redes/facebook-icon.svg" alt="Facebook" className={ICON_SIZE} />,
      };
    case 'tiktok':
      return {
        typeName: 'TikTok',
        iconBoxBg: 'bg-slate-100 text-slate-800',
        badgeBg: 'bg-slate-100 text-slate-700',
        // eslint-disable-next-line @next/next/no-img-element
        icon: <img src="/svgs/redes/tiktok-icon-dark.svg" alt="TikTok" className={ICON_SIZE} />,
      };
    case 'externo':
      return {
        typeName: 'Enlace externo',
        iconBoxBg: 'bg-amber-50 text-amber-600',
        badgeBg: 'bg-amber-50 text-amber-700',
        icon: <ExternalLink className={`${ICON_SIZE} text-amber-600`} />,
      };
    case 'delivery':
      return {
        typeName: 'App de delivery',
        iconBoxBg: 'bg-orange-50 text-orange-600',
        badgeBg: 'bg-orange-50 text-orange-600',
        icon: <Info className={`${ICON_SIZE} text-orange-600`} />,
      };
  }
}

export function buildHrefForEnlace(item: EnlaceItem): string {
  const val = item.valor.trim();
  switch (item.tipo) {
    case 'whatsapp': {
      const digits = val.replace(/\D/g, '');
      const phone = digits.length === 9 && digits.startsWith('9') ? `51${digits}` : digits;
      return phone ? `https://wa.me/${phone}` : '';
    }
    case 'menu':
      return val ? (val.startsWith('#') || val.startsWith('/') ? val : enlaceWeb(val)) : '#carta-platos';
    case 'instagram': {
      const user = usuarioSocial(val);
      return user ? `https://instagram.com/${user}` : '';
    }
    case 'tiktok': {
      const user = usuarioSocial(val);
      return user ? `https://tiktok.com/@${user}` : '';
    }
    case 'facebook':
    case 'externo':
    case 'delivery':
      return enlaceWeb(val);
  }
}

/**
 * Obtiene la lista estructurada de enlaces desde `horariosJson._enlaces` o,
 * si aún no se ha guardado con el nuevo formato, la construye a partir de los campos
 * individuales de configuración y el teléfono de la sucursal.
 */
export function parseEnlacesConfig(
  config?: {
    instagram?: string | null;
    facebook?: string | null;
    tiktok?: string | null;
    sitioWeb?: string | null;
    sitio?: string | null;
    whatsappPedidos?: string | null;
    horariosJson?: string | null;
  } | null,
  sucursalTelefono?: string | null,
): EnlaceItem[] {
  if (config?.horariosJson) {
    try {
      const parsed = JSON.parse(config.horariosJson);
      if (parsed && Array.isArray(parsed._enlaces)) {
        return parsed._enlaces as EnlaceItem[];
      }
    } catch {
      /* fallback a campos sueltos */
    }
  }

  const items: EnlaceItem[] = [];
  const rawWa = config?.whatsappPedidos?.trim() || sucursalTelefono?.trim() || '';
  if (rawWa) {
    items.push({
      id: 'whatsapp-1',
      tipo: 'whatsapp',
      titulo: 'WhatsApp',
      valor: formatWhatsappNumber(rawWa),
      activo: true,
    });
  }
  const ig = usuarioSocial(config?.instagram ?? '');
  if (ig) {
    items.push({
      id: 'instagram-1',
      tipo: 'instagram',
      titulo: 'Instagram',
      valor: `@${ig}`,
      activo: true,
    });
  }
  const fb = (config?.facebook ?? '').trim();
  if (fb) {
    items.push({
      id: 'facebook-1',
      tipo: 'facebook',
      titulo: 'Facebook',
      valor: enlaceWeb(fb),
      activo: true,
    });
  }
  const tk = usuarioSocial(config?.tiktok ?? '');
  if (tk) {
    items.push({
      id: 'tiktok-1',
      tipo: 'tiktok',
      titulo: 'TikTok',
      valor: `@${tk}`,
      activo: true,
    });
  }
  const web = (config?.sitioWeb ?? config?.sitio ?? '').trim();
  if (web) {
    items.push({
      id: 'externo-1',
      tipo: 'externo',
      titulo: 'Enlace externo',
      valor: enlaceWeb(web),
      activo: true,
    });
  }
  return items;
}

export function buildSocialLinksFromEnlaces(enlaces: EnlaceItem[]): SocialLink[] {
  return enlaces
    .filter(e => e.activo)
    .map((e): SocialLink | null => {
      const href = buildHrefForEnlace(e);
      if (!href) return null;
      const vis = getEnlaceVisuals(e.tipo);
      return {
        id: e.id,
        tipo: e.tipo,
        href,
        label: e.titulo || vis.typeName,
        subtitle: e.valor,
        icon: vis.icon,
        iconBoxBg: vis.iconBoxBg,
        badgeBg: vis.badgeBg,
      };
    })
    .filter((x): x is SocialLink => x !== null);
}

export function buildSocialLinks(
  redes: RedesSocialesState & {
    whatsappPedidos?: string | null;
    horariosJson?: string | null;
  },
  sucursalTelefono?: string | null,
): SocialLink[] {
  const enlaces = parseEnlacesConfig(
    {
      instagram: redes.instagram,
      facebook: redes.facebook,
      tiktok: redes.tiktok,
      sitio: redes.sitio,
      whatsappPedidos: redes.whatsappPedidos,
      horariosJson: redes.horariosJson,
    },
    sucursalTelefono,
  );
  if (enlaces.length > 0) {
    return buildSocialLinksFromEnlaces(enlaces);
  }
  const links: (SocialLink | '')[] = [
    usuarioSocial(redes.instagram) && {
      href: `https://instagram.com/${usuarioSocial(redes.instagram)}`,
      label: 'Instagram',
      // eslint-disable-next-line @next/next/no-img-element
      icon: <img src="/svgs/redes/instagram-icon.svg" alt="Instagram" className={ICON_SIZE} />,
    },
    redes.facebook.trim() && {
      href: enlaceWeb(redes.facebook),
      label: 'Facebook',
      // eslint-disable-next-line @next/next/no-img-element
      icon: <img src="/svgs/redes/facebook-icon.svg" alt="Facebook" className={ICON_SIZE} />,
    },
    usuarioSocial(redes.tiktok) && {
      href: `https://tiktok.com/@${usuarioSocial(redes.tiktok)}`,
      label: 'TikTok',
      // eslint-disable-next-line @next/next/no-img-element
      icon: <img src="/svgs/redes/tiktok-icon-dark.svg" alt="TikTok" className={ICON_SIZE} />,
    },
    redes.sitio.trim() && {
      href: enlaceWeb(redes.sitio),
      label: 'Sitio web',
      icon: <Globe className={ICON_SIZE} />,
    },
  ];
  return links.filter((s): s is SocialLink => s !== '');
}

export function SocialLinksRow({ links }: { links: SocialLink[] }) {
  if (links.length === 0) return null;
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {links.map((s, idx) => {
        const isInternal = s.href.startsWith('#') || s.href.startsWith('/');
        return (
          <a
            key={s.id ?? `${s.label}-${idx}`}
            href={s.href}
            target={isInternal ? undefined : '_blank'}
            rel={isInternal ? undefined : 'noopener noreferrer'}
            title={s.subtitle ? `${s.label} (${s.subtitle})` : s.label}
            className={`h-8 w-8 rounded-xl border border-slate-200/80 flex items-center justify-center hover:scale-105 hover:border-brand/40 shadow-2xs transition-all ${
              s.iconBoxBg ?? 'bg-white text-slate-600'
            }`}
          >
            {s.icon}
          </a>
        );
      })}
    </div>
  );
}

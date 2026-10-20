'use client';

import type { ReactNode } from 'react';
import { Globe } from 'lucide-react';
import type { RedesSocialesState } from '@/context/RedesSocialesContext';

export interface SocialLink {
  href: string;
  label: string;
  icon: ReactNode;
}

const ICON_SIZE = 'h-6 w-6';

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

export function buildSocialLinks(redes: RedesSocialesState): SocialLink[] {
  const links: (SocialLink | '')[] = [
    usuarioSocial(redes.instagram) && {
      href: `https://instagram.com/${usuarioSocial(redes.instagram)}`, label: 'Instagram',
      // eslint-disable-next-line @next/next/no-img-element
      icon: <img src="/svgs/redes/instagram-icon.svg" alt="Instagram" className={ICON_SIZE} />,
    },
    redes.facebook.trim() && {
      href: enlaceWeb(redes.facebook), label: 'Facebook',
      // eslint-disable-next-line @next/next/no-img-element
      icon: <img src="/svgs/redes/facebook-icon.svg" alt="Facebook" className={ICON_SIZE} />,
    },
    usuarioSocial(redes.tiktok) && {
      href: `https://tiktok.com/@${usuarioSocial(redes.tiktok)}`, label: 'TikTok',
      // eslint-disable-next-line @next/next/no-img-element
      icon: <img src="/svgs/redes/tiktok-icon-dark.svg" alt="TikTok" className={ICON_SIZE} />,
    },
    redes.sitio.trim() && {
      href: enlaceWeb(redes.sitio), label: 'Sitio web',
      icon: <Globe className={ICON_SIZE} />,
    },
  ];
  return links.filter((s): s is SocialLink => s !== '');
}

export function SocialLinksRow({ links }: { links: SocialLink[] }) {
  if (links.length === 0) return null;
  return (
    <div className="flex items-center gap-2">
      {links.map(s => (
        <a
          key={s.label}
          href={s.href}
          target="_blank"
          rel="noopener noreferrer"
          title={s.label}
          className="flex items-center justify-center text-slate-500 hover:text-brand hover:scale-110 transition-all"
        >
          {s.icon}
        </a>
      ))}
    </div>
  );
}

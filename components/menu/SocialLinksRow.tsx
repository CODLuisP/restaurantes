'use client';

import type { ReactNode } from 'react';
import { Globe } from 'lucide-react';
import type { RedesSocialesState } from '@/context/RedesSocialesContext';

export interface SocialLink {
  href: string;
  label: string;
  icon: ReactNode;
}

const ICON_SIZE = 'h-5 w-5';

export function buildSocialLinks(redes: RedesSocialesState): SocialLink[] {
  const links: (SocialLink | '')[] = [
    redes.instagram.trim() && {
      href: `https://instagram.com/${redes.instagram.trim()}`, label: 'Instagram',
      // eslint-disable-next-line @next/next/no-img-element
      icon: <img src="/svgs/redes/instagram-icon.svg" alt="Instagram" className={ICON_SIZE} />,
    },
    redes.facebook.trim() && {
      href: redes.facebook.trim(), label: 'Facebook',
      // eslint-disable-next-line @next/next/no-img-element
      icon: <img src="/svgs/redes/facebook-icon.svg" alt="Facebook" className={ICON_SIZE} />,
    },
    redes.tiktok.trim() && {
      href: `https://tiktok.com/@${redes.tiktok.trim()}`, label: 'TikTok',
      // eslint-disable-next-line @next/next/no-img-element
      icon: <img src="/svgs/redes/tiktok-icon-dark.svg" alt="TikTok" className={ICON_SIZE} />,
    },
    redes.sitio.trim() && {
      href: redes.sitio.trim(), label: 'Sitio web',
      icon: <Globe className={ICON_SIZE} />,
    },
  ];
  return links.filter((s): s is SocialLink => s !== '');
}

export function SocialLinksRow({ links }: { links: SocialLink[] }) {
  if (links.length === 0) return null;
  return (
    <div className="flex items-center gap-3">
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

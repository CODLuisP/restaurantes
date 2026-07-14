'use client';

import type { ReactNode } from 'react';
import { Store, Camera, Check, Pencil } from 'lucide-react';

export interface ProfileTab {
  id: string;
  label: string;
  count?: number;
}

/**
 * Cabecera estilo perfil de red social: portada + avatar circular superpuesto
 * + nombre con insignia de verificado + categoría + barra de pestañas.
 * Se usa en el admin (editable) y en la carta pública (solo lectura).
 */
export function ProfileHeader({
  cover, logo, fallbackIcon, avatarEditable, onAvatarClick,
  name, nameMuted, nameEditable, onNameClick, subtitle, verified = true,
  headerActions, tabs, activeTab, onTabChange, coverFullBleed,
}: {
  cover: ReactNode;
  logo?: string;
  fallbackIcon?: ReactNode;
  avatarEditable?: boolean;
  onAvatarClick?: () => void;
  name: string;
  nameMuted?: boolean;
  nameEditable?: boolean;
  onNameClick?: () => void;
  subtitle?: ReactNode;
  verified?: boolean;
  headerActions?: ReactNode;
  tabs: ProfileTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  /** Si es true, la portada se muestra a todo el ancho de la ventana, sin bordes redondeados ni padding. */
  coverFullBleed?: boolean;
}) {
  const AvatarTag = avatarEditable ? 'button' : 'div';

  return (
    <div className={coverFullBleed ? '' : 'rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm'}>
      {/* Portada */}
      <div className={`relative h-44 sm:h-60 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 ${coverFullBleed ? 'w-screen left-1/2 -translate-x-1/2' : ''}`}>
        {cover}
      </div>

      {/* Identidad */}
      <div className={coverFullBleed ? 'px-4 sm:px-6 rounded-2xl border border-slate-200 bg-white shadow-sm' : 'px-4 sm:px-6'}>
        <div className="flex items-start gap-4">
          <AvatarTag
            type={avatarEditable ? 'button' : undefined}
            onClick={onAvatarClick}
            title={avatarEditable ? 'Cambiar foto' : undefined}
            className={`group/av relative h-24 w-24 sm:h-32 sm:w-32 rounded-full ring-4 ring-white bg-white overflow-hidden shrink-0 shadow-md flex items-center justify-center -mt-12 sm:-mt-16 ${avatarEditable ? 'cursor-pointer' : ''}`}
          >
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt={name} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-brand/10 flex items-center justify-center text-brand">
                {fallbackIcon ?? <Store className="h-9 w-9" />}
              </div>
            )}
            {avatarEditable && (
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/av:opacity-100 transition-opacity flex flex-col items-center justify-center gap-0.5 rounded-full">
                <Camera className="h-5 w-5 text-white" />
                <span className="text-[9px] font-semibold text-white leading-none">Cambiar</span>
              </div>
            )}
          </AvatarTag>

          <div className="flex-1 min-w-0 pt-2 sm:pt-4 pb-2 sm:pb-3">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onNameClick}
                disabled={!nameEditable}
                className="group/name flex items-center gap-1.5 min-w-0 text-left disabled:cursor-default"
              >
                <h2 className={`text-lg sm:text-2xl font-extrabold truncate ${nameMuted ? 'text-slate-400 italic' : 'text-slate-900'}`}>
                  {name}
                </h2>
                {verified && (
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-500 shrink-0" title="Verificado">
                    <Check className="h-3 w-3 text-white" strokeWidth={3.5} />
                  </span>
                )}
                {nameEditable && (
                  <Pencil className="h-3.5 w-3.5 text-slate-300 opacity-0 group-hover/name:opacity-100 transition-opacity shrink-0" />
                )}
              </button>

              {headerActions && <div className="shrink-0">{headerActions}</div>}
            </div>
            {subtitle && <div className="text-xs sm:text-sm text-slate-500 mt-0.5">{subtitle}</div>}
          </div>
        </div>

        {/* Pestañas */}
        <div className="flex items-center gap-1 sm:gap-2 border-t border-slate-100 mt-3 overflow-x-auto">
          {tabs.map(t => {
            const active = t.id === activeTab;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onTabChange(t.id)}
                className={`relative px-3 sm:px-4 py-3 text-xs sm:text-[13px] font-semibold whitespace-nowrap transition-colors ${
                  active ? 'text-brand' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-lg'
                }`}
              >
                {t.label}
                {typeof t.count === 'number' && (
                  <span className={`ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${active ? 'bg-brand/10 text-brand' : 'bg-slate-100 text-slate-500'}`}>
                    {t.count}
                  </span>
                )}
                {active && <span className="absolute left-2 right-2 -bottom-px h-0.5 rounded-full bg-brand" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

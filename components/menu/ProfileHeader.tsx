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
      <div className={`relative h-28 sm:h-40 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 ${coverFullBleed ? 'w-screen left-1/2 -translate-x-1/2' : ''}`}>
        {cover}
      </div>

      {/* Identidad */}
      <div className={coverFullBleed ? 'px-3 sm:px-5 rounded-2xl border border-slate-200 bg-white shadow-sm' : 'px-3 sm:px-5'}>
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="relative shrink-0 -mt-8 sm:-mt-12">
            <AvatarTag
              type={avatarEditable ? 'button' : undefined}
              onClick={onAvatarClick}
              title={avatarEditable ? 'Cambiar foto/logo del negocio' : undefined}
              className={`group/av relative h-16 w-16 sm:h-24 sm:w-24 rounded-full ring-4 ring-white bg-slate-900 overflow-hidden shadow-md flex items-center justify-center ${avatarEditable ? 'cursor-pointer' : ''}`}
            >
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo} alt={name} className="h-full w-full object-cover object-center" />
              ) : (
                <div className="h-full w-full bg-brand/10 flex items-center justify-center text-brand">
                  {fallbackIcon ?? <Store className="h-7 w-7" />}
                </div>
              )}
              {avatarEditable && (
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/av:opacity-100 transition-opacity flex flex-col items-center justify-center gap-0.5 rounded-full">
                  <Camera className="h-4 w-4 text-white" />
                  <span className="text-[8px] font-semibold text-white leading-none">Cambiar</span>
                </div>
              )}
            </AvatarTag>

            {avatarEditable && (
              <button
                type="button"
                onClick={onAvatarClick}
                title="Cambiar foto/logo del negocio"
                className="absolute bottom-0 right-0 h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-slate-900 hover:bg-brand text-white flex items-center justify-center shadow-md border-2 border-white transition-transform hover:scale-110 cursor-pointer z-10"
              >
                <Camera className="h-3 w-3" />
              </button>
            )}
          </div>

          <div className="flex-1 min-w-0 pt-1.5 sm:pt-2.5 pb-1.5 sm:pb-2">
            <div className="flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                <button
                  type="button"
                  onClick={onNameClick}
                  disabled={!nameEditable}
                  title={nameEditable ? 'Haz clic para editar el nombre, dirección y teléfono del negocio' : undefined}
                  className={`group/name flex items-center gap-1.5 min-w-0 text-left disabled:cursor-default ${
                    nameEditable ? 'cursor-pointer' : ''
                  }`}
                >
                  <h2 className={`text-base sm:text-xl font-bold truncate ${nameMuted ? 'text-slate-400 italic' : 'text-slate-900 group-hover/name:text-brand transition-colors'}`}>
                    {name}
                  </h2>
                  {verified && (
                    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-sky-500 shrink-0" title="Verificado">
                      <Check className="h-2.5 w-2.5 text-white" strokeWidth={3.5} />
                    </span>
                  )}
                </button>

                {nameEditable && (
                  <button
                    type="button"
                    onClick={onNameClick}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-brand hover:text-white transition-all shrink-0 border border-slate-200/80 shadow-2xs cursor-pointer group/btn"
                    title="Editar nombre, dirección y teléfono del negocio"
                  >
                    <Pencil className="h-3 w-3 text-slate-500 group-hover/btn:text-white transition-colors" />
                    <span>Editar datos</span>
                  </button>
                )}
              </div>

              {headerActions && <div className="shrink-0">{headerActions}</div>}
            </div>

            {subtitle && (
              <div
                onClick={nameEditable ? onNameClick : undefined}
                className={`text-xs text-slate-500 mt-0.5 ${
                  nameEditable ? 'cursor-pointer hover:text-slate-800 transition-colors' : ''
                }`}
                title={nameEditable ? 'Haz clic para editar la información del negocio' : undefined}
              >
                {subtitle}
              </div>
            )}
          </div>
        </div>

        {/* Pestañas */}
        <div className="flex items-center gap-1 sm:gap-1.5 border-t border-slate-100 mt-1.5 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map(t => {
            const active = t.id === activeTab;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onTabChange(t.id)}
                className={`relative px-2.5 sm:px-3 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${
                  active ? 'text-brand' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-lg'
                }`}
              >
                {t.label}
                {typeof t.count === 'number' && (
                  <span className={`ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${active ? 'bg-brand/10 text-brand' : 'bg-slate-100 text-slate-500'}`}>
                    {t.count}
                  </span>
                )}
                {active && <span className="absolute left-2 right-2 bottom-0 h-0.5 rounded-full bg-brand" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

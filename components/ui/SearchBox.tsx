'use client';

import { Search, X } from 'lucide-react';

interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Clases del contenedor (ancho, flex, etc.). */
  className?: string;
}

/** Buscador para colocar dentro de la pantalla (junto a sus filtros), con botón para limpiar. */
export function SearchBox({ value, onChange, placeholder = 'Buscar...', className = '' }: SearchBoxProps) {
  return (
    <div className={`relative min-w-48 ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="input w-full pl-9 pr-9 py-2 text-xs"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          aria-label="Limpiar búsqueda"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

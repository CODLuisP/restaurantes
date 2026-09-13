import { Select } from './Input';
import type { SucursalOption } from '@/hooks/useSucursalSelector';

interface SucursalSelectorProps {
  visible: boolean;
  sucursales: SucursalOption[];
  sId: number | null;
  onChange: (id: number) => void;
}

/** Selector de sucursal compacto para superadmin, para insertar dentro de una fila de toolbar. */
export function SucursalSelector({ visible, sucursales, sId, onChange }: SucursalSelectorProps) {
  if (!visible || sucursales.length === 0) return null;
  return (
    <div className="w-44 shrink-0">
      <Select value={sId ?? ''} onChange={e => onChange(Number(e.target.value))}>
        {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
      </Select>
    </div>
  );
}

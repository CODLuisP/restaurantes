import { Select } from './Input';
import type { SucursalOption } from '@/hooks/useSucursalSelector';

interface SucursalSelectorProps {
  visible: boolean;
  sucursales: SucursalOption[];
  sId: number | null;
  onChange: (id: number) => void;
}

/** Selector de sucursal para superadmin, usado por las páginas de Configuración escopadas por sucursal. */
export function SucursalSelector({ visible, sucursales, sId, onChange }: SucursalSelectorProps) {
  if (!visible || sucursales.length === 0) return null;
  return (
    <div className="flex justify-end">
      <Select value={sId ?? ''} onChange={e => onChange(Number(e.target.value))}>
        {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
      </Select>
    </div>
  );
}

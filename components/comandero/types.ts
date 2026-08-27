import type { Table } from '@/types';
import type { UnitStatus } from '@/components/mesas/RestaurantTable';

export const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
export const DEFAULT_CENTER = { lat: -12.0464, lng: -77.0428 }; // Lima, Perú

/** Unidad del plano: mesa suelta o grupo de mesas unidas (mismo criterio que /mesas). */
export interface Unit {
  key: string;
  groupId?: string;
  members: Table[];
  status: UnitStatus;
  capacidad: number;
  cuenta: number;
  label: string;
  primaryName: string;
  waiter?: string;
  /** true si alguna mesa de la unidad tiene un pedido armado por el cliente (QR) sin confirmar por el mozo. */
  pendienteConfirmacion: boolean;
}

export function buildUnits(pisoTables: Table[]): Unit[] {
  const units: Unit[] = [];
  const handled = new Set<string>();
  pisoTables.forEach(t => {
    if (t.groupId) {
      if (handled.has(t.groupId)) return;
      handled.add(t.groupId);
      const members = pisoTables.filter(m => m.groupId === t.groupId).sort((a, b) => (a.x ?? 0) - (b.x ?? 0));
      const status: UnitStatus = members.some(m => m.status === 'ocupada') ? 'ocupada'
        : members.some(m => m.status === 'reservada') ? 'reservada' : 'disponible';
      units.push({
        key: t.groupId, groupId: t.groupId, members, status,
        capacidad: members.reduce((s, m) => s + m.capacidad, 0),
        cuenta: members.reduce((s, m) => s + m.cuenta, 0),
        label: members.map(m => m.name).join('+'),
        primaryName: members[0].name,
        waiter: members.find(m => m.waiter)?.waiter,
        pendienteConfirmacion: members.some(m => m.pedidoEstado === 'pendiente_confirmacion'),
      });
    } else {
      units.push({
        key: t.id, members: [t], status: t.status, capacidad: t.capacidad, cuenta: t.cuenta,
        label: t.name, primaryName: t.name, waiter: t.waiter,
        pendienteConfirmacion: t.pedidoEstado === 'pendiente_confirmacion',
      });
    }
  });
  return units;
}

/** Qué pedido ya en curso se muestra en el panel de detalle. */
export type DetailView = { kind: 'mesa'; tableName: string } | { kind: 'order'; orderId: string } | null;

export const googleMapsUrl = (address: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

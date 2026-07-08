'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle, Utensils, Receipt, CalendarClock, Unlock, Plus, Trash2,
  LayoutGrid, Building2, Link2, Unlink, X, Check,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { Modal, Input, Button } from '@/components/ui';
import { RestaurantTable, type UnitStatus } from '@/components/mesas/RestaurantTable';
import type { Table } from '@/types';

/** Unidad de la grilla: una mesa suelta o un grupo de mesas unidas. */
interface Unit {
  key: string;
  groupId?: string;
  members: Table[];
  status: UnitStatus;
  capacidad: number;
  cuenta: number;
  label: string;
  primaryName: string;
  waiter?: string;
}

export default function MesasPage() {
  const {
    pisos, tables, addPiso, removePiso, addTable, removeTable,
    mergeTables, unmergeTable, setTables, triggerToast,
  } = useApp();
  const { currentUser } = useAuth();
  const router = useRouter();

  const [showPisoModal, setShowPisoModal] = useState(false);
  const [pisoName, setPisoName] = useState('');
  const [tableModalPiso, setTableModalPiso] = useState<string | null>(null);
  const [tableName, setTableName] = useState('');
  const [tableCapacidad, setTableCapacidad] = useState('4');

  const [mergeMode, setMergeMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const canTakeOrder = currentUser?.role === 'admin' || currentUser?.role === 'mozo';
  const canCharge    = currentUser?.role === 'admin' || currentUser?.role === 'cajero';
  const canManage    = currentUser?.role === 'admin';

  /* ── Modales alta ── */
  const closePisoModal = () => { setShowPisoModal(false); setPisoName(''); };
  const submitPiso = () => { addPiso(pisoName); closePisoModal(); };

  const closeTableModal = () => { setTableModalPiso(null); setTableName(''); setTableCapacidad('4'); };
  const submitTable = () => {
    if (!tableModalPiso) return;
    const capacidad = parseInt(tableCapacidad, 10);
    if (!capacidad || capacidad <= 0) { triggerToast('Ingrese una capacidad válida.', 'warning'); return; }
    addTable(tableModalPiso, tableName, capacidad);
    closeTableModal();
  };

  /* ── Construir las unidades (mesas sueltas + grupos) de un salón ── */
  const buildUnits = (pisoTables: Table[]): Unit[] => {
    const units: Unit[] = [];
    const handled = new Set<string>();
    pisoTables.forEach(t => {
      if (t.groupId) {
        if (handled.has(t.groupId)) return;
        handled.add(t.groupId);
        const members = pisoTables
          .filter(m => m.groupId === t.groupId)
          .sort((a, b) => (a.x ?? 0) - (b.x ?? 0));
        const status: UnitStatus = members.some(m => m.status === 'ocupada') ? 'ocupada'
          : members.some(m => m.status === 'reservada') ? 'reservada' : 'disponible';
        units.push({
          key: t.groupId, groupId: t.groupId, members, status,
          capacidad: members.reduce((s, m) => s + m.capacidad, 0),
          cuenta: members.reduce((s, m) => s + m.cuenta, 0),
          label: members.map(m => m.name).join('+'),
          primaryName: members[0].name,
          waiter: members.find(m => m.waiter)?.waiter,
        });
      } else {
        units.push({
          key: t.id, members: [t], status: t.status,
          capacidad: t.capacidad, cuenta: t.cuenta, label: t.name,
          primaryName: t.name, waiter: t.waiter,
        });
      }
    });
    return units;
  };

  /* ── Unir mesas ── */
  const toggleSelect = (id: string) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const doMerge = () => { mergeTables(selectedIds); setSelectedIds([]); };
  const exitMerge = () => { setMergeMode(false); setSelectedIds([]); };

  /* ── Reservar / liberar una unidad completa ── */
  const setUnitStatus = (unit: Unit, status: 'disponible' | 'reservada') => {
    const ids = unit.members.map(m => m.id);
    setTables(prev => prev.map(t =>
      ids.includes(t.id)
        ? { ...t, status, ...(status === 'disponible' ? { items: [], cuenta: 0, waiter: undefined } : {}) }
        : t
    ));
    triggerToast(status === 'reservada' ? `${unit.label} reservada.` : `${unit.label} liberada.`, 'info');
  };

  const statusBadge: Record<UnitStatus, string> = {
    disponible: 'bg-emerald-100 text-emerald-800',
    ocupada:    'bg-rose-100 text-rose-700',
    reservada:  'bg-amber-100 text-amber-800',
  };
  const statusBorder: Record<UnitStatus, string> = {
    disponible: 'border-emerald-500 bg-emerald-50/60',
    ocupada:    'border-rose-500 bg-rose-50/60',
    reservada:  'border-amber-500 bg-amber-50/60',
  };

  return (
    <div className="space-y-6 animate-section">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-800">Distribución del Salón de Comensales</h3>
          <p className="text-xs text-slate-500">
            {pisos.length === 0
              ? 'Aún no has configurado tus salones y mesas. Agrega uno para empezar.'
              : mergeMode
                ? 'Selecciona dos o más mesas libres y únelas para atender un grupo grande.'
                : canTakeOrder
                  ? 'Elige una mesa libre para tomar el pedido; el consumo se acumula hasta el cobro.'
                  : 'Selecciona una mesa ocupada para cobrar el consumo del comensal.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {pisos.length > 0 && !mergeMode && (
            <div className="hidden sm:flex gap-3 text-xs">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Disponible</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Ocupada</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Reservada</span>
            </div>
          )}
          {canManage && pisos.length > 0 && (
            mergeMode ? (
              <Button size="sm" variant="secondary" icon={<Check className="h-3.5 w-3.5" />} onClick={exitMerge}>
                Listo
              </Button>
            ) : (
              <Button size="sm" variant="secondary" icon={<Link2 className="h-3.5 w-3.5" />} onClick={() => setMergeMode(true)}>
                Unir mesas
              </Button>
            )
          )}
          {canManage && (
            <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setShowPisoModal(true)}>
              Nuevo Salón
            </Button>
          )}
        </div>
      </div>

      {/* Barra de confirmación de unión */}
      {mergeMode && selectedIds.length > 0 && (
        <div className="sticky top-2 z-20 flex items-center justify-between gap-3 bg-indigo-600 text-white px-4 py-2.5 rounded-xl shadow-lg animate-section">
          <span className="text-xs font-bold flex items-center gap-2">
            <Link2 className="h-4 w-4" /> {selectedIds.length} mesa{selectedIds.length > 1 ? 's' : ''} seleccionada{selectedIds.length > 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-2">
            <button onClick={() => setSelectedIds([])}
              className="text-[11px] font-medium px-2 py-1 rounded-lg hover:bg-white/15 transition-colors flex items-center gap-1">
              <X className="h-3.5 w-3.5" /> Cancelar
            </button>
            <button onClick={doMerge} disabled={selectedIds.length < 2}
              className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-white text-indigo-700 hover:bg-indigo-50 transition-colors disabled:opacity-50 flex items-center gap-1">
              <Link2 className="h-3.5 w-3.5" /> Unir mesas
            </button>
          </div>
        </div>
      )}

      {pisos.length === 0 ? (
        <div className="card-lg flex flex-col items-center justify-center text-center py-20 gap-3">
          <div className="h-14 w-14 rounded-2xl bg-brand/10 text-brand flex items-center justify-center">
            <LayoutGrid className="h-7 w-7" />
          </div>
          <h4 className="text-sm font-bold text-slate-800">Gestiona tus salones y mesas</h4>
          <p className="text-xs text-slate-500 max-w-sm">
            Agrega un salón (por ejemplo &quot;Salón Principal&quot;, &quot;Piso 1&quot; o &quot;Terraza&quot;) y luego
            agrega las mesas dentro, identificándolas por número o letra. Puedes tener uno solo o varios.
          </p>
          {canManage ? (
            <Button className="mt-2" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setShowPisoModal(true)}>
              Agregar salón
            </Button>
          ) : (
            <p className="text-[11px] text-slate-400 mt-1">Pide a un administrador que configure los salones y mesas.</p>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {pisos.map(piso => {
            const pisoTables = tables.filter(t => t.pisoId === piso.id);
            const units = buildUnits(pisoTables);
            return (
              <div key={piso.id} className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-brand" />
                    <h4 className="text-sm font-bold text-slate-800">{piso.name}</h4>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {pisoTables.length} {pisoTables.length === 1 ? 'mesa' : 'mesas'}
                    </span>
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-2">
                      <button onClick={() => setTableModalPiso(piso.id)}
                        className="flex items-center gap-1 text-[11px] font-bold text-brand hover:underline">
                        <Plus className="h-3.5 w-3.5" /> Agregar mesa
                      </button>
                      {pisoTables.length === 0 && (
                        <button onClick={() => removePiso(piso.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                          aria-label={`Eliminar ${piso.name}`}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {pisoTables.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-4">Este salón todavía no tiene mesas.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                    {units.map(unit => {
                      const isOcupada = unit.status === 'ocupada';
                      const isReservada = unit.status === 'reservada';
                      const isDisponible = unit.status === 'disponible';
                      const selectable = mergeMode && !unit.groupId && isDisponible;
                      const isSelected = unit.members.some(m => selectedIds.includes(m.id));
                      const merged = unit.members.length > 1;

                      return (
                        <div
                          key={unit.key}
                          onClick={selectable ? () => toggleSelect(unit.members[0].id) : undefined}
                          className={`card-lg p-5 transition-all duration-200 relative border-2 flex flex-col ${statusBorder[unit.status]} ${
                            merged ? 'sm:col-span-2' : ''
                          } ${
                            mergeMode
                              ? selectable
                                ? `cursor-pointer ${isSelected ? 'ring-2 ring-indigo-500' : 'hover:ring-2 hover:ring-indigo-200'}`
                                : 'opacity-50'
                              : 'hover:shadow-md'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] font-bold text-slate-400 font-mono uppercase">
                              {merged ? 'Mesa unida' : `Mesa ${unit.label}`}
                            </span>
                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${statusBadge[unit.status]}`}>
                              {unit.status}
                            </span>
                          </div>

                          {/* Forma de mesa */}
                          <div className="my-3 px-1">
                            <RestaurantTable
                              members={unit.members}
                              status={unit.status}
                              capacidad={unit.capacidad}
                              label={unit.label}
                              selected={isSelected}
                            />
                          </div>

                          <div className="text-center">
                            <p className="text-[11px] text-slate-500">Capacidad: {unit.capacidad} personas</p>
                            {isOcupada && unit.waiter && (
                              <p className="text-[10px] text-brand mt-0.5 font-medium">Atiende: {unit.waiter}</p>
                            )}
                          </div>

                          <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between items-center text-xs">
                            <span className="text-slate-500">Consumido:</span>
                            <span className="font-mono font-bold text-slate-800">S/. {unit.cuenta.toFixed(2)}</span>
                          </div>

                          {/* Acciones (ocultas en modo unir) */}
                          {!mergeMode && (
                            <div className="mt-3 space-y-2">
                              {canTakeOrder && !isOcupada && (
                                <button
                                  onClick={() => router.push(`/pos?mesa=${encodeURIComponent(unit.primaryName)}`)}
                                  className="w-full flex items-center justify-center gap-1.5 text-[11px] font-bold text-white bg-brand hover:bg-brand-hover py-1.5 rounded-lg transition-colors">
                                  <Utensils className="w-3.5 h-3.5" /> Tomar pedido
                                </button>
                              )}
                              {canTakeOrder && isOcupada && (
                                <button
                                  onClick={() => router.push(`/pos?mesa=${encodeURIComponent(unit.primaryName)}`)}
                                  className="w-full flex items-center justify-center gap-1.5 text-[11px] font-bold text-brand bg-brand/10 hover:bg-brand/20 py-1.5 rounded-lg transition-colors">
                                  <Utensils className="w-3.5 h-3.5" /> Agregar a comanda
                                </button>
                              )}
                              {canCharge && isOcupada && (
                                <button
                                  onClick={() => router.push(`/cobrar?mesa=${encodeURIComponent(unit.primaryName)}`)}
                                  className="w-full flex items-center justify-center gap-1.5 text-[11px] font-bold text-white bg-sky-700 hover:bg-sky-800 py-1.5 rounded-lg transition-colors">
                                  <Receipt className="w-3.5 h-3.5" /> Cobrar
                                </button>
                              )}
                              {isDisponible && (
                                <button
                                  onClick={() => setUnitStatus(unit, 'reservada')}
                                  className="w-full flex items-center justify-center gap-1.5 text-[11px] font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 py-1.5 rounded-lg transition-colors">
                                  <CalendarClock className="w-3.5 h-3.5" /> Reservar
                                </button>
                              )}
                              {isReservada && (
                                <button
                                  onClick={() => setUnitStatus(unit, 'disponible')}
                                  className="w-full flex items-center justify-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 py-1.5 rounded-lg transition-colors">
                                  <Unlock className="w-3.5 h-3.5" /> Liberar
                                </button>
                              )}
                              {canManage && merged && isDisponible && (
                                <button
                                  onClick={() => unmergeTable(unit.groupId!)}
                                  className="w-full flex items-center justify-center gap-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-100 py-1.5 rounded-lg transition-colors">
                                  <Unlink className="w-3.5 h-3.5" /> Separar mesas
                                </button>
                              )}
                              {canManage && !merged && isDisponible && (
                                <button
                                  onClick={() => removeTable(unit.members[0].id)}
                                  className="w-full flex items-center justify-center gap-1.5 text-[11px] font-medium text-rose-600 hover:bg-rose-50 py-1.5 rounded-lg transition-colors">
                                  <Trash2 className="w-3.5 h-3.5" /> Eliminar mesa
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {pisos.length > 0 && !mergeMode && (
        <div className="bg-emerald-500/10 border border-brand/10 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-brand shrink-0" />
          <p className="text-xs text-gray-700">
            <strong>Flujo:</strong> el mozo toma el pedido en una mesa → la comanda llega a Cocina → el cajero cobra desde &quot;Cobrar&quot; y libera la mesa.
          </p>
        </div>
      )}

      {/* Modal: nuevo salón */}
      <Modal
        open={showPisoModal}
        onClose={closePisoModal}
        title="Nuevo Salón"
        subtitle="Ej: Salón Principal, Piso 1, Terraza, Salón VIP..."
        size="sm"
        fullHeight={false}
        footer={
          <>
            <Button variant="secondary" onClick={closePisoModal}>Cancelar</Button>
            <Button onClick={submitPiso}>Crear Salón</Button>
          </>
        }
      >
        <Input
          label="Nombre del salón"
          placeholder="Salón Principal"
          value={pisoName}
          onChange={e => setPisoName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submitPiso(); }}
          autoFocus
        />
      </Modal>

      {/* Modal: nueva mesa */}
      <Modal
        open={tableModalPiso !== null}
        onClose={closeTableModal}
        title="Nueva Mesa"
        subtitle="Identifícala por número o letra (ej: 1, 2, A, B)."
        size="sm"
        fullHeight={false}
        footer={
          <>
            <Button variant="secondary" onClick={closeTableModal}>Cancelar</Button>
            <Button onClick={submitTable}>Agregar Mesa</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Número o letra"
            placeholder="1"
            value={tableName}
            onChange={e => setTableName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submitTable(); }}
            autoFocus
          />
          <Input
            label="Capacidad (personas)"
            type="number"
            min={1}
            value={tableCapacidad}
            onChange={e => setTableCapacidad(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submitTable(); }}
          />
        </div>
      </Modal>
    </div>
  );
}

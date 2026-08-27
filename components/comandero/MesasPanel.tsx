'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle, Building2, CalendarClock, Check, LayoutGrid, Link2, Plus,
  Receipt, Trash2, Unlink, Unlock, Utensils, X,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { Modal, Input, Button, Spinner } from '@/components/ui';
import { RestaurantTable, type UnitStatus } from '@/components/mesas/RestaurantTable';
import { buildUnits } from './types';

const SIN_SALON = 'Sin salón asignado';

export default function MesasPanel({ onTakeOrder }: { onTakeOrder: (name: string) => void }) {
  const {
    tables, mesasLoading, addTable, removeTable,
    mergeTables, unmergeTable, setTableStatus, triggerToast,
  } = useApp();
  const { currentUser } = useAuth();
  const router = useRouter();

  const [tableModalOpen, setTableModalOpen] = useState(false);
  const [tableUbicacion, setTableUbicacion] = useState('');
  const [tableNumero, setTableNumero] = useState('');
  const [tableCapacidad, setTableCapacidad] = useState('4');
  const [saving, setSaving] = useState(false);

  const [mergeMode, setMergeMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const canTakeOrder = currentUser?.role === 'admin' || currentUser?.role === 'mozo';
  const canCharge    = currentUser?.role === 'admin' || currentUser?.role === 'cajero';
  const canManage    = currentUser?.role === 'admin' || currentUser?.role === 'mozo';

  const salones = Array.from(new Set(tables.map(t => t.ubicacion || SIN_SALON))).sort();

  /* ── Alta de mesa ── */
  const openTableModal = (ubicacion?: string) => {
    setTableUbicacion(ubicacion && ubicacion !== SIN_SALON ? ubicacion : '');
    setTableNumero('');
    setTableCapacidad('4');
    setTableModalOpen(true);
  };
  const closeTableModal = () => setTableModalOpen(false);

  const submitTable = async () => {
    const capacidad = parseInt(tableCapacidad, 10);
    if (!capacidad || capacidad <= 0) { triggerToast('Ingrese una capacidad válida.', 'warning'); return; }
    setSaving(true);
    await addTable(tableUbicacion, tableNumero, capacidad);
    setSaving(false);
    closeTableModal();
  };

  /* ── Eliminar mesa ── */
  const handleRemoveTable = async (tableId: string) => {
    setSaving(true);
    await removeTable(tableId);
    setSaving(false);
  };

  /* ── Unir mesas ── */
  const toggleSelect = (id: string) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const doMerge = () => { mergeTables(selectedIds); setSelectedIds([]); };
  const exitMerge = () => { setMergeMode(false); setSelectedIds([]); };

  /* ── Reservar / liberar una unidad completa ── */
  const setUnitStatus = (unit: ReturnType<typeof buildUnits>[number], status: 'disponible' | 'reservada') => {
    unit.members.forEach(m => setTableStatus(m.id, status));
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

  if (mesasLoading) {
    return (
      <div className="card-lg flex items-center justify-center py-20 text-xs text-slate-400 gap-2">
        <Spinner size="sm" /> Cargando mesas...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-section">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-800">Distribución del Salón de Comensales</h3>
          <p className="text-xs text-slate-500">
            {tables.length === 0
              ? 'Aún no has configurado mesas. Agrega una para empezar.'
              : mergeMode
                ? 'Selecciona dos o más mesas libres y únelas para atender un grupo grande.'
                : canTakeOrder
                  ? 'Elige una mesa libre para tomar el pedido; el consumo se acumula hasta el cobro.'
                  : 'Selecciona una mesa ocupada para cobrar el consumo del comensal.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {tables.length > 0 && !mergeMode && (
            <div className="hidden sm:flex gap-3 text-xs">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Disponible</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Ocupada</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Reservada</span>
            </div>
          )}
          {canManage && tables.length > 0 && (
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
            <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => openTableModal()}>
              Nueva Mesa
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

      {tables.length === 0 ? (
        <div className="card-lg flex flex-col items-center justify-center text-center py-20 gap-3">
          <div className="h-14 w-14 rounded-2xl bg-brand/10 text-brand flex items-center justify-center">
            <LayoutGrid className="h-7 w-7" />
          </div>
          <h4 className="text-sm font-bold text-slate-800">Gestiona tus mesas</h4>
          <p className="text-xs text-slate-500 max-w-sm">
            Agrega una mesa identificándola por número. Opcionalmente, indica un salón o zona
            (por ejemplo &quot;Salón Principal&quot; o &quot;Terraza&quot;) para agruparlas.
          </p>
          {canManage ? (
            <Button className="mt-2" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => openTableModal()}>
              Agregar mesa
            </Button>
          ) : (
            <p className="text-[11px] text-slate-400 mt-1">Pide a un administrador que configure las mesas.</p>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {salones.map(salon => {
            const salonTables = tables.filter(t => (t.ubicacion || SIN_SALON) === salon);
            const units = buildUnits(salonTables);
            return (
              <div key={salon} className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-brand" />
                    <h4 className="text-sm font-bold text-slate-800">{salon}</h4>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {salonTables.length} {salonTables.length === 1 ? 'mesa' : 'mesas'}
                    </span>
                  </div>
                  {canManage && (
                    <button onClick={() => openTableModal(salon)}
                      className="flex items-center gap-1 text-[11px] font-bold text-brand hover:underline">
                      <Plus className="h-3.5 w-3.5" /> Agregar mesa
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {units.map(unit => {
                    const isOcupada = unit.status === 'ocupada';
                    const isReservada = unit.status === 'reservada';
                    const isDisponible = unit.status === 'disponible';
                    const selectable = mergeMode && !unit.groupId && isDisponible;
                    const isSelected = unit.members.some(m => selectedIds.includes(m.id));
                    const merged = unit.members.length > 1;
                    const cardTakesOrder = !mergeMode && canTakeOrder;

                    return (
                      <div
                        key={unit.key}
                        onClick={
                          selectable ? () => toggleSelect(unit.members[0].id)
                          : cardTakesOrder ? () => onTakeOrder(unit.primaryName)
                          : undefined
                        }
                        className={`card-lg p-2.5 transition-all duration-200 relative border-2 flex flex-col ${statusBorder[unit.status]} ${
                          merged ? 'col-span-2' : ''
                        } ${unit.pendienteConfirmacion ? 'ring-2 ring-amber-400 animate-pulse' : ''} ${
                          mergeMode
                            ? selectable
                              ? `cursor-pointer ${isSelected ? 'ring-2 ring-indigo-500' : 'hover:ring-2 hover:ring-indigo-200'}`
                              : 'opacity-50'
                            : cardTakesOrder
                              ? 'cursor-pointer hover:shadow-md hover:ring-2 hover:ring-brand/30'
                              : 'hover:shadow-md'
                        }`}
                      >
                        {unit.pendienteConfirmacion && (
                          <span className="absolute -top-2 -right-2 bg-amber-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow-sm z-10 whitespace-nowrap">
                            Por Confirmar
                          </span>
                        )}
                        <div className="flex justify-between items-start gap-1">
                          <span className="text-[9px] font-bold text-slate-400 font-mono uppercase truncate">
                            {merged ? 'Unida' : `Mesa ${unit.label}`}
                          </span>
                          <span className={`shrink-0 text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${statusBadge[unit.status]}`}>
                            {unit.status}
                          </span>
                        </div>

                        {/* Forma de mesa */}
                        <div className="my-1">
                          <RestaurantTable
                            members={unit.members}
                            status={unit.status}
                            capacidad={unit.capacidad}
                            label={unit.label}
                            selected={isSelected}
                          />
                        </div>

                        <div className="text-center leading-tight">
                          <p className="text-[10px] text-slate-500">{unit.capacidad} pers.</p>
                          {isOcupada && unit.waiter && (
                            <p className="text-[9px] text-brand font-medium truncate">{unit.waiter}</p>
                          )}
                        </div>

                        <div className="mt-1.5 pt-1.5 border-t border-slate-200 flex justify-between items-center text-[11px]">
                          <span className="text-slate-500">Consumo:</span>
                          <span className="font-mono font-bold text-slate-800">S/.{unit.cuenta.toFixed(2)}</span>
                        </div>

                        {/* Acciones (ocultas en modo unir) */}
                        {!mergeMode && (
                          <div className="mt-1.5 space-y-1">
                            {canTakeOrder && !isOcupada && (
                              <button
                                onClick={e => { e.stopPropagation(); onTakeOrder(unit.primaryName); }}
                                className="w-full flex items-center justify-center gap-1 text-[10px] font-bold text-white bg-brand hover:bg-brand-hover py-1 rounded-lg transition-colors text-center leading-tight">
                                <Utensils className="w-3 h-3" /> Tomar pedido
                              </button>
                            )}
                            {canTakeOrder && isOcupada && (
                              <button
                                onClick={e => { e.stopPropagation(); onTakeOrder(unit.primaryName); }}
                                className="w-full flex items-center justify-center gap-1 text-[10px] font-bold text-brand bg-brand/10 hover:bg-brand/20 py-1 rounded-lg transition-colors text-center leading-tight">
                                <Utensils className="w-3 h-3" /> Agregar a comanda
                              </button>
                            )}
                            {canCharge && isOcupada && (
                              <button
                                onClick={e => { e.stopPropagation(); router.push(`/cobrar?mesa=${encodeURIComponent(unit.primaryName)}`); }}
                                className="w-full flex items-center justify-center gap-1 text-[10px] font-bold text-white bg-sky-700 hover:bg-sky-800 py-1 rounded-lg transition-colors text-center leading-tight">
                                <Receipt className="w-3 h-3" /> Cobrar
                              </button>
                            )}
                            {isDisponible && (
                              <button
                                onClick={e => { e.stopPropagation(); setUnitStatus(unit, 'reservada'); }}
                                className="w-full flex items-center justify-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 py-1 rounded-lg transition-colors text-center leading-tight">
                                <CalendarClock className="w-3 h-3" /> Reservar
                              </button>
                            )}
                            {isReservada && (
                              <button
                                onClick={e => { e.stopPropagation(); setUnitStatus(unit, 'disponible'); }}
                                className="w-full flex items-center justify-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 py-1 rounded-lg transition-colors text-center leading-tight">
                                <Unlock className="w-3 h-3" /> Liberar
                              </button>
                            )}
                            {canManage && merged && isDisponible && (
                              <button
                                onClick={e => { e.stopPropagation(); unmergeTable(unit.groupId!); }}
                                className="w-full flex items-center justify-center gap-1 text-[10px] font-medium text-slate-600 hover:bg-slate-100 py-1 rounded-lg transition-colors text-center leading-tight">
                                <Unlink className="w-3 h-3" /> Separar mesas
                              </button>
                            )}
                            {canManage && !merged && isDisponible && (
                              <button
                                onClick={e => { e.stopPropagation(); handleRemoveTable(unit.members[0].id); }}
                                disabled={saving}
                                className="w-full flex items-center justify-center gap-1 text-[10px] font-medium text-rose-600 hover:bg-rose-50 py-1 rounded-lg transition-colors text-center leading-tight disabled:opacity-50">
                                <Trash2 className="w-3 h-3" /> Eliminar mesa
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tables.length > 0 && !mergeMode && (
        <div className="bg-emerald-500/10 border border-brand/10 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-brand shrink-0" />
          <p className="text-xs text-gray-700">
            <strong>Flujo:</strong> el mozo toma el pedido en una mesa → la comanda llega a Cocina → el cajero cobra desde &quot;Cobrar&quot; y libera la mesa.
          </p>
        </div>
      )}

      {/* Modal: nueva mesa */}
      <Modal
        open={tableModalOpen}
        onClose={closeTableModal}
        title="Nueva Mesa"
        subtitle="Identifícala por número. El salón es opcional y agrupa mesas de una misma zona."
        size="sm"
        fullHeight={false}
        footer={
          <>
            <Button variant="secondary" onClick={closeTableModal} disabled={saving}>Cancelar</Button>
            <Button onClick={submitTable} disabled={saving}>{saving ? 'Agregando...' : 'Agregar Mesa'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Número de mesa"
            type="number" min={1}
            placeholder="1"
            value={tableNumero}
            onChange={e => setTableNumero(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submitTable(); }}
            autoFocus
          />
          <Input
            label="Capacidad (personas)"
            type="number" min={1}
            value={tableCapacidad}
            onChange={e => setTableCapacidad(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submitTable(); }}
          />
          <Input
            label="Salón / zona (opcional)"
            list="salones-existentes"
            placeholder="Salón Principal, Terraza..."
            value={tableUbicacion}
            onChange={e => setTableUbicacion(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submitTable(); }}
          />
          <datalist id="salones-existentes">
            {salones.filter(s => s !== SIN_SALON).map(s => <option key={s} value={s} />)}
          </datalist>
        </div>
      </Modal>
    </div>
  );
}

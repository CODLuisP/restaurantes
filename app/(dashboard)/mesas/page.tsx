'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle, Utensils, Receipt, CalendarClock, Unlock,
  Plus, Trash2, LayoutGrid, Building2,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { Modal, Input, Button } from '@/components/ui';

export default function MesasPage() {
  const { pisos, tables, addPiso, removePiso, addTable, removeTable, setTableStatus, triggerToast } = useApp();
  const { currentUser } = useAuth();
  const router = useRouter();

  const [showPisoModal, setShowPisoModal] = useState(false);
  const [pisoName, setPisoName] = useState('');
  const [tableModalPiso, setTableModalPiso] = useState<string | null>(null);
  const [tableName, setTableName] = useState('');
  const [tableCapacidad, setTableCapacidad] = useState('4');

  const canTakeOrder = currentUser?.role === 'admin' || currentUser?.role === 'mozo';
  const canCharge    = currentUser?.role === 'admin' || currentUser?.role === 'cajero';
  const canManage    = currentUser?.role === 'admin';

  const closePisoModal = () => { setShowPisoModal(false); setPisoName(''); };
  const submitPiso = () => {
    addPiso(pisoName);
    closePisoModal();
  };

  const closeTableModal = () => { setTableModalPiso(null); setTableName(''); setTableCapacidad('4'); };
  const submitTable = () => {
    if (!tableModalPiso) return;
    const capacidad = parseInt(tableCapacidad, 10);
    if (!capacidad || capacidad <= 0) {
      triggerToast('Ingrese una capacidad válida.', 'warning');
      return;
    }
    addTable(tableModalPiso, tableName, capacidad);
    closeTableModal();
  };

  return (
    <div className="space-y-6 animate-section">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-800">Distribución del Salón de Comensales</h3>
          <p className="text-xs text-slate-500">
            {pisos.length === 0
              ? 'Aún no has configurado tus salones y mesas. Agrega uno para empezar.'
              : canTakeOrder
                ? 'Elige una mesa libre para tomar el pedido; el consumo se acumula hasta el cobro.'
                : 'Selecciona una mesa ocupada para cobrar el consumo del comensal.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {pisos.length > 0 && (
            <div className="flex gap-3 text-xs">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Disponible</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Ocupada</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Reservada</span>
            </div>
          )}
          {canManage && (
            <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setShowPisoModal(true)}>
              Nuevo Salón
            </Button>
          )}
        </div>
      </div>

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
                      <button
                        onClick={() => setTableModalPiso(piso.id)}
                        className="flex items-center gap-1 text-[11px] font-bold text-brand hover:underline"
                      >
                        <Plus className="h-3.5 w-3.5" /> Agregar mesa
                      </button>
                      {pisoTables.length === 0 && (
                        <button
                          onClick={() => removePiso(piso.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                          aria-label={`Eliminar ${piso.name}`}
                        >
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
                    {pisoTables.map(table => {
                      const isOcupada = table.status === 'ocupada';
                      const isReservada = table.status === 'reservada';
                      const isDisponible = table.status === 'disponible';
                      return (
                        <div
                          key={table.id}
                          className={`card-lg p-5 hover:shadow-md transition-all duration-200 relative border-t-4 flex flex-col ${
                            isDisponible ? 'border-t-emerald-500' : isOcupada ? 'border-t-rose-500' : 'border-t-amber-500'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <span className="text-xs font-bold text-slate-500 font-mono">CODE: {table.id.toUpperCase()}</span>
                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                              isDisponible ? 'bg-emerald-100 text-emerald-800' : isOcupada ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {table.status}
                            </span>
                          </div>

                          <div className="my-4 text-center">
                            <h4 className="text-lg font-bold text-slate-800 tracking-tight">Mesa {table.name}</h4>
                            <p className="text-[10px] text-slate-500 mt-0.5">Capacidad: {table.capacidad} personas</p>
                            {isOcupada && table.waiter && (
                              <p className="text-[10px] text-brand mt-1 font-medium">Atiende: {table.waiter}</p>
                            )}
                          </div>

                          <div className="pt-3 border-t border-slate-200 flex justify-between items-center text-xs">
                            <span className="text-slate-500">Consumido:</span>
                            <span className="font-mono font-bold text-slate-800">S/. {table.cuenta.toFixed(2)}</span>
                          </div>

                          {/* Acciones según rol y estado */}
                          <div className="mt-3 space-y-2">
                            {canTakeOrder && (isDisponible || isReservada) && (
                              <button
                                onClick={() => router.push(`/pos?mesa=${encodeURIComponent(table.name)}`)}
                                className="w-full flex items-center justify-center gap-1.5 text-[11px] font-bold text-white bg-brand hover:bg-brand-hover py-1.5 rounded-lg transition-colors"
                              >
                                <Utensils className="w-3.5 h-3.5" /> Tomar pedido
                              </button>
                            )}
                            {canTakeOrder && isOcupada && (
                              <button
                                onClick={() => router.push(`/pos?mesa=${encodeURIComponent(table.name)}`)}
                                className="w-full flex items-center justify-center gap-1.5 text-[11px] font-bold text-brand bg-brand/10 hover:bg-brand/20 py-1.5 rounded-lg transition-colors"
                              >
                                <Utensils className="w-3.5 h-3.5" /> Agregar a comanda
                              </button>
                            )}
                            {canCharge && isOcupada && (
                              <button
                                onClick={() => router.push(`/cobrar?mesa=${encodeURIComponent(table.name)}`)}
                                className="w-full flex items-center justify-center gap-1.5 text-[11px] font-bold text-white bg-sky-700 hover:bg-sky-800 py-1.5 rounded-lg transition-colors"
                              >
                                <Receipt className="w-3.5 h-3.5" /> Cobrar
                              </button>
                            )}
                            {isDisponible && (
                              <button
                                onClick={() => setTableStatus(table.id, 'reservada')}
                                className="w-full flex items-center justify-center gap-1.5 text-[11px] font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 py-1.5 rounded-lg transition-colors"
                              >
                                <CalendarClock className="w-3.5 h-3.5" /> Reservar
                              </button>
                            )}
                            {isReservada && (
                              <button
                                onClick={() => setTableStatus(table.id, 'disponible')}
                                className="w-full flex items-center justify-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 py-1.5 rounded-lg transition-colors"
                              >
                                <Unlock className="w-3.5 h-3.5" /> Liberar
                              </button>
                            )}
                            {canManage && isDisponible && (
                              <button
                                onClick={() => removeTable(table.id)}
                                className="w-full flex items-center justify-center gap-1.5 text-[11px] font-medium text-rose-600 hover:bg-rose-50 py-1.5 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Eliminar mesa
                              </button>
                            )}
                          </div>
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

      {pisos.length > 0 && (
        <div className="bg-emerald-500/10 border border-brand/10 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-brand shrink-0" />
          <p className="text-xs text-gray-700">
            <strong>Flujo:</strong> el mozo toma el pedido en una mesa → la comanda llega a Cocina → el cajero cobra desde &quot;Cobrar&quot; y libera la mesa.
          </p>
        </div>
      )}

      {/* Modal: nuevo piso */}
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

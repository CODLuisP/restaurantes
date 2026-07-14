'use client';

import { useState } from 'react';
import { CalendarOff, Trash2 } from 'lucide-react';
import { Button, Modal } from '@/components/ui';

interface Cierre {
  id: string;
  motivo: string;
  desde: string;
  hasta: string;
}

export default function CierresProgramadosTab() {
  const [cierres, setCierres] = useState<Cierre[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const resetForm = () => { setMotivo(''); setDesde(''); setHasta(''); };

  const handleGuardar = () => {
    if (!motivo.trim() || !desde || !hasta) return;
    setCierres(prev => [...prev, { id: `c${Date.now()}`, motivo: motivo.trim(), desde, hasta }]);
    resetForm();
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-600">Programa cierres futuros con un motivo visible para tus clientes</p>
        <Button size="sm" onClick={() => setModalOpen(true)} className="shrink-0">
          Nuevo cierre
        </Button>
      </div>

      {cierres.length === 0 ? (
        <div className="border border-dashed border-slate-300 rounded-xl py-12 text-center">
          <CalendarOff className="h-6 w-6 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No hay cierres programados</p>
        </div>
      ) : (
        <div className="space-y-2">
          {cierres.map(c => (
            <div key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-800">{c.motivo}</p>
                <p className="text-[11px] text-slate-500">
                  {new Date(c.desde).toLocaleString('es-PE')} — {new Date(c.hasta).toLocaleString('es-PE')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCierres(prev => prev.filter(x => x.id !== c.id))}
                className="p-1.5 text-slate-400 hover:text-rose-500 shrink-0"
                aria-label="Eliminar cierre"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
        <p className="text-[11px] text-blue-700">
          El cierre se activa automáticamente al llegar la hora de inicio y desaparece al llegar la
          hora de fin. Tus clientes verán el motivo en el menú.
        </p>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); resetForm(); }}
        title="Nuevo cierre programado"
        subtitle="Tus clientes verán este motivo en el menú durante el cierre"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setModalOpen(false); resetForm(); }}>Cancelar</Button>
            <Button onClick={handleGuardar} disabled={!motivo.trim() || !desde || !hasta}>Guardar cierre</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Motivo del cierre *
            </label>
            <input
              type="text"
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder="Ej: Feriado, mantenimiento, capacitación del equipo..."
              className="input w-full px-3 py-2"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Desde *
              </label>
              <input
                type="datetime-local"
                value={desde}
                onChange={e => setDesde(e.target.value)}
                className="input w-full px-3 py-2"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Hasta *
              </label>
              <input
                type="datetime-local"
                value={hasta}
                onChange={e => setHasta(e.target.value)}
                className="input w-full px-3 py-2"
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

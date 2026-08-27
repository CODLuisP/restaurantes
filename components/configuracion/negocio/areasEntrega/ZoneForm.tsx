'use client';

import {
  X, Check, Undo2, Circle as CircleIcon, PenTool,
} from 'lucide-react';
import { Input, Toggle } from '@/components/ui';
import type { LatLng, FormState } from './types';

interface ZoneFormProps {
  editingId: number | null;
  form: FormState;
  onFormChange: (patch: Partial<FormState>) => void;
  drawingPath: LatLng[] | null;
  drawPoints: LatLng[];
  onUndoLastPoint: () => void;
  onFinalizePolygon: () => void;
  onRestartPolygon: () => void;
  onClose: () => void;
  onSubmit: () => void;
}

export default function ZoneForm({
  editingId, form, onFormChange, drawingPath, drawPoints,
  onUndoLastPoint, onFinalizePolygon, onRestartPolygon, onClose, onSubmit,
}: ZoneFormProps) {
  return (
    <div className="rounded-2xl border-2 border-brand/30 bg-brand/5 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-brand" />
          {editingId ? 'Editar zona' : 'Nueva zona'}
        </h5>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-1.5">
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tipo de zona</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onFormChange({ type: 'circulo' })}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-xl border text-[11px] font-semibold transition-colors ${
              form.type === 'circulo' ? 'bg-brand text-white border-brand' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <CircleIcon className="h-3.5 w-3.5" /> Círculo (radio)
          </button>
          <button
            type="button"
            onClick={() => { onFormChange({ type: 'poligono' }); onRestartPolygon(); }}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-xl border text-[11px] font-semibold transition-colors ${
              form.type === 'poligono' ? 'bg-brand text-white border-brand' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <PenTool className="h-3.5 w-3.5" /> Polígono (dibujar)
          </button>
        </div>
      </div>

      <Input
        label="Nombre *"
        value={form.name}
        onChange={e => onFormChange({ name: e.target.value })}
        placeholder="Ej: Zona Centro"
      />

      {form.type === 'circulo' ? (
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Radio (km) *"
            type="number" min={0.5} step={0.5}
            value={form.radiusKm}
            onChange={e => onFormChange({ radiusKm: e.target.value })}
          />
          <Input
            label="Costo envío (S/.) *"
            type="number" min={0} step={0.5}
            value={form.shippingCost}
            onChange={e => onFormChange({ shippingCost: e.target.value })}
          />
        </div>
      ) : (
        <div className="space-y-3">
          <div className={`rounded-xl border px-3 py-2.5 text-[11px] flex items-center gap-2 ${
            drawingPath ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'
          }`}>
            {drawingPath ? <Check className="h-3.5 w-3.5 shrink-0" /> : <PenTool className="h-3.5 w-3.5 shrink-0" />}
            {drawingPath
              ? `Área dibujada (${drawingPath.length} puntos). `
              : `Haz clic en el mapa para marcar los vértices (${drawPoints.length}, mínimo 3). `}
            {drawingPath && (
              <button onClick={onRestartPolygon} className="font-bold hover:underline shrink-0">Rehacer</button>
            )}
          </div>

          {!drawingPath && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onUndoLastPoint}
                disabled={drawPoints.length === 0}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Undo2 className="h-3.5 w-3.5" /> Deshacer punto
              </button>
              <button
                type="button"
                onClick={onFinalizePolygon}
                disabled={drawPoints.length < 3}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-bold bg-brand hover:bg-brand-hover text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="h-3.5 w-3.5" /> Finalizar polígono
              </button>
            </div>
          )}

          <Input
            label="Costo envío (S/.) *"
            type="number" min={0} step={0.5}
            value={form.shippingCost}
            onChange={e => onFormChange({ shippingCost: e.target.value })}
          />
        </div>
      )}

      <Input
        label="Envío gratis sobre (S/.)"
        type="number" min={0} step={1}
        value={form.freeOverAmount}
        onChange={e => onFormChange({ freeOverAmount: e.target.value })}
        placeholder="Vacío = no aplica"
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Pedido mínimo (S/.)"
          type="number" min={0} step={1}
          value={form.minOrderAmount}
          onChange={e => onFormChange({ minOrderAmount: e.target.value })}
          placeholder="Sin mínimo"
        />
        <Input
          label="Tiempo estimado (min) *"
          type="number" min={1} step={5}
          value={form.etaMinutes}
          onChange={e => onFormChange({ etaMinutes: e.target.value })}
        />
      </div>

      <Toggle checked={form.active} onChange={v => onFormChange({ active: v })} label="Zona activa" />

      <div className="flex gap-2 pt-1">
        <button onClick={onClose} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
          <X className="h-3.5 w-3.5" /> Cancelar
        </button>
        <button
          onClick={onSubmit}
          disabled={!form.name.trim() || (form.type === 'poligono' && !drawingPath)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold bg-brand hover:bg-brand-hover text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Check className="h-3.5 w-3.5" /> {editingId ? 'Guardar cambios' : 'Crear zona'}
        </button>
      </div>
    </div>
  );
}

'use client';

import {
  Map as MapIcon, Pencil, Trash2, Ban, X, Circle as CircleIcon, PenTool, Info,
} from 'lucide-react';
import type { DeliveryZone } from './types';
import { money } from './types';

interface ZoneListProps {
  zones: DeliveryZone[];
  showForm: boolean;
  selectedZoneId: number | null;
  onSelectZone: (id: number) => void;
  onEdit: (zone: DeliveryZone) => void;
  onRemoveZone: (id: number) => void;
  onRemoveExclusion: (zoneId: number, exclusionId: number) => void;
  onAddExclusionFor: (zone: DeliveryZone) => void;
  onCreateFirst: () => void;
}

export default function ZoneList({
  zones, showForm, selectedZoneId, onSelectZone, onEdit, onRemoveZone, onRemoveExclusion, onAddExclusionFor, onCreateFirst,
}: ZoneListProps) {
  return (
    <>
      {zones.length === 0 && !showForm ? (
        <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center space-y-2">
          <MapIcon className="h-7 w-7 text-slate-300 mx-auto" />
          <p className="text-xs text-slate-500">Aún no tienes zonas de entrega.</p>
          <button onClick={onCreateFirst} className="text-xs font-bold text-brand hover:underline">Crear la primera zona →</button>
        </div>
      ) : (
        <div className="space-y-3">
          {zones.map(zone => (
            <div
              key={zone.id}
              onClick={() => onSelectZone(zone.id)}
              className={`rounded-2xl border p-4 cursor-pointer transition-colors ${
                selectedZoneId === zone.id ? 'border-brand/50 bg-brand/5' : 'border-slate-200 bg-white hover:bg-slate-50'
              } ${!zone.active ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: zone.color }} />
                  <span className="text-sm font-bold text-slate-800 truncate">{zone.name}</span>
                  <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
                    {zone.type === 'circulo' ? 'Círculo' : 'Polígono'}
                  </span>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button onClick={e => { e.stopPropagation(); onEdit(zone); }} className="p-1.5 rounded-lg text-slate-400 hover:text-brand hover:bg-brand/10">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={e => { e.stopPropagation(); onRemoveZone(zone.id); }} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-slate-600">
                {zone.type === 'circulo' && <span className="font-semibold">{zone.radiusKm} km</span>}
                <span>Envío <strong className="text-slate-800">{money(zone.shippingCost)}</strong></span>
                {zone.freeOverAmount != null && (
                  <span className="text-emerald-600 font-semibold">Gratis +{money(zone.freeOverAmount)}</span>
                )}
                <span>~{zone.etaMinutes} min</span>
                {zone.minOrderAmount != null && <span>Mín. {money(zone.minOrderAmount)}</span>}
              </div>

              {/* Exclusiones */}
              <div className="mt-3 pt-3 border-t border-dashed border-slate-200">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Zonas de exclusión</p>
                {zone.exclusions.length > 0 && (
                  <div className="space-y-1 mb-1.5">
                    {zone.exclusions.map(ex => (
                      <div key={ex.id} className="flex items-center justify-between bg-rose-50 rounded-lg px-2.5 py-1.5 text-[11px] text-rose-700">
                        <span className="flex items-center gap-1.5"><Ban className="h-3 w-3" /> Exclusión · {ex.radiusKm} km</span>
                        <button onClick={e => { e.stopPropagation(); onRemoveExclusion(zone.id, ex.id); }} className="text-rose-400 hover:text-rose-600">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  onClick={e => { e.stopPropagation(); onAddExclusionFor(zone); }}
                  className="w-full flex items-center justify-center gap-1.5 text-[11px] font-semibold text-rose-500 border border-dashed border-rose-200 hover:bg-rose-50 py-1.5 rounded-lg transition-colors"
                >
                  <Ban className="h-3.5 w-3.5" /> Agregar zona de exclusión
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5 mb-3">
          <Info className="h-3.5 w-3.5 text-slate-400" /> ¿Cómo funcionan las zonas?
        </p>
        <div className="space-y-3">
          <div className="flex items-start gap-2.5">
            <span className="h-7 w-7 rounded-lg bg-brand/10 text-brand flex items-center justify-center shrink-0">
              <CircleIcon className="h-3.5 w-3.5" />
            </span>
            <p className="text-[11px] text-slate-600 pt-1">
              <strong className="text-slate-800">Círculo:</strong> cobertura por radio desde el restaurante.
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="h-7 w-7 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center shrink-0">
              <PenTool className="h-3.5 w-3.5" />
            </span>
            <p className="text-[11px] text-slate-600 pt-1">
              <strong className="text-slate-800">Polígono:</strong> área libre dibujada en el mapa.
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="h-7 w-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <Ban className="h-3.5 w-3.5" />
            </span>
            <p className="text-[11px] text-slate-600 pt-1">
              <strong className="text-slate-800">Exclusiones</strong> en rojo: áreas donde no se entrega aunque estén dentro.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

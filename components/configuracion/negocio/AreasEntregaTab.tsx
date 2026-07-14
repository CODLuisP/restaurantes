'use client';

import { useMemo, useState } from 'react';
import {
  GoogleMap, Marker, Circle, Polygon, useJsApiLoader,
} from '@react-google-maps/api';
import {
  Map as MapIcon, Plus, Pencil, Trash2, Ban, X, Check, Undo2,
  Circle as CircleIcon, PenTool, Info, TriangleAlert,
} from 'lucide-react';
import { Input, Toggle } from '@/components/ui';
import { GOOGLE_MAPS_LOADER_ID, GOOGLE_MAPS_LIBRARIES } from '@/lib/googleMapsLoader';
import {
  useDeliveryZones, ZONE_COLORS,
  type DeliveryZone, type ZoneShape, type LatLng,
} from '@/context/DeliveryZonesContext';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const MAP_HEIGHT = 560;

const money = (n: number) => `S/. ${n.toFixed(2)}`;

interface FormState {
  name: string;
  type: ZoneShape;
  radiusKm: string;
  shippingCost: string;
  freeOverAmount: string;
  minOrderAmount: string;
  etaMinutes: string;
  active: boolean;
}

const emptyForm = (): FormState => ({
  name: '', type: 'circulo', radiusKm: '3', shippingCost: '0',
  freeOverAmount: '', minOrderAmount: '', etaMinutes: '30', active: true,
});

export default function AreasEntregaTab() {
  const {
    zones, restaurantLocation, setRestaurantLocation,
    addZone, updateZone, removeZone, addExclusion, removeExclusion,
  } = useDeliveryZones();

  const { isLoaded, loadError } = useJsApiLoader({
    id: GOOGLE_MAPS_LOADER_ID,
    googleMapsApiKey: GOOGLE_MAPS_API_KEY ?? '',
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [drawingPath, setDrawingPath] = useState<LatLng[] | null>(null);
  const [drawPoints, setDrawPoints] = useState<LatLng[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [addingExclusionFor, setAddingExclusionFor] = useState<string | null>(null);

  const nextColor = useMemo(() => ZONE_COLORS[zones.length % ZONE_COLORS.length], [zones.length]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setDrawingPath(null);
    setDrawPoints([]);
    setShowForm(true);
  };

  const openEdit = (zone: DeliveryZone) => {
    setEditingId(zone.id);
    setForm({
      name: zone.name,
      type: zone.type,
      radiusKm: String(zone.radiusKm ?? 3),
      shippingCost: String(zone.shippingCost),
      freeOverAmount: zone.freeOverAmount != null ? String(zone.freeOverAmount) : '',
      minOrderAmount: zone.minOrderAmount != null ? String(zone.minOrderAmount) : '',
      etaMinutes: String(zone.etaMinutes),
      active: zone.active,
    });
    setDrawingPath(zone.path ?? null);
    setDrawPoints([]);
    setSelectedZoneId(zone.id);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setDrawingPath(null);
    setDrawPoints([]);
  };

  const undoLastPoint = () => setDrawPoints(prev => prev.slice(0, -1));

  const finalizePolygon = () => {
    if (drawPoints.length < 3) return;
    setDrawingPath(drawPoints);
    setDrawPoints([]);
  };

  const restartPolygon = () => {
    setDrawingPath(null);
    setDrawPoints([]);
  };

  const handleSubmit = () => {
    const name = form.name.trim();
    if (!name) return;
    if (form.type === 'poligono' && (!drawingPath || drawingPath.length < 3)) return;

    const payload = {
      name,
      type: form.type,
      active: form.active,
      color: editingId ? (zones.find(z => z.id === editingId)?.color ?? nextColor) : nextColor,
      center: form.type === 'circulo' ? restaurantLocation : undefined,
      radiusKm: form.type === 'circulo' ? Number(form.radiusKm) || 0 : undefined,
      path: form.type === 'poligono' ? drawingPath ?? undefined : undefined,
      shippingCost: Number(form.shippingCost) || 0,
      freeOverAmount: form.freeOverAmount.trim() === '' ? null : Number(form.freeOverAmount),
      minOrderAmount: form.minOrderAmount.trim() === '' ? null : Number(form.minOrderAmount),
      etaMinutes: Number(form.etaMinutes) || 0,
    };

    if (editingId) updateZone(editingId, payload);
    else addZone(payload);
    closeForm();
  };

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    const point = { lat: e.latLng.lat(), lng: e.latLng.lng() };

    if (addingExclusionFor) {
      addExclusion(addingExclusionFor, { center: point, radiusKm: 0.3 });
      setAddingExclusionFor(null);
      return;
    }

    if (showForm && form.type === 'poligono' && !drawingPath) {
      setDrawPoints(prev => [...prev, point]);
    }
  };

  const handleMarkerDragEnd = (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    setRestaurantLocation({ lat: e.latLng.lat(), lng: e.latLng.lng() });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-brand p-2.5 rounded-xl shrink-0">
            <MapIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h4 className="text-base font-bold text-slate-800">Zonas de Entrega</h4>
            <p className="text-xs text-slate-500">Cobertura y costos de envío</p>
          </div>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-1.5 text-xs font-bold text-white bg-brand hover:bg-brand-hover px-4 py-2.5 rounded-xl transition-colors shrink-0"
        >
          <Plus className="h-3.5 w-3.5" /> Nueva zona
        </button>
      </div>

      {addingExclusionFor && (
        <div className="flex items-center gap-2.5 bg-rose-50 border border-rose-200 rounded-xl px-4 py-2.5 text-xs text-rose-700">
          <Ban className="h-4 w-4 shrink-0" />
          Toca un punto del mapa para ubicar la zona de exclusión.
          <button onClick={() => setAddingExclusionFor(null)} className="ml-auto font-bold hover:underline shrink-0">Cancelar</button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-5 items-start">
        {/* ── Mapa ── */}
        <div className="rounded-2xl overflow-hidden border border-slate-200" style={{ height: MAP_HEIGHT }}>
          {!GOOGLE_MAPS_API_KEY ? (
            <div className="w-full h-full flex items-center justify-center bg-slate-50 p-6">
              <div className="flex items-start gap-2.5 max-w-sm">
                <TriangleAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-700">
                  Falta configurar <code className="font-mono bg-amber-100 px-1 rounded">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>{' '}
                  para activar el mapa interactivo.
                </p>
              </div>
            </div>
          ) : loadError ? (
            <div className="w-full h-full flex items-center justify-center bg-slate-50 p-6">
              <p className="text-[11px] text-rose-700 text-center max-w-sm">No se pudo cargar Google Maps. Verifica tu API key.</p>
            </div>
          ) : !isLoaded ? (
            <div className="w-full h-full flex items-center justify-center bg-slate-50">
              <p className="text-xs text-slate-400">Cargando mapa...</p>
            </div>
          ) : (
            <GoogleMap
              mapContainerClassName="w-full h-full"
              center={restaurantLocation}
              zoom={13}
              onClick={handleMapClick}
              options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: true }}
            >
              <Marker position={restaurantLocation} draggable onDragEnd={handleMarkerDragEnd} />

              {/* Zonas existentes */}
              {zones.map(zone => {
                const isSelected = selectedZoneId === zone.id;
                const shapeOpts = {
                  fillColor: zone.color,
                  fillOpacity: isSelected ? 0.32 : zone.active ? 0.16 : 0.06,
                  strokeColor: zone.color,
                  strokeWeight: isSelected ? 3 : 2,
                  strokeOpacity: zone.active ? 1 : 0.4,
                  clickable: true,
                };
                return (
                  <div key={zone.id}>
                    {zone.type === 'circulo' && zone.center && zone.radiusKm ? (
                      <Circle
                        center={zone.center}
                        radius={zone.radiusKm * 1000}
                        options={shapeOpts}
                        onClick={() => setSelectedZoneId(zone.id)}
                      />
                    ) : zone.type === 'poligono' && zone.path ? (
                      <Polygon path={zone.path} options={shapeOpts} onClick={() => setSelectedZoneId(zone.id)} />
                    ) : null}
                    {zone.exclusions.map(ex => (
                      <Circle
                        key={ex.id}
                        center={ex.center}
                        radius={ex.radiusKm * 1000}
                        options={{ fillColor: '#ef4444', fillOpacity: 0.28, strokeColor: '#ef4444', strokeWeight: 2 }}
                      />
                    ))}
                  </div>
                );
              })}

              {/* Vista previa mientras se crea/edita */}
              {showForm && form.type === 'circulo' && (
                <Circle
                  center={restaurantLocation}
                  radius={(Number(form.radiusKm) || 0) * 1000}
                  options={{ fillColor: '#007542', fillOpacity: 0.12, strokeColor: '#007542', strokeWeight: 2, strokeOpacity: 0.8 }}
                />
              )}
              {showForm && form.type === 'poligono' && drawingPath && (
                <Polygon
                  path={drawingPath}
                  options={{ fillColor: '#007542', fillOpacity: 0.2, strokeColor: '#007542', strokeWeight: 2 }}
                />
              )}
              {showForm && form.type === 'poligono' && !drawingPath && drawPoints.length >= 2 && (
                <Polygon
                  path={drawPoints}
                  options={{ fillColor: '#007542', fillOpacity: 0.12, strokeColor: '#007542', strokeWeight: 2, strokeOpacity: 0.9, clickable: false }}
                />
              )}
              {showForm && form.type === 'poligono' && !drawingPath && drawPoints.map((p, i) => (
                <Marker
                  key={i}
                  position={p}
                  icon={{
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 6,
                    fillColor: '#007542',
                    fillOpacity: 1,
                    strokeColor: '#ffffff',
                    strokeWeight: 2,
                  }}
                />
              ))}
            </GoogleMap>
          )}
        </div>

        {/* ── Panel lateral ── */}
        <div className="space-y-4">
          {showForm && (
            <div className="rounded-2xl border-2 border-brand/30 bg-brand/5 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-brand" />
                  {editingId ? 'Editar zona' : 'Nueva zona'}
                </h5>
                <button onClick={closeForm} className="text-slate-400 hover:text-slate-600">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tipo de zona</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, type: 'circulo' }))}
                    className={`flex items-center justify-center gap-1.5 py-2 rounded-xl border text-[11px] font-semibold transition-colors ${
                      form.type === 'circulo' ? 'bg-brand text-white border-brand' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <CircleIcon className="h-3.5 w-3.5" /> Círculo (radio)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setForm(f => ({ ...f, type: 'poligono' })); restartPolygon(); }}
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
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ej: Zona Centro"
              />

              {form.type === 'circulo' ? (
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Radio (km) *"
                    type="number" min={0.5} step={0.5}
                    value={form.radiusKm}
                    onChange={e => setForm(f => ({ ...f, radiusKm: e.target.value }))}
                  />
                  <Input
                    label="Costo envío (S/.) *"
                    type="number" min={0} step={0.5}
                    value={form.shippingCost}
                    onChange={e => setForm(f => ({ ...f, shippingCost: e.target.value }))}
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
                      <button onClick={restartPolygon} className="font-bold hover:underline shrink-0">Rehacer</button>
                    )}
                  </div>

                  {!drawingPath && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={undoLastPoint}
                        disabled={drawPoints.length === 0}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Undo2 className="h-3.5 w-3.5" /> Deshacer punto
                      </button>
                      <button
                        type="button"
                        onClick={finalizePolygon}
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
                    onChange={e => setForm(f => ({ ...f, shippingCost: e.target.value }))}
                  />
                </div>
              )}

              <Input
                label="Envío gratis sobre (S/.)"
                type="number" min={0} step={1}
                value={form.freeOverAmount}
                onChange={e => setForm(f => ({ ...f, freeOverAmount: e.target.value }))}
                placeholder="Vacío = no aplica"
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Pedido mínimo (S/.)"
                  type="number" min={0} step={1}
                  value={form.minOrderAmount}
                  onChange={e => setForm(f => ({ ...f, minOrderAmount: e.target.value }))}
                  placeholder="Sin mínimo"
                />
                <Input
                  label="Tiempo estimado (min) *"
                  type="number" min={1} step={5}
                  value={form.etaMinutes}
                  onChange={e => setForm(f => ({ ...f, etaMinutes: e.target.value }))}
                />
              </div>

              <Toggle checked={form.active} onChange={v => setForm(f => ({ ...f, active: v }))} label="Zona activa" />

              <div className="flex gap-2 pt-1">
                <button onClick={closeForm} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                  <X className="h-3.5 w-3.5" /> Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!form.name.trim() || (form.type === 'poligono' && !drawingPath)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold bg-brand hover:bg-brand-hover text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="h-3.5 w-3.5" /> {editingId ? 'Guardar cambios' : 'Crear zona'}
                </button>
              </div>
            </div>
          )}

          {/* Lista de zonas */}
          {zones.length === 0 && !showForm ? (
            <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center space-y-2">
              <MapIcon className="h-7 w-7 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500">Aún no tienes zonas de entrega.</p>
              <button onClick={openCreate} className="text-xs font-bold text-brand hover:underline">Crear la primera zona →</button>
            </div>
          ) : (
            <div className="space-y-3">
              {zones.map(zone => (
                <div
                  key={zone.id}
                  onClick={() => setSelectedZoneId(zone.id)}
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
                      <button onClick={e => { e.stopPropagation(); openEdit(zone); }} className="p-1.5 rounded-lg text-slate-400 hover:text-brand hover:bg-brand/10">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={e => { e.stopPropagation(); removeZone(zone.id); if (selectedZoneId === zone.id) setSelectedZoneId(null); }} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50">
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
                            <button onClick={e => { e.stopPropagation(); removeExclusion(zone.id, ex.id); }} className="text-rose-400 hover:text-rose-600">
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); setSelectedZoneId(zone.id); setAddingExclusionFor(zone.id); }}
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
          <div className="rounded-xl bg-sky-50 border border-sky-100 p-4">
            <p className="text-[11px] font-bold text-sky-800 flex items-center gap-1.5 mb-1.5">
              <Info className="h-3.5 w-3.5" /> ¿Cómo funcionan las zonas?
            </p>
            <ul className="space-y-1 text-[11px] text-sky-700 list-disc list-inside">
              <li><strong>Círculo:</strong> cobertura por radio desde el restaurante.</li>
              <li><strong>Polígono:</strong> área libre dibujada en el mapa.</li>
              <li><strong>Exclusiones</strong> en rojo: áreas donde no se entrega aunque estén dentro.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

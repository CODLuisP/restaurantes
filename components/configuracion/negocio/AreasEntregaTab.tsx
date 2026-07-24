'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import { Map as MapIcon, Plus, Ban } from 'lucide-react';
import { SucursalSelector, Spinner } from '@/components/ui';
import { GOOGLE_MAPS_LOADER_ID, GOOGLE_MAPS_LIBRARIES } from '@/lib/googleMapsLoader';
import { useApp } from '@/context/AppContext';
import { useSucursalSelector } from '@/hooks/useSucursalSelector';
import { getConfiguracion, updateUbicacion } from '@/lib/api/configuracion';
import {
  getZonasEntrega, createZonaEntrega, updateZonaEntrega, deleteZonaEntrega,
  addZonaExclusion, updateZonaExclusion, deleteZonaExclusion,
} from '@/lib/api/zonasEntrega';
import ZoneMap from './areasEntrega/ZoneMap';
import ZoneForm from './areasEntrega/ZoneForm';
import ZoneList from './areasEntrega/ZoneList';
import {
  type LatLng, type DeliveryZone, type ZoneExclusion, type FormState,
  ZONE_COLORS, DEFAULT_RESTAURANT_LOCATION, emptyForm, dtoToZone, toUpsertDto, isPointInsideZone,
} from './areasEntrega/types';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export default function AreasEntregaTab() {
  const { triggerToast } = useApp();
  const { token, isSuperAdmin, sucursales, sId, selectSucursal } = useSucursalSelector();

  const { isLoaded, loadError } = useJsApiLoader({
    id: GOOGLE_MAPS_LOADER_ID,
    googleMapsApiKey: GOOGLE_MAPS_API_KEY ?? '',
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const [cargando, setCargando] = useState(true);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [restaurantLocation, setRestaurantLocationState] = useState<LatLng>(DEFAULT_RESTAURANT_LOCATION);
  const ubicacionDireccionRef = useRef<string | null>(null);
  const mostrarDireccionMenuRef = useRef(false);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [drawingPath, setDrawingPath] = useState<LatLng[] | null>(null);
  const [drawPoints, setDrawPoints] = useState<LatLng[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
  const [addingExclusionFor, setAddingExclusionFor] = useState<number | null>(null);
  const [exclusionRadiusKm, setExclusionRadiusKm] = useState('1');
  const [exclusionOutsideError, setExclusionOutsideError] = useState(false);
  const exclusionCircleRefs = useRef(new Map<number, google.maps.Circle>());

  useEffect(() => {
    if (!token || !sId) return;
    setCargando(true);
    Promise.all([getConfiguracion(token, sId), getZonasEntrega(token, sId)])
      .then(([config, zonasDto]) => {
        const loc = config.ubicacionLat != null && config.ubicacionLng != null
          ? { lat: Number(config.ubicacionLat), lng: Number(config.ubicacionLng) }
          : DEFAULT_RESTAURANT_LOCATION;
        setRestaurantLocationState(loc);
        ubicacionDireccionRef.current = config.ubicacionDireccion ?? null;
        mostrarDireccionMenuRef.current = !!config.mostrarDireccionMenu;
        setZones(zonasDto.map(dtoToZone));
      })
      .catch(() => triggerToast('Error al cargar las zonas de entrega.', 'error'))
      .finally(() => setCargando(false));
  }, [token, sId, triggerToast]);

  const setRestaurantLocation = async (loc: LatLng) => {
    setRestaurantLocationState(loc);
    if (!token || !sId) return;
    try {
      await updateUbicacion(token, sId, {
        ubicacionLat: loc.lat, ubicacionLng: loc.lng,
        ubicacionDireccion: ubicacionDireccionRef.current, mostrarDireccionMenu: mostrarDireccionMenuRef.current,
      });
    } catch { triggerToast('Error al guardar la ubicación del negocio.', 'error'); }
  };

  const addZone = async (payload: Omit<DeliveryZone, 'id' | 'exclusions'>) => {
    if (!token || !sId) return;
    try {
      const created = await createZonaEntrega(token, sId, toUpsertDto(payload));
      setZones(prev => [...prev, dtoToZone(created)]);
    } catch { triggerToast('Error al crear la zona.', 'error'); }
  };

  const updateZone = async (id: number, changes: Partial<DeliveryZone>) => {
    if (!token) return;
    const current = zones.find(z => z.id === id);
    if (!current) return;
    const merged = { ...current, ...changes };
    try {
      const updated = await updateZonaEntrega(token, id, toUpsertDto(merged));
      setZones(prev => prev.map(z => (z.id === id ? { ...dtoToZone(updated), exclusions: z.exclusions } : z)));
    } catch { triggerToast('Error al actualizar la zona.', 'error'); }
  };

  const removeZone = async (id: number) => {
    if (!token) return;
    try {
      await deleteZonaEntrega(token, id);
      setZones(prev => prev.filter(z => z.id !== id));
    } catch { triggerToast('Error al eliminar la zona.', 'error'); }
  };

  const addExclusion = async (zoneId: number, exclusion: { center: LatLng; radiusKm: number }) => {
    if (!token) return;
    try {
      const created = await addZonaExclusion(token, zoneId, {
        centerLat: exclusion.center.lat, centerLng: exclusion.center.lng, radiusKm: exclusion.radiusKm,
      });
      setZones(prev => prev.map(z => (z.id === zoneId
        ? { ...z, exclusions: [...z.exclusions, { id: created.id, center: { lat: created.centerLat, lng: created.centerLng }, radiusKm: created.radiusKm }] }
        : z)));
    } catch { triggerToast('Error al agregar la exclusión.', 'error'); }
  };

  const updateExclusion = async (zoneId: number, exclusionId: number, changes: Partial<ZoneExclusion>) => {
    if (!token) return;
    const zone = zones.find(z => z.id === zoneId);
    const current = zone?.exclusions.find(e => e.id === exclusionId);
    if (!current) return;
    const merged = { ...current, ...changes };
    try {
      const updated = await updateZonaExclusion(token, exclusionId, {
        centerLat: merged.center.lat, centerLng: merged.center.lng, radiusKm: merged.radiusKm,
      });
      setZones(prev => prev.map(z => (z.id === zoneId
        ? { ...z, exclusions: z.exclusions.map(e => (e.id === exclusionId ? { id: updated.id, center: { lat: updated.centerLat, lng: updated.centerLng }, radiusKm: updated.radiusKm } : e)) }
        : z)));
    } catch { triggerToast('Error al actualizar la exclusión.', 'error'); }
  };

  const removeExclusion = async (zoneId: number, exclusionId: number) => {
    if (!token) return;
    try {
      await deleteZonaExclusion(token, exclusionId);
      setZones(prev => prev.map(z => (z.id === zoneId ? { ...z, exclusions: z.exclusions.filter(e => e.id !== exclusionId) } : z)));
    } catch { triggerToast('Error al eliminar la exclusión.', 'error'); }
  };

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
      const zone = zones.find(z => z.id === addingExclusionFor);
      if (!zone || !isPointInsideZone(point, zone)) {
        setExclusionOutsideError(true);
        return;
      }
      addExclusion(addingExclusionFor, { center: point, radiusKm: Number(exclusionRadiusKm) || 1 });
      setAddingExclusionFor(null);
      setExclusionOutsideError(false);
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

  const handleExclusionDragEnd = (zone: DeliveryZone, exclusionId: number, e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    const point = { lat: e.latLng.lat(), lng: e.latLng.lng() };
    if (!isPointInsideZone(point, zone)) {
      // El arrastre nativo del mapa ya movió el círculo visualmente; como no vamos a
      // guardar esta posición, hay que devolverlo a mano a su centro original.
      const original = zone.exclusions.find(e2 => e2.id === exclusionId)?.center;
      const circle = exclusionCircleRefs.current.get(exclusionId);
      if (original && circle) circle.setCenter(original);
      return;
    }
    updateExclusion(zone.id, exclusionId, { center: point });
  };

  const startAddingExclusion = (zone: DeliveryZone) => {
    setSelectedZoneId(zone.id);
    setAddingExclusionFor(zone.id);
    setExclusionRadiusKm('1');
    setExclusionOutsideError(false);
  };

  if (cargando) {
    return (
      <div className="py-16 flex flex-col items-center justify-center gap-3">
        <Spinner size="lg" />
        <p className="text-xs font-semibold text-slate-600">Cargando zonas de entrega...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <SucursalSelector visible={isSuperAdmin} sucursales={sucursales} sId={sId} onChange={selectSucursal} />

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
          <span>
            {exclusionOutsideError
              ? 'Ese punto está fuera de la zona. Toca dentro del área verde/morada de la zona.'
              : 'Toca un punto del mapa para ubicar la zona de exclusión.'}
          </span>
          <label className="flex items-center gap-1.5 shrink-0">
            Radio
            <input
              type="number"
              min={0.1}
              step={0.1}
              value={exclusionRadiusKm}
              onChange={e => setExclusionRadiusKm(e.target.value)}
              className="w-16 rounded-lg border border-rose-200 bg-white px-2 py-1 text-xs text-rose-700"
            />
            km
          </label>
          <button onClick={() => { setAddingExclusionFor(null); setExclusionOutsideError(false); }} className="ml-auto font-bold hover:underline shrink-0">Cancelar</button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-5 items-start">
        <ZoneMap
          isLoaded={isLoaded}
          loadError={loadError}
          restaurantLocation={restaurantLocation}
          zones={zones}
          selectedZoneId={selectedZoneId}
          onSelectZone={setSelectedZoneId}
          addingExclusionFor={addingExclusionFor}
          showForm={showForm}
          form={form}
          drawingPath={drawingPath}
          drawPoints={drawPoints}
          onMapClick={handleMapClick}
          onMarkerDragEnd={handleMarkerDragEnd}
          onExclusionDragEnd={handleExclusionDragEnd}
          exclusionCircleRefs={exclusionCircleRefs}
        />

        {/* ── Panel lateral ── */}
        <div className="space-y-4">
          {showForm && (
            <ZoneForm
              editingId={editingId}
              form={form}
              onFormChange={patch => setForm(f => ({ ...f, ...patch }))}
              drawingPath={drawingPath}
              drawPoints={drawPoints}
              onUndoLastPoint={() => setDrawPoints(prev => prev.slice(0, -1))}
              onFinalizePolygon={() => { if (drawPoints.length >= 3) { setDrawingPath(drawPoints); setDrawPoints([]); } }}
              onRestartPolygon={restartPolygon}
              onClose={closeForm}
              onSubmit={handleSubmit}
            />
          )}

          <ZoneList
            zones={zones}
            showForm={showForm}
            selectedZoneId={selectedZoneId}
            onSelectZone={setSelectedZoneId}
            onEdit={openEdit}
            onRemoveZone={id => { removeZone(id); if (selectedZoneId === id) setSelectedZoneId(null); }}
            onRemoveExclusion={removeExclusion}
            onAddExclusionFor={startAddingExclusion}
            onCreateFirst={openCreate}
          />
        </div>
      </div>
    </div>
  );
}

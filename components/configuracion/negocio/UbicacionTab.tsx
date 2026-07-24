'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { GoogleMap, Autocomplete, Marker, useJsApiLoader } from '@react-google-maps/api';
import { MapPin } from 'lucide-react';
import { GOOGLE_MAPS_LOADER_ID, GOOGLE_MAPS_LIBRARIES } from '@/lib/googleMapsLoader';
import { Toggle, Select, Button } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { getConfiguracion, updateUbicacion } from '@/lib/api/configuracion';
import { ApiError } from '@/lib/api/client';
import { getSucursales } from '@/lib/api/sucursales';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const DEFAULT_CENTER = { lat: -12.0464, lng: -77.0428 };

export default function UbicacionTab() {
  const { isLoaded, loadError } = useJsApiLoader({ id: GOOGLE_MAPS_LOADER_ID, googleMapsApiKey: GOOGLE_MAPS_API_KEY ?? '', libraries: GOOGLE_MAPS_LIBRARIES });
  const { data: session } = useSession();
  const { triggerToast } = useApp();
  const token = session?.accessToken;
  const isSuperAdmin = session?.user?.role === 'superadmin';

  const [sucursales, setSucursales] = useState<{ id: number; nombre: string }[]>([]);
  const [sId, setSId] = useState<number | null>(null);
  const [direccion, setDireccion] = useState('');
  const [mostrarDireccion, setMostrarDireccion] = useState(false);
  const [posicion, setPosicion] = useState(DEFAULT_CENTER);
  const [saving, setSaving] = useState(false);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    if (!token) return;
    getSucursales(token).then(lista => {
      const activas = lista.filter(s => s.activo);
      setSucursales(activas.map(s => ({ id: s.id, nombre: s.nombre })));
      const id = session?.user?.sucursalId ?? activas[0]?.id;
      if (id) { setSId(id); load(id); }
    }).catch(() => {});
  }, [token]);

  const load = (id: number) => {
    if (!token) return;
    getConfiguracion(token, id).then(c => {
      setDireccion(c.ubicacionDireccion || '');
      setMostrarDireccion(!!c.mostrarDireccionMenu);
      if (c.ubicacionLat && c.ubicacionLng) setPosicion({ lat: Number(c.ubicacionLat), lng: Number(c.ubicacionLng) });
    }).catch(() => {});
  };

  const handleSave = async () => {
    if (!token || !sId) return;
    setSaving(true);
    try {
      await updateUbicacion(token, sId, {
        ubicacionDireccion: direccion || null, mostrarDireccionMenu: mostrarDireccion,
        ubicacionLat: posicion.lat, ubicacionLng: posicion.lng,
      });
      triggerToast('Ubicación guardada.', 'success');
    } catch (error) {
      triggerToast(error instanceof ApiError ? error.message : 'Error al guardar', 'error');
    }
    finally { setSaving(false); }
  };

  const onPlaceChanged = () => {
    const place = autocompleteRef.current?.getPlace();
    if (!place?.geometry?.location) return;
    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();
    setPosicion({ lat, lng });
    setDireccion(place.formatted_address || place.name || '');
  };

  const onMarkerDragEnd = useCallback((e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    const lat = e.latLng.lat(); const lng = e.latLng.lng();
    setPosicion({ lat, lng });
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results?.[0]) setDireccion(results[0].formatted_address);
    });
  }, []);

  if (loadError) return <div className="p-6 text-rose-600 text-sm">Error al cargar Google Maps.</div>;

  return (
    <div className="space-y-4">
      {isSuperAdmin && sucursales.length > 0 && (
        <div className="flex justify-end">
          <Select value={sId ?? ''} onChange={e => { const id = Number(e.target.value); setSId(id); load(id); }}>
            {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </Select>
        </div>
      )}

      <p className="text-sm text-slate-600">Configura la ubicación de tu negocio en el mapa.</p>

      <div className="flex items-center justify-between py-1">
        <div><span className="text-sm font-medium text-slate-800">Mostrar dirección en el menú</span><p className="text-[11px] text-slate-500">Los clientes verán la dirección en el menú digital.</p></div>
        <Toggle checked={mostrarDireccion} onChange={setMostrarDireccion} />
      </div>

      {isLoaded && (
        <div className="space-y-3">
          <Autocomplete onLoad={a => { autocompleteRef.current = a; }} onPlaceChanged={onPlaceChanged} options={{ componentRestrictions: { country: 'pe' } }}>
            <input type="text" value={direccion} onChange={e => setDireccion(e.target.value)} placeholder="Buscar dirección..." className="input w-full px-3 py-2" />
          </Autocomplete>
          <div className="rounded-xl overflow-hidden border border-slate-200">
            <GoogleMap mapContainerStyle={{ width: '100%', height: 350 }} center={posicion} zoom={15} options={{ streetViewControl: false, mapTypeControl: false }}>
              <Marker position={posicion} draggable onDragEnd={onMarkerDragEnd} />
            </GoogleMap>
          </div>
        </div>
      )}

      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
        <MapPin className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-[11px] text-amber-700">{direccion || 'Sin dirección configurada. Busca una dirección o arrastra el marcador.'}</p>
      </div>

      <div className="flex justify-end pt-2"><Button onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar cambios'}</Button></div>
    </div>
  );
}

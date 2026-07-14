'use client';

import { useCallback, useRef, useState } from 'react';
import { GoogleMap, Autocomplete, Marker, useJsApiLoader } from '@react-google-maps/api';
import { MapPin, TriangleAlert } from 'lucide-react';
import { GOOGLE_MAPS_LOADER_ID, GOOGLE_MAPS_LIBRARIES } from '@/lib/googleMapsLoader';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

const DEFAULT_CENTER = { lat: -12.0464, lng: -77.0428 }; // Lima, Perú

interface LatLng { lat: number; lng: number }

export default function UbicacionTab() {
  const { isLoaded, loadError } = useJsApiLoader({
    id: GOOGLE_MAPS_LOADER_ID,
    googleMapsApiKey: GOOGLE_MAPS_API_KEY ?? '',
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const [direccion, setDireccion] = useState('');
  const [posicion, setPosicion] = useState<LatLng | null>(null);
  const [mostrarDireccion, setMostrarDireccion] = useState(true);

  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  const getGeocoder = useCallback(() => {
    if (!geocoderRef.current && window.google) {
      geocoderRef.current = new google.maps.Geocoder();
    }
    return geocoderRef.current;
  }, []);

  const reverseGeocode = useCallback((lat: number, lng: number) => {
    const geocoder = getGeocoder();
    if (!geocoder) return;
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results?.[0]) {
        setDireccion(results[0].formatted_address);
      }
    });
  }, [getGeocoder]);

  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setPosicion({ lat, lng });
    reverseGeocode(lat, lng);
  }, [reverseGeocode]);

  const handleMarkerDragEnd = useCallback((e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setPosicion({ lat, lng });
    reverseGeocode(lat, lng);
  }, [reverseGeocode]);

  const handlePlaceChanged = useCallback(() => {
    const place = autocompleteRef.current?.getPlace();
    if (!place?.geometry?.location) return;
    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();
    setPosicion({ lat, lng });
    setDireccion(place.formatted_address ?? place.name ?? '');
  }, []);

  return (
    <div className="space-y-6">
      <div className="w-full sm:w-1/2 space-y-1">
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          País del negocio
        </label>
        <select defaultValue="PE" className="input w-full px-3 py-2">
          <option value="PE">Peru (PEN)</option>
          <option value="CL">Chile (CLP)</option>
          <option value="CO">Colombia (COP)</option>
          <option value="MX">México (MXN)</option>
        </select>
        <p className="text-[11px] text-slate-500">
          Solo filtra en qué país se busca la dirección. El país y la moneda del negocio se guardan
          según la dirección que elijas abajo.
        </p>
      </div>

      <div className="space-y-1">
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          Dirección del negocio
        </label>
        {isLoaded ? (
          <Autocomplete
            onLoad={ac => { autocompleteRef.current = ac; }}
            onPlaceChanged={handlePlaceChanged}
            options={{ componentRestrictions: { country: 'pe' } }}
          >
            <input
              type="text"
              value={direccion}
              onChange={e => setDireccion(e.target.value)}
              placeholder="Busca tu dirección..."
              className="input w-full px-3 py-2"
            />
          </Autocomplete>
        ) : (
          <input
            type="text"
            value={direccion}
            onChange={e => setDireccion(e.target.value)}
            placeholder="Busca tu dirección..."
            className="input w-full px-3 py-2"
          />
        )}
        <p className="text-[11px] text-slate-500">
          Busca tu dirección o haz clic en el mapa para ubicar tu negocio
        </p>
      </div>

      {direccion && (
        <div className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          <MapPin className="h-4 w-4 text-brand shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-slate-800">{direccion}</p>
            {posicion && (
              <p className="text-[11px] text-slate-500">
                Coordenadas: {posicion.lat.toFixed(6)}, {posicion.lng.toFixed(6)}
              </p>
            )}
          </div>
        </div>
      )}

      {!GOOGLE_MAPS_API_KEY ? (
        <div className="flex items-start gap-2.5 border border-amber-200 bg-amber-50 rounded-xl px-4 py-3">
          <TriangleAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-700">
            Falta configurar <code className="font-mono bg-amber-100 px-1 rounded">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>{' '}
            en tu <code className="font-mono bg-amber-100 px-1 rounded">.env.local</code> para activar el mapa interactivo.
          </p>
        </div>
      ) : loadError ? (
        <div className="flex items-start gap-2.5 border border-rose-200 bg-rose-50 rounded-xl px-4 py-3">
          <TriangleAlert className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <p className="text-[11px] text-rose-700">
            No se pudo cargar Google Maps. Verifica que la API key tenga habilitadas Maps JavaScript
            API, Geocoding API y Places API.
          </p>
        </div>
      ) : !isLoaded ? (
        <div className="w-full h-64 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center">
          <p className="text-xs text-slate-400">Cargando mapa...</p>
        </div>
      ) : (
        <div className="w-full h-64 rounded-xl overflow-hidden border border-slate-200">
          <GoogleMap
            mapContainerClassName="w-full h-full"
            center={posicion ?? DEFAULT_CENTER}
            zoom={posicion ? 16 : 12}
            onClick={handleMapClick}
            options={{ streetViewControl: false, mapTypeControl: false }}
          >
            {posicion && (
              <Marker position={posicion} draggable onDragEnd={handleMarkerDragEnd} />
            )}
          </GoogleMap>
        </div>
      )}

      <label className="flex items-start gap-2.5 cursor-pointer">
        <input
          type="checkbox"
          checked={mostrarDireccion}
          onChange={e => setMostrarDireccion(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
        />
        <span>
          <span className="block text-sm font-medium text-slate-800">Mostrar dirección en el menú digital</span>
          <span className="block text-[11px] text-slate-500">
            Si la desactivas, la dirección se sigue usando internamente para zonas de entrega pero no se muestra públicamente.
          </span>
        </span>
      </label>
    </div>
  );
}

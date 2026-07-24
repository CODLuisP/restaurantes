'use client';

import type { MutableRefObject } from 'react';
import { GoogleMap, Marker, Circle, Polygon } from '@react-google-maps/api';
import { TriangleAlert } from 'lucide-react';
import type { LatLng, DeliveryZone, FormState } from './types';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const MAP_HEIGHT = 560;

interface ZoneMapProps {
  isLoaded: boolean;
  loadError?: Error;
  restaurantLocation: LatLng;
  zones: DeliveryZone[];
  selectedZoneId: number | null;
  onSelectZone: (id: number) => void;
  addingExclusionFor: number | null;
  showForm: boolean;
  form: FormState;
  drawingPath: LatLng[] | null;
  drawPoints: LatLng[];
  onMapClick: (e: google.maps.MapMouseEvent) => void;
  onMarkerDragEnd: (e: google.maps.MapMouseEvent) => void;
  onExclusionDragEnd: (zone: DeliveryZone, exclusionId: number, e: google.maps.MapMouseEvent) => void;
  exclusionCircleRefs: MutableRefObject<Map<number, google.maps.Circle>>;
}

export default function ZoneMap({
  isLoaded, loadError, restaurantLocation, zones, selectedZoneId, onSelectZone,
  addingExclusionFor, showForm, form, drawingPath, drawPoints,
  onMapClick, onMarkerDragEnd, onExclusionDragEnd, exclusionCircleRefs,
}: ZoneMapProps) {
  return (
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
          onClick={onMapClick}
          options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: true }}
        >
          <Marker position={restaurantLocation} draggable onDragEnd={onMarkerDragEnd} />

          {/* Zonas existentes */}
          {zones.map(zone => {
            const isSelected = selectedZoneId === zone.id;
            const shapeOpts = {
              fillColor: zone.color,
              fillOpacity: isSelected ? 0.32 : zone.active ? 0.16 : 0.06,
              strokeColor: zone.color,
              strokeWeight: isSelected ? 3 : 2,
              strokeOpacity: zone.active ? 1 : 0.4,
              // Mientras se ubica una exclusión, la forma no debe "atrapar" el click:
              // tiene que dejarlo pasar al mapa para poder tocar puntos dentro de la zona.
              clickable: !addingExclusionFor,
            };
            return (
              <div key={zone.id}>
                {zone.type === 'circulo' && zone.center && zone.radiusKm ? (
                  <Circle
                    center={zone.center}
                    radius={zone.radiusKm * 1000}
                    options={shapeOpts}
                    onClick={() => onSelectZone(zone.id)}
                  />
                ) : zone.type === 'poligono' && zone.path ? (
                  <Polygon path={zone.path} options={shapeOpts} onClick={() => onSelectZone(zone.id)} />
                ) : null}
                {zone.exclusions.map(ex => (
                  <Circle
                    key={ex.id}
                    center={ex.center}
                    radius={ex.radiusKm * 1000}
                    draggable={!addingExclusionFor}
                    onDragEnd={e => onExclusionDragEnd(zone, ex.id, e)}
                    onLoad={circle => exclusionCircleRefs.current.set(ex.id, circle)}
                    onUnmount={() => exclusionCircleRefs.current.delete(ex.id)}
                    options={{
                      fillColor: '#ef4444', fillOpacity: 0.28, strokeColor: '#ef4444', strokeWeight: 2,
                      clickable: !addingExclusionFor,
                    }}
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
  );
}

'use client';

import type { MutableRefObject } from 'react';
import { GoogleMap, Autocomplete, Marker } from '@react-google-maps/api';
import { MapPin } from 'lucide-react';
import { DEFAULT_CENTER, GOOGLE_MAPS_API_KEY } from './types';

interface DeliveryLocationPickerProps {
  isLoaded: boolean;
  loadError?: Error;
  custAddress: string;
  setCustAddress: (v: string) => void;
  /** Al editar un pedido existente la dirección queda bloqueada. */
  editingOrderId: string | null;
  posicion: { lat: number; lng: number } | null;
  autocompleteRef: MutableRefObject<google.maps.places.Autocomplete | null>;
  onPlaceChanged: () => void;
  onGeocodeManual: (e: React.MouseEvent) => void;
  onMapClick: (e: google.maps.MapMouseEvent) => void;
  onMarkerDragEnd: (e: google.maps.MapMouseEvent) => void;
}

/** Dirección de entrega con autocompletado de Google Places y marcador arrastrable en el mapa. */
export default function DeliveryLocationPicker({
  isLoaded, loadError, custAddress, setCustAddress, editingOrderId, posicion, autocompleteRef,
  onPlaceChanged, onGeocodeManual, onMapClick, onMarkerDragEnd,
}: DeliveryLocationPickerProps) {
  return (
    <>
                  
                  {/* Google Places Autocomplete */}
                  <div className="space-y-1">
                    {isLoaded ? (
                      <Autocomplete
                        onLoad={ac => { autocompleteRef.current = ac; }}
                        onPlaceChanged={onPlaceChanged}
                        options={{ componentRestrictions: { country: 'pe' } }}
                      >
                        <input
                          type="text"
                          value={custAddress}
                          onChange={e => setCustAddress(e.target.value)}
                          disabled={!!editingOrderId}
                          placeholder="Dirección de entrega *"
                          className="input w-full px-3 py-1.5 text-xs bg-white border-slate-200 disabled:bg-slate-100 disabled:cursor-not-allowed"
                        />
                      </Autocomplete>
                    ) : (
                      <input
                        type="text"
                        value={custAddress}
                        onChange={e => setCustAddress(e.target.value)}
                        disabled={!!editingOrderId}
                        placeholder="Dirección de entrega *"
                        className="input w-full px-3 py-1.5 text-xs bg-white border-slate-200 disabled:bg-slate-100 disabled:cursor-not-allowed"
                      />
                    )}
                  </div>

                  {/* Manual Geocode Map Action button */}
                  {!editingOrderId && (
                    <button
                      onClick={onGeocodeManual}
                      className="w-full py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] rounded-lg transition-colors font-bold flex items-center justify-center gap-1"
                    >
                      <MapPin className="h-3 w-3" /> Ubicar dirección en el mapa
                    </button>
                  )}

                  {/* Google Maps Container */}
                  {GOOGLE_MAPS_API_KEY && (
                    <div className="w-full h-36 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 mt-2 shrink-0 animate-section">
                      {!isLoaded ? (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 text-[10px]">
                          Cargando mapa...
                        </div>
                      ) : loadError ? (
                        <div className="w-full h-full flex items-center justify-center text-rose-500 text-[10px] p-2 text-center">
                          Error al cargar Google Maps
                        </div>
                      ) : (
                        <GoogleMap
                          mapContainerClassName="w-full h-full"
                          center={posicion ?? DEFAULT_CENTER}
                          zoom={posicion ? 16 : 12}
                          onClick={onMapClick}
                          options={{
                            streetViewControl: false,
                            mapTypeControl: false,
                            fullscreenControl: false,
                            zoomControl: true,
                          }}
                        >
                          {posicion && (
                            <Marker
                              position={posicion}
                              draggable={!editingOrderId}
                              onDragEnd={onMarkerDragEnd}
                            />
                          )}
                        </GoogleMap>
                      )}
                    </div>
                  )}
    </>
  );
}

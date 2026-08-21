'use client';

import { useCallback, useRef, useState } from 'react';

interface UseDeliveryGeocodingArgs {
  /** Dirección escrita en el formulario; el hook la sincroniza al mover el marcador. */
  custAddress: string;
  setCustAddress: (address: string) => void;
  /** Al editar un pedido existente no se permite mover el punto de entrega. */
  isEditingExisting: boolean;
  triggerToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

/**
 * Geocodificación del punto de entrega para pedidos de delivery: mantiene la posición
 * en el mapa sincronizada con la dirección escrita (y viceversa al arrastrar el marcador).
 */
export function useDeliveryGeocoding({
  custAddress, setCustAddress, isEditingExisting, triggerToast,
}: UseDeliveryGeocodingArgs) {
  const [posicion, setPosicion] = useState<{ lat: number; lng: number } | null>(null);
  const [lastGeocoded, setLastGeocoded] = useState('');

  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  const getGeocoder = useCallback(() => {
    if (!geocoderRef.current && window.google) {
      geocoderRef.current = new google.maps.Geocoder();
    }
    return geocoderRef.current;
  }, []);

  const geocodeAddress = useCallback((addressStr: string) => {
    const geocoder = getGeocoder();
    if (!geocoder || !addressStr.trim()) return;
    geocoder.geocode({ address: addressStr }, (results, status) => {
      if (status === 'OK' && results?.[0]?.geometry?.location) {
        setPosicion({
          lat: results[0].geometry.location.lat(),
          lng: results[0].geometry.location.lng(),
        });
      }
    });
  }, [getGeocoder]);

  const reverseGeocode = useCallback((lat: number, lng: number) => {
    const geocoder = getGeocoder();
    if (!geocoder) return;
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results?.[0]) {
        const address = results[0].formatted_address;
        setCustAddress(address);
        setLastGeocoded(address);
      }
    });
  }, [getGeocoder, setCustAddress]);

  const handlePlaceChanged = () => {
    const place = autocompleteRef.current?.getPlace();
    if (!place?.geometry?.location) return;
    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();
    const addressStr = place.formatted_address ?? place.name ?? '';
    setPosicion({ lat, lng });
    setCustAddress(addressStr);
    setLastGeocoded(addressStr);
  };

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (!e.latLng || isEditingExisting) return;
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setPosicion({ lat, lng });
    reverseGeocode(lat, lng);
  };

  const handleMarkerDragEnd = (e: google.maps.MapMouseEvent) => {
    if (!e.latLng || isEditingExisting) return;
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setPosicion({ lat, lng });
    reverseGeocode(lat, lng);
  };

  const handleGeocodeManual = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!custAddress.trim()) {
      triggerToast('Ingresa una dirección primero', 'warning');
      return;
    }
    geocodeAddress(custAddress);
    setLastGeocoded(custAddress);
  };

  /** Limpia la posición al terminar/cancelar un pedido. */
  const resetGeocoding = () => {
    setPosicion(null);
    setLastGeocoded('');
  };

  return {
    posicion, setPosicion,
    lastGeocoded, setLastGeocoded,
    autocompleteRef,
    geocodeAddress,
    handlePlaceChanged,
    handleMapClick,
    handleMarkerDragEnd,
    handleGeocodeManual,
    resetGeocoding,
  };
}

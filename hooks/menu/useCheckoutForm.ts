'use client';

import { useRef, useState } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import { GOOGLE_MAPS_API_KEY, LIBRARIES } from '@/components/menu/publico/types';

export type OrderTypePublico = 'mesa' | 'llevar' | 'delivery';

/**
 * Datos del cliente del checkout del menú público, incluido el autocompletado de dirección
 * para pedidos delivery. El comprobante y el método de pago los define el mozo al confirmar
 * el pedido (no se le piden al cliente en este paso).
 */
export function useCheckoutForm(mesaLabel?: string) {
  // Por defecto "Comer aquí": la mayoría de clientes escanean el QR ya sentados en el local,
  // tengan o no mesaLabel resuelto (ej. QR genérico de sucursal, sin mesa específica en la URL).
  // Si "mesa" termina deshabilitada en Métodos de entrega, CheckoutModal ya cae al primer tipo
  // habilitado (ver su useEffect), así que no hace falta replicar esa lógica acá.
  const [orderType, setOrderType] = useState<OrderTypePublico>('mesa');
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [tableNum, setTableNum] = useState(mesaLabel ? mesaLabel.replace(/Mesa /i, '') : '');
  const [formError, setFormError] = useState('');

  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const { isLoaded } = useJsApiLoader({
    id: 'restopro-google-maps-public',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY ?? '',
    libraries: LIBRARIES,
  });

  const handlePlaceChanged = () => {
    const place = autocompleteRef.current?.getPlace();
    if (!place?.geometry?.location) return;
    setCustAddress(place.formatted_address ?? place.name ?? '');
  };

  return {
    orderType, setOrderType,
    custName, setCustName,
    custPhone, setCustPhone,
    custEmail, setCustEmail,
    custAddress, setCustAddress,
    tableNum, setTableNum,
    formError, setFormError,
    autocompleteRef, isLoaded, handlePlaceChanged,
  };
}

export type CheckoutForm = ReturnType<typeof useCheckoutForm>;

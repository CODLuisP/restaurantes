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
  const [orderType, setOrderType] = useState<OrderTypePublico>(mesaLabel ? 'mesa' : 'llevar');
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

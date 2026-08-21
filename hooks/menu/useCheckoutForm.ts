'use client';

import { useRef, useState } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import { GOOGLE_MAPS_API_KEY, LIBRARIES } from '@/components/menu/publico/types';

export type OrderTypePublico = 'mesa' | 'llevar' | 'delivery';
export type DocTypePublico = 'Boleta' | 'Factura' | 'Nota de venta';
export type PaymentMethodPublico = 'Efectivo' | 'Tarjeta' | 'Yape / Plin';

/**
 * Datos del cliente, comprobante y pago del checkout del menú público,
 * incluido el autocompletado de dirección para pedidos delivery.
 */
export function useCheckoutForm(mesaLabel?: string) {
  const [orderType, setOrderType] = useState<OrderTypePublico>(mesaLabel ? 'mesa' : 'llevar');
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [tableNum, setTableNum] = useState(mesaLabel ? mesaLabel.replace(/Mesa /i, '') : '');
  const [docType, setDocType] = useState<DocTypePublico>('Nota de venta');
  const [ruc, setRuc] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodPublico>('Efectivo');
  const [paymentScreenshot, setPaymentScreenshot] = useState<string>('');
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
    docType, setDocType,
    ruc, setRuc,
    razonSocial, setRazonSocial,
    paymentMethod, setPaymentMethod,
    paymentScreenshot, setPaymentScreenshot,
    formError, setFormError,
    autocompleteRef, isLoaded, handlePlaceChanged,
  };
}

export type CheckoutForm = ReturnType<typeof useCheckoutForm>;

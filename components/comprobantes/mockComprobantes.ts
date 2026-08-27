import type { Comprobante } from './types';

/** Comprobantes de ejemplo mientras el módulo no consume el backend real. */
export const INITIAL_MOCK_COMPROBANTES: Comprobante[] = [
  {
    id: 'C-01',
    fecha: '10/07/2026 12:00',
    tipo: 'Factura',
    numero: 'F001-00015115',
    clienteDoc: { type: 'RUC', number: '10105294919', name: 'PANIBRA DE LA CRUZ HUMBERTO' },
    monto: 356.40,
    subtotal: 302.03,
    igv: 54.37,
    estadoSunat: 'Aceptado',
    correoStatus: 'Enviado',
    correoDestino: 'humberto.panibra@gmail.com',
    whatsappStatus: 'Enviado',
    whatsappDestino: '987654321',
    metodoPago: 'Tarjeta',
    hash: '8E4A9F5C1B6D',
    items: [
      { name: 'Arroz con Mariscos Meloso', quantity: 4, price: 42.00 },
      { name: 'Ceviche Clásico Carretillero', quantity: 4, price: 39.50 },
      { name: 'Chicha Morada RestoPro (Jarra 1L)', quantity: 1, price: 18.00 },
      { name: 'Inka Kola Personal Vidrio', quantity: 1, price: 12.40 }
    ]
  },
  {
    id: 'C-02',
    fecha: '10/07/2026 08:10',
    tipo: 'Factura',
    numero: 'F001-00015114',
    clienteDoc: { type: 'RUC', number: '10105294919', name: 'PANIBRA DE LA CRUZ HUMBERTO' },
    monto: 50.00,
    subtotal: 42.37,
    igv: 7.63,
    estadoSunat: 'Aceptado',
    correoStatus: 'Enviado',
    correoDestino: 'humberto.panibra@gmail.com',
    whatsappStatus: 'Enviado',
    whatsappDestino: '987654321',
    metodoPago: 'Yape / Plin',
    hash: '7D3A8F4C0B5D',
    items: [
      { name: 'Ají de Gallina de la Abuela', quantity: 1, price: 34.00 },
      { name: 'Suspiro a la Limeña de la Casa', quantity: 1, price: 16.00 }
    ]
  },
  {
    id: 'C-03',
    fecha: '10/07/2026 07:50',
    tipo: 'Factura',
    numero: 'F001-00015113',
    clienteDoc: { type: 'RUC', number: '20603572425', name: 'CONSTRUCCIONES Y SERVICIOS GENERALES EDMUNDO DARIO E.I.R.L.' },
    monto: 270.00,
    subtotal: 228.81,
    igv: 41.19,
    estadoSunat: 'Aceptado',
    correoStatus: 'Enviado',
    correoDestino: 'contacto@edmundodario.pe',
    whatsappStatus: 'Pendiente',
    metodoPago: 'Tarjeta',
    hash: '6C2A7F3B9A4C',
    items: [
      { name: 'Lomo Saltado con Papas Amarillas', quantity: 6, price: 45.00 }
    ]
  },
  {
    id: 'C-04',
    fecha: '10/07/2026 12:00',
    tipo: 'Factura',
    numero: 'F001-00015112',
    clienteDoc: { type: 'RUC', number: '20612176800', name: 'INVERSIONES LAGUNA & Q S.A.C.' },
    monto: 480.00,
    subtotal: 406.78,
    igv: 73.22,
    estadoSunat: 'Aceptado',
    correoStatus: 'Enviado',
    correoDestino: 'administracion@lagunaq.com',
    whatsappStatus: 'Pendiente',
    metodoPago: 'Tarjeta',
    hash: '5B1A6E2A893B',
    items: [
      { name: 'Tacu Tacu con Lomo al Jugo', quantity: 10, price: 48.00 }
    ]
  },
  {
    id: 'C-05',
    fecha: '10/07/2026 12:00',
    tipo: 'Factura',
    numero: 'F001-00015111',
    clienteDoc: { type: 'RUC', number: '10200591611', name: 'MAYTA GUERRA PRIMITIVO ZACARIAS' },
    monto: 480.00,
    subtotal: 406.78,
    igv: 73.22,
    estadoSunat: 'Aceptado',
    correoStatus: 'Enviado',
    correoDestino: 'primitivo.mayta@outlook.com',
    whatsappStatus: 'Pendiente',
    metodoPago: 'Efectivo',
    hash: '4A0A5D1A782A',
    items: [
      { name: 'Tacu Tacu con Lomo al Jugo', quantity: 10, price: 48.00 }
    ]
  },
  {
    id: 'C-06',
    fecha: '10/07/2026 12:00',
    tipo: 'Factura',
    numero: 'F001-00015110',
    clienteDoc: { type: 'RUC', number: '10106605128', name: 'TUMBAY BRAVO OLIMPIO FRANCISCO' },
    monto: 356.40,
    subtotal: 302.03,
    igv: 54.37,
    estadoSunat: 'Aceptado',
    correoStatus: 'Enviado',
    correoDestino: 'olimpio.tumbay@gmail.com',
    whatsappStatus: 'Pendiente',
    metodoPago: 'Yape / Plin',
    hash: '3F9A4C0B671F',
    items: [
      { name: 'Arroz con Mariscos Meloso', quantity: 4, price: 42.00 },
      { name: 'Ceviche Clásico Carretillero', quantity: 4, price: 39.50 },
      { name: 'Chicha Morada RestoPro (Jarra 1L)', quantity: 1, price: 18.00 },
      { name: 'Inka Kola Personal Vidrio', quantity: 1, price: 12.40 }
    ]
  },
  {
    id: 'C-07',
    fecha: '09/07/2026 12:00',
    tipo: 'Factura',
    numero: 'F001-00015109',
    clienteDoc: { type: 'RUC', number: '20542218356', name: 'EMPRESA DE TRANSPORTES Y SERVICIOS EL AGUILA S.A.C.' },
    monto: 480.00,
    subtotal: 406.78,
    igv: 73.22,
    estadoSunat: 'Aceptado',
    correoStatus: 'Enviado',
    correoDestino: 'facturas@elaguilasac.com',
    whatsappStatus: 'Pendiente',
    metodoPago: 'Tarjeta',
    hash: '2E8A3B9A560E',
    items: [
      { name: 'Tacu Tacu con Lomo al Jugo', quantity: 10, price: 48.00 }
    ]
  },
  {
    id: 'C-08',
    fecha: '09/07/2026 12:00',
    tipo: 'Factura',
    numero: 'F001-00015108',
    clienteDoc: { type: 'RUC', number: '20556143189', name: 'INVERSIONES GENERALES ANFALE E.I.R.L.' },
    monto: 480.00,
    subtotal: 406.78,
    igv: 73.22,
    estadoSunat: 'Aceptado',
    correoStatus: 'Pendiente',
    whatsappStatus: 'Enviado',
    whatsappDestino: '999111222',
    metodoPago: 'Efectivo',
    hash: '1D7A2A89459D',
    items: [
      { name: 'Tacu Tacu con Lomo al Jugo', quantity: 10, price: 48.00 }
    ]
  },
  {
    id: 'C-09',
    fecha: '09/07/2026 04:52',
    tipo: 'Factura',
    numero: 'F001-00015107',
    clienteDoc: { type: 'RUC', number: '20556143189', name: 'INVERSIONES GENERALES ANFALE E.I.R.L.' },
    monto: 290.00,
    subtotal: 245.76,
    igv: 44.24,
    estadoSunat: 'Aceptado',
    correoStatus: 'Enviado',
    correoDestino: 'facturacion@anfale.com.pe',
    whatsappStatus: 'Enviado',
    whatsappDestino: '999111222',
    metodoPago: 'Tarjeta',
    hash: '0C6A1E78348C',
    items: [
      { name: 'Anticuchos de Corazón (2 palos)', quantity: 5, price: 28.50 },
      { name: 'Arroz con Mariscos Meloso', quantity: 3, price: 42.00 },
      { name: 'Chicha Morada RestoPro (Jarra 1L)', quantity: 1, price: 18.00 },
      { name: 'Inka Kola Personal Vidrio', quantity: 1, price: 3.50 }
    ]
  },
  {
    id: 'C-10',
    fecha: '09/07/2026 12:00',
    tipo: 'Factura',
    numero: 'F001-00015106',
    clienteDoc: { type: 'RUC', number: '20522170322', name: 'SERVICENTRO PETRO GAS S.A.C.' },
    monto: 420.00,
    subtotal: 355.93,
    igv: 64.07,
    estadoSunat: 'Aceptado',
    correoStatus: 'Enviado',
    correoDestino: 'administracion@petrogas.pe',
    whatsappStatus: 'Pendiente',
    metodoPago: 'Tarjeta',
    hash: '9B5A0D67237B',
    items: [
      { name: 'Arroz con Mariscos Meloso', quantity: 10, price: 42.00 }
    ]
  },
  {
    id: 'C-11',
    fecha: '09/07/2026 12:00',
    tipo: 'Boleta',
    numero: 'B001-00012200',
    clienteDoc: { type: 'DNI', number: '16765473', name: 'BRAVO RUIZ SONIA DEL ROCIO' },
    monto: 360.00,
    subtotal: 305.08,
    igv: 54.92,
    estadoSunat: 'Aceptado',
    correoStatus: 'Enviado',
    correoDestino: 'sonia.bravo@gmail.com',
    whatsappStatus: 'Pendiente',
    metodoPago: 'Efectivo',
    hash: '8A4A9C56126A',
    items: [
      { name: 'Causa Rellena de Pollo', quantity: 15, price: 24.00 }
    ]
  }
];

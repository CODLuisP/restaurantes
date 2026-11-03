const UNIDADES = [
  '', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE', 'DIEZ', 'ONCE', 'DOCE', 'TRECE',
  'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE', 'VEINTE', 'VEINTIUNO', 'VEINTIDOS',
  'VEINTITRES', 'VEINTICUATRO', 'VEINTICINCO', 'VEINTISEIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE',
];
const DECENAS = ['', '', '', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
const CENTENAS = [
  '', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS',
  'OCHOCIENTOS', 'NOVECIENTOS',
];

const apocope = (s: string) => s.replace(/UNO$/, 'UN');

function menorMil(n: number): string {
  if (n === 100) return 'CIEN';
  const c = Math.floor(n / 100);
  const r = n % 100;
  const parts: string[] = [];
  if (c) parts.push(CENTENAS[c]);
  if (r < 30) {
    if (r) parts.push(UNIDADES[r]);
  } else {
    const d = Math.floor(r / 10);
    const u = r % 10;
    parts.push(u ? `${DECENAS[d]} Y ${UNIDADES[u]}` : DECENAS[d]);
  }
  return parts.join(' ');
}

function entero(n: number): string {
  if (n === 0) return 'CERO';
  const millones = Math.floor(n / 1_000_000);
  const miles = Math.floor((n % 1_000_000) / 1000);
  const resto = n % 1000;
  const parts: string[] = [];
  if (millones) parts.push(millones === 1 ? 'UN MILLON' : `${apocope(entero(millones))} MILLONES`);
  if (miles) parts.push(miles === 1 ? 'MIL' : `${apocope(menorMil(miles))} MIL`);
  if (resto) parts.push(menorMil(resto));
  return parts.join(' ');
}

/** 12 → "DOCE CON 00/100 SOLES" — leyenda de importe en letras que exige el comprobante. */
export function montoEnLetras(total: number, moneda = 'SOLES'): string {
  let enteros = Math.floor(total);
  let centavos = Math.round((total - enteros) * 100);
  if (centavos === 100) { enteros += 1; centavos = 0; }
  return `${entero(enteros)} CON ${String(centavos).padStart(2, '0')}/100 ${moneda}`;
}

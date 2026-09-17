/** Umbral a partir del cual mostrar la fecha real de registro en la API de facturación por
 *  separado: si el reintento fue casi inmediato, mostrarla junto a la fecha de venta es ruido. */
const UMBRAL_MINUTOS = 2;

/**
 * Devuelve la fecha real de registro en la API de facturación solo si vale la pena mostrarla
 * (difiere de la fecha de venta/creación local en más de UMBRAL_MINUTOS). Si el comprobante
 * sigue pendiente (fechaRegistroFacturacion es null) o el desfase es insignificante, null.
 */
export function getFechaEnvioSunatVisible(
  fechaCreacionLocal: string | Date,
  fechaRegistroFacturacion: string | Date | null | undefined,
): Date | null {
  if (!fechaRegistroFacturacion) return null;
  const local = new Date(fechaCreacionLocal);
  const registro = new Date(fechaRegistroFacturacion);
  const diffMinutos = (registro.getTime() - local.getTime()) / 60_000;
  return diffMinutos > UMBRAL_MINUTOS ? registro : null;
}

export function formatFechaHora(d: Date): string {
  return d.toLocaleString('es-PE');
}

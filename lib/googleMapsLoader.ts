/**
 * Configuración compartida del script de Google Maps.
 * Debe ser el MISMO id + el MISMO arreglo de librerías en todos los componentes
 * que usen `useJsApiLoader`, para que no se intente cargar el script dos veces
 * con distintas librerías (Google Maps solo permite una carga por página).
 */
export const GOOGLE_MAPS_LOADER_ID = 'restopro-google-maps';
export const GOOGLE_MAPS_LIBRARIES: ('places' | 'drawing' | 'geometry')[] = ['places', 'drawing', 'geometry'];

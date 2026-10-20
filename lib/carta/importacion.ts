/**
 * Importación de cartas con IA: tipos y utilidades compartidas entre el servidor
 * (/api/leer-carta) y la pantalla de revisión (Menú Digital → Importar).
 */

export interface PlatoLeido {
  nombre: string;
  descripcion: string;
  /** null = la carta no muestra precio: el usuario debe ponerlo antes de importar. */
  precio: number | null;
  /** Plato que YA está en la carta con el mismo nombre (o casi): importarlo lo duplicaría. */
  coincideCon: string | null;
  /** Plato existente que la IA considera equivalente aunque el nombre cambie: solo es un aviso. */
  parecidoA: string | null;
}

export interface CategoriaLeida {
  nombre: string;
  platos: PlatoLeido[];
}

export interface CartaLeida {
  moneda: string;
  categorias: CategoriaLeida[];
}

/** Lo que ya tiene el restaurante, para que la IA reutilice categorías y detecte platos repetidos. */
export interface CatalogoActual {
  categorias: string[];
  platos: string[];
}

export const CATEGORIA_SIN_NOMBRE = 'Otros';
export const MAX_BYTES_ARCHIVO = 10 * 1024 * 1024;
export const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const TIPO_PDF = 'application/pdf';

/** "Ají de Gallina!" → "aji de gallina": para comparar nombres sin importar tildes, mayúsculas ni signos. */
export function normalizarNombre(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function distanciaLevenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let previa = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const actual = [i];
    for (let j = 1; j <= b.length; j++) {
      actual[j] = Math.min(
        previa[j] + 1,
        actual[j - 1] + 1,
        previa[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    previa = actual;
  }
  return previa[b.length];
}

/** 1 = iguales, 0 = nada en común (sobre los nombres normalizados). */
export function similitud(a: string, b: string): number {
  const x = normalizarNombre(a);
  const y = normalizarNombre(b);
  if (!x || !y) return 0;
  return 1 - distanciaLevenshtein(x, y) / Math.max(x.length, y.length);
}

/**
 * Devuelve el nombre existente que corresponde a `nombre`: mismo nombre normalizado
 * ("Ají de gallina" = "aji de Gallina!") o casi igual por un error de tipeo ("Chicharron" ≈ "Chicharrón.").
 */
export function buscarCoincidencia(nombre: string, existentes: string[], umbral = 0.88): string | null {
  const n = normalizarNombre(nombre);
  if (!n) return null;
  // Los números marcan tamaños o medidas: "Pollo a la brasa 1/4" y "1/2" son platos distintos.
  const numeros = n.replace(/\D+/g, ' ').trim();
  let mejor: { nombre: string; puntaje: number } | null = null;
  for (const e of existentes) {
    const ne = normalizarNombre(e);
    if (ne === n) return e;
    if (ne.replace(/\D+/g, ' ').trim() !== numeros) continue;
    const p = similitud(nombre, e);
    if (p >= umbral && (!mejor || p > mejor.puntaje)) mejor = { nombre: e, puntaje: p };
  }
  return mejor?.nombre ?? null;
}

/** "S/ 18.50" → 18.5 · "18,50" → 18.5 · "1.200,50" → 1200.5 · "" / "consultar" / 0 → null */
export function parsePrecio(valor: unknown): number | null {
  if (typeof valor === 'number') {
    return Number.isFinite(valor) && valor > 0 ? Math.round(valor * 100) / 100 : null;
  }
  if (typeof valor !== 'string') return null;
  const match = valor.replace(/\s/g, '').match(/\d[\d.,]*/);
  if (!match) return null;
  let num = match[0];
  const ultimoPunto = num.lastIndexOf('.');
  const ultimaComa = num.lastIndexOf(',');
  if (ultimoPunto !== -1 && ultimaComa !== -1) {
    // El separador que aparece al final es el decimal; el otro es de miles.
    num = ultimaComa > ultimoPunto ? num.replace(/\./g, '').replace(',', '.') : num.replace(/,/g, '');
  } else if (ultimaComa !== -1) {
    // Solo comas: "18,50" es decimal; "1,200" (3 dígitos detrás) es de miles.
    num = /,\d{3}$/.test(num) && num.split(',').length === 2 && num.length > 4 ? num.replace(',', '') : num.replace(',', '.');
  }
  const n = parseFloat(num);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

const texto = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/**
 * Convierte lo que devolvió la IA en una carta limpia: precios como número, sin platos sin nombre,
 * sin categorías vacías, categorías repetidas fusionadas y coincidencias con la carta actual verificadas.
 */
export function normalizarCartaLeida(bruto: unknown, catalogo: CatalogoActual): CartaLeida {
  const obj = (bruto && typeof bruto === 'object' ? bruto : {}) as Record<string, unknown>;
  const moneda = /^[A-Z]{3}$/.test(texto(obj.moneda).toUpperCase()) ? texto(obj.moneda).toUpperCase() : 'PEN';

  const porNombre = new Map<string, CategoriaLeida>();
  const categoriasBrutas = Array.isArray(obj.categorias) ? obj.categorias : [];

  for (const c of categoriasBrutas) {
    const cat = (c && typeof c === 'object' ? c : {}) as Record<string, unknown>;
    let nombreCat = texto(cat.nombre) || CATEGORIA_SIN_NOMBRE;
    // Si equivale a una categoría que ya existe, se usa el nombre existente.
    nombreCat = buscarCoincidencia(nombreCat, catalogo.categorias, 0.9) ?? nombreCat;

    const platos: PlatoLeido[] = [];
    for (const p of Array.isArray(cat.platos) ? cat.platos : []) {
      const plato = (p && typeof p === 'object' ? p : {}) as Record<string, unknown>;
      const nombre = texto(plato.nombre);
      if (!nombre) continue;
      platos.push({
        nombre,
        descripcion: texto(plato.descripcion),
        precio: parsePrecio(plato.precio),
        coincideCon: buscarCoincidencia(nombre, catalogo.platos),
        parecidoA: null,
      });
    }
    if (platos.length === 0) continue;

    const clave = normalizarNombre(nombreCat);
    const previa = porNombre.get(clave);
    if (previa) previa.platos.push(...platos);
    else porNombre.set(clave, { nombre: nombreCat, platos });
  }

  return { moneda, categorias: [...porNombre.values()] };
}

/** Palabras con peso propio ("pollo", "brasa"), sin conectores ni medidas cortas. */
function palabrasClave(nombre: string): Set<string> {
  return new Set(normalizarNombre(nombre).split(' ').filter(p => p.length >= 4 && !/^\d/.test(p)));
}

/**
 * Filtro para las sugerencias de la IA: dos platos solo pueden ser "el mismo" si comparten alguna
 * palabra ("Cebiche de pescado" / "Ceviche de pescado") o se escriben casi igual ("Cebiche" / "Ceviche").
 */
function sugerenciaVerosimil(leido: string, existente: string): boolean {
  if (similitud(leido, existente) >= 0.6) return true;
  const claves = palabrasClave(existente);
  return [...palabrasClave(leido)].some(p => claves.has(p));
}

/** Lo que se le manda a la IA para comparar: solo nombres, con un índice por plato. */
export function datosParaComparar(carta: CartaLeida, catalogo: CatalogoActual) {
  return {
    categoriasLeidas: carta.categorias.map(c => c.nombre),
    platosLeidos: carta.categorias.flatMap(c => c.platos).map((p, i) => ({ i, nombre: p.nombre })),
    categoriasExistentes: catalogo.categorias,
    platosExistentes: catalogo.platos,
  };
}

/**
 * Aplica la comparación hecha por la IA. Solo acepta nombres que existan de verdad en el catálogo
 * e índices de platos leídos: la IA no puede agregar ni quitar platos en este paso.
 */
export function aplicarComparacion(carta: CartaLeida, bruto: unknown, catalogo: CatalogoActual): CartaLeida {
  const obj = (bruto && typeof bruto === 'object' ? bruto : {}) as Record<string, unknown>;
  const existente = (lista: string[], valor: unknown) => {
    const v = texto(valor);
    return v ? lista.find(e => normalizarNombre(e) === normalizarNombre(v)) ?? null : null;
  };

  const renombrar = new Map<string, string>();
  for (const c of Array.isArray(obj.categorias) ? obj.categorias : []) {
    const item = (c && typeof c === 'object' ? c : {}) as Record<string, unknown>;
    const destino = existente(catalogo.categorias, item.existente);
    if (destino && texto(item.leida)) renombrar.set(normalizarNombre(texto(item.leida)), destino);
  }

  const parecidos = new Map<number, string>();
  for (const p of Array.isArray(obj.platos) ? obj.platos : []) {
    const item = (p && typeof p === 'object' ? p : {}) as Record<string, unknown>;
    const destino = existente(catalogo.platos, item.existente);
    if (destino && typeof item.i === 'number') parecidos.set(item.i, destino);
  }

  let indice = 0;
  const categorias = carta.categorias.map(cat => ({
    nombre: renombrar.get(normalizarNombre(cat.nombre)) ?? cat.nombre,
    platos: cat.platos.map(plato => {
      const sugerido = parecidos.get(indice++) ?? null;
      // Si ya hay coincidencia por nombre, esa manda; la de la IA queda como aviso solo si es otra.
      const valido = sugerido && sugerido !== plato.coincideCon && sugerenciaVerosimil(plato.nombre, sugerido);
      return { ...plato, parecidoA: valido ? sugerido : null };
    }),
  }));
  return unirCartas([{ moneda: carta.moneda, categorias }]);
}

/** Une los resultados de varias fotos/páginas de la misma carta. */
export function unirCartas(cartas: CartaLeida[]): CartaLeida {
  const porNombre = new Map<string, CategoriaLeida>();
  for (const carta of cartas) {
    for (const cat of carta.categorias) {
      const clave = normalizarNombre(cat.nombre);
      const previa = porNombre.get(clave);
      if (previa) previa.platos.push(...cat.platos);
      else porNombre.set(clave, { nombre: cat.nombre, platos: [...cat.platos] });
    }
  }
  return { moneda: cartas[0]?.moneda ?? 'PEN', categorias: [...porNombre.values()] };
}

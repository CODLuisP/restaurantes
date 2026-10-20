import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { ErrorIA, ejecutarModelo, pdfATexto, type MensajeIA } from '@/lib/ia/cloudflareAI';
import {
  MAX_BYTES_ARCHIVO, TIPOS_IMAGEN, TIPO_PDF, aplicarComparacion, datosParaComparar, normalizarCartaLeida,
  type CartaLeida, type CatalogoActual,
} from '@/lib/carta/importacion';

export const runtime = 'nodejs';
export const maxDuration = 60;

/** Texto mínimo que debe salir de un PDF; menos que esto suele ser un PDF escaneado (solo imágenes). */
const MIN_CARACTERES_PDF = 80;
/** Tope de texto de PDF que se envía al modelo (una carta larga entra de sobra). */
const MAX_CARACTERES_PDF = 24_000;

/** Paso 1: leer la carta. No recibe la carta existente para que no la mezcle con lo que lee. */
const PROMPT_LECTURA = `Eres un asistente que lee cartas y menús de restaurantes del Perú y los convierte a JSON.
Responde SOLO con JSON válido, sin texto adicional y sin bloques de código, con esta forma exacta:
{"moneda":"PEN","categorias":[{"nombre":"Entradas","platos":[{"nombre":"Causa limeña","descripcion":"","precio":18.00}]}]}

Reglas:
1. Incluye SOLO los platos y bebidas que aparecen en la carta recibida. No inventes ni completes nada.
2. Respeta los nombres de categorías y platos tal como aparecen (misma ortografía; no traduzcas).
3. "precio" es un número sin símbolo de moneda (ej. 18.5). Si el plato no muestra precio, usa null. Nunca inventes precios.
4. Si un plato tiene varios tamaños o variantes con precios distintos, crea una entrada por cada uno y agrega el tamaño al nombre (ej. "Pollo a la brasa (1/4)").
5. "descripcion" es el texto descriptivo del plato si existe; si no existe, "".
6. Los platos que no estén bajo ninguna categoría van en la categoría "Otros".
7. "moneda" es el código ISO de la moneda de la carta; por defecto "PEN".
8. No incluyas como platos: títulos, nombre del local, horarios, direcciones, teléfonos, redes sociales ni notas generales.`;

/** Paso 2: comparar lo leído con la carta existente. Solo puede emparejar nombres, no agregar platos. */
const PROMPT_COMPARACION = `Comparas los platos y categorías recién leídos de una carta con los que el restaurante YA tiene registrados.
Responde SOLO con JSON válido, sin texto adicional y sin bloques de código, con esta forma exacta:
{"categorias":[{"leida":"Pollos a la leña","existente":"Pollo a la leña"}],"platos":[{"i":0,"existente":null}]}

Reglas:
1. "existente" debe ser EXACTAMENTE uno de los nombres de las listas de existentes, o null.
2. Una categoría leída corresponde a una existente solo si significa lo mismo (mayúsculas, tildes o singular/plural distintos).
3. Un plato leído corresponde a uno existente solo si es el mismo plato aunque esté escrito distinto (ej. "Cebiche de pescado" = "Ceviche de pescado"). Platos diferentes que solo comparten un ingrediente NO corresponden.
4. Devuelve una entrada por cada categoría leída y por cada plato leído (usa su "i").`;

/** Quita bloques ```json y toma lo que hay entre la primera "{" y la última "}". */
function extraerJson(respuesta: unknown): unknown {
  if (respuesta && typeof respuesta === 'object') return respuesta;
  if (typeof respuesta !== 'string') return null;
  const limpio = respuesta.replace(/```(?:json)?/gi, '');
  const inicio = limpio.indexOf('{');
  const fin = limpio.lastIndexOf('}');
  if (inicio === -1 || fin <= inicio) return null;
  try {
    return JSON.parse(limpio.slice(inicio, fin + 1));
  } catch {
    return null;
  }
}

/** Nombres que manda la pantalla de revisión (solo se usan como referencia para la IA). */
function leerCatalogo(valor: FormDataEntryValue | null): CatalogoActual {
  const lista = (v: unknown, max: number) =>
    Array.isArray(v)
      ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map(x => x.trim().slice(0, 80)).slice(0, max)
      : [];
  try {
    const obj = JSON.parse(typeof valor === 'string' ? valor : '{}');
    return { categorias: lista(obj.categorias, 80), platos: lista(obj.platos, 400) };
  } catch {
    return { categorias: [], platos: [] };
  }
}

/**
 * Pide a la IA que empareje lo leído con la carta existente (categorías equivalentes y platos
 * parecidos). Si falla, se sigue solo con la comparación por nombre: no debe impedir la lectura.
 */
async function compararConCatalogo(carta: CartaLeida, catalogo: CatalogoActual): Promise<CartaLeida> {
  if (catalogo.platos.length === 0 && catalogo.categorias.length === 0) return carta;
  try {
    const respuesta = await ejecutarModelo(
      [
        { role: 'system', content: PROMPT_COMPARACION },
        { role: 'user', content: JSON.stringify(datosParaComparar(carta, catalogo)) },
      ],
      { maxTokens: 2048 },
    );
    const json = extraerJson(respuesta);
    return json ? aplicarComparacion(carta, json, catalogo) : carta;
  } catch (err) {
    console.error('[IA] leer-carta: no se pudo comparar con la carta existente', err);
    return carta;
  }
}

const error = (status: number, mensaje: string) => NextResponse.json({ error: mensaje }, { status });

/**
 * Lee una carta (foto o PDF) con Cloudflare Workers AI y devuelve categorías y platos para que el
 * usuario los revise. NO guarda nada: la importación se confirma desde la pantalla de revisión.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return error(401, 'No autorizado.');

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return error(400, 'No se recibió ningún archivo.');
  }

  const archivo = form.get('archivo');
  if (!(archivo instanceof File) || archivo.size === 0) return error(400, 'No se recibió ningún archivo.');
  if (archivo.size > MAX_BYTES_ARCHIVO) return error(413, 'El archivo pesa más de 10 MB. Sube uno más liviano.');

  const esPdf = archivo.type === TIPO_PDF || /\.pdf$/i.test(archivo.name);
  const esImagen = (TIPOS_IMAGEN as readonly string[]).includes(archivo.type);
  if (!esPdf && !esImagen) return error(415, 'Formato no soportado. Sube una foto (JPG, PNG o WEBP) o un PDF.');

  const catalogo = leerCatalogo(form.get('catalogo'));

  try {
    let contenidoUsuario: MensajeIA['content'];

    if (esPdf) {
      const texto = await pdfATexto(archivo, archivo.name);
      if (texto.replace(/\s+/g, '').length < MIN_CARACTERES_PDF) {
        return error(422, 'Este PDF parece escaneado (no tiene texto que se pueda leer). Sube fotos de la carta en su lugar.');
      }
      contenidoUsuario = `Extrae la carta de este texto:\n\n${texto.slice(0, MAX_CARACTERES_PDF)}`;
    } else {
      const base64 = Buffer.from(await archivo.arrayBuffer()).toString('base64');
      contenidoUsuario = [
        { type: 'text', text: 'Extrae la carta de esta imagen.' },
        { type: 'image_url', image_url: { url: `data:${archivo.type};base64,${base64}` } },
      ];
    }

    const respuesta = await ejecutarModelo([
      { role: 'system', content: PROMPT_LECTURA },
      { role: 'user', content: contenidoUsuario },
    ]);

    const json = extraerJson(respuesta);
    if (!json) {
      console.error('[IA] leer-carta: la respuesta no es JSON válido:', String(respuesta).slice(0, 500));
      return error(502, 'La IA no pudo interpretar la carta. Intenta con una foto más nítida, de frente y con buena luz.');
    }

    let carta = normalizarCartaLeida(json, catalogo);
    if (carta.categorias.length === 0) {
      return error(422, 'No encontramos platos ni precios en este archivo. Verifica que sea una foto o PDF de tu carta; si lo es, prueba con una foto más nítida y de frente.');
    }
    carta = await compararConCatalogo(carta, catalogo);
    return NextResponse.json(carta);
  } catch (err) {
    if (err instanceof ErrorIA) return error(err.status, err.message);
    console.error('[IA] leer-carta: error inesperado', err);
    return error(500, 'Ocurrió un error al leer la carta. Intenta de nuevo.');
  }
}

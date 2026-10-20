/**
 * Cliente mínimo de Cloudflare Workers AI (REST, sin SDK). Solo se importa desde rutas del
 * servidor (/api/leer-carta): el token nunca llega al navegador.
 */

export const MODELO_CARTA = '@cf/mistralai/mistral-small-3.1-24b-instruct';

/** Error con un mensaje listo para mostrar al usuario y el status HTTP que debe devolver la ruta. */
export class ErrorIA extends Error {
  constructor(public status: number, mensaje: string) {
    super(mensaje);
  }
}

export type ContenidoMensaje =
  | string
  | ({ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } })[];

export interface MensajeIA {
  role: 'system' | 'user' | 'assistant';
  content: ContenidoMensaje;
}

interface RespuestaCloudflare<T> {
  success?: boolean;
  result?: T;
  errors?: { code?: number; message?: string }[];
}

function configuracion() {
  const cuenta = process.env.CLOUDFLARE_ACCOUNT_ID_AI?.trim().replace(/^"|"$/g, '');
  const token = process.env.CLOUDFLARE_AI_TOKEN?.trim().replace(/^"|"$/g, '');
  if (!cuenta || !token) {
    console.error('[IA] Faltan CLOUDFLARE_ACCOUNT_ID_AI o CLOUDFLARE_AI_TOKEN en el entorno.');
    throw new ErrorIA(500, 'La lectura con IA no está configurada en el servidor.');
  }
  return { base: `https://api.cloudflare.com/client/v4/accounts/${cuenta}/ai`, token };
}

/** Cuota diaria gratuita agotada (Workers AI responde 429 / código 4006 / "daily free allocation"). */
function esLimiteDiario(status: number, errores: RespuestaCloudflare<unknown>['errors']) {
  const texto = (errores ?? []).map(e => `${e.code ?? ''} ${e.message ?? ''}`).join(' ');
  return status === 429 || /\b4006\b|daily free allocation|neurons|quota/i.test(texto);
}

async function llamar<T>(url: string, init: RequestInit, operacion: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (err) {
    console.error(`[IA] ${operacion}: no se pudo conectar con Cloudflare`, err);
    throw new ErrorIA(502, 'No se pudo conectar con el servicio de IA. Revisa tu conexión e intenta de nuevo.');
  }

  const data = (await res.json().catch(() => null)) as RespuestaCloudflare<T> | null;
  if (!res.ok || !data?.success || data.result === undefined) {
    console.error(`[IA] ${operacion}: Cloudflare respondió ${res.status}`, JSON.stringify(data?.errors ?? data));
    if (esLimiteDiario(res.status, data?.errors)) {
      throw new ErrorIA(429, 'Se alcanzó el límite diario de lectura con IA, intenta más tarde.');
    }
    throw new ErrorIA(502, 'El servicio de IA no pudo procesar el archivo. Intenta de nuevo en unos minutos.');
  }
  return data.result;
}

/** Ejecuta el modelo y devuelve su respuesta (texto u objeto, según lo que entregue Cloudflare). */
export async function ejecutarModelo(mensajes: MensajeIA[], opciones?: { maxTokens?: number; temperatura?: number }) {
  const { base, token } = configuracion();
  const resultado = await llamar<{ response?: unknown }>(
    `${base}/run/${MODELO_CARTA}`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: mensajes,
        max_tokens: opciones?.maxTokens ?? 4096,
        temperature: opciones?.temperatura ?? 0.1,
      }),
    },
    'run',
  );
  return resultado.response;
}

/**
 * Convierte un PDF a texto con /tomarkdown. Devuelve solo el contenido de las páginas
 * (Cloudflare antepone un bloque "## Metadata" que no es parte de la carta).
 */
export async function pdfATexto(archivo: Blob, nombre: string): Promise<string> {
  const { base, token } = configuracion();
  const form = new FormData();
  form.append('files', archivo, nombre || 'carta.pdf');
  const resultado = await llamar<{ data?: string }[]>(
    `${base}/tomarkdown`,
    { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form },
    'tomarkdown',
  );
  const markdown = resultado[0]?.data ?? '';
  const indiceContenido = markdown.indexOf('## Contents');
  const contenido = indiceContenido >= 0 ? markdown.slice(indiceContenido + '## Contents'.length) : markdown;
  return contenido
    .split('\n')
    .filter(linea => !/^#{1,6}\s*Page\s+\d+\s*$/i.test(linea.trim()))
    .join('\n')
    .trim();
}

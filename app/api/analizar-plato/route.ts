import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

const PROMPT = `Analiza esta foto y determina si muestra un plato de comida, un postre o una bebida (de cualquier tipo de cocina, no solo peruana).

Si NO muestra comida ni bebida (por ejemplo: personas, objetos, paisajes, documentos, pantallas), responde ÚNICAMENTE: {"error": "no_food"}

Si SÍ muestra comida o bebida, responde ÚNICAMENTE con un JSON (sin markdown, sin texto adicional) con esta forma exacta:
{"name": "Nombre del plato en español, apetitoso y descriptivo", "description": "Descripción apetitosa de 1-2 frases con ingredientes o preparación visibles", "category": "la más parecida entre: Entradas, Platos de fondo, Bebidas, Postres, Promociones"}
El campo "category" es obligatorio y SIEMPRE debe ser una de esas 5 opciones, elige la más cercana aunque el plato no sea peruano.`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'invalid_form' }, { status: 400 });
  }

  const file = form.get('image');
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'missing_image' }, { status: 400 });
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: 'image_too_large' }, { status: 400 });
  }
  const mimeType = file.type || 'image/jpeg';
  if (!mimeType.startsWith('image/')) {
    return NextResponse.json({ error: 'invalid_type' }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const base64 = bytes.toString('base64');

  let geminiRes: Response;
  try {
    geminiRes = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: PROMPT },
            { inline_data: { mime_type: mimeType, data: base64 } },
          ],
        }],
        generationConfig: { response_mime_type: 'application/json', temperature: 0.4 },
      }),
    });
  } catch {
    return NextResponse.json({ error: 'ai_unreachable' }, { status: 502 });
  }

  if (!geminiRes.ok) {
    return NextResponse.json({ error: 'ai_request_failed' }, { status: 502 });
  }

  const data = await geminiRes.json();
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    return NextResponse.json({ error: 'ai_empty_response' }, { status: 502 });
  }

  let parsed: { name?: string; description?: string; category?: string; error?: string };
  try {
    parsed = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: 'ai_bad_json' }, { status: 502 });
  }

  if (parsed.error === 'no_food' || !parsed.name) {
    return NextResponse.json({ error: 'no_food_detected' }, { status: 422 });
  }

  return NextResponse.json({
    name: parsed.name,
    description: parsed.description ?? '',
    category: parsed.category ?? '',
  });
}

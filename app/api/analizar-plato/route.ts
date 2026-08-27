import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

const PROMPT = `Eres un chef peruano e inspector gastronómico experto. Analiza la imagen y reconoce el plato, bebida o postre.

REGLAS DE ORO PARA EL NOMBRE EN "name":
1. Usa el NOMBRE CULINARIO Y TRADICIONAL PERUANO O INTERNACIONAL DEL PLATO.
   - Si ves carne de res en tiras salteada con cebolla, tomate, papas fritas y arroz ➔ "Lomo Saltado" (¡NUNCA "Arroz con carne", ni "Carne con verduras"!).
   - Si ves pescado en cubos marinado con limón, cebolla roja, choclo y camote ➔ "Ceviche de Pescado" o "Ceviche Mixto".
   - Si ves arroz verde o amarillo con pollo/mariscos ➔ "Arroz con Pollo" o "Arroz con Mariscos".
   - Si ves pollo horneado/asado con papas y ensalada ➔ "Pollo a la Brasa".
   - Si ves papa prensada de color amarillo rellena ➔ "Causa Rellena".
   - Si ves papa con crema amarilla de ají ➔ "Papa a la Huancaína".
   - Si ves pechuga desmenuzada en crema de ají amarillo ➔ "Ají de Gallina".
   - Si ves carne guisada en salsa verde de culantro ➔ "Seco de Res".
   - Si ves fideos salteados al wok con tiras de carne ➔ "Tallarín Saltado".
   - Si ves fideos con salsa verde de albahaca y bistec ➔ "Tallarines Verdes con Bistec".
   - Si ves arroz frito oriental con carne o pollo ➔ "Arroz Chaufa de Pollo" o "Arroz Chaufa de Carne".
   - Si ves aros fritos bañados en chancaca/miel ➔ "Picarones".
   - Si ves bebida morada ➔ "Chicha Morada" o copa con espuma ➔ "Pisco Sour".

2. PROHIBICIÓN ABSOLUTA: JAMÁS uses listas descriptivas de ingredientes como el nombre ("Arroz con carne", "Trozos de res", "Plato con papa"). Pon SIEMPRE la denominación oficial del plato comercial.

REGLAS PARA LA CATEGORÍA "category":
- DEBE SER ESTRUCTURADAMENTE UNA DE ESTAS 5 OPCIONES EXACTAS:
  - "Platos de fondo": Lomo Saltado, Seco de Res, Arroz Chaufa, Pollo a la Brasa, Tallarines, platos principales.
  - "Entradas": Ceviches, Causa Rellena, Papa a la Huancaína, Tequeños, Sopas, Ensaladas.
  - "Bebidas": Chicha Morada, Pisco Sour, Jugos, Gaseosas, Cervezas.
  - "Postres": Picarones, Suspiro a la Limeña, Mazamorra, Tortas, Helados.
  - "Promociones": Combos o paquetes de varios productos.

REGLAS PARA LA DESCRIPCIÓN "description":
- Redacta una sola oración apetitosa de carta de restaurante resaltando sazón e ingredientes.

FORMATO DE RESPUESTA JSON:
- Si NO es comida o bebida: {"error": "no_food"}
- Si SÍ es comida o bebida, responde ÚNICAMENTE este JSON:
{"name": "Lomo Saltado", "description": "Trozos de lomo de res salteados al wok con cebolla, tomate y ají, acompañados de crujientes papas fritas y arroz blanco.", "category": "Platos de fondo"}`;

export async function POST(req: NextRequest) {
  const accountId = (process.env.CLOUDFLARE_AI_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID)?.trim().replace(/"/g, '');
  const apiToken = (process.env.CLOUDFLARE_AI_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN)?.trim().replace(/"/g, '');

  if (!apiToken || !accountId) {
    return NextResponse.json(
      { error: 'server_misconfigured', message: 'Falta CLOUDFLARE_AI_ACCOUNT_ID o CLOUDFLARE_AI_API_TOKEN en .env.local' },
      { status: 500 }
    );
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

  const arrayBuffer = await file.arrayBuffer();
  const imageBytes = Array.from(new Uint8Array(arrayBuffer));

  const model = '@cf/meta/llama-3.2-11b-vision-instruct';

  try {
    let cfRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageBytes,
          prompt: PROMPT,
        }),
      }
    );

    let data = await cfRes.json();

    // Si Cloudflare solicita el acuerdo de licencia del modelo Llama 3.2
    if (data?.errors?.[0]?.code === 5016 && data?.errors?.[0]?.message?.includes("submit the prompt 'agree'")) {
      await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prompt: 'agree' }),
        }
      );

      // Reintentar la llamada tras enviar el acuerdo
      cfRes = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image: imageBytes,
            prompt: PROMPT,
          }),
        }
      );
      data = await cfRes.json();
    }

    if (!cfRes.ok || !data.success) {
      console.error('[Cloudflare AI Error]', cfRes.status, data);
      return NextResponse.json({ error: 'ai_request_failed', detail: JSON.stringify(data.errors) }, { status: 502 });
    }

    const rawResponse = data?.result?.response;
    let rawText = '';
    if (typeof rawResponse === 'string') {
      rawText = rawResponse;
    } else if (typeof rawResponse === 'object' && rawResponse !== null) {
      rawText = JSON.stringify(rawResponse);
    } else {
      rawText = JSON.stringify(data.result ?? {});
    }

    let parsedResult: { name?: string; description?: string; category?: string; error?: string } | null = null;

    try {
      const cleaned = rawText.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim();
      const firstJsonStart = cleaned.indexOf('{');
      const lastJsonEnd = cleaned.lastIndexOf('}');
      if (firstJsonStart !== -1 && lastJsonEnd !== -1) {
        const jsonStr = cleaned.slice(firstJsonStart, lastJsonEnd + 1);
        parsedResult = JSON.parse(jsonStr);
      }
    } catch (err) {
      console.error('[Cloudflare AI Parse Error]', err, rawText);
    }

    if (!parsedResult || (!parsedResult.name && !parsedResult.error)) {
      return NextResponse.json({ error: 'ai_request_failed', raw: rawText }, { status: 502 });
    }

    if (parsedResult.error === 'no_food' || !parsedResult.name) {
      return NextResponse.json({ error: 'no_food_detected' }, { status: 422 });
    }

    return NextResponse.json({
      name: parsedResult.name,
      description: parsedResult.description ?? '',
      category: parsedResult.category ?? '',
    });
  } catch (err) {
    console.error('[Cloudflare AI Fetch Catch]', err);
    return NextResponse.json({ error: 'ai_unreachable' }, { status: 502 });
  }
}

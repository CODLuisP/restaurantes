import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

/** Proxy server-side hacia Cloudflare Images: las credenciales nunca llegan al cliente. */
export async function POST(req: NextRequest) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !apiToken) {
    return NextResponse.json(
      { ok: false, error: 'Cloudflare no está configurado en el servidor.' },
      { status: 500 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: 'Formulario inválido.' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof Blob)) {
    return NextResponse.json({ ok: false, error: 'No se recibió ningún archivo.' }, { status: 400 });
  }

  const cfForm = new FormData();
  cfForm.append('file', file, 'producto.jpg');

  let cfRes: Response;
  try {
    cfRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiToken}` },
      body: cfForm,
    });
  } catch {
    return NextResponse.json({ ok: false, error: 'No se pudo conectar con Cloudflare.' }, { status: 502 });
  }

  const data = await cfRes.json();
  if (!data.success) {
    return NextResponse.json(
      { ok: false, error: JSON.stringify(data.errors ?? data.messages ?? 'Error desconocido.') },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, url: data.result.variants[0] as string, imageId: data.result.id as string });
}

export async function DELETE(req: NextRequest) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !apiToken) {
    return NextResponse.json(
      { ok: false, error: 'Cloudflare no está configurado en el servidor.' },
      { status: 500 },
    );
  }

  let body: { imageId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON inválido.' }, { status: 400 });
  }

  if (!body.imageId) {
    return NextResponse.json({ ok: false, error: 'imageId requerido.' }, { status: 400 });
  }

  try {
    const cfRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1/${body.imageId}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${apiToken}` } },
    );
    const data = await cfRes.json();
    if (!data.success) {
      return NextResponse.json({ ok: false, error: JSON.stringify(data.errors) }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: 'No se pudo conectar con Cloudflare.' }, { status: 502 });
  }
}

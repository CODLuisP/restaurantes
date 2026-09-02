export const runtime = 'nodejs';

/**
 * Envía el PDF de un comprobante por WhatsApp a uno o varios números.
 *
 * En producción, sube el PDF y lo envía a través de una pasarela de WhatsApp (subida + envío de
 * documento) configurada por variables de entorno. Si no hay pasarela configurada, opera en
 * MODO DEMO simulando el envío.
 */

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const to = String(form.get('to') ?? '');
    const mensaje = String(form.get('mensaje') ?? '');
    const numero = String(form.get('numero') ?? 'comprobante');
    const pdf = form.get('pdf');

    const destinatarios = to.split(',').map(s => s.trim()).filter(Boolean);
    if (destinatarios.length === 0) {
      return Response.json({ ok: false, error: 'Ingresa al menos un número válido.' }, { status: 400 });
    }
    const invalidos = destinatarios.filter(d => !/^\d{9}$/.test(d.replace(/^51/, '')));
    if (invalidos.length > 0) {
      return Response.json({ ok: false, error: `Número inválido (9 dígitos): ${invalidos.join(', ')}` }, { status: 400 });
    }
    if (!(pdf instanceof Blob)) {
      return Response.json({ ok: false, error: 'Falta el PDF del comprobante.' }, { status: 400 });
    }

    const baseUrl = process.env.WHATSAPP_API_URL;
    const apiKey = process.env.WHATSAPP_API_KEY;

    if (!baseUrl || !apiKey) {
      // ── Modo demo: simula el envío sin pasarela real configurada ──
      return Response.json({ ok: true, enviados: destinatarios, fallidos: [], simulated: true });
    }

    const uploadForm = new FormData();
    uploadForm.append('file', pdf, `${numero}.pdf`);
    const resUpload = await fetch(`${baseUrl}/api/upload`, {
      method: 'POST',
      headers: { 'x-api-key': apiKey },
      body: uploadForm,
    });
    if (!resUpload.ok) {
      return Response.json({ ok: false, error: 'No se pudo subir el PDF a la pasarela de WhatsApp.' }, { status: 502 });
    }
    const uploadData = await resUpload.json().catch(() => null);
    const fileUrl = uploadData?.datos?.url;
    if (!fileUrl) {
      return Response.json({ ok: false, error: 'La pasarela no devolvió la URL del archivo.' }, { status: 502 });
    }

    const resultados = await Promise.allSettled(
      destinatarios.map(async numeroDestino => {
        const digits = numeroDestino.replace(/\D/g, '');
        const formateado = digits.startsWith('51') ? digits : `51${digits}`;
        const res = await fetch(`${baseUrl}/api/send/single`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
          body: JSON.stringify({
            phone: formateado,
            type: 'documento',
            file_url: fileUrl,
            filename: `${numero}.pdf`,
            mime_type: 'application/pdf',
            text: mensaje,
          }),
        });
        if (!res.ok) throw new Error(numeroDestino);
      })
    );

    const fallidos = resultados
      .map((r, i) => (r.status === 'rejected' ? destinatarios[i] : null))
      .filter((v): v is string => v !== null);
    const enviados = destinatarios.filter(d => !fallidos.includes(d));

    if (enviados.length === 0) {
      return Response.json({ ok: false, error: 'No se pudo enviar a ningún número.', fallidos }, { status: 502 });
    }
    return Response.json({ ok: true, enviados, fallidos });
  } catch {
    return Response.json({ ok: false, error: 'Error interno al enviar por WhatsApp.' }, { status: 500 });
  }
}

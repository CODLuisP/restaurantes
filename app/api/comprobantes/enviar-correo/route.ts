export const runtime = 'nodejs';

/**
 * Envía el PDF de un comprobante por correo a uno o varios destinatarios.
 *
 * En producción, reenvía a un proveedor de email transaccional (Resend) configurado por
 * variables de entorno. Si no hay proveedor configurado, opera en MODO DEMO simulando el envío.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const to = String(form.get('to') ?? '');
    const subject = String(form.get('subject') ?? 'Comprobante electrónico');
    const bodyText = String(form.get('bodyText') ?? '');
    const numero = String(form.get('numero') ?? 'comprobante');
    const pdf = form.get('pdf');

    const destinatarios = to.split(',').map(s => s.trim()).filter(Boolean);
    if (destinatarios.length === 0) {
      return Response.json({ ok: false, error: 'Ingresa al menos un correo válido.' }, { status: 400 });
    }
    const invalidos = destinatarios.filter(d => !EMAIL_RE.test(d));
    if (invalidos.length > 0) {
      return Response.json({ ok: false, error: `Correo inválido: ${invalidos.join(', ')}` }, { status: 400 });
    }
    if (!(pdf instanceof Blob)) {
      return Response.json({ ok: false, error: 'Falta el PDF del comprobante.' }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;

    if (!apiKey || !from) {
      // ── Modo demo: simula el envío sin proveedor real configurado ──
      return Response.json({ ok: true, enviados: destinatarios, fallidos: [], simulated: true });
    }

    const pdfBase64 = Buffer.from(await pdf.arrayBuffer()).toString('base64');

    const resultados = await Promise.allSettled(
      destinatarios.map(async email => {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from,
            to: email,
            subject,
            html: `<p>${bodyText.replace(/\n/g, '<br/>')}</p>`,
            attachments: [{ filename: `${numero}.pdf`, content: pdfBase64 }],
          }),
        });
        if (!res.ok) throw new Error(email);
      })
    );

    const fallidos = resultados
      .map((r, i) => (r.status === 'rejected' ? destinatarios[i] : null))
      .filter((v): v is string => v !== null);
    const enviados = destinatarios.filter(d => !fallidos.includes(d));

    if (enviados.length === 0) {
      return Response.json({ ok: false, error: 'No se pudo enviar a ningún destinatario.', fallidos }, { status: 502 });
    }
    return Response.json({ ok: true, enviados, fallidos });
  } catch {
    return Response.json({ ok: false, error: 'Error interno al enviar el correo.' }, { status: 500 });
  }
}

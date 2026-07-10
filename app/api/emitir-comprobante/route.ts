import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Emisión de comprobante electrónico (Boleta / Factura).
 *
 * En producción, este endpoint reenvía el comprobante a un proveedor OSE/SUNAT
 * (Nubefact, Facturactiva, SUNAT SOL, etc.) configurado por variables de entorno.
 * Si no hay proveedor configurado, opera en MODO DEMO simulando la aceptación.
 */

interface Body {
  docType?: 'Boleta' | 'Factura';
  total?: number;
  customer?: { type?: 'DNI' | 'RUC'; number?: string; name?: string };
  items?: { name: string; quantity: number; price: number }[];
}

const onlyDigits = (s: string) => s.replace(/\D/g, '');

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const { docType, customer } = body;

  if (docType !== 'Boleta' && docType !== 'Factura') {
    return NextResponse.json({ ok: false, error: 'invalid_doc_type' }, { status: 400 });
  }

  /* ── Validaciones tributarias mínimas ──────────────────────── */
  if (docType === 'Factura') {
    const ruc = onlyDigits(customer?.number ?? '');
    if (ruc.length !== 11) {
      return NextResponse.json({ ok: false, error: 'ruc_invalido' }, { status: 422 });
    }
    if (!customer?.name?.trim()) {
      return NextResponse.json({ ok: false, error: 'razon_social_requerida' }, { status: 422 });
    }
  }
  if (docType === 'Boleta' && customer?.number) {
    const dni = onlyDigits(customer.number);
    if (dni.length !== 8) {
      return NextResponse.json({ ok: false, error: 'dni_invalido' }, { status: 422 });
    }
  }

  /* ── Integración real con proveedor OSE/SUNAT ──────────────── */
  const providerUrl = process.env.SUNAT_API_URL;
  const providerToken = process.env.SUNAT_API_TOKEN;

  if (providerUrl && providerToken) {
    try {
      const res = await fetch(providerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${providerToken}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        return NextResponse.json({ ok: false, error: 'provider_error' }, { status: 502 });
      }
      const data = await res.json();
      return NextResponse.json({ ok: true, status: 'ACEPTADO', ...data });
    } catch {
      return NextResponse.json({ ok: false, error: 'provider_unreachable' }, { status: 502 });
    }
  }

  /* ── Modo demo: simula la aceptación de SUNAT ──────────────── */
  const hash = Math.random().toString(36).slice(2, 12).toUpperCase();
  return NextResponse.json({
    ok: true,
    status: 'ACEPTADO',
    hash,
    issuedAt: new Date().toISOString(),
    simulated: true,
  });
}

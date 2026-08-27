export async function POST(request: Request) {
  try {
    const { ruc } = await request.json();
    if (!ruc || String(ruc).length !== 11) {
      return Response.json({ success: false, error: 'RUC inválido (debe tener 11 dígitos).' }, { status: 400 });
    }

    const res = await fetch('https://api.json.pe/api/ruc', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.JSONPE_API_KEY ?? ''}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ruc: String(ruc) }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) {
      return Response.json({ success: false, error: data?.message || 'No se pudo consultar el RUC.' }, { status: 502 });
    }

    return Response.json(data);
  } catch {
    return Response.json({ success: false, error: 'Error interno al consultar RUC.' }, { status: 500 });
  }
}

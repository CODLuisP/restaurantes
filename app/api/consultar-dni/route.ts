export async function POST(request: Request) {
  try {
    const { dni } = await request.json();
    if (!dni || String(dni).length !== 8) {
      return Response.json({ success: false, error: 'DNI inválido (debe tener 8 dígitos).' }, { status: 400 });
    }

    const res = await fetch('https://api.json.pe/api/dni', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.JSONPE_API_KEY ?? ''}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ dni: String(dni) }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) {
      return Response.json({ success: false, error: data?.message || 'No se pudo consultar el DNI.' }, { status: 502 });
    }

    return Response.json(data);
  } catch {
    return Response.json({ success: false, error: 'Error interno al consultar DNI.' }, { status: 500 });
  }
}

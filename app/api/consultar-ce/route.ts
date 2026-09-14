export async function POST(request: Request) {
  try {
    const { ce } = await request.json();
    if (!ce || String(ce).length !== 9) {
      return Response.json({ success: false, error: 'Carnet de Extranjería inválido (debe tener 9 dígitos).' }, { status: 400 });
    }

    const res = await fetch('https://api.json.pe/api/ce', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.JSONPE_API_KEY ?? ''}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ce: String(ce) }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) {
      return Response.json({ success: false, error: data?.message || 'No se pudo consultar el Carnet de Extranjería.' }, { status: 502 });
    }

    return Response.json(data);
  } catch {
    return Response.json({ success: false, error: 'Error interno al consultar el Carnet de Extranjería.' }, { status: 500 });
  }
}

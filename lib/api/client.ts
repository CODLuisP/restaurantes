const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5004';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  token?: string | null;
  body?: unknown;
}

/** Llama directo al backend RestaurantesAPI desde el cliente. El backend ya trae CORS abierto. */
export async function apiFetch<T>(path: string, { token, headers, body, ...init }: ApiFetchOptions = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (res.status === 204) return undefined as T;

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const message = (data && (data.message as string)) || `Error ${res.status} al conectar con el servidor.`;
    throw new ApiError(message, res.status);
  }

  return data as T;
}

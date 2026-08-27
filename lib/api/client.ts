const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5004';

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
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
    const validationErrors = data?.errors && typeof data.errors === 'object'
      ? Object.values(data.errors as Record<string, unknown>).flatMap(value => Array.isArray(value) ? value : [value]).join(' ')
      : '';
    const message = (data && typeof data.message === 'string' && data.message)
      || (data && typeof data.detail === 'string' && data.detail)
      || (data && typeof data.title === 'string' && data.title)
      || validationErrors
      || `Error ${res.status} al conectar con el servidor.`;
    throw new ApiError(message, res.status, data);
  }

  return data as T;
}

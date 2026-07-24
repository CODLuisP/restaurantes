import { apiFetch } from './client';

export interface TicketsConfigDto {
  clienteJson?: string | null;
  cocinaJson?: string | null;
  paperSize: string;
}

export interface UpdateTicketsConfigDto {
  clienteJson?: string | null;
  cocinaJson?: string | null;
  paperSize?: string | null;
}

export function getTicketsConfig(token: string) {
  return apiFetch<TicketsConfigDto | null>('/api/tickets-config', { token });
}

export function updateTicketsConfig(token: string, dto: UpdateTicketsConfigDto) {
  return apiFetch<TicketsConfigDto>('/api/tickets-config', { token, method: 'PUT', body: dto });
}

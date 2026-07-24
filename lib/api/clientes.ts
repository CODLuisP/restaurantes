import { apiFetch } from './client';
import type {
  Cliente,
  CreateClienteDto,
  UpdateClienteDto,
  CreateClienteDireccionDto,
  UpdateClienteDireccionDto,
  ImportarClientesDto,
  ImportarResultadoDto,
} from '@/types/clientes';

export function getClientes(token: string) {
  return apiFetch<Cliente[]>('/api/clientes', { token });
}

export function getClienteById(token: string, id: number) {
  return apiFetch<Cliente>(`/api/clientes/${id}`, { token });
}

export function createCliente(token: string, dto: CreateClienteDto) {
  return apiFetch<Cliente>('/api/clientes', { token, method: 'POST', body: dto });
}

export function updateCliente(token: string, id: number, dto: UpdateClienteDto) {
  return apiFetch<Cliente>(`/api/clientes/${id}`, { token, method: 'PUT', body: dto });
}

export function deleteCliente(token: string, id: number) {
  return apiFetch<void>(`/api/clientes/${id}`, { token, method: 'DELETE' });
}

export function importarClientes(token: string, dto: ImportarClientesDto) {
  return apiFetch<ImportarResultadoDto>('/api/clientes/importar', { token, method: 'POST', body: dto });
}

export function agregarDireccionCliente(token: string, clienteId: number, dto: CreateClienteDireccionDto) {
  return apiFetch<void>(`/api/clientes/${clienteId}/agregar`, { token, method: 'POST', body: dto });
}

export function editarDireccionCliente(token: string, clienteId: number, direccionId: number, dto: UpdateClienteDireccionDto) {
  return apiFetch<void>(`/api/clientes/${clienteId}/editar/${direccionId}`, { token, method: 'PUT', body: dto });
}

export function eliminarDireccionCliente(token: string, clienteId: number, direccionId: number) {
  return apiFetch<void>(`/api/clientes/${clienteId}/direcciones/${direccionId}`, { token, method: 'DELETE' });
}

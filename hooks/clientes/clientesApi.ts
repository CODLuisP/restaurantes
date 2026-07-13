const BASE = process.env.NEXT_PUBLIC_API_URL;

export const CLIENTES_API = {
  getAll:   ()                          => `${BASE}/api/clientes`,
  getById:  (id: number)                => `${BASE}/api/clientes/${id}`,
  create:   ()                          => `${BASE}/api/clientes`,
  update:   (id: number)                => `${BASE}/api/clientes/${id}`,
  delete:   (id: number)                => `${BASE}/api/clientes/${id}`,
  importar: ()                          => `${BASE}/api/clientes/importar`,
};

export const DIRECCIONES_API = {
  agregar:  (clienteId: number)                    => `${BASE}/api/clientes/${clienteId}/agregar`,
  editar:   (clienteId: number, id: number)        => `${BASE}/api/clientes/${clienteId}/editar/${id}`,
  eliminar: (clienteId: number, id: number)        => `${BASE}/api/clientes/${clienteId}/direcciones/${id}`,
};

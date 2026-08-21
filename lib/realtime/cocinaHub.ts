import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5004';

let connection: HubConnection | null = null;
let currentToken: string | null = null;

/** Conexión SignalR única por sesión (compartida entre todos los hooks que la usan en la pestaña). */
export function getCocinaConnection(token: string): HubConnection {
  if (connection && currentToken === token) return connection;

  if (connection) {
    connection.stop();
  }

  currentToken = token;
  connection = new HubConnectionBuilder()
    .withUrl(`${API_URL}/hubs/cocina`, { accessTokenFactory: () => token })
    .withAutomaticReconnect()
    .configureLogging(LogLevel.Warning)
    .build();

  connection.start().catch(err => console.error('No se pudo conectar al hub de cocina:', err));

  return connection;
}

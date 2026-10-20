import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel, type ILogger } from '@microsoft/signalr';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5004';

/** Espera entre reintentos: rápido al principio y luego cada 30 s, sin rendirse nunca. */
const ESPERAS_MS = [0, 2_000, 5_000, 10_000, 30_000];
const esperaReintento = (intento: number) => ESPERAS_MS[Math.min(intento, ESPERAS_MS.length - 1)];

/**
 * Los cortes del WebSocket (red inestable, la PC en reposo, el servidor que se reinicia) son
 * normales y la conexión se recupera sola: se registran como aviso y no como error de la app.
 */
const registro: ILogger = {
  log(nivel, mensaje) {
    if (nivel >= LogLevel.Warning) console.warn('[Tiempo real]', mensaje);
  },
};

let connection: HubConnection | null = null;
let currentToken: string | null = null;

/** Arranca la conexión y, si el servidor no responde, lo vuelve a intentar mientras siga vigente. */
function iniciar(conexion: HubConnection, intento = 0) {
  conexion.start().catch(err => {
    if (conexion !== connection || conexion.state !== HubConnectionState.Disconnected) return;
    console.warn('[Tiempo real] No se pudo conectar al hub de cocina, reintentando…', err);
    setTimeout(() => {
      if (conexion === connection && conexion.state === HubConnectionState.Disconnected) iniciar(conexion, intento + 1);
    }, esperaReintento(intento + 1));
  });
}

/** Conexión SignalR única por sesión (compartida entre todos los hooks que la usan en la pestaña). */
export function getCocinaConnection(token: string): HubConnection {
  if (connection && currentToken === token) return connection;

  if (connection) {
    connection.stop();
  }

  currentToken = token;
  const nueva = new HubConnectionBuilder()
    .withUrl(`${API_URL}/hubs/cocina`, { accessTokenFactory: () => token })
    .withAutomaticReconnect({ nextRetryDelayInMilliseconds: ctx => esperaReintento(ctx.previousRetryCount) })
    .configureLogging(registro)
    .build();
  connection = nueva;

  // Si la reconexión automática se agota o el servidor cierra la sesión, se vuelve a empezar.
  nueva.onclose(() => {
    if (nueva === connection) setTimeout(() => iniciar(nueva), esperaReintento(1));
  });

  iniciar(nueva);
  return nueva;
}

import type { NextConfig } from 'next';
import { version } from './package.json';

const nextConfig: NextConfig = {
  // Versión del sistema (la del package.json) visible en el login: subir "version" ahí la actualiza.
  env: {
    NEXT_PUBLIC_APP_VERSION: version,
  },
  // Desactivado: en desarrollo, Strict Mode simula un montaje/desmontaje/remontaje
  // extra por cada componente. Las clases legacy de @react-google-maps/api
  // (Circle/Polygon/Marker) no son resilientes a eso: guardan la instancia nativa
  // en this.state y la leen recién en componentWillUnmount, así que ese ciclo extra
  // deja un overlay "fantasma" pegado al mapa para siempre (un círculo/polígono
  // que ya no corresponde a ninguna zona). No afecta producción: Strict Mode no
  // hace nada en el build de producción de React.
  reactStrictMode: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

export default nextConfig;

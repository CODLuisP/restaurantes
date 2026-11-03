import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { QRCodeCanvas } from 'qrcode.react';

/** Genera un QR como data URL PNG sin depender de que haya un componente montado: renderiza un
 *  <QRCodeCanvas> fuera de pantalla, lee su canvas y lo desmonta. Necesario porque el ticket se
 *  arma como HTML plano (sin React) y el contenido del QR recién se conoce tras cobrar. */
export function qrToDataUrl(value: string, size = 200): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-9999px;top:0;pointer-events:none';
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    flushSync(() => {
      root.render(<QRCodeCanvas value={value} size={size} bgColor="#ffffff" fgColor="#000000" level="M" />);
    });
    return host.querySelector('canvas')?.toDataURL('image/png');
  } finally {
    root.unmount();
    host.remove();
  }
}

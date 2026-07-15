/** Sube/borra imágenes de productos en Cloudflare Images a través de /api/upload-imagen. */

/** Redimensiona/comprime la foto en el navegador antes de subirla, para no mandar el archivo original de la cámara (varios MB) a Cloudflare. */
export function resizeImageToBlob(
  file: File,
  maxW: number,
  maxH: number,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (w > maxW) {
          h *= maxW / w;
          w = maxW;
        }
        if (h > maxH) {
          w *= maxH / h;
          h = maxH;
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) =>
            blob
              ? resolve(blob)
              : reject(new Error("No se pudo procesar la imagen.")),
          "image/jpeg",
          quality,
        );
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Extrae el imageId de una URL de Cloudflare Images (https://imagedelivery.net/{hash}/{imageId}/{variant}). */
export function extractCloudflareImageId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname !== "imagedelivery.net") return null;
    const parts = u.pathname.split("/").filter(Boolean);
    return parts.length >= 2 ? parts[parts.length - 2] : null;
  } catch {
    return null;
  }
}

export async function subirImagenProducto(
  blob: Blob,
): Promise<{ url: string; imageId: string }> {
  const fd = new FormData();
  fd.append("file", blob, "producto.jpg");
  const res = await fetch("/api/upload-imagen", { method: "POST", body: fd });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "Error al subir la imagen.");
  return { url: data.url, imageId: data.imageId };
}

/** Borrado en segundo plano: si falla, no bloquea al usuario (queda huérfana en Cloudflare, pero el producto sigue consistente). */
export async function eliminarImagenProductoCloudflare(imageId: string) {
  try {
    await fetch("/api/upload-imagen", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageId }),
    });
  } catch {
    /* fallo silencioso */
  }
}

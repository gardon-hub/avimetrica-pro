import type { NextConfig } from "next";

/**
 * Exportación estática (2026-08-18): la aplicación se publica como sitio
 * estático (GitHub Pages) y TODOS los datos viven en el navegador del
 * usuario (IndexedDB, ver src/lib/local-db.ts). No hay rutas API ni Prisma.
 *
 * NEXT_PUBLIC_BASE_PATH lo fija el workflow de despliegue
 * ("/avimetrica-pro" en GitHub Pages); vacío en desarrollo local.
 *
 * El idioma se resuelve en el cliente (src/components/shell/locale-provider),
 * así que ya no hay plugin de next-intl ni request.ts de servidor.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  reactStrictMode: true,
  // Sin servidor no hay optimizador de imágenes.
  images: { unoptimized: true },
  // /aves → /aves/index.html: la forma que cualquier host estático sirve bien.
  trailingSlash: true,
  ...(basePath ? { basePath } : {}),
};

export default nextConfig;

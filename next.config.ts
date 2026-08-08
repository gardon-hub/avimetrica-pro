import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Auditoría 2026-08-07: se eliminó output "standalone" (era para el hosting
  // original en la nube) y se dejó de ignorar errores de TypeScript en el
  // build: el typecheck ahora es parte de la verificación normal.
  reactStrictMode: true,
};

export default nextConfig;

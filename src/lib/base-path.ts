/**
 * Prefijo de ruta del despliegue (2026-08-18).
 *
 * En GitHub Pages la aplicación no vive en la raíz del dominio sino en
 * /avimetrica-pro. Next aplica `basePath` solo a la navegación y a
 * next/image; todo lo que construye URLs a mano (el registro del service
 * worker, el logo incrustado en los reportes) debe anteponer este prefijo.
 *
 * El valor llega por NEXT_PUBLIC_BASE_PATH en el build de despliegue y es
 * vacío en desarrollo local, donde la app sigue en la raíz.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

/** URL absoluta del logo, para incrustarlo en los reportes imprimibles. */
export function logoUrl(): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}${BASE_PATH}/logo-avimetrica.png`;
}

/**
 * Configuración de idiomas (multilenguaje).
 *
 * DECISIÓN DE DISEÑO: el idioma NO va en la URL (no hay segmento [locale]).
 * Las rutas siguen siendo /aves, /huevos y /estadistica, así que no se rompen
 * el `start_url` del manifiesto PWA, la navegación entre módulos ni la caché
 * del service worker. El idioma elegido vive en una cookie que lee
 * `src/i18n/request.ts` en cada petición.
 *
 * Consecuencia asumida: las páginas pasan de estáticas a renderizadas por
 * petición. En una app local eso no cuesta nada (TTFB medido: 2 ms) y a cambio
 * el HTML llega ya en el idioma correcto, sin parpadeo ni desajuste de
 * hidratación.
 */

export const LOCALES = ['es', 'en', 'pt'] as const;

export type Locale = (typeof LOCALES)[number];

/** Español: es el idioma en el que se escribió la aplicación. */
export const DEFAULT_LOCALE: Locale = 'es';

export const LOCALE_COOKIE = 'avimetrica-locale';

/** Un año: la elección de idioma debe sobrevivir al cierre del navegador. */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Nombre de cada idioma EN SU PROPIO idioma, como manda la convención. */
export const LOCALE_NAMES: Record<Locale, string> = {
  es: 'Español',
  en: 'English',
  pt: 'Português',
};

export function isLocale(value: string | undefined): value is Locale {
  return value !== undefined && (LOCALES as readonly string[]).includes(value);
}

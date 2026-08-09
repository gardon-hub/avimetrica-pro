/**
 * Cómo llega el idioma a los generadores de reportes.
 *
 * Los generadores viven en `lib/` y construyen HTML como cadena, fuera de
 * React: no pueden usar `useTranslations`. En vez de duplicar catálogos o
 * leer una variable global, cada generador RECIBE su traductor como
 * parámetro, y quien lo invoca —siempre un componente cliente— lo obtiene
 * con `useTranslations('reports')` y se lo pasa.
 *
 * Consecuencia buscada: el documento sale en el idioma que el usuario tiene
 * elegido en ese momento, sin que `lib/` sepa nada de cookies ni de React.
 */

/**
 * Traductor sobre la RAÍZ del catálogo, no acotado a `reports`: los reportes
 * necesitan también claves de otros espacios —los créditos del pie, por
 * ejemplo— y acotarlo obligaría a duplicarlas, con el riesgo de que las dos
 * copias diverjan.
 *
 * Se declara con una firma mínima a propósito, para que los generadores no
 * dependan de los tipos internos de next-intl.
 */
export type ReportTranslator = (
  key: string,
  values?: Record<string, string | number>,
) => string;

export interface ReportI18n {
  /** Idioma activo: va al atributo `lang` del documento y a las fechas. */
  locale: string;
  t: ReportTranslator;
}

/**
 * CONVENCIÓN DE ESCAPADO en los generadores, para no tener que adivinar:
 *
 * - Una cadena del catálogo que es TEXTO PLANO se inserta con `esc(...)`.
 * - Una cadena que contiene marcado —`<b>` para enfatizar, o entidades como
 *   `&lt;` en «n &lt; 30»— se inserta CRUDA, sin `esc`, porque escaparla
 *   mostraría las etiquetas literales al lector.
 *
 * Los valores que vienen de datos del usuario (nombres de conjunto, de lote,
 * de granja) se escapan SIEMPRE: son la única entrada no controlada.
 */

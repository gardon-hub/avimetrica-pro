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
 * REGLA DE ORO: los mensajes del espacio `reports` son TEXTO PLANO. Nunca
 * llevan `<b>` ni ninguna otra etiqueta, y siempre se insertan con `esc(...)`.
 *
 * No es una preferencia de estilo. next-intl interpreta cualquier etiqueta
 * dentro de un mensaje como *rich text*, que exige `t.rich` y devuelve nodos
 * de React —inservibles dentro de una plantilla de cadena—. El traductor
 * plano no sabe resolverla y devuelve LA CLAVE LITERAL: el reporte acaba
 * imprimiendo «reports.dataset.shapiro» en mitad del documento. Ocurrió, y no
 * lo detectan typecheck, lint ni las pruebas: solo se ve leyendo el HTML
 * generado.
 *
 * Cuando haga falta resaltar algo, el marcado va en la PLANTILLA, envolviendo
 * el valor o la frase: `<b>${esc(tr('clave'))}</b>`. Si la frase mezcla texto
 * normal y texto resaltado, se parte en dos claves.
 *
 * Los datos del usuario (nombres de conjunto, de lote, de granja) se escapan
 * siempre: son la única entrada no controlada.
 */

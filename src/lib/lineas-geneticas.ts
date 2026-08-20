/**
 * Catálogo de líneas genéticas seleccionables, agrupadas por propósito.
 *
 * FUENTE ÚNICA: el selector principal y el formulario de lote leen de aquí,
 * para que no puedan divergir. Los `value` son los identificadores que
 * entiende diagnostic-engine.ts (getTargetWeight); los `label` son los
 * nombres comerciales, que NO se traducen en ningún idioma.
 *
 * Además de las líneas con curva de referencia, el usuario puede escribir
 * una línea propia (criollas, estirpes locales, líneas sin guía cargada):
 * el análisis completo funciona igual, solo que sin comparación contra el
 * peso objetivo — getTargetWeight devuelve null y la interfaz lo explica.
 */

export interface OpcionLinea {
  value: string;
  label: string;
}

export const LINEAS_ENGORDE: OpcionLinea[] = [
  { value: 'Broiler - Cobb', label: 'Cobb 500' },
  { value: 'Broiler - Ross', label: 'Ross 308' },
  { value: 'Broiler - Hubbard', label: 'Hubbard' },
];

export const LINEAS_POSTURA: OpcionLinea[] = [
  { value: 'Ponedora - Hy-Line Brown', label: 'Hy-Line Brown' },
  { value: 'Ponedora - Hy-Line W-36', label: 'Hy-Line W-36' },
  { value: 'Ponedora - Lohmann Brown', label: 'Lohmann Brown-Classic' },
  { value: 'Ponedora - Lohmann LSL', label: 'Lohmann LSL-Lite' },
  { value: 'Ponedora - Dekalb Brown', label: 'Dekalb Brown' },
  { value: 'Ponedora - Dekalb White', label: 'Dekalb White' },
  { value: 'Ponedora - Nick Brown', label: 'Nick Brown (H&N)' },
  { value: 'Ponedora - Super Nick', label: 'Super Nick (H&N)' },
];

const CONOCIDAS = new Set([...LINEAS_ENGORDE, ...LINEAS_POSTURA].map((l) => l.value));

export function esLineaConocida(valor: string): boolean {
  return CONOCIDAS.has(valor);
}

/** Valor centinela del selector para «otra línea» (nunca se guarda). */
export const OTRA_LINEA = '__otra__';

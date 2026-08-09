/**
 * Formato del valor p, en un solo lugar.
 *
 * Había ocho copias locales de `fmtP` y todas producían «p = < 0.0001»:
 * el mensaje decía «(p = {p})» y el valor pequeño llegaba como «< 0.0001»,
 * con lo que el signo se duplicaba. La regla ahora es:
 *
 * - En una CELDA de tabla (la columna ya se titula «Valor p»): `fmtP`,
 *   que devuelve el valor solo — «0.0032» o «< 0.0001».
 * - En una FRASE o renglón, el mensaje dice «(p {p})» / «valor p {p}» SIN
 *   operador, y el valor lo aporta `fmtPFrase` — «= 0.0032» o «< 0.0001».
 *
 * Ambos devuelven TEXTO PLANO, nunca la entidad `&lt;`: quien lo inserta en
 * HTML lo escapa (ver report-i18n.ts).
 */

/** Valor p para celdas de tabla: «0.0032» o «< 0.0001». */
export function fmtP(p: number): string {
  return p < 0.0001 ? '< 0.0001' : p.toFixed(4);
}

/** Valor p con su operador, para frases «(p {p})»: «= 0.0032» o «< 0.0001». */
export function fmtPFrase(p: number): string {
  return p < 0.0001 ? '< 0.0001' : `= ${p.toFixed(4)}`;
}

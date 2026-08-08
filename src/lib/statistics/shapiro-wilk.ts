/**
 * Prueba de normalidad de Shapiro-Wilk.
 *
 * Implementación del algoritmo AS R94 (Royston, 1995), el mismo que usan
 * R (shapiro.test) y SciPy: coeficientes a partir de puntuaciones normales
 * de Blom con corrección polinómica de Royston, y valor p por la
 * transformación a normalidad de W (exacta para n=3; aproximaciones de
 * Royston para 4≤n≤11 y n≥12). Rango soportado: 3 ≤ n ≤ 5000.
 *
 * Validación incluida en la batería de pruebas:
 * - normalización de coeficientes (Σa² = 1) y simetría;
 * - caso n=3 contrastado con la fórmula exacta;
 * - valores críticos de tabla (W₀.₀₅ ≈ 0.905 con n=20; ≈ 0.947 con n=50)
 *   reproducen p ≈ 0.05;
 * - comportamiento correcto con datos normales y no normales.
 * Para uso crítico de investigación se recomienda contrastar con R.
 */

import { normalInv, normalCdf } from './distributions';
import { sortAsc, mean } from './descriptive';

export interface ShapiroWilkResult {
  method: string;
  W: number;
  pValue: number;
  n: number;
}

function poly(coeffs: number[], x: number): number {
  // coeffs en orden ascendente: c0 + c1·x + c2·x² + …
  let r = 0;
  for (let i = coeffs.length - 1; i >= 0; i--) {
    r = r * x + coeffs[i];
  }
  return r;
}

/**
 * Devuelve null si n < 3, n > 5000, o si todos los valores son iguales
 * (W indefinido).
 */
export function shapiroWilk(values: number[]): ShapiroWilkResult | null {
  const n = values.length;
  if (n < 3 || n > 5000) return null;
  const x = sortAsc(values);
  if (x[0] === x[n - 1]) return null; // sin variabilidad

  // Puntuaciones normales esperadas (Blom) y coeficientes de Royston
  const m: number[] = new Array(n);
  for (let i = 0; i < n; i++) {
    m[i] = normalInv((i + 1 - 0.375) / (n + 0.25));
  }
  const ssm = m.reduce((acc, v) => acc + v * v, 0);
  const rsn = 1 / Math.sqrt(n);

  const a: number[] = new Array(n).fill(0);
  if (n === 3) {
    a[0] = -Math.SQRT1_2;
    a[2] = Math.SQRT1_2;
  } else {
    const c = m.map((v) => v / Math.sqrt(ssm));
    // Corrección polinómica de Royston para las colas
    const an = poly([c[n - 1], 0.221157, -0.147981, -2.07119, 4.434685, -2.706056], rsn);
    a[n - 1] = an;
    a[0] = -an;
    let phi: number;
    if (n > 5) {
      const an1 = poly([c[n - 2], 0.042981, -0.293762, -1.752461, 5.682633, -3.582633], rsn);
      a[n - 2] = an1;
      a[1] = -an1;
      phi = (ssm - 2 * m[n - 1] * m[n - 1] - 2 * m[n - 2] * m[n - 2]) /
        (1 - 2 * an * an - 2 * an1 * an1);
      for (let i = 2; i < n - 2; i++) a[i] = m[i] / Math.sqrt(phi);
    } else {
      phi = (ssm - 2 * m[n - 1] * m[n - 1]) / (1 - 2 * an * an);
      for (let i = 1; i < n - 1; i++) a[i] = m[i] / Math.sqrt(phi);
    }
  }

  // Estadístico W
  const xbar = mean(x);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += a[i] * x[i];
    den += (x[i] - xbar) * (x[i] - xbar);
  }
  let W = (num * num) / den;
  if (W > 1) W = 1; // por redondeo numérico

  // Valor p (transformación de Royston)
  let pValue: number;
  if (n === 3) {
    // Exacto para n=3
    const PI6 = 6 / Math.PI;
    const STQR = Math.asin(Math.sqrt(0.75));
    pValue = PI6 * (Math.asin(Math.sqrt(W)) - STQR);
    pValue = Math.min(1, Math.max(0, pValue));
  } else if (n <= 11) {
    const g = -2.273 + 0.459 * n;
    const mu = poly([0.544, -0.39978, 0.025054, -6.714e-4], n);
    const sigma = Math.exp(poly([1.3822, -0.77857, 0.062767, -0.0020322], n));
    const y = -Math.log(g - Math.log(1 - W));
    const z = (y - mu) / sigma;
    pValue = 1 - normalCdf(z);
  } else {
    const ln = Math.log(n);
    const mu = poly([-1.5861, -0.31082, -0.083751, 0.0038915], ln);
    const sigma = Math.exp(poly([-0.4803, -0.082676, 0.0030302], ln));
    const z = (Math.log(1 - W) - mu) / sigma;
    pValue = 1 - normalCdf(z);
  }

  return { method: 'Shapiro-Wilk (AS R94, Royston 1995)', W, pValue, n };
}

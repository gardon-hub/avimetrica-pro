/**
 * Evaluación de normalidad.
 *
 * Implementada: prueba ómnibus de D'Agostino-Pearson K² (asimetría +
 * curtosis), con las transformaciones estándar:
 * - Z(g1): D'Agostino (1970).
 * - Z(g2): Anscombe & Glynn (1983).
 * - K² = Z1² + Z2² ~ χ²(2) bajo H0 de normalidad.
 * Requiere n ≥ 20 para que la aproximación sea confiable (se advierte).
 *
 * NO implementada aún: Shapiro-Wilk (requiere tablas de coeficientes
 * extensas para ser exacta; se prefirió no incluir una versión dudosa).
 * El gráfico Q-Q acompaña siempre a la prueba: la prueba no sustituye
 * la inspección gráfica.
 */

import { mean, sortAsc } from './descriptive';
import { normalInv, lnGamma } from './distributions';

/** CDF de chi-cuadrado con k grados de libertad via gamma incompleta (serie). */
export function chiSquareCdf(x: number, k: number): number {
  if (x <= 0) return 0;
  const a = k / 2;
  const x2 = x / 2;
  // P(a, x) — gamma incompleta regularizada inferior
  if (x2 < a + 1) {
    // serie
    let sum = 1 / a;
    let term = sum;
    for (let n = 1; n < 500; n++) {
      term *= x2 / (a + n);
      sum += term;
      if (Math.abs(term) < Math.abs(sum) * 1e-15) break;
    }
    return sum * Math.exp(-x2 + a * Math.log(x2) - lnGamma(a));
  }
  // fracción continua (Lentz) para Q(a,x)
  const FPMIN = 1e-300;
  let b = x2 + 1 - a;
  let c = 1 / FPMIN;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 500; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = b + an / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-15) break;
  }
  const q = Math.exp(-x2 + a * Math.log(x2) - lnGamma(a)) * h;
  return 1 - q;
}

export interface NormalityTestResult {
  method: string;
  statistic: number;
  pValue: number;
  zSkewness: number;
  zKurtosis: number;
  reliable: boolean; // false si n < 20
}

/** Prueba ómnibus K² de D'Agostino-Pearson. Devuelve null si n < 8. */
export function dagostinoPearson(values: number[]): NormalityTestResult | null {
  const n = values.length;
  if (n < 8) return null;

  const m = mean(values);
  let m2 = 0;
  let m3 = 0;
  let m4 = 0;
  for (const v of values) {
    const d = v - m;
    m2 += d * d;
    m3 += d * d * d;
    m4 += d * d * d * d;
  }
  m2 /= n;
  m3 /= n;
  m4 /= n;
  if (m2 === 0) return null;

  const g1 = m3 / Math.pow(m2, 1.5);
  const g2 = m4 / (m2 * m2) - 3;

  // Z para asimetría (D'Agostino 1970)
  const Y = g1 * Math.sqrt(((n + 1) * (n + 3)) / (6 * (n - 2)));
  const beta2 = (3 * (n * n + 27 * n - 70) * (n + 1) * (n + 3)) /
    ((n - 2) * (n + 5) * (n + 7) * (n + 9));
  const W2 = -1 + Math.sqrt(2 * (beta2 - 1));
  const deltaS = 1 / Math.sqrt(0.5 * Math.log(W2));
  const alphaS = Math.sqrt(2 / (W2 - 1));
  const yAlpha = Y / alphaS;
  const Z1 = deltaS * Math.log(yAlpha + Math.sqrt(yAlpha * yAlpha + 1));

  // Z para curtosis (Anscombe & Glynn 1983)
  const meanG2 = (-6) / (n + 1);
  const varG2 = (24 * n * (n - 2) * (n - 3)) / ((n + 1) * (n + 1) * (n + 3) * (n + 5));
  const xk = (g2 - meanG2) / Math.sqrt(varG2);
  const sqrtBeta1 = ((6 * (n * n - 5 * n + 2)) / ((n + 7) * (n + 9))) *
    Math.sqrt((6 * (n + 3) * (n + 5)) / (n * (n - 2) * (n - 3)));
  const A = 6 + (8 / sqrtBeta1) * (2 / sqrtBeta1 + Math.sqrt(1 + 4 / (sqrtBeta1 * sqrtBeta1)));
  const term = (1 - 2 / A) / (1 + xk * Math.sqrt(2 / (A - 4)));
  const Z2 = (1 - 2 / (9 * A) - Math.cbrt(term)) / Math.sqrt(2 / (9 * A));

  const K2 = Z1 * Z1 + Z2 * Z2;
  const pValue = 1 - chiSquareCdf(K2, 2);

  return {
    method: "D'Agostino-Pearson K²",
    statistic: K2,
    pValue,
    zSkewness: Z1,
    zKurtosis: Z2,
    reliable: n >= 20,
  };
}

export interface QQPoint {
  theoretical: number; // cuantil normal esperado (en unidades de los datos)
  observed: number;
}

/**
 * Puntos para gráfico Q-Q normal. Posición de graficación de Blom:
 * p_i = (i - 3/8) / (n + 1/4), la usada por Minitab por defecto.
 */
export function qqPoints(values: number[], mu: number, sigma: number): QQPoint[] {
  const sorted = sortAsc(values);
  const n = sorted.length;
  return sorted.map((v, i) => ({
    theoretical: normalInv((i + 1 - 0.375) / (n + 0.25), mu, sigma),
    observed: v,
  }));
}

/**
 * Inferencia estadística — prueba t de una muestra e intervalos de confianza.
 *
 * Metodología: prueba t clásica (Student). Supuestos: observaciones
 * independientes y población aproximadamente normal (o n suficientemente
 * grande). Las advertencias sobre supuestos se generan en la capa de
 * interpretación, no aquí.
 */

import { mean, sdSample, skewness } from './descriptive';
import { tCdf, tInv } from './distributions';

export type Alternative = 'two-sided' | 'greater' | 'less';

export interface TTestResult {
  n: number;
  mean: number;
  sd: number;
  se: number;
  mu0: number;
  diff: number; // mean - mu0
  t: number;
  df: number;
  pValue: number;
  alternative: Alternative;
  confidenceLevel: number; // p.ej. 0.95
  /** IC bilateral (para 'two-sided') o unilateral según la alternativa */
  ciLower: number;
  ciUpper: number;
  /** d de Cohen = diff / sd */
  cohenD: number;
  rejectNull: boolean; // p < alfa (alfa = 1 - confidenceLevel)
}

/**
 * Prueba t de una muestra. Devuelve null si n < 2 o SD = 0
 * (con SD 0 el estadístico no está definido).
 */
export function oneSampleTTest(
  values: number[],
  mu0: number,
  alternative: Alternative = 'two-sided',
  confidenceLevel = 0.95,
): TTestResult | null {
  const n = values.length;
  if (n < 2) return null;
  const m = mean(values);
  const sd = sdSample(values);
  if (!Number.isFinite(sd) || sd === 0) return null;
  const se = sd / Math.sqrt(n);
  const df = n - 1;
  const t = (m - mu0) / se;
  const alpha = 1 - confidenceLevel;

  let pValue: number;
  let ciLower: number;
  let ciUpper: number;
  switch (alternative) {
    case 'two-sided': {
      pValue = 2 * tCdf(-Math.abs(t), df);
      const tc = tInv(1 - alpha / 2, df);
      ciLower = m - tc * se;
      ciUpper = m + tc * se;
      break;
    }
    case 'greater': {
      pValue = 1 - tCdf(t, df);
      const tc = tInv(1 - alpha, df);
      ciLower = m - tc * se;
      ciUpper = Infinity;
      break;
    }
    case 'less': {
      pValue = tCdf(t, df);
      const tc = tInv(1 - alpha, df);
      ciLower = -Infinity;
      ciUpper = m + tc * se;
      break;
    }
  }

  return {
    n,
    mean: m,
    sd,
    se,
    mu0,
    diff: m - mu0,
    t,
    df,
    pValue,
    alternative,
    confidenceLevel,
    ciLower,
    ciUpper,
    cohenD: (m - mu0) / sd,
    rejectNull: pValue < alpha,
  };
}

/** IC bilateral para la media (t). Devuelve null si n<2 o SD no finita. */
export function meanConfidenceInterval(
  values: number[],
  confidenceLevel = 0.95,
): { lower: number; upper: number; margin: number } | null {
  const n = values.length;
  if (n < 2) return null;
  const sd = sdSample(values);
  if (!Number.isFinite(sd)) return null;
  const se = sd / Math.sqrt(n);
  const tc = tInv(1 - (1 - confidenceLevel) / 2, n - 1);
  const m = mean(values);
  return { lower: m - tc * se, upper: m + tc * se, margin: tc * se };
}

export interface TTestWarnings {
  smallSample: boolean; // n < 30 (y especialmente < 10)
  verySmallSample: boolean; // n < 10
  markedSkewness: boolean; // |G1| > 1 con n < 30
  sdZero: boolean;
}

export function tTestAssumptionWarnings(values: number[]): TTestWarnings {
  const n = values.length;
  const sk = skewness(values);
  const sd = sdSample(values);
  return {
    smallSample: n < 30,
    verySmallSample: n < 10,
    markedSkewness: sk !== null && Math.abs(sk) > 1 && n < 30,
    sdZero: Number.isFinite(sd) && sd === 0,
  };
}

// ─── Comparación de dos mediciones ───────────────────────────────

export interface TwoSampleTTestResult {
  n1: number;
  n2: number;
  mean1: number;
  mean2: number;
  sd1: number;
  sd2: number;
  diff: number; // mean1 - mean2
  se: number;
  t: number;
  df: number; // Welch-Satterthwaite (fraccionario)
  pValue: number;
  alternative: Alternative;
  confidenceLevel: number;
  ciLower: number;
  ciUpper: number;
  /** d de Cohen con SD combinada (pooled) */
  cohenD: number;
  rejectNull: boolean;
}

/**
 * Prueba t de dos muestras INDEPENDIENTES con corrección de Welch
 * (no asume varianzas iguales; es la opción robusta por defecto,
 * la misma que usa R en t.test). H0: μ1 = μ2.
 */
export function twoSampleTTest(
  a: number[],
  b: number[],
  alternative: Alternative = 'two-sided',
  confidenceLevel = 0.95,
): TwoSampleTTestResult | null {
  const n1 = a.length;
  const n2 = b.length;
  if (n1 < 2 || n2 < 2) return null;
  const m1 = mean(a);
  const m2 = mean(b);
  const s1 = sdSample(a);
  const s2 = sdSample(b);
  if (!Number.isFinite(s1) || !Number.isFinite(s2)) return null;
  const v1 = (s1 * s1) / n1;
  const v2 = (s2 * s2) / n2;
  if (v1 + v2 === 0) return null; // ambas SD = 0: estadístico indefinido
  const se = Math.sqrt(v1 + v2);
  // Grados de libertad de Welch-Satterthwaite
  const df = ((v1 + v2) * (v1 + v2)) / ((v1 * v1) / (n1 - 1) + (v2 * v2) / (n2 - 1));
  const t = (m1 - m2) / se;
  const alpha = 1 - confidenceLevel;

  let pValue: number;
  let ciLower: number;
  let ciUpper: number;
  switch (alternative) {
    case 'two-sided': {
      pValue = 2 * tCdf(-Math.abs(t), df);
      const tc = tInv(1 - alpha / 2, df);
      ciLower = m1 - m2 - tc * se;
      ciUpper = m1 - m2 + tc * se;
      break;
    }
    case 'greater': {
      pValue = 1 - tCdf(t, df);
      const tc = tInv(1 - alpha, df);
      ciLower = m1 - m2 - tc * se;
      ciUpper = Infinity;
      break;
    }
    case 'less': {
      pValue = tCdf(t, df);
      const tc = tInv(1 - alpha, df);
      ciLower = -Infinity;
      ciUpper = m1 - m2 + tc * se;
      break;
    }
  }

  // d de Cohen con SD combinada clásica (para magnitud del efecto)
  const sPooled = Math.sqrt(((n1 - 1) * s1 * s1 + (n2 - 1) * s2 * s2) / (n1 + n2 - 2));
  const cohenD = sPooled > 0 ? (m1 - m2) / sPooled : NaN;

  return {
    n1, n2, mean1: m1, mean2: m2, sd1: s1, sd2: s2,
    diff: m1 - m2, se, t, df, pValue, alternative, confidenceLevel,
    ciLower, ciUpper, cohenD, rejectNull: pValue < alpha,
  };
}

/**
 * Prueba t PAREADA: cada ave de la primera medición corresponde a la misma
 * ave en la segunda (requiere igual longitud y orden correspondiente).
 * Equivale a una t de una muestra sobre las diferencias.
 */
export function pairedTTest(
  a: number[],
  b: number[],
  alternative: Alternative = 'two-sided',
  confidenceLevel = 0.95,
): TTestResult | null {
  if (a.length !== b.length || a.length < 2) return null;
  const diffs = a.map((v, i) => v - b[i]);
  return oneSampleTTest(diffs, 0, alternative, confidenceLevel);
}

/**
 * Detección exploratoria de valores atípicos.
 *
 * Métodos:
 * - Regla de Tukey: 1.5×IQR (atípico) y 3×IQR (extremo).
 * - Puntuación Z clásica (|z| > 3).
 * - Puntuación Z modificada con mediana y MAD (|Mi| > 3.5),
 *   Mi = 0.6745 (xi - mediana) / MAD. Referencia: Iglewicz & Hoaglin (1993).
 *
 * Ningún método elimina datos: solo marca observaciones para revisión.
 */

import { mean, median, percentile, sdSample, sortAsc } from './descriptive';

export type OutlierMethod = 'iqr15' | 'iqr30' | 'zscore' | 'modifiedZ';

export interface OutlierFlag {
  index: number; // índice en el arreglo original (0-based)
  value: number;
  methods: OutlierMethod[];
  zScore: number | null;
  modifiedZ: number | null;
  deviationFromMean: number;
}

export interface OutlierAnalysis {
  flags: OutlierFlag[];
  fences: {
    iqrLower15: number;
    iqrUpper15: number;
    iqrLower30: number;
    iqrUpper30: number;
  } | null;
  mad: number | null;
}

/** MAD: mediana de las desviaciones absolutas respecto a la mediana. */
export function medianAbsoluteDeviation(values: number[]): number | null {
  if (values.length === 0) return null;
  const med = median(values);
  return median(values.map((v) => Math.abs(v - med)));
}

export function detectOutliers(values: number[]): OutlierAnalysis {
  const n = values.length;
  if (n < 4) {
    // Con menos de 4 datos los cercos de Tukey no son informativos
    return { flags: [], fences: null, mad: null };
  }
  const sorted = sortAsc(values);
  const q1 = percentile(sorted, 25);
  const q3 = percentile(sorted, 75);
  const iqr = q3 - q1;
  const fences = {
    iqrLower15: q1 - 1.5 * iqr,
    iqrUpper15: q3 + 1.5 * iqr,
    iqrLower30: q1 - 3 * iqr,
    iqrUpper30: q3 + 3 * iqr,
  };
  const m = mean(values);
  const sd = sdSample(values);
  const med = median(values);
  const mad = medianAbsoluteDeviation(values);

  const flags: OutlierFlag[] = [];
  values.forEach((v, index) => {
    const methods: OutlierMethod[] = [];
    if (v < fences.iqrLower30 || v > fences.iqrUpper30) {
      methods.push('iqr30');
    } else if (v < fences.iqrLower15 || v > fences.iqrUpper15) {
      methods.push('iqr15');
    }
    const z = Number.isFinite(sd) && sd > 0 ? (v - m) / sd : null;
    if (z !== null && Math.abs(z) > 3) methods.push('zscore');
    const mz = mad !== null && mad > 0 ? (0.6745 * (v - med)) / mad : null;
    if (mz !== null && Math.abs(mz) > 3.5) methods.push('modifiedZ');

    if (methods.length > 0) {
      flags.push({
        index,
        value: v,
        methods,
        zScore: z,
        modifiedZ: mz,
        deviationFromMean: v - m,
      });
    }
  });

  return { flags, fences, mad };
}

export const OUTLIER_METHOD_LABELS: Record<OutlierMethod, string> = {
  iqr15: '1.5×IQR (Tukey)',
  iqr30: '3×IQR (extremo)',
  zscore: '|Z| > 3',
  modifiedZ: 'Z modificada (MAD) > 3.5',
};

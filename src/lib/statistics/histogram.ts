/**
 * Construcción de histogramas: reglas de Sturges y Freedman-Diaconis,
 * o número manual de clases. Devuelve las frecuencias reales de los datos
 * (distribución empírica), no una curva teórica.
 */

import { percentile, sortAsc } from './descriptive';

export type BinRule = 'auto' | 'sturges' | 'freedman-diaconis' | 'manual';

export interface HistogramBin {
  x0: number; // límite inferior (incluido)
  x1: number; // límite superior (excluido; el último bin incluye x1)
  count: number;
  percent: number;
  density: number; // count / (n * ancho)
}

export interface Histogram {
  bins: HistogramBin[];
  binWidth: number;
  rule: BinRule;
  n: number;
}

export function sturgesBins(n: number): number {
  return Math.max(1, Math.ceil(Math.log2(n) + 1));
}

export function freedmanDiaconisBins(values: number[]): number {
  const n = values.length;
  const sorted = sortAsc(values);
  const iqr = percentile(sorted, 75) - percentile(sorted, 25);
  const range = sorted[n - 1] - sorted[0];
  if (iqr <= 0 || range <= 0) return sturgesBins(n);
  const width = (2 * iqr) / Math.cbrt(n);
  return Math.max(1, Math.ceil(range / width));
}

export function buildHistogram(
  values: number[],
  rule: BinRule = 'auto',
  manualBins?: number,
): Histogram | null {
  const n = values.length;
  if (n === 0) return null;
  const sorted = sortAsc(values);
  const min = sorted[0];
  const max = sorted[n - 1];

  let k: number;
  let effectiveRule = rule;
  switch (rule) {
    case 'manual':
      k = Math.max(1, Math.floor(manualBins ?? sturgesBins(n)));
      break;
    case 'sturges':
      k = sturgesBins(n);
      break;
    case 'freedman-diaconis':
      k = freedmanDiaconisBins(values);
      break;
    case 'auto':
    default:
      // FD para n≥30 (más robusta con atípicos), Sturges para muestras chicas
      effectiveRule = n >= 30 ? 'freedman-diaconis' : 'sturges';
      k = n >= 30 ? freedmanDiaconisBins(values) : sturgesBins(n);
      break;
  }

  if (min === max) {
    // Todos los valores iguales: un solo bin centrado
    return {
      bins: [{ x0: min - 0.5, x1: min + 0.5, count: n, percent: 100, density: 1 }],
      binWidth: 1,
      rule: effectiveRule,
      n,
    };
  }

  const width = (max - min) / k;
  const bins: HistogramBin[] = Array.from({ length: k }, (_, i) => ({
    x0: min + i * width,
    x1: min + (i + 1) * width,
    count: 0,
    percent: 0,
    density: 0,
  }));

  for (const v of values) {
    let idx = Math.floor((v - min) / width);
    if (idx >= k) idx = k - 1; // el máximo cae en el último bin
    bins[idx].count++;
  }
  for (const b of bins) {
    b.percent = (b.count / n) * 100;
    b.density = b.count / (n * width);
  }

  return { bins, binWidth: width, rule: effectiveRule, n };
}

/**
 * Estadística descriptiva — funciones puras, sin dependencias externas.
 *
 * Convenciones:
 * - Todos los cálculos se hacen en la unidad original (gramos) sin redondeo;
 *   el redondeo es responsabilidad de la capa de presentación.
 * - "Muestral" usa n-1 grados de libertad (Bessel); "poblacional" usa n.
 *   Para pesajes de una muestra del lote (el caso normal) corresponde la
 *   versión MUESTRAL. La poblacional solo aplica si se pesó todo el lote.
 * - Percentiles: método de interpolación lineal R-7 (el de Excel/NumPy
 *   por defecto). Referencia: Hyndman & Fan (1996), tipo 7.
 * - Asimetría y curtosis: estimadores ajustados por sesgo g1→G1 y g2→G2
 *   (los que reportan Minitab, SPSS y Excel). Referencia: Joanes & Gill (1998).
 */

export interface DescriptiveSummary {
  n: number;
  sum: number;
  mean: number;
  median: number;
  modes: number[];
  min: number;
  max: number;
  range: number;
  varianceSample: number;
  sdSample: number;
  variancePopulation: number;
  sdPopulation: number;
  cv: number; // % — basado en SD muestral
  sem: number; // error estándar de la media (SD muestral / sqrt(n))
  q1: number;
  q3: number;
  iqr: number;
  percentiles: Record<number, number>; // 5,10,25,50,75,90,95
  skewness: number | null; // G1; null si n<3 o SD=0
  kurtosis: number | null; // G2 (exceso); null si n<4 o SD=0
}

export function sortAsc(values: number[]): number[] {
  return [...values].sort((a, b) => a - b);
}

export function mean(values: number[]): number {
  if (values.length === 0) return NaN;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Percentil p (0-100), método R-7 (interpolación lineal). */
export function percentile(sorted: number[], p: number): number {
  const n = sorted.length;
  if (n === 0) return NaN;
  if (n === 1) return sorted[0];
  const h = ((n - 1) * p) / 100;
  const lo = Math.floor(h);
  const hi = Math.ceil(h);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (h - lo) * (sorted[hi] - sorted[lo]);
}

export function median(values: number[]): number {
  return percentile(sortAsc(values), 50);
}

/** Varianza muestral (n-1). Devuelve NaN si n<2. */
export function varianceSample(values: number[]): number {
  const n = values.length;
  if (n < 2) return NaN;
  const m = mean(values);
  const ss = values.reduce((acc, v) => acc + (v - m) * (v - m), 0);
  return ss / (n - 1);
}

/** Varianza poblacional (n). Devuelve NaN si n<1. */
export function variancePopulation(values: number[]): number {
  const n = values.length;
  if (n < 1) return NaN;
  const m = mean(values);
  const ss = values.reduce((acc, v) => acc + (v - m) * (v - m), 0);
  return ss / n;
}

export function sdSample(values: number[]): number {
  return Math.sqrt(varianceSample(values));
}

export function sdPopulation(values: number[]): number {
  return Math.sqrt(variancePopulation(values));
}

/** Moda(s). Si todos los valores son únicos, devuelve []. */
export function modes(values: number[]): number[] {
  if (values.length === 0) return [];
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  const maxCount = Math.max(...counts.values());
  if (maxCount < 2) return [];
  return [...counts.entries()]
    .filter(([, c]) => c === maxCount)
    .map(([v]) => v)
    .sort((a, b) => a - b);
}

/**
 * Asimetría ajustada G1 (Joanes & Gill tipo 2, la de Minitab/SPSS/Excel).
 * G1 = g1 * sqrt(n(n-1))/(n-2), con g1 = m3 / m2^(3/2).
 */
export function skewness(values: number[]): number | null {
  const n = values.length;
  if (n < 3) return null;
  const m = mean(values);
  let m2 = 0;
  let m3 = 0;
  for (const v of values) {
    const d = v - m;
    m2 += d * d;
    m3 += d * d * d;
  }
  m2 /= n;
  m3 /= n;
  if (m2 === 0) return null;
  const g1 = m3 / Math.pow(m2, 1.5);
  return (g1 * Math.sqrt(n * (n - 1))) / (n - 2);
}

/**
 * Curtosis en exceso ajustada G2 (Joanes & Gill tipo 2).
 * G2 = ((n+1)*g2 + 6) * (n-1)/((n-2)(n-3)), con g2 = m4/m2^2 - 3.
 * Normal ≈ 0; >0 colas pesadas; <0 colas ligeras.
 */
export function kurtosisExcess(values: number[]): number | null {
  const n = values.length;
  if (n < 4) return null;
  const m = mean(values);
  let m2 = 0;
  let m4 = 0;
  for (const v of values) {
    const d = v - m;
    m2 += d * d;
    m4 += d * d * d * d;
  }
  m2 /= n;
  m4 /= n;
  if (m2 === 0) return null;
  const g2 = m4 / (m2 * m2) - 3;
  return (((n + 1) * g2 + 6) * (n - 1)) / ((n - 2) * (n - 3));
}

export function describe(values: number[]): DescriptiveSummary | null {
  const n = values.length;
  if (n === 0) return null;
  const sorted = sortAsc(values);
  const m = mean(values);
  const varS = varianceSample(values);
  const sdS = Number.isNaN(varS) ? NaN : Math.sqrt(varS);
  const varP = variancePopulation(values);
  const pcts: Record<number, number> = {};
  for (const p of [5, 10, 25, 50, 75, 90, 95]) pcts[p] = percentile(sorted, p);
  const q1 = pcts[25];
  const q3 = pcts[75];
  return {
    n,
    sum: values.reduce((a, b) => a + b, 0),
    mean: m,
    median: pcts[50],
    modes: modes(values),
    min: sorted[0],
    max: sorted[n - 1],
    range: sorted[n - 1] - sorted[0],
    varianceSample: varS,
    sdSample: sdS,
    variancePopulation: varP,
    sdPopulation: Math.sqrt(varP),
    cv: m !== 0 && !Number.isNaN(sdS) ? (sdS / m) * 100 : NaN,
    sem: !Number.isNaN(sdS) ? sdS / Math.sqrt(n) : NaN,
    q1,
    q3,
    iqr: q3 - q1,
    percentiles: pcts,
    skewness: skewness(values),
    kurtosis: kurtosisExcess(values),
  };
}

/** Proporción (%) de valores dentro de media ± pct%. */
export function proportionWithinPct(values: number[], pct: number): number {
  const n = values.length;
  if (n === 0) return NaN;
  const m = mean(values);
  const lo = m * (1 - pct / 100);
  const hi = m * (1 + pct / 100);
  const inside = values.filter((v) => v >= lo && v <= hi).length;
  return (inside / n) * 100;
}

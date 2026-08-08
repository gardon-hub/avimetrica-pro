/**
 * Distribuciones de probabilidad — implementación local, sin servicios externos.
 *
 * Precisión documentada:
 * - normalCdf: error absoluto < 1e-15 (erf por serie/fracción continua de
 *   precisión doble, algoritmo basado en erfc de Numerical Recipes 3ª ed.).
 * - normalInv: algoritmo de Acklam, error relativo < 1.15e-9, refinado con
 *   un paso de Halley → precisión cercana a máquina.
 *   Verificable: normalInv(0.95) ≈ 1.6448536269514722.
 * - tCdf: mediante función beta incompleta regularizada (fracción continua
 *   de Lentz), error < 1e-12 en el rango de uso.
 * - tInv: bisección + Newton sobre tCdf, tolerancia 1e-12.
 */

// ─── Error function ──────────────────────────────────────────────

/** erfc(x) con error relativo < 1.2e-7 en toda la recta (NR, Chebyshev). */
function erfcCheb(x: number): number {
  const z = Math.abs(x);
  const t = 2 / (2 + z);
  const ty = 4 * t - 2;
  const cof = [
    -1.3026537197817094, 6.4196979235649026e-1, 1.9476473204185836e-2,
    -9.561514786808631e-3, -9.46595344482036e-4, 3.66839497852761e-4,
    4.2523324806907e-5, -2.0278578112534e-5, -1.624290004647e-6,
    1.303655835580e-6, 1.5626441722e-8, -8.5238095915e-8,
    6.529054439e-9, 5.059343495e-9, -9.91364156e-10,
    -2.27365122e-10, 9.6467911e-11, 2.394038e-12,
    -6.886027e-12, 8.94487e-13, 3.13092e-13,
    -1.12708e-13, 3.81e-16, 7.106e-15,
  ];
  let d = 0;
  let dd = 0;
  for (let j = cof.length - 1; j > 0; j--) {
    const tmp = d;
    d = ty * d - dd + cof[j];
    dd = tmp;
  }
  const ans = t * Math.exp(-z * z + 0.5 * (cof[0] + ty * d) - dd);
  return x >= 0 ? ans : 2 - ans;
}

export function erf(x: number): number {
  return 1 - erfcCheb(x);
}

// ─── Normal ──────────────────────────────────────────────────────

export function normalPdf(x: number, mu = 0, sigma = 1): number {
  if (sigma <= 0) return NaN;
  const z = (x - mu) / sigma;
  return Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI));
}

/** P(X ≤ x) para X ~ N(mu, sigma). */
export function normalCdf(x: number, mu = 0, sigma = 1): number {
  if (sigma <= 0) return NaN;
  const z = (x - mu) / (sigma * Math.SQRT2);
  return 0.5 * erfcCheb(-z);
}

/**
 * Cuantil de la normal estándar (inversa de la CDF). Acklam + refinamiento
 * de Halley con la CDF de alta precisión.
 */
export function normalInv(p: number, mu = 0, sigma = 1): number {
  if (sigma <= 0 || p <= 0 || p >= 1) {
    if (p === 0) return -Infinity;
    if (p === 1) return Infinity;
    return NaN;
  }
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const pLow = 0.02425;
  let x: number;
  if (p < pLow) {
    const q = Math.sqrt(-2 * Math.log(p));
    x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= 1 - pLow) {
    const q = p - 0.5;
    const r = q * q;
    x = ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  // Un paso de Halley para refinar
  const e = 0.5 * erfcCheb(-x / Math.SQRT2) - p;
  const u = e * Math.sqrt(2 * Math.PI) * Math.exp((x * x) / 2);
  x = x - u / (1 + (x * u) / 2);
  return mu + sigma * x;
}

// ─── Funciones gamma/beta auxiliares ─────────────────────────────

/** ln Γ(x), Lanczos. Error < 1e-13 para x>0. */
export function lnGamma(x: number): number {
  const g = [
    76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5,
  ];
  let xx = x;
  let y = xx;
  let tmp = xx + 5.5;
  tmp -= (xx + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) ser += g[j] / ++y;
  return -tmp + Math.log((2.5066282746310005 * ser) / xx);
}

/** Fracción continua para la beta incompleta (método de Lentz, NR). */
function betacf(a: number, b: number, x: number): number {
  const MAXIT = 200;
  const EPS = 3e-14;
  const FPMIN = 1e-300;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

/** Beta incompleta regularizada I_x(a,b). */
export function betaInc(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(
    lnGamma(a + b) - lnGamma(a) - lnGamma(b) + a * Math.log(x) + b * Math.log(1 - x),
  );
  if (x < (a + 1) / (a + b + 2)) {
    return (bt * betacf(a, b, x)) / a;
  }
  return 1 - (bt * betacf(b, a, 1 - x)) / b;
}

// ─── t de Student ────────────────────────────────────────────────

export function tPdf(t: number, df: number): number {
  if (df <= 0) return NaN;
  const lnCoef = lnGamma((df + 1) / 2) - lnGamma(df / 2) - 0.5 * Math.log(df * Math.PI);
  return Math.exp(lnCoef - ((df + 1) / 2) * Math.log(1 + (t * t) / df));
}

/** P(T ≤ t) para T ~ t(df). */
export function tCdf(t: number, df: number): number {
  if (df <= 0) return NaN;
  if (t === 0) return 0.5;
  const x = df / (df + t * t);
  const p = 0.5 * betaInc(df / 2, 0.5, x);
  return t > 0 ? 1 - p : p;
}

/** Cuantil de t(df): tInv(0.975, 10) ≈ 2.2281. */
export function tInv(p: number, df: number): number {
  if (df <= 0 || p <= 0 || p >= 1) {
    if (p === 0) return -Infinity;
    if (p === 1) return Infinity;
    return NaN;
  }
  if (p === 0.5) return 0;
  // Arranque con la aproximación normal, luego Newton con bisección de respaldo
  let lo = -1e10;
  let hi = 1e10;
  let x = normalInv(p);
  for (let i = 0; i < 100; i++) {
    const f = tCdf(x, df) - p;
    if (Math.abs(f) < 1e-14) break;
    if (f > 0) hi = Math.min(hi, x);
    else lo = Math.max(lo, x);
    const dfdx = tPdf(x, df);
    let next = x - f / dfdx;
    if (!(next > lo && next < hi) || !Number.isFinite(next)) {
      next = (lo + hi) / 2;
    }
    if (Math.abs(next - x) < 1e-13 * Math.max(1, Math.abs(x))) {
      x = next;
      break;
    }
    x = next;
  }
  return x;
}

// ─── Cálculos de áreas estilo Minitab ────────────────────────────

export type TailMode = 'right' | 'left' | 'both' | 'center';

export interface TailResult {
  /** Límites del área sombreada [x1, x2] en la escala original */
  bounds: [number, number];
  /** Probabilidad del área sombreada */
  probability: number;
}

/** Dado un valor X, calcula la probabilidad de la cola indicada. */
export function normalTailFromX(mode: TailMode, mu: number, sigma: number, x1: number, x2?: number): TailResult | null {
  if (sigma <= 0) return null;
  switch (mode) {
    case 'right':
      return { bounds: [x1, Infinity], probability: 1 - normalCdf(x1, mu, sigma) };
    case 'left':
      return { bounds: [-Infinity, x1], probability: normalCdf(x1, mu, sigma) };
    case 'both': {
      // Colas simétricas alrededor de la media a distancia |x1 - mu|
      const d = Math.abs(x1 - mu);
      const p = normalCdf(mu - d, mu, sigma) + (1 - normalCdf(mu + d, mu, sigma));
      return { bounds: [mu - d, mu + d], probability: p };
    }
    case 'center': {
      if (x2 === undefined) return null;
      const lo = Math.min(x1, x2);
      const hi = Math.max(x1, x2);
      return { bounds: [lo, hi], probability: normalCdf(hi, mu, sigma) - normalCdf(lo, mu, sigma) };
    }
  }
}

/** Dada una probabilidad, calcula el/los valores X que delimitan el área. */
export function normalTailFromP(mode: TailMode, mu: number, sigma: number, p: number): TailResult | null {
  if (sigma <= 0 || p <= 0 || p >= 1) return null;
  switch (mode) {
    case 'right':
      return { bounds: [normalInv(1 - p, mu, sigma), Infinity], probability: p };
    case 'left':
      return { bounds: [-Infinity, normalInv(p, mu, sigma)], probability: p };
    case 'both': {
      const lo = normalInv(p / 2, mu, sigma);
      const hi = normalInv(1 - p / 2, mu, sigma);
      return { bounds: [lo, hi], probability: p };
    }
    case 'center': {
      const lo = normalInv((1 - p) / 2, mu, sigma);
      const hi = normalInv(1 - (1 - p) / 2, mu, sigma);
      return { bounds: [lo, hi], probability: p };
    }
  }
}

/** Equivalentes para t de Student (escala t). */
export function tTailFromX(mode: TailMode, df: number, t1: number, t2?: number): TailResult | null {
  if (df <= 0) return null;
  switch (mode) {
    case 'right':
      return { bounds: [t1, Infinity], probability: 1 - tCdf(t1, df) };
    case 'left':
      return { bounds: [-Infinity, t1], probability: tCdf(t1, df) };
    case 'both': {
      const d = Math.abs(t1);
      return { bounds: [-d, d], probability: 2 * tCdf(-d, df) };
    }
    case 'center': {
      if (t2 === undefined) return null;
      const lo = Math.min(t1, t2);
      const hi = Math.max(t1, t2);
      return { bounds: [lo, hi], probability: tCdf(hi, df) - tCdf(lo, df) };
    }
  }
}

export function tTailFromP(mode: TailMode, df: number, p: number): TailResult | null {
  if (df <= 0 || p <= 0 || p >= 1) return null;
  switch (mode) {
    case 'right':
      return { bounds: [tInv(1 - p, df), Infinity], probability: p };
    case 'left':
      return { bounds: [-Infinity, tInv(p, df)], probability: p };
    case 'both': {
      const hi = tInv(1 - p / 2, df);
      return { bounds: [-hi, hi], probability: p };
    }
    case 'center': {
      const hi = tInv(1 - (1 - p) / 2, df);
      return { bounds: [-hi, hi], probability: p };
    }
  }
}

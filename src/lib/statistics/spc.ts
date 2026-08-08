/**
 * Control estadístico de procesos (Fase 7).
 *
 * Herramientas: carta X̄-S (subgrupos) y carta de individuales I-MR.
 * Constantes calculadas exactamente con la función gamma (no tablas
 * truncadas): c4(n) = sqrt(2/(n-1)) · Γ(n/2) / Γ((n-1)/2).
 * Valores de control clásicos: c4(2)=0.797885, c4(5)=0.939986, c4(10)=0.972659.
 *
 * ADVERTENCIA DE DOMINIO: en aves en crecimiento el peso medio TIENE
 * tendencia (no es un proceso estable), por lo que una carta X̄ sobre el peso
 * crudo viola el supuesto de estabilidad. Para seguimiento entre pesajes son
 * más apropiados el CV o la desviación porcentual respecto al objetivo de la
 * línea; la capa de UI aplica esa recomendación.
 *
 * Reglas de Nelson implementadas (1, 2 y 3), documentadas en cada resultado.
 */

import { lnGamma } from './distributions';
import { mean, sdSample } from './descriptive';

/** Constante c4 (sesgo de la SD muestral). Requiere n ≥ 2. */
export function c4(n: number): number {
  if (n < 2) return NaN;
  return Math.sqrt(2 / (n - 1)) * Math.exp(lnGamma(n / 2) - lnGamma((n - 1) / 2));
}

export interface XbarSChart {
  /** Media global (de las medias de subgrupo) */
  xbarbar: number;
  /** SD promedio de subgrupos */
  sbar: number;
  /** n promedio de subgrupo usado para los límites */
  nAvg: number;
  xbar: { center: number; ucl: number; lcl: number; points: number[] };
  s: { center: number; ucl: number; lcl: number; points: number[] };
}

/**
 * Carta X̄-S con límites basados en el tamaño promedio de subgrupo
 * (aproximación estándar cuando los n difieren poco). Devuelve null si hay
 * menos de 2 subgrupos o algún subgrupo con n < 2.
 */
export function xbarSChart(subgroups: number[][]): XbarSChart | null {
  if (subgroups.length < 2) return null;
  if (subgroups.some((g) => g.length < 2)) return null;
  const means = subgroups.map((g) => mean(g));
  const sds = subgroups.map((g) => sdSample(g));
  const ns = subgroups.map((g) => g.length);
  const nAvg = mean(ns);
  const xbarbar = mean(means);
  const sbar = mean(sds);
  const c = c4(Math.round(nAvg));
  const a3 = 3 / (c * Math.sqrt(nAvg));
  const b = (3 * Math.sqrt(1 - c * c)) / c;
  return {
    xbarbar,
    sbar,
    nAvg,
    xbar: {
      center: xbarbar,
      ucl: xbarbar + a3 * sbar,
      lcl: xbarbar - a3 * sbar,
      points: means,
    },
    s: {
      center: sbar,
      ucl: sbar * (1 + b),
      lcl: Math.max(0, sbar * (1 - b)),
      points: sds,
    },
  };
}

export interface IMRChart {
  center: number;
  ucl: number;
  lcl: number;
  points: number[];
  mrBar: number;
  mr: { center: number; ucl: number; points: number[] }; // MR: LCL = 0
}

/**
 * Carta de individuales con rango móvil (I-MR).
 * Límites: x̄ ± 2.66·MR̄ (2.66 = 3/d2 con d2(2) = 1.128).
 * Devuelve null con menos de 2 observaciones.
 */
export function imrChart(values: number[]): IMRChart | null {
  if (values.length < 2) return null;
  const mrs: number[] = [];
  for (let i = 1; i < values.length; i++) {
    mrs.push(Math.abs(values[i] - values[i - 1]));
  }
  const mrBar = mean(mrs);
  const center = mean(values);
  return {
    center,
    ucl: center + 2.66 * mrBar,
    lcl: center - 2.66 * mrBar,
    points: [...values],
    mrBar,
    mr: { center: mrBar, ucl: 3.267 * mrBar, points: mrs },
  };
}

export interface NelsonViolation {
  rule: 1 | 2 | 3;
  index: number; // índice del punto que completa la señal
  description: string;
}

/**
 * Reglas de Nelson 1-3 sobre una serie con línea central y límites 3σ:
 * 1: un punto fuera de los límites de control.
 * 2: nueve puntos consecutivos al mismo lado de la línea central.
 * 3: seis puntos consecutivos en ascenso o descenso sostenido.
 */
export function nelsonRules(points: number[], center: number, ucl: number, lcl: number): NelsonViolation[] {
  const out: NelsonViolation[] = [];

  points.forEach((p, i) => {
    if (p > ucl || p < lcl) {
      out.push({ rule: 1, index: i, description: `Punto ${i + 1} fuera de los límites de control (${p.toFixed(2)}).` });
    }
  });

  let side = 0; // 1 arriba, -1 abajo
  let run = 0;
  points.forEach((p, i) => {
    const s = p > center ? 1 : p < center ? -1 : 0;
    if (s !== 0 && s === side) run++;
    else { side = s; run = s === 0 ? 0 : 1; }
    if (run === 9) {
      out.push({ rule: 2, index: i, description: `Nueve puntos consecutivos ${side > 0 ? 'sobre' : 'bajo'} la línea central (hasta el punto ${i + 1}).` });
    }
  });

  let trend = 0; // 1 subiendo, -1 bajando
  let trendRun = 1;
  for (let i = 1; i < points.length; i++) {
    const s = points[i] > points[i - 1] ? 1 : points[i] < points[i - 1] ? -1 : 0;
    if (s !== 0 && s === trend) trendRun++;
    else { trend = s; trendRun = s === 0 ? 1 : 2; }
    if (trendRun === 6) {
      out.push({ rule: 3, index: i, description: `Seis puntos consecutivos en ${trend > 0 ? 'ascenso' : 'descenso'} sostenido (hasta el punto ${i + 1}).` });
    }
  }

  return out;
}

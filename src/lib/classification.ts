/**
 * Motor de clasificación de observaciones en categorías (Fase 8).
 *
 * OBSERVACIÓN CENTRAL DEL DISEÑO: la "uniformidad ±10 %" avícola y las
 * categorías de tamaño de huevo (S/M/L/XL) son el mismo concepto —clasificar
 * observaciones en clases— con dos formas de fijar los cortes:
 *
 *   - Banda RELATIVA: los cortes dependen de la media observada
 *     (media ±X %). Es el criterio tradicional de uniformidad avícola.
 *   - Bins ABSOLUTOS: los cortes son valores fijos, independientes de los
 *     datos (p. ej. Large ≥ 56.7 g). Es como funcionan las normas de huevo.
 *
 * Unificarlos permite que un mismo conjunto de gráficos, tablas y reportes
 * sirva para aves, huevos y cualquier variable cuantitativa del usuario.
 *
 * Este módulo es agnóstico del dominio: no conoce aves ni huevos.
 */

import { mean } from '@/lib/statistics/descriptive';

/** Una categoría con sus cortes. `null` = sin límite por ese lado. */
export interface Bin {
  label: string;
  /** Límite inferior INCLUSIVE (x >= min). null = −∞ */
  min: number | null;
  /** Límite superior EXCLUSIVE (x < max). null = +∞ */
  max: number | null;
  /** Color opcional para gráficos (CSS). */
  color?: string;
}

export type ClassificationScheme =
  | {
      type: 'relative-band';
      /** Semiancho de la banda en % de la media (10 → media ±10 %). */
      pct: number;
      labels?: { below: string; within: string; above: string };
    }
  | {
      type: 'absolute-bins';
      bins: Bin[];
    };

export interface BinResult extends Bin {
  count: number;
  /** Porcentaje sobre el total de observaciones clasificadas y sin clasificar. */
  pct: number;
  /** Índices (0-based) de las observaciones que cayeron en esta categoría. */
  indices: number[];
}

export interface ClassificationResult {
  bins: BinResult[];
  /** Observaciones que no cayeron en ninguna categoría (bins con huecos). */
  unclassified: number;
  unclassifiedIndices: number[];
  n: number;
  /** Cortes efectivos usados; en banda relativa se derivan de la media. */
  effectiveBins: Bin[];
  /** Categoría con más observaciones (null si no hay datos o hay empate vacío). */
  modeLabel: string | null;
}

const DEFAULT_BAND_LABELS = {
  below: 'Por debajo',
  within: 'Dentro del rango',
  above: 'Por encima',
};

/**
 * Convierte un esquema en cortes concretos. Para la banda relativa necesita
 * los datos, porque los cortes dependen de la media observada.
 */
export function resolveBins(scheme: ClassificationScheme, values: number[]): Bin[] {
  if (scheme.type === 'absolute-bins') {
    return scheme.bins;
  }
  const labels = scheme.labels ?? DEFAULT_BAND_LABELS;
  if (values.length === 0) {
    return [
      { label: labels.below, min: null, max: null },
      { label: labels.within, min: null, max: null },
      { label: labels.above, min: null, max: null },
    ];
  }
  const m = mean(values);
  const inf = m * (1 - scheme.pct / 100);
  const sup = m * (1 + scheme.pct / 100);
  // El límite superior de la banda es INCLUSIVE en el criterio avícola
  // tradicional (un ave justo en el límite cuenta como uniforme), por eso el
  // bin "dentro" llega hasta sup y el de "encima" empieza justo después.
  return [
    { label: labels.below, min: null, max: inf },
    { label: labels.within, min: inf, max: nextAfter(sup) },
    { label: labels.above, min: nextAfter(sup), max: null },
  ];
}

/**
 * Menor double estrictamente mayor que x. Se usa para que un corte superior
 * inclusivo (x <= sup) se exprese con la convención [min, max) del motor sin
 * desplazar el valor de forma perceptible.
 */
function nextAfter(x: number): number {
  if (!Number.isFinite(x)) return x;
  if (x === 0) return Number.MIN_VALUE;
  const buf = new DataView(new ArrayBuffer(8));
  buf.setFloat64(0, x);
  const hi = buf.getUint32(0);
  const lo = buf.getUint32(4);
  if (lo === 0xffffffff) {
    buf.setUint32(0, x > 0 ? hi + 1 : hi - 1);
    buf.setUint32(4, 0);
  } else {
    buf.setUint32(4, x > 0 ? lo + 1 : lo - 1);
  }
  return buf.getFloat64(0);
}

function inBin(x: number, bin: Bin): boolean {
  if (bin.min !== null && x < bin.min) return false;
  if (bin.max !== null && x >= bin.max) return false;
  return true;
}

/**
 * Clasifica los valores según el esquema. Cada observación entra en el PRIMER
 * bin que la acepta, de modo que bins solapados no la cuentan dos veces.
 */
export function classify(values: number[], scheme: ClassificationScheme): ClassificationResult {
  const effectiveBins = resolveBins(scheme, values);
  const bins: BinResult[] = effectiveBins.map((b) => ({ ...b, count: 0, pct: 0, indices: [] }));
  const unclassifiedIndices: number[] = [];

  values.forEach((v, i) => {
    const idx = effectiveBins.findIndex((b) => inBin(v, b));
    if (idx === -1) {
      unclassifiedIndices.push(i);
    } else {
      bins[idx].count++;
      bins[idx].indices.push(i);
    }
  });

  const n = values.length;
  if (n > 0) {
    for (const b of bins) b.pct = (b.count / n) * 100;
  }

  let modeLabel: string | null = null;
  let best = 0;
  for (const b of bins) {
    if (b.count > best) {
      best = b.count;
      modeLabel = b.label;
    }
  }

  return {
    bins,
    unclassified: unclassifiedIndices.length,
    unclassifiedIndices,
    n,
    effectiveBins,
    modeLabel,
  };
}

/**
 * Porcentaje dentro de la categoría central de una banda relativa: es la
 * definición de "uniformidad" avícola, expresada sobre el motor genérico.
 */
export function uniformityPct(values: number[], pct: number): number {
  if (values.length === 0) return 0;
  const r = classify(values, { type: 'relative-band', pct });
  return r.bins[1].pct;
}

/** Valida un conjunto de bins definido por el usuario. */
export function validateBins(bins: Bin[]): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (bins.length === 0) errors.push('Define al menos una categoría.');

  bins.forEach((b, i) => {
    if (!b.label.trim()) errors.push(`La categoría ${i + 1} no tiene nombre.`);
    if (b.min !== null && b.max !== null && b.min >= b.max) {
      errors.push(`En "${b.label}" el límite inferior (${b.min}) no es menor que el superior (${b.max}).`);
    }
  });

  const named = bins.map((b) => b.label.trim().toLowerCase());
  const dups = named.filter((l, i) => l && named.indexOf(l) !== i);
  if (dups.length > 0) {
    errors.push(`Hay nombres de categoría repetidos: ${[...new Set(dups)].join(', ')}.`);
  }

  // Solapamientos: se detectan para avisar, no son un error fatal porque el
  // motor asigna al primer bin que acepta el valor.
  for (let i = 0; i < bins.length; i++) {
    for (let j = i + 1; j < bins.length; j++) {
      const a = bins[i];
      const b = bins[j];
      const aMin = a.min ?? -Infinity;
      const aMax = a.max ?? Infinity;
      const bMin = b.min ?? -Infinity;
      const bMax = b.max ?? Infinity;
      if (aMin < bMax && bMin < aMax) {
        errors.push(`"${a.label}" y "${b.label}" se solapan; cada valor se contará solo en "${a.label}".`);
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

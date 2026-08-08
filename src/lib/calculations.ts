/**
 * Cálculo central de uniformidad del lote.
 *
 * DECISIÓN ESTADÍSTICA (auditoría 2026-08-07): la desviación estándar y el CV
 * se calculan con la fórmula MUESTRAL (n-1), porque el pesaje avícola típico
 * es una muestra del lote, no un censo. La versión poblacional (n) queda
 * disponible en el módulo `statistics/descriptive` para el caso censo.
 * Antes de la auditoría se usaba la poblacional sin documentarlo.
 *
 * El criterio de uniformidad (media ± X%) es configurable; el predeterminado
 * sigue siendo ±10% (criterio tradicional avícola). Este rango NO es un
 * intervalo de confianza: es una banda alrededor de la media observada.
 */

import { mean, sdSample, sdPopulation } from '@/lib/statistics/descriptive';

export interface FlockStats {
  totalAves: number;
  promedio: number;
  desvEst: number;
  cv: number;
  limiteInf: number;
  limiteSup: number;
  countDebajo: number;
  countEncima: number;
  countDentro: number;
  uniformidad: number;
  /** Criterio usado, en % (p.ej. 10 → media ±10%) */
  criterioPct: number;
}

export const DEFAULT_UNIFORMITY_PCT = 10;

export function pdf(x: number, mu: number, sigma: number): number {
  if (sigma === 0) return 0;
  const exp = -0.5 * Math.pow((x - mu) / sigma, 2);
  return (1 / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(exp);
}

export function calculateStats(
  pesos: number[],
  criterioPct: number = DEFAULT_UNIFORMITY_PCT,
): FlockStats {
  const n = pesos.length;
  if (n === 0) {
    return {
      totalAves: 0,
      promedio: 0,
      desvEst: 0,
      cv: 0,
      limiteInf: 0,
      limiteSup: 0,
      countDebajo: 0,
      countEncima: 0,
      countDentro: 0,
      uniformidad: 0,
      criterioPct,
    };
  }

  const media = mean(pesos);
  const limInf = media * (1 - criterioPct / 100);
  const limSup = media * (1 + criterioPct / 100);
  // Con n=1 la SD muestral no está definida; se reporta 0 para la UI
  const desvEst = n >= 2 ? sdSample(pesos) : 0;
  const cv = media > 0 && n >= 2 ? (desvEst / media) * 100 : 0;

  let countDebajo = 0;
  let countEncima = 0;
  let countDentro = 0;

  pesos.forEach((p) => {
    if (p < limInf) countDebajo++;
    else if (p > limSup) countEncima++;
    else countDentro++;
  });

  const uniformidad = (countDentro / n) * 100;

  return {
    totalAves: n,
    promedio: media,
    desvEst,
    cv,
    limiteInf: limInf,
    limiteSup: limSup,
    countDebajo,
    countEncima,
    countDentro,
    uniformidad,
    criterioPct,
  };
}

/** SD poblacional expuesta para el caso "se pesó todo el lote" (censo). */
export function sdPoblacional(pesos: number[]): number {
  return pesos.length >= 1 ? sdPopulation(pesos) : 0;
}

export function getUniformityLevel(uniformidad: number): 'excellent' | 'regular' | 'poor' {
  if (uniformidad >= 85) return 'excellent';
  if (uniformidad >= 70) return 'regular';
  return 'poor';
}

export function getDiagnosticText(uniformidad: number, countDebajo: number, countEncima: number): { title: string; message: string; level: 'excellent' | 'regular' | 'poor' } {
  const level = getUniformityLevel(uniformidad);

  if (level === 'poor') {
    return {
      title: `Uniformidad Pobre (${uniformidad.toFixed(1)}%)`,
      message: `Este lote es muy desuniforme. Las aves no alcanzarán la madurez al mismo tiempo.\n\n🚨 Acción: Revisar espacio de comedero y bebedero. Considerar separar las aves más ligeras para darles alimento extra.`,
      level: 'poor',
    };
  } else if (level === 'regular') {
    return {
      title: `Uniformidad Regular (${uniformidad.toFixed(1)}%)`,
      message: `Hay margen de mejora. Tienes ${countDebajo} aves muy ligeras y ${countEncima} muy pesadas.\n\n⚠️ Acción: Vigilar la velocidad de crecimiento de las aves pequeñas. Asegurar buena distribución del alimento.`,
      level: 'regular',
    };
  } else {
    return {
      title: `¡Excelente Uniformidad! (${uniformidad.toFixed(1)}%)`,
      message: `El lote es muy homogéneo. Están listos para un manejo estándar de iluminación y alimentación.\n\n✅ Acción: Mantener el programa actual. Prepararse para un pico de producción sincronizado.`,
      level: 'excellent',
    };
  }
}

export const GENETIC_LINES = [
  'Broiler - Cobb',
  'Broiler - Ross',
  'Broiler - Hubbard',
  'Ponedora - Hy-Line Brown',
  'Ponedora - Hy-Line W-36',
  'Ponedora - Lohmann Brown',
  'Ponedora - Lohmann LSL',
  'Ponedora - Dekalb Brown',
  'Ponedora - Dekalb White',
  'Ponedora - Nick Brown',
  'Ponedora - Super Nick',
  'Otra',
] as const;

export type GeneticLine = (typeof GENETIC_LINES)[number];

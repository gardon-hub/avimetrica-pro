/**
 * Dominio: peso corporal de aves (el módulo original).
 *
 * Se declara sobre la misma capa genérica que huevos y estadística, pero su
 * comportamiento es idéntico al de las fases 1-7: la banda relativa media ±X %
 * reproduce exactamente el cálculo de uniformidad histórico (verificado por la
 * prueba de equivalencia en tests/statistics.test.ts).
 */

import type { Domain, ClassificationPreset } from './types';

/** Criterios de uniformidad ofrecidos, con ±10 % como tradicional. */
const CRITERIOS: Array<{ pct: number; tradicional?: boolean }> = [
  { pct: 5 },
  { pct: 7.5 },
  { pct: 10, tradicional: true },
  { pct: 15 },
];

const PRESETS_BANDA: ClassificationPreset[] = CRITERIOS.map(({ pct, tradicional }) => ({
  id: `banda-${pct}`,
  label: `Media ±${pct} %${tradicional ? ' (tradicional)' : ''}`,
  source: tradicional
    ? 'Criterio tradicional de uniformidad en avicultura.'
    : 'Criterio de uniformidad alternativo, más o menos exigente que el tradicional ±10 %.',
  official: false,
  scheme: {
    type: 'relative-band',
    pct,
    labels: {
      below: `Bajo la media −${pct} %`,
      within: `Dentro de ±${pct} %`,
      above: `Sobre la media +${pct} %`,
    },
  },
  note:
    'Es una banda descriptiva alrededor de la media observada; NO es un intervalo de confianza.',
}));

export const DOMINIO_AVES: Domain = {
  id: 'aves',
  label: 'Peso corporal y uniformidad del lote',
  shortLabel: 'Aves',
  description:
    'Pesaje individual de aves, uniformidad del lote y comparación con los objetivos de la línea genética.',
  route: '/aves',
  variable: {
    label: 'Peso corporal',
    unit: 'g',
    decimals: 1,
    // Cubre desde un pollito de un día (~35 g) hasta una reproductora pesada.
    plausibleMin: 25,
    plausibleMax: 8000,
  },
  classificationPresets: PRESETS_BANDA,
  defaultPresetId: 'banda-10',
};

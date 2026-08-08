/**
 * Dominio: variable cuantitativa libre — "Modo Estadística" (Fase 10).
 *
 * Pensado para docencia: el profesor o el estudiante define el nombre de la
 * variable, su unidad y, si quiere, sus propias categorías. Toda la maquinaria
 * (descriptiva, distribuciones, IC, pruebas de hipótesis, normalidad, atípicos,
 * histograma, boxplot, Q-Q) es la misma que usan aves y huevos.
 *
 * A diferencia de los otros dominios, aquí la variable NO está fijada: se
 * sobrescribe con lo que el usuario declare en cada conjunto de datos.
 */

import type { Domain, ClassificationPreset } from './types';

const PRESET_SIN_CLASIFICAR: ClassificationPreset = {
  id: 'ninguna',
  label: 'Sin clasificación',
  source: 'Solo análisis estadístico, sin agrupar en categorías.',
  official: false,
  // Un único bin sin límites: toda observación cae dentro, de modo que la
  // clasificación no altera nada y la interfaz puede ocultarla.
  scheme: { type: 'absolute-bins', bins: [{ label: 'Todos los datos', min: null, max: null }] },
};

const PRESET_BANDA: ClassificationPreset = {
  id: 'banda-10',
  label: 'Banda relativa (media ±10 %)',
  source: 'Criterio de dispersión relativo a la media observada.',
  official: false,
  scheme: {
    type: 'relative-band',
    pct: 10,
    labels: { below: 'Bajo la media −10 %', within: 'Dentro de ±10 %', above: 'Sobre la media +10 %' },
  },
  note: 'Útil para enseñar la diferencia entre una banda descriptiva y un intervalo de confianza.',
};

const PRESET_PERSONALIZADO: ClassificationPreset = {
  id: 'personalizado',
  label: 'Categorías personalizadas',
  source: 'Cortes definidos por el usuario.',
  official: false,
  scheme: {
    type: 'absolute-bins',
    bins: [
      { label: 'Bajo', min: null, max: 0, color: '#38bdf8' },
      { label: 'Alto', min: 0, max: null, color: '#f59e0b' },
    ],
  },
  note: 'Editar los cortes según el ejercicio; sirve para practicar distribuciones de frecuencias.',
};

export const DOMINIO_GENERICO: Domain = {
  id: 'generico',
  label: 'Modo Estadística',
  shortLabel: 'Estadística',
  description:
    'Análisis estadístico de cualquier variable cuantitativa, con datos reales o experimentales, para enseñanza y práctica.',
  route: '/estadistica',
  variable: {
    // Valores por defecto: cada conjunto de datos los sobrescribe.
    label: 'Variable',
    unit: '',
    decimals: 2,
  },
  classificationPresets: [PRESET_SIN_CLASIFICAR, PRESET_BANDA, PRESET_PERSONALIZADO],
  defaultPresetId: 'ninguna',
};

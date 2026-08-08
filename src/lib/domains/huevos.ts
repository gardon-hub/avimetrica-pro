/**
 * Dominio: peso de huevo (Fase 9).
 *
 * TRAZABILIDAD DE LA NORMA USDA
 * ------------------------------
 * La norma estadounidense (USDA, "Egg Grading Manual" / 7 CFR 56) define las
 * clases de tamaño por el PESO MÍNIMO NETO POR DOCENA en onzas, no por el peso
 * de un huevo individual:
 *
 *     Jumbo 30 oz · Extra Large 27 · Large 24 · Medium 21 · Small 18 · Peewee 15
 *
 * Como aquí se pesan huevos de uno en uno, se deriva el mínimo por huevo:
 *
 *     mínimo_por_huevo (g) = (onzas_por_docena / 12) × 28.349523125
 *
 * La conversión se hace en código, no a mano, para que el origen del número sea
 * auditable y no un valor mágico. Un huevo por debajo del mínimo de Peewee no
 * tiene clase USDA: el motor lo reporta como "sin clasificar", que es lo
 * correcto y además delata errores de digitación.
 */

import type { Domain, ClassificationPreset } from './types';
import type { Bin } from '@/lib/classification';

/** Gramos exactos por onza avoirdupois (definición internacional). */
export const GRAMS_PER_OUNCE = 28.349523125;

/** Peso mínimo neto por docena que define cada clase USDA, en onzas. */
export const USDA_DOZEN_OUNCES = [
  { label: 'Peewee', ozPorDocena: 15 },
  { label: 'Small (Pequeño)', ozPorDocena: 18 },
  { label: 'Medium (Mediano)', ozPorDocena: 21 },
  { label: 'Large (Grande)', ozPorDocena: 24 },
  { label: 'Extra Large (Extra grande)', ozPorDocena: 27 },
  { label: 'Jumbo', ozPorDocena: 30 },
] as const;

/** Mínimo por huevo, en gramos, derivado del peso por docena. */
export function minimoPorHuevoGramos(ozPorDocena: number): number {
  return (ozPorDocena / 12) * GRAMS_PER_OUNCE;
}

/**
 * Construye los cortes USDA en gramos por huevo, en orden ascendente.
 * Cada clase va desde su propio mínimo hasta el mínimo de la clase siguiente.
 */
export function buildUsdaBins(): Bin[] {
  const colores = ['#94a3b8', '#38bdf8', '#22c55e', '#84cc16', '#f59e0b', '#f97316'];
  return USDA_DOZEN_OUNCES.map((clase, i) => {
    const siguiente = USDA_DOZEN_OUNCES[i + 1];
    return {
      label: clase.label,
      min: minimoPorHuevoGramos(clase.ozPorDocena),
      max: siguiente ? minimoPorHuevoGramos(siguiente.ozPorDocena) : null,
      color: colores[i],
    };
  });
}

const PRESET_USDA: ClassificationPreset = {
  id: 'usda',
  label: 'USDA (Estados Unidos)',
  source:
    'USDA, clases de tamaño por peso mínimo neto por docena (Jumbo 30 oz · XL 27 · L 24 · M 21 · S 18 · Peewee 15). ' +
    'Los cortes por huevo se derivan dividiendo entre 12 y convirtiendo a gramos (1 oz = 28.349523125 g).',
  official: true,
  scheme: { type: 'absolute-bins', bins: buildUsdaBins() },
  note:
    'Los huevos por debajo del mínimo de Peewee (≈35.4 g) no tienen clase USDA y se reportan como "sin clasificar".',
};

const PRESET_UNIFORMIDAD: ClassificationPreset = {
  id: 'banda-10',
  label: 'Uniformidad (media ±10 %)',
  source: 'Criterio de dispersión relativo a la media observada, no es una norma de tamaño.',
  official: false,
  scheme: {
    type: 'relative-band',
    pct: 10,
    labels: { below: 'Bajo la media −10 %', within: 'Dentro de ±10 %', above: 'Sobre la media +10 %' },
  },
  note:
    'Mide qué tan parejo es el lote de huevos, independientemente de su tamaño comercial. ' +
    'No confundir con un intervalo de confianza.',
};

const PRESET_PERSONALIZADO: ClassificationPreset = {
  id: 'personalizado',
  label: 'Personalizado',
  source: 'Cortes definidos por el usuario.',
  official: false,
  scheme: {
    type: 'absolute-bins',
    bins: [
      { label: 'Pequeño', min: null, max: 50, color: '#38bdf8' },
      { label: 'Mediano', min: 50, max: 60, color: '#22c55e' },
      { label: 'Grande', min: 60, max: null, color: '#f59e0b' },
    ],
  },
  note: 'Punto de partida editable para adaptarse a la norma de una planta, un mercado o un ejercicio de clase.',
};

export const DOMINIO_HUEVOS: Domain = {
  id: 'huevos',
  label: 'Peso y clasificación de huevo',
  shortLabel: 'Huevos',
  description:
    'Muestreo de peso de huevos, análisis de su distribución y clasificación automática por categorías de tamaño.',
  route: '/huevos',
  variable: {
    label: 'Peso del huevo',
    unit: 'g',
    decimals: 1,
    // Rango plausible amplio: solo para advertir de posibles errores de
    // digitación o de unidad, nunca para bloquear la captura.
    plausibleMin: 20,
    plausibleMax: 120,
  },
  classificationPresets: [PRESET_USDA, PRESET_UNIFORMIDAD, PRESET_PERSONALIZADO],
  defaultPresetId: 'usda',
};

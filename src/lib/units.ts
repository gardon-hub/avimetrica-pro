/** Conversión de unidades de peso. Internamente todo se almacena en gramos. */

export type WeightUnit = 'g' | 'kg' | 'lb';

export const GRAMS_PER: Record<WeightUnit, number> = {
  g: 1,
  kg: 1000,
  lb: 453.59237, // libra avoirdupois exacta
};

export const UNIT_LABELS: Record<WeightUnit, string> = {
  g: 'gramos (g)',
  kg: 'kilogramos (kg)',
  lb: 'libras (lb)',
};

export function toGrams(value: number, unit: WeightUnit): number {
  return value * GRAMS_PER[unit];
}

export function fromGrams(grams: number, unit: WeightUnit): number {
  return grams / GRAMS_PER[unit];
}

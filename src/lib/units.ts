/** Conversión de unidades de peso. Internamente todo se almacena en gramos. */

export type WeightUnit = 'g' | 'kg' | 'lb';

export const GRAMS_PER: Record<WeightUnit, number> = {
  g: 1,
  kg: 1000,
  lb: 453.59237, // libra avoirdupois exacta
};

// Los rótulos de unidad viven en los catálogos de idioma (clave `units`), no
// aquí: este módulo es de conversión y no debe cargar texto de interfaz.

export function toGrams(value: number, unit: WeightUnit): number {
  return value * GRAMS_PER[unit];
}

export function fromGrams(grams: number, unit: WeightUnit): number {
  return grams / GRAMS_PER[unit];
}

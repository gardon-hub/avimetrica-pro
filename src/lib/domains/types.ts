/**
 * Capa de dominios (Fase 8).
 *
 * Un "dominio" describe QUÉ se está midiendo (peso corporal de aves, peso de
 * huevo, o una variable libre definida por el usuario) sin tocar CÓMO se
 * analiza: eso vive en `src/lib/statistics/` y `src/lib/classification.ts`,
 * que son agnósticos del dominio.
 *
 * Añadir un dominio nuevo (p. ej. consumo de alimento, altura de plantas)
 * consiste en declarar un objeto Domain; no requiere tocar el motor.
 */

import type { ClassificationScheme } from '@/lib/classification';

export type DomainId = 'aves' | 'huevos' | 'generico';

/** La variable cuantitativa que se mide. */
export interface VariableDefinition {
  /** Nombre mostrado: "Peso corporal", "Peso del huevo". */
  label: string;
  /** Unidad mostrada: "g". */
  unit: string;
  /** Decimales para presentación (el cálculo nunca redondea antes). */
  decimals: number;
  /**
   * Rango plausible para ADVERTIR (nunca para bloquear): un valor fuera de
   * este rango sugiere error de digitación o de unidad.
   */
  plausibleMin?: number;
  plausibleMax?: number;
}

/** Un criterio de clasificación con su procedencia. */
export interface ClassificationPreset {
  id: string;
  label: string;
  /**
   * De dónde sale el criterio. Se muestra al usuario: el proyecto no presenta
   * aproximaciones como normas oficiales.
   */
  source: string;
  /** true solo si reproduce una norma publicada. */
  official: boolean;
  scheme: ClassificationScheme;
  note?: string;
}

export interface Domain {
  id: DomainId;
  /** Nombre completo para encabezados. */
  label: string;
  /** Nombre corto para la navegación. */
  shortLabel: string;
  description: string;
  variable: VariableDefinition;
  classificationPresets: ClassificationPreset[];
  defaultPresetId: string;
  /** Ruta de la aplicación. */
  route: string;
}

/** Busca un preset por id dentro de un dominio. */
export function findPreset(domain: Domain, presetId: string): ClassificationPreset | undefined {
  return domain.classificationPresets.find((p) => p.id === presetId);
}

/** Preset predeterminado del dominio. */
export function defaultPreset(domain: Domain): ClassificationPreset {
  return findPreset(domain, domain.defaultPresetId) ?? domain.classificationPresets[0];
}

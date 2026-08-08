/**
 * Fuentes técnicas de los pesos de referencia (Fase 7 / sección 20).
 *
 * IMPORTANTE: esta tabla refleja EXACTAMENTE lo documentado en el registro
 * del proyecto (worklog de extracción de PDFs oficiales, 2025-05). Donde el
 * registro no anota año/edición o página, se indica "no registrado" en lugar
 * de inventarlo. Las líneas sin documento se marcan como aproximadas.
 */

import { REFERENCE_DATA_VERSION } from '@/lib/diagnostic-engine';

export type EstadoFuente = 'oficial' | 'aproximado';

export interface FuenteTecnica {
  lineaGenetica: string;
  documento: string;
  detalle: string; // tabla/sección de origen, si quedó registrada
  estado: EstadoFuente;
  notas?: string;
}

export const FECHA_INCORPORACION = '2025-05 (extracción de PDFs oficiales)';
export const VERSION_DATOS = REFERENCE_DATA_VERSION;

export const FUENTES_TECNICAS: FuenteTecnica[] = [
  {
    lineaGenetica: 'Broiler - Cobb 500',
    documento: 'Suplemento de rendimiento oficial Cobb (PDF de la casa genética)',
    detalle: 'Datos diarios convertidos a semanas 1-8; verificados contra el PDF',
    estado: 'oficial',
  },
  {
    lineaGenetica: 'Broiler - Ross 308',
    documento: 'Objetivos de rendimiento oficiales Ross (PDF de la casa genética)',
    detalle: 'Datos diarios convertidos a semanas 1-8; verificados contra el PDF',
    estado: 'oficial',
  },
  {
    lineaGenetica: 'Broiler - Hubbard',
    documento: 'Sin documento oficial en el proyecto',
    detalle: 'Valores aproximados interpolados de literatura general',
    estado: 'aproximado',
    notas: 'Usar solo como orientación gruesa; no citar como estándar oficial.',
  },
  {
    lineaGenetica: 'Hy-Line Brown',
    documento: 'Hy-Line Brown Standard Guide (edición registrada: Dic 2025)',
    detalle: 'Pesos min/max semanas 1-100',
    estado: 'oficial',
  },
  {
    lineaGenetica: 'Hy-Line W-36',
    documento: 'Sin documento oficial en el proyecto',
    detalle: 'Valores aproximados',
    estado: 'aproximado',
    notas: 'Usar solo como orientación gruesa; no citar como estándar oficial.',
  },
  {
    lineaGenetica: 'Lohmann Brown-Classic',
    documento: 'Guía de manejo oficial Lohmann (PDF de la casa genética)',
    detalle: 'Tabla 17: min/prom/max, semanas 1-100',
    estado: 'oficial',
  },
  {
    lineaGenetica: 'Lohmann LSL-Lite',
    documento: 'Guía de manejo oficial Lohmann (PDF de la casa genética)',
    detalle: 'Tabla 17: min/prom/max, semanas 1-95',
    estado: 'oficial',
  },
  {
    lineaGenetica: 'Dekalb Brown',
    documento: 'Guía oficial Dekalb para alojamiento en jaula (PDF)',
    detalle: 'Semanas 1-100',
    estado: 'oficial',
  },
  {
    lineaGenetica: 'Dekalb White',
    documento: 'Guía oficial Dekalb para alojamiento en jaula (PDF)',
    detalle: 'Semanas 1-100',
    estado: 'oficial',
  },
  {
    lineaGenetica: 'Nick Brown (H&N)',
    documento: 'Guía de manejo oficial H&N (PDF de la casa genética)',
    detalle: 'Tabla 34: semanas de producción 21-100 completas',
    estado: 'oficial',
  },
  {
    lineaGenetica: 'Super Nick (H&N)',
    documento: 'Guía de manejo oficial H&N (PDF de la casa genética)',
    detalle: 'Tabla 34: semanas de producción 21-100 completas',
    estado: 'oficial',
  },
];

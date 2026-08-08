/**
 * Ensamblaje de datos para reportes (Fase 6).
 * Reúne en un solo objeto todos los resultados calculados localmente; las
 * plantillas de reporte solo formatean, nunca calculan.
 */

import { FlockStats, calculateStats } from '@/lib/calculations';
import { describe, DescriptiveSummary } from '@/lib/statistics/descriptive';
import { meanConfidenceInterval, oneSampleTTest, TTestResult } from '@/lib/statistics/inference';
import { dagostinoPearson, NormalityTestResult } from '@/lib/statistics/normality';
import { shapiroWilk, ShapiroWilkResult } from '@/lib/statistics/shapiro-wilk';
import { detectOutliers, OutlierAnalysis } from '@/lib/statistics/outliers';
import {
  generateDiagnostic, DiagnosticResult, getTargetWeight, isApproximateLine,
  REFERENCE_DATA_VERSION,
} from '@/lib/diagnostic-engine';

export const APP_VERSION = '0.7.0';

export type ReportVariant = 'resumido' | 'tecnico' | 'academico';

export const VARIANT_LABELS: Record<ReportVariant, string> = {
  resumido: 'Resumido (administración)',
  tecnico: 'Técnico',
  academico: 'Académico (con metodología)',
};

export interface ReportContext {
  lote?: string;
  granja?: string;
  galpon?: string;
  responsable?: string;
  metodoMuestreo?: string;
}

export interface ReportData {
  generadoEl: string; // fecha-hora legible
  appVersion: string;
  refDataVersion: string;
  lineaGenetica: string;
  lineaAproximada: boolean;
  edadSemanas: number | null;
  criterioPct: number;
  contexto: ReportContext;
  stats: FlockStats;
  descr: DescriptiveSummary;
  ci95: { lower: number; upper: number } | null;
  target: { pesoMin: number; pesoOptimo: number; pesoMax: number } | null;
  targetDiffG: number | null;
  targetDiffPct: number | null;
  pctDentroGuia: number | null;
  normality: NormalityTestResult | null;
  shapiro: ShapiroWilkResult | null;
  outliers: OutlierAnalysis;
  /** t bilateral al 95% contra el peso objetivo (solo si hay objetivo) */
  tTest: TTestResult | null;
  diagnostic: DiagnosticResult;
  limitaciones: string[];
  pesos: number[];
}

const MUESTREO_TEXT: Record<string, string> = {
  aleatorio: 'aleatorio',
  sistematico: 'sistemático',
  zonas: 'por zonas',
  conveniencia: 'por conveniencia',
  ns: 'no especificado',
};

export function muestreoLabel(v: string | undefined): string {
  if (!v) return 'no especificado';
  return MUESTREO_TEXT[v] ?? v;
}

function buildLimitaciones(d: {
  n: number;
  metodoMuestreo?: string;
  lineaAproximada: boolean;
  edadSemanas: number | null;
  normality: NormalityTestResult | null;
  outlierCount: number;
}): string[] {
  const lim: string[] = [];
  if (d.n < 30) {
    lim.push(`La muestra es pequeña (n=${d.n}): las estimaciones tienen amplia incertidumbre y las pruebas poca potencia. Se recomienda pesar al menos 30 aves.`);
  }
  if (!d.metodoMuestreo || d.metodoMuestreo === 'ns') {
    lim.push('No se documentó el método de muestreo: si las aves no se seleccionaron al azar, los resultados pueden no representar al lote completo.');
  } else if (d.metodoMuestreo === 'conveniencia') {
    lim.push('El muestreo fue por conveniencia: las aves más fáciles de capturar pueden diferir sistemáticamente del resto del lote (sesgo de selección).');
  }
  if (d.lineaAproximada) {
    lim.push('Los pesos de referencia de esta línea genética son APROXIMADOS (sin guía oficial auditada): la comparación con el objetivo es orientativa.');
  }
  if (d.edadSemanas === null) {
    lim.push('No se indicó la edad del lote: no fue posible comparar contra el peso objetivo de la línea genética.');
  }
  if (d.normality && d.normality.pValue < 0.05) {
    lim.push('Los pesos se desvían de la distribución normal: las probabilidades teóricas y la prueba t deben interpretarse con cautela (ver histograma y Q-Q).');
  }
  if (d.outlierCount > 0) {
    lim.push(`Se detectaron ${d.outlierCount} posible(s) valor(es) atípico(s) que influyen en media, SD y CV. Verificar si son errores de medición o aves reales.`);
  }
  lim.push('Este reporte describe el pesaje analizado; no sustituye el criterio del profesional a cargo del lote.');
  return lim;
}

export function buildReportData(input: {
  pesos: number[];
  lineaGenetica: string;
  edadSemanas: string;
  criterioPct: number;
  contexto: ReportContext;
}): ReportData | null {
  const { pesos, lineaGenetica, criterioPct, contexto } = input;
  if (pesos.length === 0) return null;

  const descr = describe(pesos);
  if (!descr) return null;

  const stats = calculateStats(pesos, criterioPct);
  const edad = parseFloat(input.edadSemanas);
  const edadSemanas = Number.isFinite(edad) && edad > 0 ? edad : null;
  const target = edadSemanas ? getTargetWeight(lineaGenetica, edadSemanas) : null;
  const ci = meanConfidenceInterval(pesos, 0.95);
  const normality = dagostinoPearson(pesos);
  const shapiro = shapiroWilk(pesos);
  const outliers = detectOutliers(pesos);
  const tTest = target && pesos.length >= 2 ? oneSampleTTest(pesos, target.pesoOptimo, 'two-sided', 0.95) : null;

  const diagnostic = generateDiagnostic({
    lineaGenetica,
    edadSemanas: edadSemanas ?? 0,
    promedio: stats.promedio,
    desvEst: stats.desvEst,
    cv: stats.cv,
    uniformidad: stats.uniformidad,
    limiteInf: stats.limiteInf,
    limiteSup: stats.limiteSup,
    countDebajo: stats.countDebajo,
    countEncima: stats.countEncima,
    countDentro: stats.countDentro,
    totalAves: stats.totalAves,
  });

  const lineaAproximada = isApproximateLine(lineaGenetica);

  return {
    generadoEl: new Date().toLocaleString(),
    appVersion: APP_VERSION,
    refDataVersion: REFERENCE_DATA_VERSION,
    lineaGenetica,
    lineaAproximada,
    edadSemanas,
    criterioPct,
    contexto,
    stats,
    descr,
    ci95: ci ? { lower: ci.lower, upper: ci.upper } : null,
    target,
    targetDiffG: target ? stats.promedio - target.pesoOptimo : null,
    targetDiffPct: target ? ((stats.promedio - target.pesoOptimo) / target.pesoOptimo) * 100 : null,
    pctDentroGuia: target
      ? (pesos.filter((p) => p >= target.pesoMin && p <= target.pesoMax).length / pesos.length) * 100
      : null,
    normality,
    shapiro,
    outliers,
    tTest,
    diagnostic,
    limitaciones: buildLimitaciones({
      n: pesos.length,
      metodoMuestreo: contexto.metodoMuestreo,
      lineaAproximada,
      edadSemanas,
      normality,
      outlierCount: outliers.flags.length,
    }),
    pesos,
  };
}

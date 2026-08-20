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

export const APP_VERSION = '0.7.1';

export type ReportVariant = 'resumido' | 'tecnico' | 'academico';

/**
 * Clave del catálogo para cada variante. El rótulo visible sale del idioma
 * activo; aquí solo vive el identificador, que es del dominio.
 */
export const VARIANT_KEYS: Record<ReportVariant, string> = {
  resumido: 'variantSummary',
  tecnico: 'variantTechnical',
  academico: 'variantAcademic',
};

export interface ReportContext {
  lote?: string;
  granja?: string;
  galpon?: string;
  responsable?: string;
  metodoMuestreo?: string;
}

export interface ReportData {
  generadoEl: string; // fecha-hora legible, formateada con el idioma del sistema
  /**
   * Marca de tiempo cruda. El reporte HTML la formatea con el idioma elegido
   * por el usuario; `generadoEl` no sirve para eso porque ya viene formateada.
   */
  generadoEnMs: number;
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
  limitaciones: ReportLimitation[];
  pesos: number[];
}

/**
 * El método de muestreo se guarda como identificador; su rótulo sale del
 * catálogo (clave `sampling`), igual en interfaz, reporte y Excel.
 */

/**
 * Limitación detectada, SIN redactar: el generador del reporte compone el
 * texto desde el catálogo con `code` y `params`. Este módulo ensambla datos,
 * no texto de interfaz.
 */
export interface ReportLimitation {
  code:
    | 'limSmall'
    | 'limSamplingUnknown'
    | 'limSamplingConvenience'
    | 'limApproxLine'
    | 'limNoAge'
    | 'limNormality'
    | 'limOutliers'
    | 'limProfessional';
  params?: Record<string, string | number>;
}

function buildLimitaciones(d: {
  n: number;
  metodoMuestreo?: string;
  lineaAproximada: boolean;
  edadSemanas: number | null;
  normality: NormalityTestResult | null;
  outlierCount: number;
}): ReportLimitation[] {
  const lim: ReportLimitation[] = [];
  if (d.n < 30) lim.push({ code: 'limSmall', params: { n: d.n } });
  if (!d.metodoMuestreo || d.metodoMuestreo === 'ns') {
    lim.push({ code: 'limSamplingUnknown' });
  } else if (d.metodoMuestreo === 'conveniencia') {
    lim.push({ code: 'limSamplingConvenience' });
  }
  if (d.lineaAproximada) lim.push({ code: 'limApproxLine' });
  if (d.edadSemanas === null) lim.push({ code: 'limNoAge' });
  if (d.normality && d.normality.pValue < 0.05) lim.push({ code: 'limNormality' });
  if (d.outlierCount > 0) lim.push({ code: 'limOutliers', params: { n: d.outlierCount } });
  lim.push({ code: 'limProfessional' });
  return lim;
}

export function buildReportData(input: {
  pesos: number[];
  lineaGenetica: string;
  /** Propósito declarado para una línea fuera del catálogo (ver store). */
  tipoOtraLinea?: 'broiler' | 'ponedora';
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
    tipoAveManual: input.tipoOtraLinea,
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
    generadoEnMs: Date.now(),
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

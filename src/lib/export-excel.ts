/**
 * Exportación del análisis a Excel (Fase 6).
 * Hojas: Resumen (metadatos y resultados clave), Descriptiva (tabla completa),
 * Pesos (datos individuales con estado y marcas de atípico).
 */

import * as XLSX from 'xlsx';
import { ReportData, ReportLimitation, muestreoLabel } from '@/lib/report-data';

/**
 * Redacción en español de cada limitación.
 *
 * El reporte HTML las toma del catálogo de idiomas; esta tabla sobrevive
 * únicamente porque el Excel todavía no está traducido. Cuando lo esté, debe
 * borrarse y pasar el traductor, igual que a los generadores de HTML.
 */
const LIMITACION_ESP: Record<ReportLimitation['code'], (p?: Record<string, string | number>) => string> = {
  limSmall: (p) => `La muestra es pequeña (n=${p?.n}): las estimaciones tienen amplia incertidumbre y las pruebas poca potencia. Se recomienda pesar al menos 30 aves.`,
  limSamplingUnknown: () => 'No se documentó el método de muestreo: si las aves no se seleccionaron al azar, los resultados pueden no representar al lote completo.',
  limSamplingConvenience: () => 'El muestreo fue por conveniencia: las aves más fáciles de capturar pueden diferir sistemáticamente del resto del lote (sesgo de selección).',
  limApproxLine: () => 'Los pesos de referencia de esta línea genética son APROXIMADOS (sin guía oficial auditada): la comparación con el objetivo es orientativa.',
  limNoAge: () => 'No se indicó la edad del lote: no fue posible comparar contra el peso objetivo de la línea genética.',
  limNormality: () => 'Los pesos se desvían de la distribución normal: las probabilidades teóricas y la prueba t deben interpretarse con cautela (ver histograma y Q-Q).',
  limOutliers: (p) => `Se detectaron ${p?.n} posible(s) valor(es) atípico(s) que influyen en media, SD y CV. Verificar si son errores de medición o aves reales.`,
  limProfessional: () => 'Este reporte describe el pesaje analizado; no sustituye el criterio del profesional a cargo del lote.',
};

function limitacionEsp(l: ReportLimitation): string {
  return LIMITACION_ESP[l.code](l.params);
}
import { OUTLIER_METHOD_LABELS } from '@/lib/statistics/outliers';

type Row = Array<string | number>;

function num(v: number | null | undefined, dec = 2): number | string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  return Number(v.toFixed(dec));
}

export function buildWorkbook(d: ReportData): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  // ── Hoja Resumen ──
  const resumen: Row[] = [
    ['Avimétrica Pro — Reporte de uniformidad'],
    ['Generado', d.generadoEl],
    ['Versión de la aplicación', d.appVersion],
    ['Versión datos de referencia', d.refDataVersion],
    [],
    ['Línea genética', d.lineaGenetica + (d.lineaAproximada ? ' (referencia APROXIMADA)' : '')],
    ['Edad (semanas)', d.edadSemanas ?? 'No especificada'],
    ['Lote', d.contexto.lote || '—'],
    ['Granja', d.contexto.granja || '—'],
    ['Galpón', d.contexto.galpon || '—'],
    ['Responsable', d.contexto.responsable || '—'],
    ['Método de muestreo', muestreoLabel(d.contexto.metodoMuestreo)],
    [],
    ['Aves pesadas (n)', d.stats.totalAves],
    ['Media (g)', num(d.stats.promedio)],
    ['Desv. estándar muestral (g)', num(d.stats.desvEst)],
    ['CV (%)', num(d.stats.cv)],
    ['Criterio de uniformidad', `media ±${d.criterioPct}%`],
    ['Uniformidad (%)', num(d.stats.uniformidad)],
    ['Aves debajo / dentro / encima', `${d.stats.countDebajo} / ${d.stats.countDentro} / ${d.stats.countEncima}`],
    ['IC 95% de la media (g)', d.ci95 ? `${num(d.ci95.lower)} – ${num(d.ci95.upper)}` : '—'],
    [],
    ['Peso objetivo (g)', d.target ? num(d.target.pesoOptimo, 0) : '—'],
    ['Rango guía (g)', d.target ? `${num(d.target.pesoMin, 0)} – ${num(d.target.pesoMax, 0)}` : '—'],
    ['Diferencia vs. objetivo (g)', num(d.targetDiffG, 1)],
    ['Diferencia vs. objetivo (%)', num(d.targetDiffPct, 2)],
    ['% de aves dentro del rango guía', num(d.pctDentroGuia, 1)],
    [],
    ['Normalidad (Shapiro-Wilk)', d.shapiro ? `W = ${num(d.shapiro.W, 4)}, p = ${d.shapiro.pValue < 0.0001 ? '< 0.0001' : num(d.shapiro.pValue, 4)}` : 'No evaluada (n < 3 o sin variabilidad)'],
    ['Normalidad (D\'Agostino-Pearson)', d.normality ? `K² = ${num(d.normality.statistic, 3)}, p = ${d.normality.pValue < 0.0001 ? '< 0.0001' : num(d.normality.pValue, 4)}` : 'No evaluada (n < 8)'],
    ['Prueba t vs. objetivo (bilateral 95%)', d.tTest ? `t = ${num(d.tTest.t, 4)}, gl = ${d.tTest.df}, p = ${d.tTest.pValue < 0.0001 ? '< 0.0001' : num(d.tTest.pValue, 4)}` : 'No ejecutada'],
    ['Posibles atípicos', d.outliers.flags.length],
    [],
    ['Limitaciones'],
    ...d.limitaciones.map((l): Row => [limitacionEsp(l)]),
  ];
  const wsResumen = XLSX.utils.aoa_to_sheet(resumen);
  wsResumen['!cols'] = [{ wch: 34 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

  // ── Hoja Descriptiva ──
  const s = d.descr;
  const descriptiva: Row[] = [
    ['Estadístico', 'Valor', 'Unidad'],
    ['n', s.n, 'aves'],
    ['Suma', num(s.sum, 1), 'g'],
    ['Media', num(s.mean), 'g'],
    ['Mediana', num(s.median), 'g'],
    ['Moda(s)', s.modes.length ? s.modes.join(', ') : 'sin repetición', 'g'],
    ['Mínimo', num(s.min, 1), 'g'],
    ['Máximo', num(s.max, 1), 'g'],
    ['Rango', num(s.range, 1), 'g'],
    ['Varianza muestral (n−1)', num(s.varianceSample), 'g²'],
    ['Desv. estándar muestral', num(s.sdSample), 'g'],
    ['Varianza poblacional (n)', num(s.variancePopulation), 'g²'],
    ['Desv. estándar poblacional', num(s.sdPopulation), 'g'],
    ['CV', num(s.cv), '%'],
    ['Error estándar de la media', num(s.sem), 'g'],
    ['Cuartil 1 (P25)', num(s.q1), 'g'],
    ['Cuartil 3 (P75)', num(s.q3), 'g'],
    ['IQR', num(s.iqr), 'g'],
    ['Percentil 5', num(s.percentiles[5]), 'g'],
    ['Percentil 10', num(s.percentiles[10]), 'g'],
    ['Percentil 90', num(s.percentiles[90]), 'g'],
    ['Percentil 95', num(s.percentiles[95]), 'g'],
    ['Asimetría (G1)', s.skewness === null ? '— (n<3)' : num(s.skewness, 4), ''],
    ['Curtosis en exceso (G2)', s.kurtosis === null ? '— (n<4)' : num(s.kurtosis, 4), ''],
  ];
  const wsDescr = XLSX.utils.aoa_to_sheet(descriptiva);
  wsDescr['!cols'] = [{ wch: 30 }, { wch: 18 }, { wch: 8 }];
  XLSX.utils.book_append_sheet(wb, wsDescr, 'Descriptiva');

  // ── Hoja Pesos ──
  const flagByIndex = new Map(d.outliers.flags.map((f) => [f.index, f]));
  const pesosRows: Row[] = [['# Ave', 'Peso (g)', `Estado vs. banda ±${d.criterioPct}%`, 'Posible atípico']];
  d.pesos.forEach((p, i) => {
    let estado = 'Dentro del rango';
    if (p < d.stats.limiteInf) estado = 'Debajo';
    else if (p > d.stats.limiteSup) estado = 'Encima';
    const flag = flagByIndex.get(i);
    pesosRows.push([i + 1, p, estado, flag ? flag.methods.map((m) => OUTLIER_METHOD_LABELS[m]).join(' · ') : '']);
  });
  const wsPesos = XLSX.utils.aoa_to_sheet(pesosRows);
  wsPesos['!cols'] = [{ wch: 7 }, { wch: 10 }, { wch: 22 }, { wch: 38 }];
  XLSX.utils.book_append_sheet(wb, wsPesos, 'Pesos');

  return wb;
}

export function downloadExcel(d: ReportData): void {
  const wb = buildWorkbook(d);
  const fecha = new Date().toISOString().slice(0, 10);
  const lote = d.contexto.lote ? `-${d.contexto.lote.replace(/[^\w-]+/g, '_')}` : '';
  XLSX.writeFile(wb, `uniformidad${lote}-${fecha}.xlsx`);
}

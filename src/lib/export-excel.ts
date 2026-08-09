/**
 * Exportación del análisis a Excel (Fase 6).
 * Hojas: Resumen (metadatos y resultados clave), Descriptiva (tabla completa),
 * Pesos (datos individuales con estado y marcas de atípico).
 *
 * Como los generadores de HTML, recibe el traductor (ver report-i18n.ts): el
 * libro sale en el idioma elegido, nombres de hoja incluidos. Las limitaciones
 * y los métodos de atípicos se toman de las MISMAS claves que usa el reporte
 * HTML, para que los dos documentos no puedan divergir.
 */

import * as XLSX from 'xlsx';
import { ReportData, ReportLimitation } from '@/lib/report-data';
import type { ReportI18n, ReportTranslator } from '@/lib/report-i18n';
import { fmtPFrase } from '@/lib/p-value';

type Row = Array<string | number>;

function num(v: number | null | undefined, dec = 2): number | string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  return Number(v.toFixed(dec));
}

function limitacion(l: ReportLimitation, t: ReportTranslator): string {
  return t(`reports.aves.${l.code}`, l.params);
}

export function buildWorkbook(d: ReportData, { locale, t }: ReportI18n): XLSX.WorkBook {
  const tr = (k: string, v?: Record<string, string | number>) => t(`excel.aves.${k}`, v);
  const wb = XLSX.utils.book_new();

  // ── Hoja Resumen ──
  const resumen: Row[] = [
    [tr('docTitle')],
    [tr('generated'), new Date(d.generadoEnMs).toLocaleString(locale)],
    [tr('appVersion'), d.appVersion],
    [tr('refDataVersion'), d.refDataVersion],
    [],
    [tr('geneticLine'), d.lineaGenetica + (d.lineaAproximada ? ` ${tr('approxSuffix')}` : '')],
    [tr('ageWeeks'), d.edadSemanas ?? tr('unspecified')],
    [tr('lot'), d.contexto.lote || '—'],
    [tr('farm'), d.contexto.granja || '—'],
    [tr('house'), d.contexto.galpon || '—'],
    [tr('responsible'), d.contexto.responsable || '—'],
    [tr('samplingMethod'), t(`sampling.${d.contexto.metodoMuestreo || 'ns'}`)],
    [],
    [tr('birds'), d.stats.totalAves],
    [tr('mean'), num(d.stats.promedio)],
    [tr('sd'), num(d.stats.desvEst)],
    [tr('cv'), num(d.stats.cv)],
    [tr('criterion'), tr('criterionValue', { pct: d.criterioPct })],
    [tr('uniformity'), num(d.stats.uniformidad)],
    [tr('belowWithinAbove'), `${d.stats.countDebajo} / ${d.stats.countDentro} / ${d.stats.countEncima}`],
    [tr('ci95'), d.ci95 ? `${num(d.ci95.lower)} – ${num(d.ci95.upper)}` : '—'],
    [],
    [tr('targetWeight'), d.target ? num(d.target.pesoOptimo, 0) : '—'],
    [tr('guideRange'), d.target ? `${num(d.target.pesoMin, 0)} – ${num(d.target.pesoMax, 0)}` : '—'],
    [tr('diffG'), num(d.targetDiffG, 1)],
    [tr('diffPct'), num(d.targetDiffPct, 2)],
    [tr('pctWithinGuide'), num(d.pctDentroGuia, 1)],
    [],
    [tr('shapiro'), d.shapiro ? `W = ${num(d.shapiro.W, 4)}, p ${fmtPFrase(d.shapiro.pValue)}` : tr('shapiroNotRun')],
    [tr('dagostino'), d.normality ? `K² = ${num(d.normality.statistic, 3)}, p ${fmtPFrase(d.normality.pValue)}` : tr('dagostinoNotRun')],
    [tr('tTest'), d.tTest ? `t = ${num(d.tTest.t, 4)}, gl = ${d.tTest.df}, p ${fmtPFrase(d.tTest.pValue)}` : tr('tTestNotRun')],
    [tr('possibleOutliers'), d.outliers.flags.length],
    [],
    [tr('limitations')],
    ...d.limitaciones.map((l): Row => [limitacion(l, t)]),
  ];
  const wsResumen = XLSX.utils.aoa_to_sheet(resumen);
  wsResumen['!cols'] = [{ wch: 34 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, wsResumen, tr('sheetSummary'));

  // ── Hoja Descriptiva ──
  const s = d.descr;
  const g = tr('unitG');
  const g2 = tr('unitG2');
  const descriptiva: Row[] = [
    [tr('colStatistic'), tr('colValue'), tr('colUnit')],
    ['n', s.n, tr('unitBirds')],
    [tr('rowSum'), num(s.sum, 1), g],
    [tr('rowMean'), num(s.mean), g],
    [tr('rowMedian'), num(s.median), g],
    [tr('rowModes'), s.modes.length ? s.modes.join(', ') : tr('noRepeat'), g],
    [tr('rowMin'), num(s.min, 1), g],
    [tr('rowMax'), num(s.max, 1), g],
    [tr('rowRange'), num(s.range, 1), g],
    [tr('rowVarSample'), num(s.varianceSample), g2],
    [tr('rowSdSample'), num(s.sdSample), g],
    [tr('rowVarPopulation'), num(s.variancePopulation), g2],
    [tr('rowSdPopulation'), num(s.sdPopulation), g],
    [tr('rowCv'), num(s.cv), '%'],
    [tr('rowSem'), num(s.sem), g],
    [tr('rowQ1'), num(s.q1), g],
    [tr('rowQ3'), num(s.q3), g],
    [tr('rowIqr'), num(s.iqr), g],
    [tr('rowPercentile', { n: 5 }), num(s.percentiles[5]), g],
    [tr('rowPercentile', { n: 10 }), num(s.percentiles[10]), g],
    [tr('rowPercentile', { n: 90 }), num(s.percentiles[90]), g],
    [tr('rowPercentile', { n: 95 }), num(s.percentiles[95]), g],
    [tr('rowSkewness'), s.skewness === null ? tr('naMin', { n: 3 }) : num(s.skewness, 4), ''],
    [tr('rowKurtosis'), s.kurtosis === null ? tr('naMin', { n: 4 }) : num(s.kurtosis, 4), ''],
  ];
  const wsDescr = XLSX.utils.aoa_to_sheet(descriptiva);
  wsDescr['!cols'] = [{ wch: 30 }, { wch: 18 }, { wch: 8 }];
  XLSX.utils.book_append_sheet(wb, wsDescr, tr('sheetDescriptive'));

  // ── Hoja Pesos ──
  const flagByIndex = new Map(d.outliers.flags.map((f) => [f.index, f]));
  const pesosRows: Row[] = [[tr('colBird'), tr('colWeight'), tr('colStatus', { pct: d.criterioPct }), tr('colOutlier')]];
  d.pesos.forEach((peso, i) => {
    let estado = tr('statusWithin');
    if (peso < d.stats.limiteInf) estado = tr('statusBelow');
    else if (peso > d.stats.limiteSup) estado = tr('statusAbove');
    const flag = flagByIndex.get(i);
    pesosRows.push([i + 1, peso, estado, flag ? flag.methods.map((m) => t(`outlierMethods.${m}`)).join(' · ') : '']);
  });
  const wsPesos = XLSX.utils.aoa_to_sheet(pesosRows);
  wsPesos['!cols'] = [{ wch: 7 }, { wch: 10 }, { wch: 22 }, { wch: 38 }];
  XLSX.utils.book_append_sheet(wb, wsPesos, tr('sheetWeights'));

  return wb;
}

export function downloadExcel(d: ReportData, i18n: ReportI18n): void {
  const wb = buildWorkbook(d, i18n);
  const fecha = new Date().toISOString().slice(0, 10);
  const lote = d.contexto.lote ? `-${d.contexto.lote.replace(/[^\w-]+/g, '_')}` : '';
  XLSX.writeFile(wb, `${i18n.t('excel.aves.fileName')}${lote}-${fecha}.xlsx`);
}

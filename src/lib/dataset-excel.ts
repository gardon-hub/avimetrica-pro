/**
 * Exportación a Excel de un muestreo genérico (huevos o docencia).
 * Hojas: Resumen, Categorías y Datos.
 *
 * Recibe el traductor igual que los generadores de HTML (ver report-i18n.ts).
 */

import * as XLSX from 'xlsx';
import { describe } from '@/lib/statistics/descriptive';
import { meanConfidenceInterval } from '@/lib/statistics/inference';
import { shapiroWilk } from '@/lib/statistics/shapiro-wilk';
import { detectOutliers } from '@/lib/statistics/outliers';
import { classify } from '@/lib/classification';
import type { DatasetReportInput } from '@/lib/dataset-report';
import type { ReportI18n } from '@/lib/report-i18n';
import { fmtPFrase } from '@/lib/p-value';

type Row = Array<string | number>;

function num(v: number, dec = 2): number | string {
  return Number.isFinite(v) ? Number(v.toFixed(dec)) : '—';
}

/**
 * Arma el libro. Separado de la descarga para que las pruebas puedan
 * inspeccionarlo sin tocar el sistema de archivos, igual que en export-excel.
 */
export function buildDatasetWorkbook(
  input: DatasetReportInput,
  { locale, t }: ReportI18n,
): XLSX.WorkBook | null {
  const { valores, variable, scheme, contexto } = input;
  const d = describe(valores);
  if (!d) return null;

  const tr = (k: string, v?: Record<string, string | number>) => t(`excel.dataset.${k}`, v);
  const dec = variable.decimals;
  const u = variable.unit;
  const ci = meanConfidenceInterval(valores, 0.95);
  const sw = shapiroWilk(valores);
  const out = detectOutliers(valores);
  const cl = classify(valores, scheme);
  const sinClasificar = tr('unclassified');

  const wb = XLSX.utils.book_new();

  const resumen: Row[] = [
    [tr('docTitle', { modulo: input.tituloModulo })],
    [tr('generated'), new Date().toLocaleString(locale)],
    [],
    [tr('variable'), `${variable.label}${u ? ` (${u})` : ''}`],
    [tr('sampling'), contexto.nombre || '—'],
    [tr('origin'), contexto.origen || '—'],
    [tr('date'), contexto.fecha || '—'],
    [tr('responsible'), contexto.responsable || '—'],
    [],
    ['n', d.n],
    [tr('mean'), num(d.mean, dec)],
    [tr('median'), num(d.median, dec)],
    [tr('sdSample'), num(d.sdSample, dec)],
    [tr('cv'), num(d.cv, 2)],
    [tr('sem'), num(d.sem, dec)],
    [tr('min'), num(d.min, dec)],
    [tr('max'), num(d.max, dec)],
    [tr('range'), num(d.range, dec)],
    ['Q1', num(d.q1, dec)],
    ['Q3', num(d.q3, dec)],
    ['IQR', num(d.iqr, dec)],
    [tr('skewness'), d.skewness === null ? '—' : num(d.skewness, 4)],
    [tr('kurtosis'), d.kurtosis === null ? '—' : num(d.kurtosis, 4)],
    [tr('ci95'), ci ? `${num(ci.lower, dec)} – ${num(ci.upper, dec)}` : '—'],
    [],
    [tr('criterion'), input.criterioLabel],
    [tr('provenance'), input.criterioFuente],
    [tr('officialStandard'), input.criterioOficial ? tr('yes') : tr('no')],
    [],
    [tr('shapiro'), sw ? `W = ${num(sw.W, 4)}, p ${fmtPFrase(sw.pValue)}` : tr('notRun')],
    [tr('possibleOutliers'), out.flags.length],
  ];
  const wsR = XLSX.utils.aoa_to_sheet(resumen);
  wsR['!cols'] = [{ wch: 32 }, { wch: 46 }];
  XLSX.utils.book_append_sheet(wb, wsR, tr('sheetSummary'));

  const cats: Row[] = [[tr('colCategory'), tr('colMin'), tr('colMax'), 'n', '%']];
  cl.bins.forEach((b, i) => {
    const eb = cl.effectiveBins[i];
    cats.push([
      b.label,
      eb.min === null ? tr('noLimit') : num(eb.min, dec),
      eb.max === null ? tr('noLimit') : num(eb.max, dec),
      b.count,
      num(b.pct, 1),
    ]);
  });
  if (cl.unclassified > 0) {
    cats.push([sinClasificar, '', '', cl.unclassified, num((cl.unclassified / cl.n) * 100, 1)]);
  }
  const wsC = XLSX.utils.aoa_to_sheet(cats);
  wsC['!cols'] = [{ wch: 28 }, { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 8 }];
  XLSX.utils.book_append_sheet(wb, wsC, tr('sheetCategories'));

  const flagIdx = new Set(out.flags.map((x) => x.index));
  const datos: Row[] = [['#', `${variable.label}${u ? ` (${u})` : ''}`, tr('colCategory'), tr('colOutlier')]];
  valores.forEach((v, i) => {
    const bin = cl.bins.find((b) => b.indices.includes(i));
    datos.push([i + 1, v, bin?.label ?? sinClasificar, flagIdx.has(i) ? tr('yes') : '']);
  });
  const wsD = XLSX.utils.aoa_to_sheet(datos);
  wsD['!cols'] = [{ wch: 6 }, { wch: 16 }, { wch: 28 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsD, tr('sheetData'));

  return wb;
}

export function downloadDatasetExcel(input: DatasetReportInput, i18n: ReportI18n): void {
  const wb = buildDatasetWorkbook(input, i18n);
  if (!wb) return;
  const fecha = new Date().toISOString().slice(0, 10);
  const base = (input.contexto.nombre || input.variable.label).replace(/[^\w-]+/g, '_');
  XLSX.writeFile(wb, `${base}-${fecha}.xlsx`);
}

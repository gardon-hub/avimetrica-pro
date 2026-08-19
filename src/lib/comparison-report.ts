/**
 * Reporte imprimible de la comparación entre dos muestreos.
 *
 * Hasta ahora la comparación solo existía en pantalla: este módulo la vuelve
 * documento, con los mismos gráficos y el mismo lenguaje estadístico prudente.
 * Como el resto de reportes, SOLO formatea resultados ya calculados.
 */

import type { DescriptiveSummary } from '@/lib/statistics/descriptive';
import type { TTestResult, TwoSampleTTestResult } from '@/lib/statistics/inference';
import { REPORT_CSS } from '@/lib/report-html';
import { APP_VERSION } from '@/lib/report-data';
import { svgToDataUri } from '@/lib/report-charts';
import {
  categoriasComparadasSvg,
  mediasComparadasSvg,
  type CategoriaComparadaSvg,
} from '@/lib/dataset-report-charts';
import { reportFooterHtml, type ReportI18n } from '@/lib/report-i18n';
import { logoUrl } from '@/lib/base-path';
import { fmtP, fmtPFrase } from '@/lib/p-value';

export interface ComparisonReportInput {
  tituloModulo: string;
  nombreA: string;
  nombreB: string;
  dA: DescriptiveSummary;
  dB: DescriptiveSummary;
  ciA: { lower: number; upper: number } | null;
  ciB: { lower: number; upper: number } | null;
  test: TTestResult | TwoSampleTTestResult | null;
  pareada: boolean;
  /** Diseño declarado por el usuario, que condiciona la lectura del valor p. */
  diseno: 'independientes' | 'pareadas' | 'repeticiones';
  categorias: Array<CategoriaComparadaSvg & { nA: number; nB: number }> | null;
  unidad: string;
  decimales: number;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Clave del catálogo para cada diseño declarado. */
const DISENO_CLAVE: Record<ComparisonReportInput['diseno'], string> = {
  independientes: 'designIndependent',
  pareadas: 'designPaired',
  repeticiones: 'designRepeated',
};

export function buildComparisonReportHtml(
  input: ComparisonReportInput,
  { locale, t }: ReportI18n,
): string {
  const { dA, dB, test, unidad: u, decimales: dec } = input;
  const f = (v: number, k = dec) => (Number.isFinite(v) ? v.toFixed(k) : v > 0 ? '+∞' : '−∞');
  /** Atajo al espacio de este reporte. */
  const tr = (k: string, v?: Record<string, string | number>) => t(`reports.comparison.${k}`, v);
  const disenoTexto = tr(DISENO_CLAVE[input.diseno]);

  const gMedias = svgToDataUri(
    mediasComparadasSvg(dA.mean, dB.mean, input.ciA, input.ciB, input.nombreA, input.nombreB, u, dec, t),
  );
  const gCategorias = input.categorias
    ? svgToDataUri(categoriasComparadasSvg(input.categorias, input.nombreA, input.nombreB))
    : '';

  const filas: Array<[string, string, string, string]> = [
    [tr('metricN'), String(dA.n), String(dB.n), '—'],
    [tr('metricMean'), f(dA.mean), f(dB.mean), f(dA.mean - dB.mean)],
    [tr('metricMedian'), f(dA.median), f(dB.median), f(dA.median - dB.median)],
    [tr('metricSd'), f(dA.sdSample), f(dB.sdSample), f(dA.sdSample - dB.sdSample)],
    [tr('metricCv'), f(dA.cv, 2), f(dB.cv, 2), f(dA.cv - dB.cv, 2)],
    [tr('metricMin'), f(dA.min), f(dB.min), '—'],
    [tr('metricMax'), f(dA.max), f(dB.max), '—'],
    [tr('metricCi'), input.ciA ? `${f(input.ciA.lower)} – ${f(input.ciA.upper)}` : '—',
      input.ciB ? `${f(input.ciB.lower)} – ${f(input.ciB.upper)}` : '—', '—'],
  ];

  const muestraPequena = dA.n < 30 || dB.n < 30;

  const body = `
<div class="header">
  <img src="${logoUrl()}" class="logo" alt="Avimétrica Pro"/>
  <h1>${esc(tr('title', { modulo: input.tituloModulo }))}</h1>
  <div class="subtitle">${esc(t('reports.generated', { fecha: new Date().toLocaleString(locale), version: APP_VERSION }))}</div>
</div>

<div class="meta">
  <div><b>${esc(tr('samplingA'))}</b> ${esc(input.nombreA)}</div>
  <div><b>${esc(tr('samplingB'))}</b> ${esc(input.nombreB)}</div>
  <div><b>${esc(tr('declaredDesign'))}</b> ${esc(disenoTexto)}</div>
  <div><b>${esc(tr('unit'))}</b> ${esc(u || '—')}</div>
</div>

<h2>${esc(tr('meansTitle'))}</h2>
<div class="chart"><img src="${gMedias}" alt="${esc(tr('meansAlt'))}"/></div>
<p class="note">${esc(tr('meansNote'))}</p>

<h2>${esc(tr('summaryTitle'))}</h2>
<table>
  <tr><th>${esc(tr('colMetric'))}</th><th class="num">A</th><th class="num">B</th><th class="num">${esc(tr('colDiff'))}</th></tr>
  ${filas.map(([m, x, y, z]) => `<tr><td>${esc(m)}</td><td class="num">${x}</td><td class="num">${y}</td><td class="num"><b>${z}</b></td></tr>`).join('')}
</table>

${input.categorias ? `
<h2>${esc(tr('categoriesTitle'))}</h2>
<div class="chart"><img src="${gCategorias}" alt="${esc(tr('categoriesAlt'))}"/></div>
<table>
  <tr><th>${esc(tr('colCategory'))}</th><th class="num">${esc(tr('colAn'))}</th><th class="num">${esc(tr('colApct'))}</th><th class="num">${esc(tr('colBn'))}</th><th class="num">${esc(tr('colBpct'))}</th><th class="num">${esc(tr('colDelta'))}</th></tr>
  ${input.categorias.map((c) => {
    const delta = c.pctB - c.pctA;
    return `<tr><td>${esc(c.label)}</td><td class="num">${c.nA}</td><td class="num">${c.pctA.toFixed(1)}</td><td class="num">${c.nB}</td><td class="num">${c.pctB.toFixed(1)}</td><td class="num"><b>${delta >= 0 ? '+' : ''}${delta.toFixed(1)}</b></td></tr>`;
  }).join('')}
</table>
<p class="note">${esc(tr('categoriesNote'))}</p>` : ''}

${test ? `
<h2>${esc(tr(input.pareada ? 'pairedTest' : 'welchTest'))}</h2>
<table>
  <tr><th class="num">${esc(tr('colT'))}</th><th class="num">${esc(tr('colDf'))}</th><th class="num">${esc(tr('colP'))}</th><th class="num">${esc(tr('colDifference'))}</th><th class="num">${esc(tr('colCi'))}</th><th class="num">${esc(tr('colCohenD'))}</th></tr>
  <tr>
    <td class="num">${f(test.t, 4)}</td>
    <td class="num">${test.df.toFixed(input.pareada ? 0 : 1)}</td>
    <td class="num">${esc(fmtP(test.pValue))}</td>
    <td class="num">${test.diff >= 0 ? '+' : ''}${f(test.diff)} ${esc(u)}</td>
    <td class="num">${f(test.ciLower)} a ${f(test.ciUpper)}</td>
    <td class="num">${Number.isFinite(test.cohenD) ? test.cohenD.toFixed(2) : '—'}</td>
  </tr>
</table>
<p>${esc(tr(test.rejectNull ? 'reject' : 'notReject', { p: fmtPFrase(test.pValue) }))}${
  test.rejectNull ? '' : ` <b>${esc(tr('notRejectCaveat'))}</b>`
}</p>
` : `<h2>${esc(tr('testTitle'))}</h2><p class="note">${esc(tr('notRun'))}</p>`}

<h2>${esc(tr('limitationsTitle'))}</h2>
<ul>
  <li>${esc(disenoTexto)}</li>
  ${muestraPequena ? `<li>${esc(tr('limSmallSample'))}</li>` : ''}
  <li>${esc(tr('limIndependence'))}</li>
  <li>${esc(tr('limPractical'))}</li>
  <li>${esc(tr('limProfessional'))}</li>
</ul>

${reportFooterHtml(t)}`;

  return `<!DOCTYPE html><html lang="${esc(locale)}"><head><meta charset="utf-8"/><title>${esc(tr('docTitle'))}</title><style>${REPORT_CSS}</style></head><body>${body}</body></html>`;
}

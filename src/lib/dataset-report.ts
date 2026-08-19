/**
 * Reporte imprimible para muestreos de huevos y conjuntos de docencia.
 *
 * Comparte la hoja de estilos y los gráficos con el reporte de aves, pero su
 * contenido lo determina el dominio: aquí no hay línea genética ni diagnóstico
 * zootécnico, y en cambio la clasificación por categorías es protagonista.
 *
 * Como el resto de reportes de la aplicación, esta plantilla SOLO formatea
 * resultados ya calculados: no hace estadística por su cuenta.
 */

import { describe } from '@/lib/statistics/descriptive';
import { meanConfidenceInterval, oneSampleTTest } from '@/lib/statistics/inference';
import { shapiroWilk } from '@/lib/statistics/shapiro-wilk';
import { detectOutliers } from '@/lib/statistics/outliers';
import { classify, type ClassificationScheme } from '@/lib/classification';
import { histogramSvg, svgToDataUri } from '@/lib/report-charts';
import { categoriasBarSvg } from '@/lib/dataset-report-charts';
import { REPORT_CSS } from '@/lib/report-html';
import { APP_VERSION } from '@/lib/report-data';
import type { VariableDefinition } from '@/lib/domains/types';
import type { DatasetContext } from '@/lib/dataset-store';
import { reportFooterHtml, type ReportI18n } from '@/lib/report-i18n';
import { logoUrl } from '@/lib/base-path';
import { fmtP, fmtPFrase } from '@/lib/p-value';

export interface DatasetReportInput {
  tituloModulo: string;
  valores: number[];
  variable: VariableDefinition;
  scheme: ClassificationScheme;
  /** Nombre y procedencia del criterio de clasificación, para trazabilidad. */
  criterioLabel: string;
  criterioFuente: string;
  criterioOficial: boolean;
  contexto: DatasetContext;
  muHipotetica: number | null;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// El traductor y el idioma llegan como parámetro: ver src/lib/report-i18n.ts.

/** Limitaciones derivadas de los propios datos, sin adornos. */
function limitaciones(
  tr: (k: string, v?: Record<string, string | number>) => string,
  n: number,
  swP: number | null,
  atipicos: number,
  muestreo: string,
): string[] {
  const l: string[] = [];
  if (n < 30) l.push(tr('limSmall', { n }));
  if (!muestreo.trim()) l.push(tr('limSampling'));
  if (swP !== null && swP < 0.05) l.push(tr('limNormality'));
  if (atipicos > 0) l.push(tr('limOutliers', { n: atipicos }));
  l.push(tr('limProfessional'));
  return l;
}

export function buildDatasetReportHtml(
  input: DatasetReportInput,
  { locale, t }: ReportI18n,
): string {
  const { valores, variable, scheme, contexto } = input;
  const tr = (k: string, v?: Record<string, string | number>) => t(`reports.dataset.${k}`, v);
  const d = describe(valores);
  if (!d) return `<p>${esc(tr('noData'))}</p>`;

  const u = variable.unit;
  const dec = variable.decimals;
  const f = (v: number, k = dec) => (Number.isFinite(v) ? v.toFixed(k) : '—');

  const ci = meanConfidenceInterval(valores, 0.95);
  const sw = shapiroWilk(valores);
  const out = detectOutliers(valores);
  const cl = classify(valores, scheme);
  const tt = input.muHipotetica !== null && valores.length >= 2
    ? oneSampleTTest(valores, input.muHipotetica, 'two-sided', 0.95)
    : null;

  
  const hist = valores.length >= 5
    ? svgToDataUri(histogramSvg(valores, d.mean, d.sdSample, d.mean * 0.9, d.mean * 1.1, t))
    : '';
  const graficoCat = svgToDataUri(categoriasBarSvg(cl.bins, cl.unclassified, cl.n, t));

  const meta: Array<[string, string]> = [
    [tr('metaVariable'), `${variable.label}${u ? ` (${u})` : ''}`],
    [tr('metaSampling'), contexto.nombre || '—'],
    [tr('metaOrigin'), contexto.origen || '—'],
    [tr('metaDate'), contexto.fecha || '—'],
    [tr('metaResponsible'), contexto.responsable || '—'],
    [tr('metaN'), String(d.n)],
  ];

  const kpis: Array<[string, string]> = [
    [tr('kpiMean'), `${f(d.mean)} ${u}`],
    [tr('kpiMedian'), `${f(d.median)} ${u}`],
    [tr('kpiSd'), `${f(d.sdSample)} ${u}`],
    [tr('kpiCv'), `${f(d.cv, 2)} %`],
  ];

  const descriptiva: Array<[string, string]> = [
    [tr('rowN'), String(d.n)],
    [tr('rowMean'), `${f(d.mean)} ${u}`],
    [tr('rowMedian'), `${f(d.median)} ${u}`],
    [tr('rowMinMax'), `${f(d.min)} – ${f(d.max)} ${u}`],
    [tr('rowRange'), `${f(d.range)} ${u}`],
    [tr('rowVariance'), `${f(d.varianceSample)} ${u}²`],
    [tr('rowSd'), `${f(d.sdSample)} ${u}`],
    [tr('rowCv'), `${f(d.cv, 2)} %`],
    [tr('rowSem'), `${f(d.sem)} ${u}`],
    [tr('rowQuartiles'), `${f(d.q1)} / ${f(d.q3)} (${f(d.iqr)})`],
    [tr('rowPercentiles'), `${f(d.percentiles[5])} / ${f(d.percentiles[95])}`],
    [tr('rowSkewness'), d.skewness === null ? '—' : f(d.skewness, 3)],
    [tr('rowKurtosis'), d.kurtosis === null ? '—' : f(d.kurtosis, 3)],
    [tr('rowCi'), ci ? `${f(ci.lower)} – ${f(ci.upper)} ${u}` : '—'],
  ];
  const mitad = Math.ceil(descriptiva.length / 2);
  const col = (rs: Array<[string, string]>) =>
    `<table>${rs.map(([k, v]) => `<tr><td>${esc(k)}</td><td class="num"><b>${v}</b></td></tr>`).join('')}</table>`;

  const filasCat = cl.bins.map((b, i) => {
    const eb = cl.effectiveBins[i];
    const rango = eb.min === null && eb.max === null ? esc(tr('rangeAll'))
      : eb.min === null ? `&lt; ${f(eb.max!)}`
      : eb.max === null ? `≥ ${f(eb.min)}`
      : `${f(eb.min)} – &lt; ${f(eb.max)}`;
    return `<tr><td>${esc(b.label)}</td><td class="num">${rango} ${esc(u)}</td><td class="num">${b.count}</td><td class="num">${b.pct.toFixed(1)}</td></tr>`;
  }).join('');

  const lim = limitaciones(tr, d.n, sw?.pValue ?? null, out.flags.length, contexto.observaciones + contexto.origen);

  const body = `
<div class="header">
  <img src="${logoUrl()}" class="logo" alt="Avimétrica Pro"/>
  <h1>${esc(input.tituloModulo)}</h1>
  <div class="subtitle">${esc(t('reports.generated', { fecha: new Date().toLocaleString(locale), version: APP_VERSION }))}</div>
</div>

<div class="meta">${meta.map(([k, v]) => `<div><b>${esc(k)}:</b> ${esc(v)}</div>`).join('')}</div>

<div class="kpis">${kpis.map(([l, v]) => `<div class="kpi"><div class="v">${v}</div><div class="l">${esc(l)}</div></div>`).join('')}</div>

<h2>${esc(tr('classificationTitle'))}</h2>
<p class="note">
  ${esc(tr('criterion'))} <b>${esc(input.criterioLabel)}</b> ${esc(tr(input.criterioOficial ? 'official' : 'nonNormative'))}.
  ${esc(input.criterioFuente)}
</p>
${graficoCat ? `<div class="chart"><img src="${graficoCat}" alt="${esc(tr('categoriesAlt'))}"/></div>` : ''}
<table>
  <tr><th>${esc(tr('colCategory'))}</th><th class="num">${esc(tr('colRange'))}</th><th class="num">${esc(tr('colN'))}</th><th class="num">${esc(tr('colPct'))}</th></tr>
  ${filasCat}
  ${cl.unclassified > 0 ? `<tr><td><b>${esc(tr('unclassified'))}</b></td><td class="num">${esc(tr('unclassifiedRange'))}</td><td class="num">${cl.unclassified}</td><td class="num">${((cl.unclassified / cl.n) * 100).toFixed(1)}</td></tr>` : ''}
</table>
${cl.modeLabel ? `<p>${esc(tr('predominantLabel'))} <b>${esc(cl.modeLabel)}</b>.</p>` : ''}

<h2>${esc(tr('summaryTitle'))}</h2>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">${col(descriptiva.slice(0, mitad))}${col(descriptiva.slice(mitad))}</div>

${hist ? `<div class="chart"><img src="${hist}" alt="${esc(tr('histogramAlt'))}"/></div>` : ''}

<h2>${esc(tr('normalityTitle'))}</h2>
${sw
  ? `<p>${esc(tr('shapiroLabel'))} <b>${f(sw.W, 4)}</b>${esc(tr('shapiroP'))} <b>${esc(fmtPFrase(sw.pValue))}</b> — ${esc(tr(sw.pValue >= 0.05 ? 'shapiroOk' : 'shapiroRejected'))}.</p>
     <p class="note">${esc(tr('shapiroNote'))}</p>`
  : `<p class="note">${esc(tr('normalityNotRun'))}</p>`}

<h2>${esc(tr('outliersTitle'))}</h2>
${out.flags.length === 0
  ? `<p>${esc(tr('outliersNone'))}</p>`
  : `<table><tr><th class="num">${esc(tr('colIndex'))}</th><th class="num">${esc(tr('colValue'))}</th><th class="num">${esc(tr('colVsMean'))}</th></tr>
     ${out.flags.map((x) => `<tr><td class="num">${x.index + 1}</td><td class="num">${f(x.value)} ${esc(u)}</td><td class="num">${x.deviationFromMean >= 0 ? '+' : ''}${f(x.deviationFromMean)}</td></tr>`).join('')}
     </table><p class="note">${esc(tr('outliersNote'))}</p>`}

${tt ? `<h2>${esc(tr('tTestTitle'))}</h2>
<p>${esc(tr('hypotheses', { mu0: f(tt.mu0), unidad: u }))}</p>
<table>
  <tr><th class="num">${esc(tr('colT'))}</th><th class="num">${esc(tr('colDf'))}</th><th class="num">${esc(tr('colP'))}</th><th class="num">${esc(tr('colDifference'))}</th><th class="num">${esc(tr('colCi'))}</th></tr>
  <tr><td class="num">${f(tt.t, 4)}</td><td class="num">${tt.df}</td><td class="num">${esc(fmtP(tt.pValue))}</td><td class="num">${tt.diff >= 0 ? '+' : ''}${f(tt.diff)}</td><td class="num">${f(tt.ciLower)} – ${f(tt.ciUpper)}</td></tr>
</table>
<p>${esc(tr(tt.rejectNull ? 'tReject' : 'tNotReject', { mu0: f(tt.mu0), unidad: u }))}</p>` : ''}

<h2>${esc(tr('limitationsTitle'))}</h2>
<ul>${lim.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>

${contexto.observaciones ? `<h2>${esc(tr('observationsTitle'))}</h2><p>${esc(contexto.observaciones)}</p>` : ''}

${reportFooterHtml(t)}`;

  return `<!DOCTYPE html><html lang="${esc(locale)}"><head><meta charset="utf-8"/><title>${esc(input.tituloModulo)}</title><style>${REPORT_CSS}</style></head><body>${body}</body></html>`;
}

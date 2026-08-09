/**
 * Reporte imprimible de la comparación entre dos pesajes de aves.
 *
 * Hasta ahora la comparación de pesajes solo existía en pantalla. Este módulo
 * la vuelve documento, reutilizando los mismos generadores de gráficos que la
 * comparación de huevos: la banda de uniformidad se trata como lo que es —una
 * clasificación con cortes relativos a la media— y por eso encaja en el
 * gráfico de categorías agrupadas sin código nuevo.
 *
 * Como el resto de reportes, SOLO formatea resultados ya calculados, y recibe
 * el traductor como parámetro (ver report-i18n.ts).
 */

import type { FlockStats } from '@/lib/calculations';
import type { TTestResult, TwoSampleTTestResult } from '@/lib/statistics/inference';
import { REPORT_CSS } from '@/lib/report-html';
import { APP_VERSION } from '@/lib/report-data';
import { svgToDataUri } from '@/lib/report-charts';
import { categoriasComparadasSvg, mediasComparadasSvg } from '@/lib/dataset-report-charts';
import { reportFooterHtml, type ReportI18n } from '@/lib/report-i18n';

export interface PesajeResumen {
  etiqueta: string;
  fecha: string;
  edadSemanas: number | null;
  lote: string;
  stats: FlockStats;
  mediana: number;
  ci: { lower: number; upper: number } | null;
}

export interface PesajesComparisonInput {
  lineaGenetica: string;
  a: PesajeResumen;
  b: PesajeResumen;
  test: TTestResult | TwoSampleTTestResult | null;
  pareada: boolean;
  diseno: 'independientes' | 'pareadas' | 'repeticiones';
  /** true si los pesajes pertenecen a lotes distintos. */
  entreLotes: boolean;
  /**
   * Nombres de las dos líneas genéticas cuando difieren. Llegan los datos, no
   * la frase ya redactada: la advertencia se compone aquí para que exista en
   * los tres idiomas.
   */
  lineasDistintas?: { a: string; b: string };
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Texto plano: quien lo inserta en el HTML lo escapa. */
function fmtP(p: number): string {
  return p < 0.0001 ? '< 0.0001' : p.toFixed(4);
}

const DISENO_CLAVE: Record<PesajesComparisonInput['diseno'], string> = {
  independientes: 'designIndependent',
  pareadas: 'designPaired',
  repeticiones: 'designRepeated',
};

export function buildPesajesComparisonReportHtml(
  input: PesajesComparisonInput,
  { locale, t }: ReportI18n,
): string {
  const tr = (k: string, v?: Record<string, string | number>) => t(`reports.pesajesComparison.${k}`, v);
  const { a, b, test } = input;
  const f = (v: number, k = 1) => (Number.isFinite(v) ? v.toFixed(k) : v > 0 ? '+∞' : '−∞');
  const disenoTexto = tr(DISENO_CLAVE[input.diseno]);
  const sem = (n: number) => tr('weeks', { n });

  const gMedias = svgToDataUri(
    mediasComparadasSvg(a.stats.promedio, b.stats.promedio, a.ci, b.ci, a.etiqueta, b.etiqueta, 'g', 1, t),
  );

  // La banda de uniformidad es una clasificación en tres clases: reutiliza el
  // gráfico de categorías agrupadas de la comparación de huevos.
  const pct = a.stats.criterioPct;
  const categorias = [
    {
      label: tr('catBelow', { pct }),
      pctA: (a.stats.countDebajo / a.stats.totalAves) * 100,
      pctB: (b.stats.countDebajo / b.stats.totalAves) * 100,
      nA: a.stats.countDebajo, nB: b.stats.countDebajo,
    },
    {
      label: tr('catWithin', { pct }),
      pctA: a.stats.uniformidad, pctB: b.stats.uniformidad,
      nA: a.stats.countDentro, nB: b.stats.countDentro,
    },
    {
      label: tr('catAbove', { pct }),
      pctA: (a.stats.countEncima / a.stats.totalAves) * 100,
      pctB: (b.stats.countEncima / b.stats.totalAves) * 100,
      nA: a.stats.countEncima, nB: b.stats.countEncima,
    },
  ];
  const gCategorias = svgToDataUri(categoriasComparadasSvg(categorias, a.etiqueta, b.etiqueta));

  const filas: Array<[string, string, string, string]> = [
    [tr('metricN'), String(a.stats.totalAves), String(b.stats.totalAves), '—'],
    [tr('metricMean'), `${f(a.stats.promedio)} g`, `${f(b.stats.promedio)} g`, `${f(a.stats.promedio - b.stats.promedio)} g`],
    [tr('metricMedian'), `${f(a.mediana)} g`, `${f(b.mediana)} g`, `${f(a.mediana - b.mediana)} g`],
    [tr('metricSd'), `${f(a.stats.desvEst)} g`, `${f(b.stats.desvEst)} g`, `${f(a.stats.desvEst - b.stats.desvEst)} g`],
    [tr('metricCv'), `${f(a.stats.cv, 2)} %`, `${f(b.stats.cv, 2)} %`, `${f(a.stats.cv - b.stats.cv, 2)} %`],
    [tr('metricUniformity', { pct }), `${f(a.stats.uniformidad)} %`, `${f(b.stats.uniformidad)} %`, `${f(a.stats.uniformidad - b.stats.uniformidad)} %`],
    [tr('metricCi'), a.ci ? `${f(a.ci.lower)} – ${f(a.ci.upper)}` : '—', b.ci ? `${f(b.ci.lower)} – ${f(b.ci.upper)}` : '—', '—'],
  ];

  const muestraPequena = a.stats.totalAves < 30 || b.stats.totalAves < 30;
  const deltaCv = b.stats.cv - a.stats.cv;
  const deltaUnif = b.stats.uniformidad - a.stats.uniformidad;

  // Cada frase de la lectura es un mensaje COMPLETO: concatenar un verbo a una
  // frase se rompe al traducir, porque el orden de palabras cambia.
  const fraseCv = Math.abs(deltaCv) < 0.05
    ? tr('cvStable')
    : tr(deltaCv < 0 ? 'cvDown' : 'cvUp', { delta: f(Math.abs(deltaCv), 2) });
  const fraseUnif = Math.abs(deltaUnif) < 0.05
    ? tr('uniformityStable')
    : tr(deltaUnif > 0 ? 'uniformityUp' : 'uniformityDown', { delta: f(Math.abs(deltaUnif)) });

  // Misma tolerancia que el reporte de evolución, y por la misma razón: un
  // indicador que apenas se movió no CONTRADICE al otro, simplemente no aporta
  // información. Sin esto, un CV que baja 0.01 puntos y una uniformidad
  // idéntica producían «no apuntan en la misma dirección», que es engañoso.
  const TOL_CV = 0.25;   // puntos porcentuales de CV
  const TOL_UNIF = 1.0;  // puntos porcentuales de uniformidad
  const signo = (d: number, tol: number) => (Math.abs(d) < tol ? 0 : Math.sign(d));
  const sCv = signo(deltaCv, TOL_CV);       // −1 mejora (CV baja), +1 empeora
  const sUnif = signo(deltaUnif, TOL_UNIF); // +1 mejora, −1 empeora
  const lectura = tr(
    sCv === 0 && sUnif === 0
      ? 'readingStable'
      : sCv <= 0 && sUnif >= 0
        ? 'readingFavourable'
        : sCv >= 0 && sUnif <= 0
          ? 'readingUnfavourable'
          : 'readingContradictory',
  );

  const body = `
<div class="header">
  <img src="${typeof window !== 'undefined' ? window.location.origin : ''}/logo-avimetrica.png" class="logo" alt="Avimétrica Pro"/>
  <h1>${esc(tr('docTitle'))}</h1>
  <div class="subtitle">${esc(t('reports.generated', { fecha: new Date().toLocaleString(locale), version: APP_VERSION }))}</div>
</div>

<div class="meta">
  <div><b>${esc(tr('metaWeighInA'))}</b> ${esc(a.etiqueta)}</div>
  <div><b>${esc(tr('metaWeighInB'))}</b> ${esc(b.etiqueta)}</div>
  <div><b>${esc(tr('metaLotA'))}</b> ${esc(a.lote)}${a.edadSemanas ? ` · ${esc(sem(a.edadSemanas))}` : ''}</div>
  <div><b>${esc(tr('metaLotB'))}</b> ${esc(b.lote)}${b.edadSemanas ? ` · ${esc(sem(b.edadSemanas))}` : ''}</div>
  <div><b>${esc(tr('metaLine'))}</b> ${esc(input.lineaGenetica)}</div>
  <div><b>${esc(tr('metaDesign'))}</b> ${esc(disenoTexto)}</div>
</div>

${input.lineasDistintas ? `<div class="alert"><b>${esc(tr('warning'))}</b> ${esc(tr('linesDiffer', { a: input.lineasDistintas.a, b: input.lineasDistintas.b }))}</div>` : ''}

<h2>${esc(tr('meansTitle'))}</h2>
<div class="chart"><img src="${gMedias}" alt="${esc(tr('meansAlt'))}"/></div>
<p class="note">${esc(tr('meansNote'))}</p>

<h2>${esc(tr('summaryTitle'))}</h2>
<table>
  <tr><th>${esc(tr('colMetric'))}</th><th class="num">A</th><th class="num">B</th><th class="num">${esc(tr('colDiff'))}</th></tr>
  ${filas.map(([m, x, y, z]) => `<tr><td>${esc(m)}</td><td class="num">${x}</td><td class="num">${y}</td><td class="num"><b>${z}</b></td></tr>`).join('')}
</table>

<h2>${esc(tr('bandTitle'))}</h2>
<div class="chart"><img src="${gCategorias}" alt="${esc(tr('bandAlt'))}"/></div>
<table>
  <tr><th>${esc(tr('colCategory'))}</th><th class="num">${esc(tr('colAn'))}</th><th class="num">${esc(tr('colApct'))}</th><th class="num">${esc(tr('colBn'))}</th><th class="num">${esc(tr('colBpct'))}</th><th class="num">${esc(tr('colDelta'))}</th></tr>
  ${categorias.map((c) => {
    const d = c.pctB - c.pctA;
    return `<tr><td>${esc(c.label)}</td><td class="num">${c.nA}</td><td class="num">${c.pctA.toFixed(1)}</td><td class="num">${c.nB}</td><td class="num">${c.pctB.toFixed(1)}</td><td class="num"><b>${d >= 0 ? '+' : ''}${d.toFixed(1)}</b></td></tr>`;
  }).join('')}
</table>
<p class="note">${esc(tr('bandNote'))}</p>

<h2>${esc(tr('homogeneityTitle'))}</h2>
<p>${esc(fraseCv)} ${esc(fraseUnif)} ${esc(lectura)}</p>

${test ? `
<h2>${esc(tr(input.pareada ? 'pairedTest' : 'welchTest'))}</h2>
<table>
  <tr><th class="num">${esc(tr('colT'))}</th><th class="num">${esc(tr('colDf'))}</th><th class="num">${esc(tr('colP'))}</th><th class="num">${esc(tr('colDifference'))}</th><th class="num">${esc(tr('colCi'))}</th><th class="num">${esc(tr('colCohenD'))}</th></tr>
  <tr>
    <td class="num">${f(test.t, 4)}</td>
    <td class="num">${test.df.toFixed(input.pareada ? 0 : 1)}</td>
    <td class="num">${esc(fmtP(test.pValue))}</td>
    <td class="num">${test.diff >= 0 ? '+' : ''}${f(test.diff)} g</td>
    <td class="num">${f(test.ciLower)} – ${f(test.ciUpper)} g</td>
    <td class="num">${Number.isFinite(test.cohenD) ? test.cohenD.toFixed(2) : '—'}</td>
  </tr>
</table>
<p>${test.rejectNull
  ? esc(tr('reject', { p: fmtP(test.pValue) }))
  : `${esc(tr('notReject', { p: fmtP(test.pValue) }))} ${esc(tr('notRejectCaveat'))}`}</p>
` : `<h2>${esc(tr('testTitle'))}</h2><p class="note">${esc(tr('notRun'))}</p>`}

<h2>${esc(tr('limitationsTitle'))}</h2>
<ul>
  <li>${esc(disenoTexto)}</li>
  ${input.entreLotes ? `<li>${esc(tr('limCrossLot'))}</li>` : ''}
  ${a.edadSemanas !== null && b.edadSemanas !== null && a.edadSemanas !== b.edadSemanas
    ? `<li>${esc(tr('limAges', { a: a.edadSemanas, b: b.edadSemanas }))}</li>`
    : ''}
  ${muestraPequena ? `<li>${esc(tr('limSmallSample'))}</li>` : ''}
  <li>${esc(tr('limIndependence'))}</li>
  <li>${esc(tr('limPractical'))}</li>
  <li>${esc(tr('limProfessional'))}</li>
</ul>

${reportFooterHtml(t)}`;

  return `<!DOCTYPE html><html lang="${esc(locale)}"><head><meta charset="utf-8"/><title>${esc(tr('docTitle'))}</title><style>${REPORT_CSS}</style></head><body>${body}</body></html>`;
}

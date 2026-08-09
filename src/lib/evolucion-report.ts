/**
 * Reporte imprimible de la evolución de un lote a lo largo de sus pesajes.
 *
 * La pestaña «Evolución» solo existía en pantalla. Este módulo la vuelve
 * documento: curvas de peso frente al objetivo, de uniformidad y CV, ganancia
 * diaria entre pesajes, y una lectura de la tendencia.
 *
 * Como el resto de reportes, SOLO formatea resultados ya calculados.
 */

import { REPORT_CSS } from '@/lib/report-html';
import { APP_VERSION } from '@/lib/report-data';
import { svgToDataUri } from '@/lib/report-charts';
import { lineasEvolucionSvg, gananciaDiariaBarSvg } from '@/lib/dataset-report-charts';
import { reportFooterHtml, type ReportI18n } from '@/lib/report-i18n';

export interface PuntoEvolucion {
  label: string;
  edadSemanas: number | null;
  n: number;
  media: number;
  cv: number;
  uniformidad: number;
  objetivo: number | null;
}

export interface PeriodoGanancia {
  desde: string;
  hasta: string;
  dias: number;
  deltaG: number;
  porDia: number | null;
}

export interface EvolucionReportInput {
  lote: string;
  granja: string;
  galpon: string;
  lineaGenetica: string;
  criterioPct: number;
  serie: PuntoEvolucion[];
  ganancias: PeriodoGanancia[];
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Describe la tendencia de una serie comparando su primer y último valor. */
function tendencia(
  tr: (k: string, v?: Record<string, string | number>) => string,
  serie: number[],
  etiquetaClave: string,
  unidadClave: string,
  dec: number,
): string {
  if (serie.length < 2) return '';
  const delta = serie[serie.length - 1] - serie[0];
  const etiqueta = tr(etiquetaClave);
  if (Math.abs(delta) < 0.05) return tr('trendStable', { etiqueta });
  return tr(delta > 0 ? 'trendUp' : 'trendDown', {
    etiqueta,
    delta: Math.abs(delta).toFixed(dec),
    unidad: tr(unidadClave),
  });
}

export function buildEvolucionReportHtml(
  input: EvolucionReportInput,
  { locale, t }: ReportI18n,
): string {
  const tr = (k: string, v?: Record<string, string | number>) => t(`reports.evolution.${k}`, v);
  const { serie, ganancias, criterioPct } = input;
  const f = (v: number, k = 1) => (Number.isFinite(v) ? v.toFixed(k) : '—');
  const etiquetas = serie.map((p) => p.label);
  const hayObjetivo = serie.some((p) => p.objetivo !== null);

  const gPeso = svgToDataUri(
    lineasEvolucionSvg(
      etiquetas,
      [
        { label: tr('seriesMean'), color: '#2E7D32', valores: serie.map((p) => p.media) },
        ...(hayObjetivo
          ? [{ label: tr('seriesTarget'), color: '#1d4ed8', valores: serie.map((p) => p.objetivo), discontinua: true }]
          : []),
      ],
      'g',
      0,
      tr('weightChartTitle'),
      t,
    ),
  );

  const gUnifCv = svgToDataUri(
    lineasEvolucionSvg(
      etiquetas,
      [
        { label: `${tr('seriesUniformity')} (±${criterioPct}%)`, color: '#2E7D32', valores: serie.map((p) => p.uniformidad) },
        { label: tr('seriesCv'), color: '#dc2626', valores: serie.map((p) => p.cv) },
      ],
      '%',
      1,
      tr('homogeneityChartTitle'),
      t,
    ),
  );

  const gGanancia = svgToDataUri(
    gananciaDiariaBarSvg(
      ganancias.map((g) => ({ label: `${g.desde}→${g.hasta}`, gDia: g.porDia })),
      'g',
      t,
    ),
  );

  const filasSerie = serie.map((p) => {
    const dif = p.objetivo !== null ? p.media - p.objetivo : null;
    const difPct = p.objetivo !== null && p.objetivo !== 0 ? (dif! / p.objetivo) * 100 : null;
    return `<tr>
      <td>${esc(p.label)}</td>
      <td class="num">${p.edadSemanas ?? '—'}</td>
      <td class="num">${p.n}</td>
      <td class="num">${f(p.media)}</td>
      <td class="num">${p.objetivo !== null ? f(p.objetivo, 0) : '—'}</td>
      <td class="num">${dif !== null ? `${dif >= 0 ? '+' : ''}${f(dif)}` : '—'}${difPct !== null ? ` (${difPct >= 0 ? '+' : ''}${f(difPct, 1)}%)` : ''}</td>
      <td class="num">${f(p.cv, 2)}</td>
      <td class="num">${f(p.uniformidad)}</td>
    </tr>`;
  }).join('');

  const filasGanancia = ganancias.map((g) => `<tr>
    <td>${esc(g.desde)} → ${esc(g.hasta)}</td>
    <td class="num">${g.dias}</td>
    <td class="num">${g.deltaG >= 0 ? '+' : ''}${f(g.deltaG)}</td>
    <td class="num">${g.porDia === null ? '—' : f(g.porDia)}</td>
  </tr>`).join('');

  const tendPeso = tendencia(tr, serie.map((p) => p.media), 'labelWeight', 'unitG', 1);
  const tendCv = tendencia(tr, serie.map((p) => p.cv), 'labelCv', 'unitPoints', 2);
  const tendUnif = tendencia(tr, serie.map((p) => p.uniformidad), 'labelUniformity', 'unitPoints', 1);

  // Lectura conjunta de CV y uniformidad. Se usa una tolerancia para tratar
  // como ESTABLE lo que apenas cambió: un indicador plano no contradice al
  // otro, solo no aporta información, y decir que «no apuntan en la misma
  // dirección» en ese caso sería engañoso.
  const TOL_CV = 0.25;   // puntos porcentuales de CV
  const TOL_UNIF = 1.0;  // puntos porcentuales de uniformidad
  const dCv = (serie[serie.length - 1]?.cv ?? 0) - (serie[0]?.cv ?? 0);
  const dUnif = (serie[serie.length - 1]?.uniformidad ?? 0) - (serie[0]?.uniformidad ?? 0);
  const signo = (d: number, tol: number) => (Math.abs(d) < tol ? 0 : Math.sign(d));
  const sCv = signo(dCv, TOL_CV);       // −1 mejora (CV baja), +1 empeora
  const sUnif = signo(dUnif, TOL_UNIF); // +1 mejora, −1 empeora

  const lecturaHomogeneidad = tr(
    sCv === 0 && sUnif === 0
      ? 'homStable'
      : sCv <= 0 && sUnif >= 0
        ? 'homFavourable'
        : sCv >= 0 && sUnif <= 0
          ? 'homUnfavourable'
          : 'homContradictory',
  );

  const desviaciones = serie
    .filter((p) => p.objetivo !== null)
    .map((p) => ((p.media - p.objetivo!) / p.objetivo!) * 100);
  const desvUltima = desviaciones.length ? desviaciones[desviaciones.length - 1] : null;

  const body = `
<div class="header">
  <img src="${typeof window !== 'undefined' ? window.location.origin : ''}/logo-avimetrica.png" class="logo" alt="Avimétrica Pro"/>
  <h1>${esc(tr('docTitle'))}</h1>
  <div class="subtitle">${esc(t('reports.generated', { fecha: new Date().toLocaleString(locale), version: APP_VERSION }))}</div>
</div>

<div class="meta">
  <div><b>${esc(tr('metaLot'))}</b> ${esc(input.lote)}</div>
  <div><b>${esc(tr('metaLine'))}</b> ${esc(input.lineaGenetica)}</div>
  <div><b>${esc(tr('metaFarmHouse'))}</b> ${esc(input.granja || '—')} / ${esc(input.galpon || '—')}</div>
  <div><b>${esc(tr('metaWeighIns'))}</b> ${serie.length}</div>
  <div><b>${esc(tr('metaPeriod'))}</b> ${esc(tr('periodValue', { desde: serie[0]?.label ?? '—', hasta: serie[serie.length - 1]?.label ?? '—' }))}</div>
  <div><b>${esc(tr('metaCriterion'))}</b> ${esc(tr('criterionValue', { pct: criterioPct }))}</div>
</div>

<h2>${esc(tr('weightTitle'))}</h2>
<div class="chart"><img src="${gPeso}" alt="${esc(tr('weightAlt'))}"/></div>
${!hayObjetivo ? `<p class="note">${esc(tr('noTargetCurve'))}</p>` : ''}

<h2>${esc(tr('homogeneityTitle'))}</h2>
<div class="chart"><img src="${gUnifCv}" alt="${esc(tr('homogeneityAlt'))}"/></div>
<p class="note">${esc(tr('homogeneityNote'))}</p>

${gGanancia ? `<h2>${esc(tr('gainTitle'))}</h2>
<div class="chart"><img src="${gGanancia}" alt="${esc(tr('gainAlt'))}"/></div>
<p class="note">${esc(tr('gainNote'))}</p>` : ''}

<h2>${esc(tr('detailTitle'))}</h2>
<table>
  <tr>
    <th>${esc(tr('colDate'))}</th><th class="num">${esc(tr('colAge'))}</th><th class="num">${esc(tr('colN'))}</th>
    <th class="num">${esc(tr('colMean'))}</th><th class="num">${esc(tr('colTarget'))}</th><th class="num">${esc(tr('colDifference'))}</th>
    <th class="num">${esc(tr('colCv'))}</th><th class="num">${esc(tr('colUniformity'))}</th>
  </tr>
  ${filasSerie}
</table>

${ganancias.length ? `<h2>${esc(tr('gainPeriodTitle'))}</h2>
<table>
  <tr><th>${esc(tr('colPeriod'))}</th><th class="num">${esc(tr('colDays'))}</th><th class="num">${esc(tr('colDelta'))}</th><th class="num">${esc(tr('colPerDay'))}</th></tr>
  ${filasGanancia}
</table>` : ''}

<h2>${esc(tr('trendTitle'))}</h2>
<p>${esc(tendPeso)} ${esc(tendUnif)} ${esc(tendCv)}</p>
<p>${esc(lecturaHomogeneidad)}</p>
${desvUltima !== null ? `<p>${esc(
  Math.abs(desvUltima) < 0.05
    ? tr('lastOnTarget')
    : tr(desvUltima > 0 ? 'lastAbove' : 'lastBelow', { pct: f(Math.abs(desvUltima), 1) }),
)}</p>` : ''}

<h2>${esc(tr('limitationsTitle'))}</h2>
<ul>
  <li>${esc(tr('limSampling'))}</li>
  <li>${esc(tr('limTarget'))}</li>
  ${serie.some((p) => p.n < 30) ? `<li>${esc(tr('limSmall'))}</li>` : ''}
  <li>${esc(tr('limProfessional'))}</li>
</ul>

${reportFooterHtml(t)}`;

  return `<!DOCTYPE html><html lang="${esc(locale)}"><head><meta charset="utf-8"/><title>${esc(tr('docTitle'))}</title><style>${REPORT_CSS}</style></head><body>${body}</body></html>`;
}

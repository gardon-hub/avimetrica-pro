/**
 * Plantillas HTML de los reportes (Fase 6). Tres variantes:
 * - resumido: 1 página para administración.
 * - tecnico: 2-3 páginas con todo el análisis.
 * - academico: técnico + metodología y fórmulas.
 * Las plantillas SOLO formatean datos ya calculados (ReportData).
 */

import { ReportData, ReportVariant, muestreoLabel } from '@/lib/report-data';
import { uniformityCurveSvg, histogramSvg, svgToDataUri } from '@/lib/report-charts';
import {
  categoriasBarSvg, mediaVsObjetivoSvg, boxplotSvg, qqPlotSvg, bandaVsIcSvg,
} from '@/lib/dataset-report-charts';
import { classify } from '@/lib/classification';
import { qqPoints } from '@/lib/statistics/normality';
import { OUTLIER_METHOD_LABELS } from '@/lib/statistics/outliers';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function fmt(v: number | null | undefined, dec = 2): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  if (!Number.isFinite(v)) return v > 0 ? '+∞' : '−∞';
  return v.toFixed(dec);
}

function fmtP(p: number): string {
  return p < 0.0001 ? '&lt; 0.0001' : p.toFixed(4);
}

/** Hoja de estilos compartida por todos los reportes de la aplicación. */
export const REPORT_CSS = `
@page { size: letter; margin: 14mm 12mm; }
* { box-sizing: border-box; }
body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; margin: 0 auto; max-width: 760px; padding: 16px; font-size: 12px; line-height: 1.45; }
.header { text-align: center; border-bottom: 2px solid #2E7D32; padding-bottom: 10px; margin-bottom: 12px; }
.logo { max-width: 230px; height: auto; }
h1 { font-size: 19px; margin: 6px 0 2px 0; }
.subtitle { color: #666; font-size: 11px; }
h2 { font-size: 13px; color: #1a5276; border-bottom: 1px solid #ddd; padding-bottom: 3px; margin: 14px 0 6px 0; }
.meta { background: #f7f9f7; border: 1px solid #e2e8e2; border-radius: 6px; padding: 8px 10px; font-size: 11px; display: grid; grid-template-columns: 1fr 1fr; gap: 2px 14px; }
.kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin: 10px 0; text-align: center; }
.kpi { border: 1px solid #e2e8e2; border-radius: 6px; padding: 6px 4px; }
.kpi .v { font-size: 15px; font-weight: bold; }
.kpi .l { font-size: 9px; color: #666; text-transform: uppercase; letter-spacing: 0.03em; }
.chart { text-align: center; margin: 8px 0; }
.chart img { max-width: 100%; height: auto; border: 1px solid #eee; border-radius: 6px; }
table { width: 100%; border-collapse: collapse; font-size: 10.5px; margin: 6px 0; }
th, td { border: 1px solid #ddd; padding: 3.5px 6px; text-align: left; }
th { background: #f4f6f4; font-weight: 600; }
td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
.note { font-size: 10px; color: #666; font-style: italic; }
.alert { background: #fff8e6; border: 1px solid #f0d78c; border-radius: 6px; padding: 6px 9px; font-size: 10.5px; margin: 6px 0; }
.good { color: #2E7D32; } .warn { color: #b45309; } .bad { color: #c62828; }
ul { margin: 4px 0; padding-left: 18px; }
li { margin-bottom: 2px; }
.formula { background: #f6f6fb; border-left: 3px solid #7c3aed; padding: 5px 9px; margin: 5px 0; font-family: 'Cambria Math', Georgia, serif; font-size: 11.5px; }
.footer { margin-top: 18px; border-top: 1px solid #ccc; padding-top: 8px; text-align: center; font-size: 10px; color: #777; }
.footer .name { font-weight: bold; color: #333; font-size: 11px; }
.pagebreak { break-before: page; }
@media print { body { padding: 0; } .no-print { display: none; } }
`;

function headerHtml(d: ReportData, variantLabel: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `
<div class="header">
  <img src="${origin}/logo-avimetrica.png" class="logo" alt="Avimétrica Pro"/>
  <h1>Reporte de Uniformidad — ${esc(variantLabel)}</h1>
  <div class="subtitle">Avimétrica Pro · Analítica de peso, uniformidad y desempeño avícola · Generado: ${esc(d.generadoEl)} · v${esc(d.appVersion)}</div>
</div>`;
}

function metaHtml(d: ReportData): string {
  const c = d.contexto;
  const rows: Array<[string, string]> = [
    ['Línea genética', `${d.lineaGenetica}${d.lineaAproximada ? ' ⚠️ (referencia aproximada)' : ''}`],
    ['Edad', d.edadSemanas ? `${d.edadSemanas} semanas` : 'No especificada'],
    ['Lote', c.lote || '—'],
    ['Granja / Galpón', `${c.granja || '—'} / ${c.galpon || '—'}`],
    ['Responsable', c.responsable || '—'],
    ['Muestreo', muestreoLabel(c.metodoMuestreo)],
    ['Aves pesadas', String(d.stats.totalAves)],
    ['Criterio de uniformidad', `media ±${d.criterioPct}% (banda descriptiva, no es IC)`],
  ];
  return `<div class="meta">${rows.map(([k, v]) => `<div><b>${esc(k)}:</b> ${esc(v)}</div>`).join('')}</div>`;
}

function kpisHtml(d: ReportData): string {
  const uniClass = d.stats.uniformidad >= 85 ? 'good' : d.stats.uniformidad >= 70 ? 'warn' : 'bad';
  const kpis: Array<[string, string, string]> = [
    ['Media', `${fmt(d.stats.promedio, 1)} g`, ''],
    ['Objetivo', d.target ? `${fmt(d.target.pesoOptimo, 0)} g` : '—', ''],
    ['Diferencia', d.targetDiffG !== null ? `${d.targetDiffG >= 0 ? '+' : ''}${fmt(d.targetDiffG, 1)} g (${fmt(d.targetDiffPct, 1)}%)` : '—',
      d.targetDiffPct !== null ? (Math.abs(d.targetDiffPct) <= 5 ? 'good' : Math.abs(d.targetDiffPct) <= 10 ? 'warn' : 'bad') : ''],
    ['Uniformidad', `${fmt(d.stats.uniformidad, 1)}%`, uniClass],
    ['CV', `${fmt(d.stats.cv, 2)}%`, ''],
    ['SD muestral', `${fmt(d.stats.desvEst, 1)} g`, ''],
    ['IC 95% media', d.ci95 ? `${fmt(d.ci95.lower, 1)}–${fmt(d.ci95.upper, 1)} g` : '—', ''],
    ['En rango guía', d.pctDentroGuia !== null ? `${fmt(d.pctDentroGuia, 1)}%` : '—', ''],
  ];
  return `<div class="kpis">${kpis
    .map(([l, v, cls]) => `<div class="kpi"><div class="v ${cls}">${v}</div><div class="l">${esc(l)}</div></div>`)
    .join('')}</div>`;
}

function descriptivaHtml(d: ReportData): string {
  const s = d.descr;
  const rows: Array<[string, string]> = [
    ['n', String(s.n)],
    ['Media', `${fmt(s.mean)} g`],
    ['Mediana', `${fmt(s.median)} g`],
    ['Mínimo – Máximo', `${fmt(s.min, 1)} – ${fmt(s.max, 1)} g`],
    ['Rango', `${fmt(s.range, 1)} g`],
    ['Varianza muestral', `${fmt(s.varianceSample)} g²`],
    ['SD muestral', `${fmt(s.sdSample)} g`],
    ['CV', `${fmt(s.cv)} %`],
    ['Error estándar (EEM)', `${fmt(s.sem)} g`],
    ['Q1 / Q3 (IQR)', `${fmt(s.q1)} / ${fmt(s.q3)} (${fmt(s.iqr)}) g`],
    ['P5 / P95', `${fmt(s.percentiles[5])} / ${fmt(s.percentiles[95])} g`],
    ['Asimetría (G1)', s.skewness === null ? '—' : fmt(s.skewness, 3)],
    ['Curtosis exceso (G2)', s.kurtosis === null ? '—' : fmt(s.kurtosis, 3)],
    ['IC 95% media', d.ci95 ? `${fmt(d.ci95.lower)} – ${fmt(d.ci95.upper)} g` : '—'],
  ];
  const half = Math.ceil(rows.length / 2);
  const col = (rs: Array<[string, string]>) =>
    `<table>${rs.map(([k, v]) => `<tr><td>${esc(k)}</td><td class="num"><b>${v}</b></td></tr>`).join('')}</table>`;
  return `<h2>Resumen estadístico</h2><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">${col(rows.slice(0, half))}${col(rows.slice(half))}</div>`;
}

function normalidadHtml(d: ReportData): string {
  if (!d.normality && !d.shapiro) {
    return `<h2>Normalidad</h2><p class="note">No evaluada (se requieren ≥3 pesos con variabilidad).</p>`;
  }
  const ref = d.shapiro ?? d.normality!;
  const concl = ref.pValue >= 0.05
    ? 'no se rechaza la hipótesis de normalidad: los datos son compatibles con una distribución normal (esto no la demuestra)'
    : 'se rechaza la hipótesis de normalidad: los pesos se desvían de la distribución normal';
  let html = `<h2>Normalidad</h2>`;
  if (d.shapiro) {
    html += `<p>Shapiro-Wilk (AS R94): W = <b>${fmt(d.shapiro.W, 4)}</b>, valor p = <b>${fmtP(d.shapiro.pValue)}</b></p>`;
  }
  if (d.normality) {
    html += `<p>${esc(d.normality.method)}: K² = <b>${fmt(d.normality.statistic, 3)}</b>, valor p = <b>${fmtP(d.normality.pValue)}</b></p>`;
  }
  html += `<p>Conclusión (α = 0.05): ${concl}.</p>`;
  if (d.shapiro && d.normality && (d.shapiro.pValue >= 0.05) !== (d.normality.pValue >= 0.05)) {
    html += `<p class="note">⚠️ Las dos pruebas discrepan al 5%: evidencia limítrofe; priorizar la inspección gráfica.</p>`;
  }
  if (d.normality && !d.normality.reliable) {
    html += `<p class="note">⚠️ Con n &lt; 20 la prueba K² es poco confiable; priorizar la inspección gráfica.</p>`;
  }
  html += `<p class="note">Las pruebas no sustituyen la inspección gráfica (histograma y Q-Q en la aplicación).</p>`;
  return html;
}

function atipicosHtml(d: ReportData): string {
  if (d.outliers.flags.length === 0) {
    return `<h2>Valores atípicos</h2><p>Ninguna observación marcada por las reglas 1.5×IQR, 3×IQR, |Z|&gt;3 ni Z-modificada (MAD).</p>`;
  }
  const rows = d.outliers.flags
    .map((f) => `<tr><td class="num">${f.index + 1}</td><td class="num">${fmt(f.value, 1)}</td><td class="num">${f.deviationFromMean >= 0 ? '+' : ''}${fmt(f.deviationFromMean, 1)}</td><td>${f.methods.map((m) => esc(OUTLIER_METHOD_LABELS[m])).join(' · ')}</td></tr>`)
    .join('');
  return `<h2>Valores atípicos (${d.outliers.flags.length})</h2>
<table><tr><th class="num"># Ave</th><th class="num">Peso (g)</th><th class="num">vs. media (g)</th><th>Métodos que lo marcan</th></tr>${rows}</table>
<p class="note">Un valor marcado no es necesariamente un error: verificar antes de excluir. Ninguna observación fue eliminada en este análisis.</p>`;
}

function tTestHtml(d: ReportData): string {
  if (!d.tTest) {
    return `<h2>Prueba t contra el peso objetivo</h2><p class="note">No ejecutada (se requiere edad con referencia disponible y n ≥ 2 con variabilidad).</p>`;
  }
  const t = d.tTest;
  const concl = t.rejectNull
    ? `Con α = 0.05, existe evidencia estadística de que el peso promedio del lote difiere del objetivo de ${fmt(t.mu0, 0)} g.`
    : `Con α = 0.05, no se encontró evidencia estadística suficiente para concluir que el peso promedio difiere del objetivo de ${fmt(t.mu0, 0)} g. Esto no demuestra que sean iguales.`;
  return `<h2>Prueba t de una muestra contra el peso objetivo</h2>
<p>H₀: μ = ${fmt(t.mu0, 0)} g · H₁: μ ≠ ${fmt(t.mu0, 0)} g (bilateral, 95% de confianza)</p>
<table><tr><th class="num">t</th><th class="num">gl</th><th class="num">Valor p</th><th class="num">Diferencia</th><th class="num">IC 95%</th><th class="num">d de Cohen</th></tr>
<tr><td class="num">${fmt(t.t, 4)}</td><td class="num">${t.df}</td><td class="num">${fmtP(t.pValue)}</td><td class="num">${t.diff >= 0 ? '+' : ''}${fmt(t.diff, 1)} g</td><td class="num">${fmt(t.ciLower, 1)} – ${fmt(t.ciUpper, 1)} g</td><td class="num">${fmt(t.cohenD, 2)}</td></tr></table>
<p>${concl}</p>`;
}

function diagnosticoHtml(d: ReportData, full: boolean): string {
  const dg = d.diagnostic;
  let html = `<h2>Diagnóstico zootécnico</h2>
<p><b>${esc(dg.title)}</b> · ${dg.birdType === 'broiler' ? 'Broiler (engorde)' : 'Ponedora (postura)'} · ${esc(dg.stageLabel)}</p>
<p><b>Interpretación:</b> ${esc(dg.interpretacion)}</p>
<p><b>Peso vs. referencia:</b> ${esc(dg.pesoComparacion)}</p>`;
  if (dg.alertas.length > 0) {
    html += `<div class="alert"><b>Alertas:</b><ul>${dg.alertas.map((a) => `<li>${esc(a)}</li>`).join('')}</ul></div>`;
  }
  if (full && dg.causas.length > 0) {
    html += `<p><b>Posibles factores a investigar</b> (no diagnósticos definitivos):</p><ul>${dg.causas.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>`;
  }
  const recs = full ? dg.recomendaciones : dg.recomendaciones.slice(0, 3);
  if (recs.length > 0) {
    html += `<p><b>Recomendaciones:</b></p><ul>${recs.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>`;
  }
  return html;
}

function limitacionesHtml(d: ReportData): string {
  return `<h2>Limitaciones</h2><ul>${d.limitaciones.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>`;
}

function fuentesHtml(d: ReportData): string {
  return `<h2>Fuentes y trazabilidad</h2>
<p>Pesos de referencia: guías de manejo de la línea <b>${esc(d.lineaGenetica)}</b>${d.lineaAproximada ? ' — <span class="warn"><b>valores APROXIMADOS sin guía oficial auditada</b></span>' : ' (documento oficial de la casa genética)'}.
Versión interna de datos de referencia: <b>${esc(d.refDataVersion)}</b> · Versión de la aplicación: <b>${esc(d.appVersion)}</b>.</p>
<p class="note">Los cálculos estadísticos se ejecutan localmente con funciones deterministas verificadas por pruebas automatizadas (ver ESTADISTICA en AUDITORIA.md del proyecto).</p>`;
}

function pesosTablaHtml(d: ReportData): string {
  const rows = d.pesos
    .map((p, i) => {
      let estado = 'Dentro del rango';
      let cls = '';
      if (p < d.stats.limiteInf) { estado = `Debajo (−${fmt(d.stats.limiteInf - p, 1)} g)`; cls = 'bad'; }
      else if (p > d.stats.limiteSup) { estado = `Encima (+${fmt(p - d.stats.limiteSup, 1)} g)`; cls = 'good'; }
      return `<tr><td class="num">${i + 1}</td><td class="num">${fmt(p, 1)}</td><td class="${cls}">${estado}</td></tr>`;
    })
    .join('');
  return `<h2 class="pagebreak">Pesos individuales (${d.pesos.length})</h2>
<table><tr><th class="num"># Ave</th><th class="num">Peso (g)</th><th>Estado vs. banda ±${d.criterioPct}%</th></tr>${rows}</table>`;
}

function metodologiaHtml(d: ReportData): string {
  // Gráficos didácticos: dan imagen a los conceptos que esta sección explica.
  // Se generan solo aquí, de modo que las variantes resumida y técnica no
  // pagan el coste de construirlos.
  const graficoBandaIc = d.ci95
    ? svgToDataUri(
        bandaVsIcSvg(
          d.stats.promedio, d.stats.limiteInf, d.stats.limiteSup,
          d.ci95.lower, d.ci95.upper, d.criterioPct, 'g', 1,
        ),
      )
    : '';
  const graficoCaja = svgToDataUri(
    boxplotSvg(
      d.descr.q1, d.descr.median, d.descr.q3, d.descr.min, d.descr.max,
      d.outliers.flags.map((x) => x.value), 'g', 1,
    ),
  );
  const graficoQQ =
    d.pesos.length >= 3 && d.descr.sdSample > 0
      ? svgToDataUri(qqPlotSvg(qqPoints(d.pesos, d.descr.mean, d.descr.sdSample), 'g', 0))
      : '';

  return `<h2 class="pagebreak">Metodología y fórmulas (modo académico)</h2>
<p>Todos los cálculos se realizan en gramos con precisión doble; el redondeo ocurre solo en la presentación.</p>
<div class="formula">Media: x̄ = (Σxᵢ) / n</div>
<div class="formula">Varianza muestral: s² = Σ(xᵢ − x̄)² / (n − 1) &nbsp;·&nbsp; SD: s = √s²</div>
<p class="note">Se usa n−1 (corrección de Bessel) porque el pesaje es una muestra del lote; la versión poblacional (÷n) solo corresponde cuando se pesa el lote completo.</p>
<div class="formula">Coeficiente de variación: CV = (s / x̄) × 100</div>
<div class="formula">Error estándar de la media: EEM = s / √n</div>
<div class="formula">IC 95% para la media: x̄ ± t₍₀.₉₇₅, n−1₎ · EEM</div>
<div class="formula">Uniformidad (±${d.criterioPct}%): % de aves con peso en [x̄·(1−${(d.criterioPct / 100).toFixed(3)}), x̄·(1+${(d.criterioPct / 100).toFixed(3)})]</div>
<p class="note">La banda de uniformidad describe la dispersión alrededor de la media observada; NO es un intervalo de confianza (error conceptual frecuente).</p>
${graficoBandaIc ? `<div class="chart"><img src="${graficoBandaIc}" alt="Comparación en la misma escala entre la banda de uniformidad y el intervalo de confianza de la media"/></div>
<p class="note">
  Los dos rangos, en el mismo eje y con los datos de este lote. Responden a preguntas distintas:
  la <b>banda ±${d.criterioPct}%</b> dice entre qué pesos está la mayoría de las <i>aves</i>;
  el <b>IC 95%</b> dice entre qué valores es plausible que esté la <i>media verdadera</i> del lote.
  Por eso el IC es mucho más estrecho, y se estrecha aún más al aumentar n, mientras que la banda no:
  la banda depende de lo dispares que sean las aves, no de cuántas se pesaron.
</p>` : ''}
<div class="formula">Prueba t de una muestra: t = (x̄ − μ₀) / EEM, con gl = n − 1</div>
<p class="note">Interpretación del valor p: probabilidad de observar una diferencia al menos tan grande como la vista, si H₀ fuera cierta. p ≥ α no "acepta" H₀; solo indica evidencia insuficiente.</p>
<div class="formula">Percentiles: interpolación lineal tipo R-7 (Hyndman &amp; Fan, 1996)</div>
<div class="formula">Asimetría G1 y curtosis G2: estimadores ajustados (Joanes &amp; Gill, 1998) — los de Minitab/SPSS</div>
<div class="formula">Atípicos: cercos de Tukey (1.5×IQR y 3×IQR), |Z| &gt; 3 y Z modificada con MAD &gt; 3.5 (Iglewicz &amp; Hoaglin, 1993)</div>
<div class="chart"><img src="${graficoCaja}" alt="Diagrama de caja con los cuartiles, los cercos de Tukey y los valores atípicos"/></div>
<p class="note">
  El diagrama de caja hace visibles los estadísticos de posición ya tabulados: la caja abarca el
  50% central (Q1 a Q3), la línea interior es la mediana y los bigotes llegan hasta el dato más
  extremo dentro de 1.5×IQR. Los círculos son las observaciones marcadas como atípicas — se
  señalan, nunca se eliminan de forma automática.
</p>
<div class="formula">Normalidad: Shapiro-Wilk (AS R94, Royston 1995) y prueba ómnibus K² de D'Agostino-Pearson (D'Agostino 1970; Anscombe &amp; Glynn 1983)</div>
${graficoQQ ? `<div class="chart"><img src="${graficoQQ}" alt="Gráfico Q-Q de los cuantiles observados frente a los teóricos de una distribución normal"/></div>
<p class="note">
  Cada punto es una observación: su posición en el eje horizontal es el peso que cabría esperar
  bajo normalidad y en el vertical el peso realmente medido. Si los datos fueran perfectamente
  normales, todos caerían sobre la línea discontinua. Las desviaciones en los extremos indican
  colas más pesadas o ligeras; una curvatura sistemática, asimetría. Esta inspección es la que
  ninguna prueba de normalidad sustituye.
</p>` : ''}
<p><b>Errores comunes que este reporte evita:</b></p>
<ul>
<li>Confundir la banda de uniformidad ±${d.criterioPct}% con un intervalo de confianza.</li>
<li>Usar la SD poblacional (÷n) con datos de una muestra.</li>
<li>Concluir "las medias son iguales" cuando p ≥ α.</li>
<li>Eliminar valores atípicos sin verificar si son errores de medición o aves reales.</li>
<li>Confiar en una prueba de normalidad sin inspeccionar el histograma y el Q-Q.</li>
</ul>`;
}

function footerHtml(): string {
  return `<div class="footer">
  <span class="name">Gustavo Alonso Ardón</span><br/>
  Profesor Investigador en Ciencias Avícolas<br/>
  Universidad Nacional de Agricultura, Honduras, Centro América
</div>`;
}

export function buildReportHtml(d: ReportData, variant: ReportVariant): string {
  const variantLabel = variant === 'resumido' ? 'Resumen ejecutivo' : variant === 'tecnico' ? 'Reporte técnico' : 'Reporte académico';
  const curve = svgToDataUri(uniformityCurveSvg(d.stats.promedio, d.stats.desvEst, d.stats.limiteInf, d.stats.limiteSup, d.stats.uniformidad, d.criterioPct));
  const hist = svgToDataUri(histogramSvg(d.pesos, d.stats.promedio, d.stats.desvEst, d.stats.limiteInf, d.stats.limiteSup));

  // Barras de la banda de uniformidad. Se obtienen del MISMO motor de
  // clasificación que usan huevos y estadística: la prueba de equivalencia
  // garantiza que reproduce exactamente los conteos de calculateStats.
  const clasif = classify(d.pesos, {
    type: 'relative-band',
    pct: d.criterioPct,
    labels: {
      below: `Bajo −${d.criterioPct}%`,
      within: `Dentro de ±${d.criterioPct}%`,
      above: `Sobre +${d.criterioPct}%`,
    },
  });
  const COLORES_BANDA = ['#e53935', '#4CAF50', '#1d4ed8'];
  const barras = svgToDataUri(
    categoriasBarSvg(
      clasif.bins.map((b, i) => ({ ...b, color: COLORES_BANDA[i] })),
      clasif.unclassified,
      clasif.n,
    ),
  );

  // Media observada frente al objetivo de la línea genética (si hay edad y
  // referencia disponible).
  const vsObjetivo = d.target
    ? svgToDataUri(
        mediaVsObjetivoSvg(
          d.stats.promedio,
          d.ci95,
          d.target.pesoOptimo,
          'Objetivo de la línea',
          'g',
          1,
        ),
      )
    : '';

  let body = headerHtml(d, variantLabel) + metaHtml(d) + kpisHtml(d);

  const bloqueBanda = `
<h2>Distribución respecto a la banda de uniformidad</h2>
<div class="chart"><img src="${barras}" alt="Gráfico de barras del porcentaje de aves por debajo, dentro y por encima de la banda de uniformidad"/></div>
<table>
  <tr><th>Categoría</th><th class="num">Aves</th><th class="num">%</th></tr>
  ${clasif.bins.map((b) => `<tr><td>${esc(b.label)}</td><td class="num">${b.count}</td><td class="num">${b.pct.toFixed(1)}</td></tr>`).join('')}
</table>
<p class="note">
  Banda de ${d.criterioPct}% alrededor de la media observada (${fmt(d.stats.limiteInf, 1)} – ${fmt(d.stats.limiteSup, 1)} g).
  Es una banda descriptiva de la dispersión del lote, <b>no</b> un intervalo de confianza.
</p>`;

  const bloqueObjetivo = vsObjetivo
    ? `<h2>Peso promedio frente al objetivo de la línea</h2>
<div class="chart"><img src="${vsObjetivo}" alt="Gráfico de barras del peso promedio del lote con su intervalo de confianza, frente a la línea del peso objetivo"/></div>
<p class="note">
  La barra de error es el IC 95 % de la media observada. El objetivo se traza como línea de referencia
  porque es un valor de guía genética, no una medición con incertidumbre propia. Si la línea queda
  fuera del intervalo, la diferencia respecto al objetivo es estadísticamente apreciable; la prueba t
  siguiente lo cuantifica. La escala no arranca en cero.
</p>`
    : '';

  if (variant === 'resumido') {
    body += `<div class="chart"><img src="${curve}" alt="Curva de distribución con banda de uniformidad"/></div>`;
    body += bloqueBanda;
    body += diagnosticoHtml(d, false);
    body += limitacionesHtml(d);
  } else {
    body += `<div class="chart"><img src="${curve}" alt="Curva de distribución con banda de uniformidad"/></div>`;
    body += bloqueBanda;
    body += descriptivaHtml(d);
    body += `<div class="chart"><img src="${hist}" alt="Histograma con curva normal superpuesta"/></div>`;
    body += normalidadHtml(d);
    body += atipicosHtml(d);
    body += bloqueObjetivo;
    body += tTestHtml(d);
    body += diagnosticoHtml(d, true);
    body += limitacionesHtml(d);
    body += fuentesHtml(d);
    if (variant === 'academico') {
      body += metodologiaHtml(d);
    }
    body += pesosTablaHtml(d);
  }
  body += footerHtml();

  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/><title>Reporte de Uniformidad — ${esc(variantLabel)}</title><style>${REPORT_CSS}</style></head><body>${body}</body></html>`;
}

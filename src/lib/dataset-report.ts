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

function fmtP(p: number): string {
  return p < 0.0001 ? '&lt; 0.0001' : p.toFixed(4);
}

/** Limitaciones derivadas de los propios datos, sin adornos. */
function limitaciones(n: number, swP: number | null, atipicos: number, muestreo: string): string[] {
  const l: string[] = [];
  if (n < 30) {
    l.push(`La muestra es pequeña (n=${n}): las estimaciones tienen amplia incertidumbre y las pruebas poca potencia.`);
  }
  if (!muestreo.trim()) {
    l.push('No se documentó cómo se seleccionaron las unidades: si no fue al azar, los resultados pueden no representar al conjunto completo.');
  }
  if (swP !== null && swP < 0.05) {
    l.push('Los datos se desvían de la distribución normal: interpretar con cautela las pruebas que la asumen (ver histograma).');
  }
  if (atipicos > 0) {
    l.push(`Se detectaron ${atipicos} posible(s) valor(es) atípico(s), que influyen en media, desviación estándar y CV. Verificar si son errores de medición o valores reales.`);
  }
  l.push('Este reporte describe la muestra analizada; no sustituye el criterio del profesional a cargo.');
  return l;
}

export function buildDatasetReportHtml(input: DatasetReportInput): string {
  const { valores, variable, scheme, contexto } = input;
  const d = describe(valores);
  if (!d) return '<p>Sin datos para reportar.</p>';

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

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const hist = valores.length >= 5
    ? svgToDataUri(histogramSvg(valores, d.mean, d.sdSample, d.mean * 0.9, d.mean * 1.1))
    : '';
  const graficoCat = svgToDataUri(categoriasBarSvg(cl.bins, cl.unclassified, cl.n));

  const meta: Array<[string, string]> = [
    ['Variable', `${variable.label}${u ? ` (${u})` : ''}`],
    ['Muestreo', contexto.nombre || '—'],
    ['Origen', contexto.origen || '—'],
    ['Fecha', contexto.fecha || '—'],
    ['Responsable', contexto.responsable || '—'],
    ['Observaciones (n)', String(d.n)],
  ];

  const kpis: Array<[string, string]> = [
    ['Media', `${f(d.mean)} ${u}`],
    ['Mediana', `${f(d.median)} ${u}`],
    ['Desv. estándar', `${f(d.sdSample)} ${u}`],
    ['CV', `${f(d.cv, 2)} %`],
  ];

  const descriptiva: Array<[string, string]> = [
    ['n', String(d.n)],
    ['Media', `${f(d.mean)} ${u}`],
    ['Mediana', `${f(d.median)} ${u}`],
    ['Mínimo – Máximo', `${f(d.min)} – ${f(d.max)} ${u}`],
    ['Rango', `${f(d.range)} ${u}`],
    ['Varianza muestral', `${f(d.varianceSample)} ${u}²`],
    ['Desv. estándar muestral', `${f(d.sdSample)} ${u}`],
    ['Coeficiente de variación', `${f(d.cv, 2)} %`],
    ['Error estándar de la media', `${f(d.sem)} ${u}`],
    ['Q1 / Q3 (IQR)', `${f(d.q1)} / ${f(d.q3)} (${f(d.iqr)})`],
    ['P5 / P95', `${f(d.percentiles[5])} / ${f(d.percentiles[95])}`],
    ['Asimetría (G1)', d.skewness === null ? '—' : f(d.skewness, 3)],
    ['Curtosis exceso (G2)', d.kurtosis === null ? '—' : f(d.kurtosis, 3)],
    ['IC 95 % de la media', ci ? `${f(ci.lower)} – ${f(ci.upper)} ${u}` : '—'],
  ];
  const mitad = Math.ceil(descriptiva.length / 2);
  const col = (rs: Array<[string, string]>) =>
    `<table>${rs.map(([k, v]) => `<tr><td>${esc(k)}</td><td class="num"><b>${v}</b></td></tr>`).join('')}</table>`;

  const filasCat = cl.bins.map((b, i) => {
    const eb = cl.effectiveBins[i];
    const rango = eb.min === null && eb.max === null ? 'todos'
      : eb.min === null ? `&lt; ${f(eb.max!)}`
      : eb.max === null ? `≥ ${f(eb.min)}`
      : `${f(eb.min)} – &lt; ${f(eb.max)}`;
    return `<tr><td>${esc(b.label)}</td><td class="num">${rango} ${esc(u)}</td><td class="num">${b.count}</td><td class="num">${b.pct.toFixed(1)}</td></tr>`;
  }).join('');

  const lim = limitaciones(d.n, sw?.pValue ?? null, out.flags.length, contexto.observaciones + contexto.origen);

  const body = `
<div class="header">
  <img src="${origin}/logo-avimetrica.png" class="logo" alt="Avimétrica Pro"/>
  <h1>${esc(input.tituloModulo)}</h1>
  <div class="subtitle">Avimétrica Pro · Generado: ${esc(new Date().toLocaleString())} · v${esc(APP_VERSION)}</div>
</div>

<div class="meta">${meta.map(([k, v]) => `<div><b>${esc(k)}:</b> ${esc(v)}</div>`).join('')}</div>

<div class="kpis">${kpis.map(([l, v]) => `<div class="kpi"><div class="v">${v}</div><div class="l">${esc(l)}</div></div>`).join('')}</div>

<h2>Clasificación por categorías</h2>
<p class="note">
  Criterio: <b>${esc(input.criterioLabel)}</b>${input.criterioOficial ? ' (norma oficial)' : ' (criterio no normativo)'}.
  ${esc(input.criterioFuente)}
</p>
${graficoCat ? `<div class="chart"><img src="${graficoCat}" alt="Gráfico de barras del porcentaje de observaciones en cada categoría"/></div>` : ''}
<table>
  <tr><th>Categoría</th><th class="num">Rango</th><th class="num">n</th><th class="num">%</th></tr>
  ${filasCat}
  ${cl.unclassified > 0 ? `<tr><td><b>Sin clasificar</b></td><td class="num">fuera de las categorías</td><td class="num">${cl.unclassified}</td><td class="num">${((cl.unclassified / cl.n) * 100).toFixed(1)}</td></tr>` : ''}
</table>
${cl.modeLabel ? `<p>Categoría predominante: <b>${esc(cl.modeLabel)}</b>.</p>` : ''}

<h2>Resumen estadístico</h2>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">${col(descriptiva.slice(0, mitad))}${col(descriptiva.slice(mitad))}</div>

${hist ? `<div class="chart"><img src="${hist}" alt="Histograma con curva normal superpuesta"/></div>` : ''}

<h2>Normalidad</h2>
${sw
  ? `<p>Shapiro-Wilk (AS R94): W = <b>${f(sw.W, 4)}</b>, valor p = <b>${fmtP(sw.pValue)}</b> — ${
      sw.pValue >= 0.05
        ? 'no se rechaza la normalidad: los datos son compatibles con una distribución normal (esto no la demuestra)'
        : 'se rechaza la normalidad: los datos se desvían de la distribución normal'
    }.</p>
     <p class="note">La prueba no sustituye la inspección gráfica del histograma.</p>`
  : '<p class="note">No evaluada (se requieren al menos 3 valores con variabilidad).</p>'}

<h2>Valores atípicos</h2>
${out.flags.length === 0
  ? '<p>Ninguna observación marcada por las reglas 1.5×IQR, 3×IQR, |Z|&gt;3 ni Z modificada (MAD).</p>'
  : `<table><tr><th class="num">#</th><th class="num">Valor</th><th class="num">vs. media</th></tr>
     ${out.flags.map((x) => `<tr><td class="num">${x.index + 1}</td><td class="num">${f(x.value)} ${esc(u)}</td><td class="num">${x.deviationFromMean >= 0 ? '+' : ''}${f(x.deviationFromMean)}</td></tr>`).join('')}
     </table><p class="note">Un valor marcado no es necesariamente un error. Ninguna observación fue eliminada en este análisis.</p>`}

${tt ? `<h2>Prueba t de una muestra</h2>
<p>H₀: μ = ${f(tt.mu0)} ${esc(u)} · H₁: μ ≠ ${f(tt.mu0)} ${esc(u)} (bilateral, 95 % de confianza)</p>
<table>
  <tr><th class="num">t</th><th class="num">gl</th><th class="num">Valor p</th><th class="num">Diferencia</th><th class="num">IC 95 %</th></tr>
  <tr><td class="num">${f(tt.t, 4)}</td><td class="num">${tt.df}</td><td class="num">${fmtP(tt.pValue)}</td><td class="num">${tt.diff >= 0 ? '+' : ''}${f(tt.diff)}</td><td class="num">${f(tt.ciLower)} – ${f(tt.ciUpper)}</td></tr>
</table>
<p>${tt.rejectNull
  ? `Con α = 0.05, existe evidencia estadística de que la media difiere de ${f(tt.mu0)} ${esc(u)}.`
  : `Con α = 0.05, no se encontró evidencia suficiente para concluir que la media difiera de ${f(tt.mu0)} ${esc(u)}. Esto no demuestra que sean iguales.`}</p>` : ''}

<h2>Limitaciones</h2>
<ul>${lim.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>

${contexto.observaciones ? `<h2>Observaciones</h2><p>${esc(contexto.observaciones)}</p>` : ''}

<div class="footer">
  <span class="name">Gustavo Alonso Ardón</span><br/>
  Profesor Investigador en Ciencias Avícolas<br/>
  Universidad Nacional de Agricultura, Honduras, Centro América
</div>`;

  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/><title>${esc(input.tituloModulo)}</title><style>${REPORT_CSS}</style></head><body>${body}</body></html>`;
}

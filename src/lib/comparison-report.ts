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

function fmtP(p: number): string {
  return p < 0.0001 ? '&lt; 0.0001' : p.toFixed(4);
}

const DISENO_TEXTO: Record<ComparisonReportInput['diseno'], string> = {
  independientes: 'Muestras independientes: unidades distintas en cada muestreo.',
  pareadas: 'Muestras pareadas: las mismas unidades medidas dos veces, en el mismo orden.',
  repeticiones:
    'Repeticiones del mismo grupo: mismo lote en fechas distintas, sin identificar unidades. La independencia entre muestras es cuestionable, por lo que el valor p es orientativo.',
};

export function buildComparisonReportHtml(input: ComparisonReportInput): string {
  const { dA, dB, test, unidad: u, decimales: dec } = input;
  const f = (v: number, k = dec) => (Number.isFinite(v) ? v.toFixed(k) : v > 0 ? '+∞' : '−∞');

  const gMedias = svgToDataUri(
    mediasComparadasSvg(dA.mean, dB.mean, input.ciA, input.ciB, input.nombreA, input.nombreB, u, dec),
  );
  const gCategorias = input.categorias
    ? svgToDataUri(categoriasComparadasSvg(input.categorias, input.nombreA, input.nombreB))
    : '';

  const filas: Array<[string, string, string, string]> = [
    ['n', String(dA.n), String(dB.n), '—'],
    ['Media', f(dA.mean), f(dB.mean), f(dA.mean - dB.mean)],
    ['Mediana', f(dA.median), f(dB.median), f(dA.median - dB.median)],
    ['Desv. estándar (n−1)', f(dA.sdSample), f(dB.sdSample), f(dA.sdSample - dB.sdSample)],
    ['Coef. de variación (%)', f(dA.cv, 2), f(dB.cv, 2), f(dA.cv - dB.cv, 2)],
    ['Mínimo', f(dA.min), f(dB.min), '—'],
    ['Máximo', f(dA.max), f(dB.max), '—'],
    ['IC 95 % de la media', input.ciA ? `${f(input.ciA.lower)} – ${f(input.ciA.upper)}` : '—',
      input.ciB ? `${f(input.ciB.lower)} – ${f(input.ciB.upper)}` : '—', '—'],
  ];

  const muestraPequena = dA.n < 30 || dB.n < 30;

  const body = `
<div class="header">
  <img src="${typeof window !== 'undefined' ? window.location.origin : ''}/logo-avimetrica.png" class="logo" alt="Avimétrica Pro"/>
  <h1>Comparación de muestreos — ${esc(input.tituloModulo)}</h1>
  <div class="subtitle">Avimétrica Pro · Generado: ${esc(new Date().toLocaleString())} · v${esc(APP_VERSION)}</div>
</div>

<div class="meta">
  <div><b>Muestreo A:</b> ${esc(input.nombreA)}</div>
  <div><b>Muestreo B:</b> ${esc(input.nombreB)}</div>
  <div><b>Diseño declarado:</b> ${esc(DISENO_TEXTO[input.diseno])}</div>
  <div><b>Unidad:</b> ${esc(u || '—')}</div>
</div>

<h2>Medias comparadas</h2>
<div class="chart"><img src="${gMedias}" alt="Gráfico de barras de las medias de ambos muestreos con barras de error del intervalo de confianza del 95 %"/></div>
<p class="note">
  Las barras de error muestran el IC 95 % de cada media. Si se solapan ampliamente, la diferencia es
  dudosa; el valor p de la prueba es el criterio formal. La escala no arranca en cero para no aplanar
  diferencias pequeñas: leer los valores del eje, no solo la altura relativa.
</p>

<h2>Resumen comparativo</h2>
<table>
  <tr><th>Métrica</th><th class="num">A</th><th class="num">B</th><th class="num">A − B</th></tr>
  ${filas.map(([m, x, y, z]) => `<tr><td>${esc(m)}</td><td class="num">${x}</td><td class="num">${y}</td><td class="num"><b>${z}</b></td></tr>`).join('')}
</table>

${input.categorias ? `
<h2>Distribución por categorías</h2>
<div class="chart"><img src="${gCategorias}" alt="Gráfico de barras agrupadas comparando el porcentaje por categoría entre ambos muestreos"/></div>
<table>
  <tr><th>Categoría</th><th class="num">A (n)</th><th class="num">A (%)</th><th class="num">B (n)</th><th class="num">B (%)</th><th class="num">Δ %</th></tr>
  ${input.categorias.map((c) => {
    const delta = c.pctB - c.pctA;
    return `<tr><td>${esc(c.label)}</td><td class="num">${c.nA}</td><td class="num">${c.pctA.toFixed(1)}</td><td class="num">${c.nB}</td><td class="num">${c.pctB.toFixed(1)}</td><td class="num"><b>${delta >= 0 ? '+' : ''}${delta.toFixed(1)}</b></td></tr>`;
  }).join('')}
</table>
<p class="note">
  Se aplicó a ambos muestreos el criterio de clasificación del muestreo A. Δ % es el cambio en la
  proporción de B respecto de A: es descriptivo y no constituye una prueba de hipótesis sobre
  proporciones.
</p>` : ''}

${test ? `
<h2>${input.pareada ? 'Prueba t pareada' : 'Prueba t de dos muestras (Welch)'}</h2>
<table>
  <tr><th class="num">t</th><th class="num">gl</th><th class="num">Valor p</th><th class="num">Diferencia</th><th class="num">IC 95 % de la diferencia</th><th class="num">d de Cohen</th></tr>
  <tr>
    <td class="num">${f(test.t, 4)}</td>
    <td class="num">${test.df.toFixed(input.pareada ? 0 : 1)}</td>
    <td class="num">${fmtP(test.pValue)}</td>
    <td class="num">${test.diff >= 0 ? '+' : ''}${f(test.diff)} ${esc(u)}</td>
    <td class="num">${f(test.ciLower)} a ${f(test.ciUpper)}</td>
    <td class="num">${Number.isFinite(test.cohenD) ? test.cohenD.toFixed(2) : '—'}</td>
  </tr>
</table>
<p>${test.rejectNull
  ? `Con α = 0.05, existe evidencia estadística de una diferencia entre los dos muestreos (p = ${fmtP(test.pValue)}).`
  : `Con α = 0.05, no se encontró evidencia suficiente de diferencia entre los dos muestreos (p = ${fmtP(test.pValue)}). Esto <b>no</b> demuestra que sean iguales: puede deberse a una muestra pequeña.`}</p>
` : '<h2>Prueba de hipótesis</h2><p class="note">No ejecutada: se requieren al menos 2 observaciones con variabilidad en ambos muestreos, y en el diseño pareado, igual número de observaciones.</p>'}

<h2>Limitaciones</h2>
<ul>
  <li>${esc(DISENO_TEXTO[input.diseno])}</li>
  ${muestraPequena ? `<li>Al menos un muestreo tiene n &lt; 30: verificar normalidad y valores atípicos antes de confiar en el resultado.</li>` : ''}
  <li>La prueba asume observaciones independientes dentro de cada muestreo: revisar cómo se seleccionaron las unidades.</li>
  <li>Una diferencia estadísticamente significativa no implica, por sí sola, relevancia práctica: valorar la magnitud junto al contexto productivo.</li>
  <li>Este reporte compara las muestras analizadas; no sustituye el criterio del profesional a cargo.</li>
</ul>

<div class="footer">
  <span class="name">Gustavo Alonso Ardón</span><br/>
  Profesor Investigador en Ciencias Avícolas<br/>
  Universidad Nacional de Agricultura, Honduras, Centro América
</div>`;

  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/><title>Comparación de muestreos</title><style>${REPORT_CSS}</style></head><body>${body}</body></html>`;
}

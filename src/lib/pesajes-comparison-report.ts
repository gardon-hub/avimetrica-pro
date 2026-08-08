/**
 * Reporte imprimible de la comparación entre dos pesajes de aves.
 *
 * Hasta ahora la comparación de pesajes solo existía en pantalla. Este módulo
 * la vuelve documento, reutilizando los mismos generadores de gráficos que la
 * comparación de huevos: la banda de uniformidad se trata como lo que es —una
 * clasificación con cortes relativos a la media— y por eso encaja en el
 * gráfico de categorías agrupadas sin código nuevo.
 *
 * Como el resto de reportes, SOLO formatea resultados ya calculados.
 */

import type { FlockStats } from '@/lib/calculations';
import type { TTestResult, TwoSampleTTestResult } from '@/lib/statistics/inference';
import { REPORT_CSS } from '@/lib/report-html';
import { APP_VERSION } from '@/lib/report-data';
import { svgToDataUri } from '@/lib/report-charts';
import { categoriasComparadasSvg, mediasComparadasSvg } from '@/lib/dataset-report-charts';

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
  /** Advertencia si las líneas genéticas difieren entre lotes. */
  lineasDistintas?: string;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function fmtP(p: number): string {
  return p < 0.0001 ? '&lt; 0.0001' : p.toFixed(4);
}

const DISENO_TEXTO: Record<PesajesComparisonInput['diseno'], string> = {
  independientes: 'Muestras independientes: aves distintas en cada pesaje.',
  pareadas: 'Muestras pareadas: las mismas aves pesadas dos veces, en el mismo orden.',
  repeticiones:
    'Repeticiones del mismo grupo: mismo lote en fechas distintas, sin identificar aves. La independencia entre muestras es cuestionable, por lo que el valor p es orientativo.',
};

export function buildPesajesComparisonReportHtml(input: PesajesComparisonInput): string {
  const { a, b, test } = input;
  const f = (v: number, k = 1) => (Number.isFinite(v) ? v.toFixed(k) : v > 0 ? '+∞' : '−∞');

  const gMedias = svgToDataUri(
    mediasComparadasSvg(a.stats.promedio, b.stats.promedio, a.ci, b.ci, a.etiqueta, b.etiqueta, 'g', 1),
  );

  // La banda de uniformidad es una clasificación en tres clases: reutiliza el
  // gráfico de categorías agrupadas de la comparación de huevos.
  const pct = a.stats.criterioPct;
  const categorias = [
    {
      label: `Bajo −${pct}%`,
      pctA: (a.stats.countDebajo / a.stats.totalAves) * 100,
      pctB: (b.stats.countDebajo / b.stats.totalAves) * 100,
      nA: a.stats.countDebajo, nB: b.stats.countDebajo,
    },
    {
      label: `Dentro de ±${pct}%`,
      pctA: a.stats.uniformidad, pctB: b.stats.uniformidad,
      nA: a.stats.countDentro, nB: b.stats.countDentro,
    },
    {
      label: `Sobre +${pct}%`,
      pctA: (a.stats.countEncima / a.stats.totalAves) * 100,
      pctB: (b.stats.countEncima / b.stats.totalAves) * 100,
      nA: a.stats.countEncima, nB: b.stats.countEncima,
    },
  ];
  const gCategorias = svgToDataUri(categoriasComparadasSvg(categorias, a.etiqueta, b.etiqueta));

  const filas: Array<[string, string, string, string]> = [
    ['Aves pesadas (n)', String(a.stats.totalAves), String(b.stats.totalAves), '—'],
    ['Media', `${f(a.stats.promedio)} g`, `${f(b.stats.promedio)} g`, `${f(a.stats.promedio - b.stats.promedio)} g`],
    ['Mediana', `${f(a.mediana)} g`, `${f(b.mediana)} g`, `${f(a.mediana - b.mediana)} g`],
    ['Desv. estándar (n−1)', `${f(a.stats.desvEst)} g`, `${f(b.stats.desvEst)} g`, `${f(a.stats.desvEst - b.stats.desvEst)} g`],
    ['Coef. de variación', `${f(a.stats.cv, 2)} %`, `${f(b.stats.cv, 2)} %`, `${f(a.stats.cv - b.stats.cv, 2)} %`],
    [`Uniformidad (±${pct}%)`, `${f(a.stats.uniformidad)} %`, `${f(b.stats.uniformidad)} %`, `${f(a.stats.uniformidad - b.stats.uniformidad)} %`],
    ['IC 95 % de la media', a.ci ? `${f(a.ci.lower)} – ${f(a.ci.upper)}` : '—', b.ci ? `${f(b.ci.lower)} – ${f(b.ci.upper)}` : '—', '—'],
  ];

  const muestraPequena = a.stats.totalAves < 30 || b.stats.totalAves < 30;
  const deltaCv = b.stats.cv - a.stats.cv;
  const deltaUnif = b.stats.uniformidad - a.stats.uniformidad;

  const body = `
<div class="header">
  <img src="${typeof window !== 'undefined' ? window.location.origin : ''}/logo-avimetrica.png" class="logo" alt="Avimétrica Pro"/>
  <h1>Comparación de pesajes</h1>
  <div class="subtitle">Avimétrica Pro · Generado: ${esc(new Date().toLocaleString())} · v${esc(APP_VERSION)}</div>
</div>

<div class="meta">
  <div><b>Pesaje A:</b> ${esc(a.etiqueta)}</div>
  <div><b>Pesaje B:</b> ${esc(b.etiqueta)}</div>
  <div><b>Lote A:</b> ${esc(a.lote)}${a.edadSemanas ? ` · ${a.edadSemanas} sem` : ''}</div>
  <div><b>Lote B:</b> ${esc(b.lote)}${b.edadSemanas ? ` · ${b.edadSemanas} sem` : ''}</div>
  <div><b>Línea genética:</b> ${esc(input.lineaGenetica)}</div>
  <div><b>Diseño declarado:</b> ${esc(DISENO_TEXTO[input.diseno])}</div>
</div>

${input.lineasDistintas ? `<div class="alert"><b>Atención:</b> ${esc(input.lineasDistintas)} Una diferencia de peso puede deberse a la genética y no al manejo.</div>` : ''}

<h2>Peso promedio comparado</h2>
<div class="chart"><img src="${gMedias}" alt="Gráfico de barras del peso promedio de ambos pesajes con barras de error del intervalo de confianza del 95 %"/></div>
<p class="note">
  Las barras de error son el IC 95 % de cada media. Si se solapan ampliamente, la diferencia es
  dudosa; el valor p de la prueba es el criterio formal. La escala no arranca en cero para no
  aplanar diferencias pequeñas: leer los valores del eje, no solo la altura relativa.
</p>

<h2>Resumen comparativo</h2>
<table>
  <tr><th>Métrica</th><th class="num">A</th><th class="num">B</th><th class="num">A − B</th></tr>
  ${filas.map(([m, x, y, z]) => `<tr><td>${esc(m)}</td><td class="num">${x}</td><td class="num">${y}</td><td class="num"><b>${z}</b></td></tr>`).join('')}
</table>

<h2>Distribución respecto a la banda de uniformidad</h2>
<div class="chart"><img src="${gCategorias}" alt="Gráfico de barras agrupadas comparando el porcentaje de aves por debajo, dentro y por encima de la banda de uniformidad en ambos pesajes"/></div>
<table>
  <tr><th>Categoría</th><th class="num">A (aves)</th><th class="num">A (%)</th><th class="num">B (aves)</th><th class="num">B (%)</th><th class="num">Δ %</th></tr>
  ${categorias.map((c) => {
    const d = c.pctB - c.pctA;
    return `<tr><td>${esc(c.label)}</td><td class="num">${c.nA}</td><td class="num">${c.pctA.toFixed(1)}</td><td class="num">${c.nB}</td><td class="num">${c.pctB.toFixed(1)}</td><td class="num"><b>${d >= 0 ? '+' : ''}${d.toFixed(1)}</b></td></tr>`;
  }).join('')}
</table>
<p class="note">
  La banda se recalcula sobre la media de CADA pesaje, así que es un criterio de homogeneidad
  interna, no un rango de pesos fijo: dos pesajes con medias distintas tienen bandas distintas.
  Δ % es descriptivo y no constituye una prueba de hipótesis sobre proporciones.
</p>

<h2>Evolución de la homogeneidad</h2>
<p>
  Entre A y B, el coeficiente de variación ${deltaCv === 0 ? 'no cambió' : deltaCv < 0 ? `bajó ${f(Math.abs(deltaCv), 2)} puntos` : `subió ${f(deltaCv, 2)} puntos`}
  y la uniformidad ${deltaUnif === 0 ? 'se mantuvo' : deltaUnif > 0 ? `mejoró ${f(deltaUnif)} puntos` : `empeoró ${f(Math.abs(deltaUnif))} puntos`}.
  ${deltaCv < 0 && deltaUnif > 0
    ? 'Ambos indicadores apuntan a un lote más parejo en B.'
    : deltaCv > 0 && deltaUnif < 0
      ? 'Ambos indicadores apuntan a un lote más dispar en B: conviene revisar comedero, bebedero, densidad y estado sanitario.'
      : 'Los dos indicadores no apuntan en la misma dirección; conviene revisar el histograma de cada pesaje antes de concluir.'}
</p>

${test ? `
<h2>${input.pareada ? 'Prueba t pareada' : 'Prueba t de dos muestras (Welch)'}</h2>
<table>
  <tr><th class="num">t</th><th class="num">gl</th><th class="num">Valor p</th><th class="num">Diferencia</th><th class="num">IC 95 % de la diferencia</th><th class="num">d de Cohen</th></tr>
  <tr>
    <td class="num">${f(test.t, 4)}</td>
    <td class="num">${test.df.toFixed(input.pareada ? 0 : 1)}</td>
    <td class="num">${fmtP(test.pValue)}</td>
    <td class="num">${test.diff >= 0 ? '+' : ''}${f(test.diff)} g</td>
    <td class="num">${f(test.ciLower)} a ${f(test.ciUpper)} g</td>
    <td class="num">${Number.isFinite(test.cohenD) ? test.cohenD.toFixed(2) : '—'}</td>
  </tr>
</table>
<p>${test.rejectNull
  ? `Con α = 0.05, existe evidencia estadística de una diferencia de peso promedio entre los dos pesajes (p = ${fmtP(test.pValue)}).`
  : `Con α = 0.05, no se encontró evidencia suficiente de diferencia entre los dos pesajes (p = ${fmtP(test.pValue)}). Esto <b>no</b> demuestra que sean iguales: puede deberse a una muestra pequeña.`}</p>
` : '<h2>Prueba de hipótesis</h2><p class="note">No ejecutada: se requieren al menos 2 aves con variabilidad en ambos pesajes y, en el diseño pareado, igual número de aves.</p>'}

<h2>Limitaciones</h2>
<ul>
  <li>${esc(DISENO_TEXTO[input.diseno])}</li>
  ${input.entreLotes ? '<li>Los pesajes pertenecen a lotes distintos: las diferencias pueden deberse al lote, al manejo o a la edad, no solo al factor que se quiera evaluar.</li>' : ''}
  ${a.edadSemanas !== null && b.edadSemanas !== null && a.edadSemanas !== b.edadSemanas
    ? `<li>Las edades difieren (${a.edadSemanas} vs. ${b.edadSemanas} semanas): en aves en crecimiento buena parte de la diferencia de peso es el crecimiento normal esperado, no un efecto del manejo.</li>`
    : ''}
  ${muestraPequena ? '<li>Al menos un pesaje tiene n &lt; 30: verificar normalidad y valores atípicos antes de confiar en el resultado.</li>' : ''}
  <li>La prueba asume observaciones independientes dentro de cada pesaje: revisar cómo se seleccionaron las aves.</li>
  <li>Una diferencia estadísticamente significativa no implica, por sí sola, relevancia zootécnica: valorar la magnitud junto al objetivo de la línea y al contexto productivo.</li>
  <li>Este reporte compara las muestras analizadas; no sustituye el criterio del profesional a cargo del lote.</li>
</ul>

<div class="footer">
  <span class="name">Gustavo Alonso Ardón</span><br/>
  Profesor Investigador en Ciencias Avícolas<br/>
  Universidad Nacional de Agricultura, Honduras, Centro América
</div>`;

  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/><title>Comparación de pesajes</title><style>${REPORT_CSS}</style></head><body>${body}</body></html>`;
}

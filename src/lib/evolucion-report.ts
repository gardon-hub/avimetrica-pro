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
function tendencia(serie: number[], etiqueta: string, unidad: string, dec: number): string {
  if (serie.length < 2) return '';
  const delta = serie[serie.length - 1] - serie[0];
  const f = (v: number) => Math.abs(v).toFixed(dec);
  if (Math.abs(delta) < 0.05) return `${etiqueta} se mantuvo prácticamente estable.`;
  return `${etiqueta} ${delta > 0 ? 'aumentó' : 'disminuyó'} ${f(delta)} ${unidad} entre el primer y el último pesaje.`;
}

export function buildEvolucionReportHtml(input: EvolucionReportInput): string {
  const { serie, ganancias, criterioPct } = input;
  const f = (v: number, k = 1) => (Number.isFinite(v) ? v.toFixed(k) : '—');
  const etiquetas = serie.map((p) => p.label);
  const hayObjetivo = serie.some((p) => p.objetivo !== null);

  const gPeso = svgToDataUri(
    lineasEvolucionSvg(
      etiquetas,
      [
        { label: 'Media del lote', color: '#2E7D32', valores: serie.map((p) => p.media) },
        ...(hayObjetivo
          ? [{ label: 'Objetivo de la línea', color: '#1d4ed8', valores: serie.map((p) => p.objetivo), discontinua: true }]
          : []),
      ],
      'g',
      0,
      'Peso promedio por fecha',
    ),
  );

  const gUnifCv = svgToDataUri(
    lineasEvolucionSvg(
      etiquetas,
      [
        { label: `Uniformidad (±${criterioPct}%)`, color: '#2E7D32', valores: serie.map((p) => p.uniformidad) },
        { label: 'Coef. de variación', color: '#dc2626', valores: serie.map((p) => p.cv) },
      ],
      '%',
      1,
      'Homogeneidad por fecha',
    ),
  );

  const gGanancia = svgToDataUri(
    gananciaDiariaBarSvg(
      ganancias.map((g) => ({ label: `${g.desde}→${g.hasta}`, gDia: g.porDia })),
      'g',
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

  const tendPeso = tendencia(serie.map((p) => p.media), 'El peso promedio', 'g', 1);
  const tendCv = tendencia(serie.map((p) => p.cv), 'El coeficiente de variación', 'puntos porcentuales', 2);
  const tendUnif = tendencia(serie.map((p) => p.uniformidad), 'La uniformidad', 'puntos porcentuales', 1);

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

  const lecturaHomogeneidad =
    sCv === 0 && sUnif === 0
      ? 'La homogeneidad del lote se mantuvo estable durante el período: ni el CV ni la uniformidad cambiaron de forma apreciable.'
      : (sCv <= 0 && sUnif >= 0)
        ? 'Los indicadores de homogeneidad son favorables o estables: el lote no se volvió más dispar durante el período.'
        : (sCv >= 0 && sUnif <= 0)
          ? 'Los indicadores de homogeneidad son desfavorables o estables: conviene revisar espacio de comedero y bebedero, densidad, ambiente y estado sanitario, además de cómo se seleccionaron las aves en cada muestreo.'
          : 'Los indicadores se contradicen: uno mejoró y el otro empeoró. Conviene revisar el histograma de cada pesaje, porque un solo valor extremo puede mover el CV sin alterar la uniformidad, o al revés.';

  const desviaciones = serie
    .filter((p) => p.objetivo !== null)
    .map((p) => ((p.media - p.objetivo!) / p.objetivo!) * 100);
  const desvUltima = desviaciones.length ? desviaciones[desviaciones.length - 1] : null;

  const body = `
<div class="header">
  <img src="${typeof window !== 'undefined' ? window.location.origin : ''}/logo-avimetrica.png" class="logo" alt="Avimétrica Pro"/>
  <h1>Evolución del lote</h1>
  <div class="subtitle">Avimétrica Pro · Generado: ${esc(new Date().toLocaleString())} · v${esc(APP_VERSION)}</div>
</div>

<div class="meta">
  <div><b>Lote:</b> ${esc(input.lote)}</div>
  <div><b>Línea genética:</b> ${esc(input.lineaGenetica)}</div>
  <div><b>Granja / Galpón:</b> ${esc(input.granja || '—')} / ${esc(input.galpon || '—')}</div>
  <div><b>Pesajes analizados:</b> ${serie.length}</div>
  <div><b>Período:</b> ${esc(serie[0]?.label ?? '—')} a ${esc(serie[serie.length - 1]?.label ?? '—')}</div>
  <div><b>Criterio de uniformidad:</b> media ±${criterioPct}%</div>
</div>

<h2>Peso promedio frente al objetivo</h2>
<div class="chart"><img src="${gPeso}" alt="Gráfico de líneas del peso promedio del lote por fecha, comparado con la curva objetivo de la línea genética"/></div>
${!hayObjetivo ? '<p class="note">No se muestra la curva objetivo porque falta la edad en algún pesaje o la línea genética no tiene referencia para esas edades.</p>' : ''}

<h2>Homogeneidad del lote</h2>
<div class="chart"><img src="${gUnifCv}" alt="Gráfico de líneas de la uniformidad y el coeficiente de variación por fecha"/></div>
<p class="note">
  Uniformidad y CV se leen en direcciones opuestas: un lote mejora cuando la uniformidad sube y el
  CV baja. Ambos se calculan sobre la media de CADA pesaje, así que describen homogeneidad interna,
  no cercanía al objetivo.
</p>

${gGanancia ? `<h2>Ganancia diaria entre pesajes</h2>
<div class="chart"><img src="${gGanancia}" alt="Gráfico de barras de la ganancia diaria de peso entre pesajes consecutivos"/></div>
<p class="note">
  La ganancia se calcula entre las MEDIAS de dos pesajes, que son muestras distintas del lote y no
  las mismas aves seguidas en el tiempo. Es por tanto una estimación sujeta al error de muestreo de
  ambos pesajes: una barra baja puede reflejar una muestra poco representativa y no una caída real
  del crecimiento.
</p>` : ''}

<h2>Detalle por pesaje</h2>
<table>
  <tr>
    <th>Fecha</th><th class="num">Edad (sem)</th><th class="num">n</th>
    <th class="num">Media (g)</th><th class="num">Objetivo (g)</th><th class="num">Diferencia</th>
    <th class="num">CV (%)</th><th class="num">Unif. (%)</th>
  </tr>
  ${filasSerie}
</table>

${ganancias.length ? `<h2>Ganancia por período</h2>
<table>
  <tr><th>Período</th><th class="num">Días</th><th class="num">Δ media (g)</th><th class="num">g/día</th></tr>
  ${filasGanancia}
</table>` : ''}

<h2>Lectura de la tendencia</h2>
<p>${esc(tendPeso)} ${esc(tendUnif)} ${esc(tendCv)}</p>
<p>${esc(lecturaHomogeneidad)}</p>
${desvUltima !== null ? `<p>En el último pesaje el lote está ${
  Math.abs(desvUltima) < 0.05
    ? 'prácticamente sobre el objetivo'
    : desvUltima > 0
      ? `un ${f(desvUltima, 1)}% por encima del objetivo`
      : `un ${f(Math.abs(desvUltima), 1)}% por debajo del objetivo`
} de la línea genética.</p>` : ''}

<h2>Limitaciones</h2>
<ul>
  <li>Cada punto es una muestra distinta del lote, no un seguimiento de las mismas aves: las variaciones entre fechas incluyen error de muestreo además del cambio real.</li>
  <li>La comparación con el objetivo depende de que la edad registrada sea correcta y de que la línea genética seleccionada corresponda al lote.</li>
  ${serie.some((p) => p.n < 30) ? '<li>Algún pesaje tiene menos de 30 aves: sus estimaciones son especialmente imprecisas y pueden distorsionar la tendencia.</li>' : ''}
  <li>Este reporte describe los pesajes registrados; no sustituye el criterio del profesional a cargo del lote.</li>
</ul>

<div class="footer">
  <span class="name">Gustavo Alonso Ardón</span><br/>
  Profesor Investigador en Ciencias Avícolas<br/>
  Universidad Nacional de Agricultura, Honduras, Centro América
</div>`;

  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/><title>Evolución del lote</title><style>${REPORT_CSS}</style></head><body>${body}</body></html>`;
}

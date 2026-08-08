/**
 * Generadores de SVG como cadena para los reportes imprimibles.
 *
 * Son la contraparte de los componentes React de `comparison-charts.tsx`.
 * Diferencia deliberada: aquí los colores van FIJOS y el fondo es blanco,
 * porque el destino es papel o PDF —no hay modo oscuro que respetar— y un
 * `currentColor` heredado no sobreviviría a la conversión a data URI.
 */

import type { BinResult, Bin } from '@/lib/classification';

const COLOR_A = '#2563eb';
const COLOR_B = '#f59e0b';
const PALETA = ['#94a3b8', '#38bdf8', '#22c55e', '#84cc16', '#f59e0b', '#f97316', '#a855f7', '#ef4444'];

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function corta(s: string, max = 14): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/** Escala con marcas en números redondos (ver comparison-charts.tsx). */
function escalaBonita(maxValor: number, maxMarcas = 5): { tope: number; paso: number } {
  const pasos = [1, 2, 5, 10, 20, 25, 50, 100];
  for (const paso of pasos) {
    if (paso * (maxMarcas - 1) >= maxValor) return { tope: paso * (maxMarcas - 1), paso };
  }
  const paso = Math.ceil(maxValor / (maxMarcas - 1));
  return { tope: paso * (maxMarcas - 1), paso };
}

function envolver(width: number, height: number, contenido: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" font-family="Segoe UI, sans-serif">${contenido}</svg>`;
}

/** Barras del porcentaje por categoría de UN muestreo. */
export function categoriasBarSvg(bins: BinResult[], sinClasificar: number, n: number): string {
  const datos = [
    ...bins.map((b, i) => ({ label: b.label, pct: b.pct, color: b.color ?? PALETA[i % PALETA.length] })),
    ...(sinClasificar > 0 && n > 0
      ? [{ label: 'Sin clasificar', pct: (sinClasificar / n) * 100, color: '#dc2626' }]
      : []),
  ];
  if (datos.length === 0) return '';

  const W = 620, H = 250, padL = 38, padR = 14, padT = 16, padB = 62;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const { tope, paso } = escalaBonita(Math.max(...datos.map((d) => d.pct), 1));
  const marcas = Math.round(tope / paso);
  const grupoW = chartW / datos.length;
  const barW = Math.min(44, grupoW - 10);
  const toY = (p: number) => padT + chartH * (1 - p / tope);

  const rejilla = Array.from({ length: marcas + 1 }, (_, i) => {
    const p = paso * i;
    const y = toY(p);
    return `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${W - padR}" y2="${y.toFixed(1)}" stroke="#e5e7eb" stroke-width="1"/>
      <text x="${padL - 5}" y="${(y + 3).toFixed(1)}" text-anchor="end" font-size="9" fill="#6b7280">${p}</text>`;
  }).join('');

  const barras = datos.map((d, i) => {
    const centro = padL + i * grupoW + grupoW / 2;
    const x = centro - barW / 2;
    const y = toY(d.pct);
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(toY(0) - y, 0).toFixed(1)}" fill="${d.color}" rx="2"/>
      <text x="${centro.toFixed(1)}" y="${(y - 4).toFixed(1)}" text-anchor="middle" font-size="9" font-weight="bold" fill="#374151">${d.pct.toFixed(1)}</text>
      <text x="${centro.toFixed(1)}" y="${(toY(0) + 12).toFixed(1)}" text-anchor="end" font-size="8.5" fill="#6b7280" transform="rotate(-35 ${centro.toFixed(1)} ${(toY(0) + 12).toFixed(1)})">${esc(corta(d.label))}</text>`;
  }).join('');

  return envolver(W, H, `
    <rect width="${W}" height="${H}" fill="white" rx="8"/>
    ${rejilla}
    ${barras}
    <line x1="${padL}" y1="${toY(0).toFixed(1)}" x2="${W - padR}" y2="${toY(0).toFixed(1)}" stroke="#9ca3af" stroke-width="1.5"/>
    <text x="10" y="${padT - 4}" font-size="9" fill="#6b7280">%</text>
  `);
}

export interface CategoriaComparadaSvg {
  label: string;
  pctA: number;
  pctB: number;
}

/** Barras agrupadas: porcentaje por categoría de dos muestreos. */
export function categoriasComparadasSvg(
  categorias: CategoriaComparadaSvg[],
  nombreA: string,
  nombreB: string,
): string {
  if (categorias.length === 0) return '';
  const W = 620, H = 260, padL = 38, padR = 14, padT = 30, padB = 60;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const { tope, paso } = escalaBonita(Math.max(...categorias.flatMap((c) => [c.pctA, c.pctB]), 1));
  const marcas = Math.round(tope / paso);
  const grupoW = chartW / categorias.length;
  const barW = Math.min(24, (grupoW - 8) / 2);
  const toY = (p: number) => padT + chartH * (1 - p / tope);

  const rejilla = Array.from({ length: marcas + 1 }, (_, i) => {
    const p = paso * i;
    const y = toY(p);
    return `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${W - padR}" y2="${y.toFixed(1)}" stroke="#e5e7eb" stroke-width="1"/>
      <text x="${padL - 5}" y="${(y + 3).toFixed(1)}" text-anchor="end" font-size="9" fill="#6b7280">${p}</text>`;
  }).join('');

  const barras = categorias.map((c, i) => {
    const centro = padL + i * grupoW + grupoW / 2;
    const xA = centro - barW - 2;
    const xB = centro + 2;
    return `<rect x="${xA.toFixed(1)}" y="${toY(c.pctA).toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(toY(0) - toY(c.pctA), 0).toFixed(1)}" fill="${COLOR_A}" rx="2"/>
      <rect x="${xB.toFixed(1)}" y="${toY(c.pctB).toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(toY(0) - toY(c.pctB), 0).toFixed(1)}" fill="${COLOR_B}" rx="2"/>
      <text x="${centro.toFixed(1)}" y="${(toY(0) + 12).toFixed(1)}" text-anchor="end" font-size="8.5" fill="#6b7280" transform="rotate(-35 ${centro.toFixed(1)} ${(toY(0) + 12).toFixed(1)})">${esc(corta(c.label))}</text>`;
  }).join('');

  return envolver(W, H, `
    <rect width="${W}" height="${H}" fill="white" rx="8"/>
    ${rejilla}
    ${barras}
    <line x1="${padL}" y1="${toY(0).toFixed(1)}" x2="${W - padR}" y2="${toY(0).toFixed(1)}" stroke="#9ca3af" stroke-width="1.5"/>
    <rect x="${padL}" y="8" width="10" height="10" fill="${COLOR_A}" rx="2"/>
    <text x="${padL + 14}" y="17" font-size="9.5" fill="#374151">${esc(corta(nombreA, 26))}</text>
    <rect x="${padL + 210}" y="8" width="10" height="10" fill="${COLOR_B}" rx="2"/>
    <text x="${padL + 224}" y="17" font-size="9.5" fill="#374151">${esc(corta(nombreB, 26))}</text>
    <text x="10" y="${padT - 12}" font-size="9" fill="#6b7280">%</text>
  `);
}

/** Medias de dos muestreos con barras de error del IC 95 %. */
export function mediasComparadasSvg(
  mediaA: number,
  mediaB: number,
  ciA: { lower: number; upper: number } | null,
  ciB: { lower: number; upper: number } | null,
  nombreA: string,
  nombreB: string,
  unidad: string,
  decimales: number,
): string {
  const W = 620, H = 210, padL = 54, padR = 16, padT = 20, padB = 44;
  const chartH = H - padT - padB;

  const vals = [mediaA, mediaB, ciA?.lower, ciA?.upper, ciB?.lower, ciB?.upper]
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  let minY = Math.min(...vals);
  let maxY = Math.max(...vals);
  const margen = (maxY - minY) * 0.25 || Math.abs(maxY) * 0.05 || 1;
  minY -= margen;
  maxY += margen;

  const toY = (v: number) => padT + chartH * (1 - (v - minY) / (maxY - minY));
  const f = (v: number) => v.toFixed(decimales);

  const rejilla = Array.from({ length: 5 }, (_, i) => {
    const v = minY + ((maxY - minY) * i) / 4;
    const y = toY(v);
    return `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${W - padR}" y2="${y.toFixed(1)}" stroke="#e5e7eb" stroke-width="1"/>
      <text x="${padL - 5}" y="${(y + 3).toFixed(1)}" text-anchor="end" font-size="9" fill="#6b7280">${f(v)}</text>`;
  }).join('');

  const barW = 100;
  const barras = [
    { nombre: nombreA, media: mediaA, ci: ciA, color: COLOR_A, x: padL + 110 },
    { nombre: nombreB, media: mediaB, ci: ciB, color: COLOR_B, x: padL + 350 },
  ].map((b) => {
    const bigote = b.ci
      ? `<g stroke="#111827" stroke-width="1.6">
           <line x1="${b.x}" y1="${toY(b.ci.lower).toFixed(1)}" x2="${b.x}" y2="${toY(b.ci.upper).toFixed(1)}"/>
           <line x1="${b.x - 9}" y1="${toY(b.ci.lower).toFixed(1)}" x2="${b.x + 9}" y2="${toY(b.ci.lower).toFixed(1)}"/>
           <line x1="${b.x - 9}" y1="${toY(b.ci.upper).toFixed(1)}" x2="${b.x + 9}" y2="${toY(b.ci.upper).toFixed(1)}"/>
         </g>`
      : '';
    return `<rect x="${b.x - barW / 2}" y="${toY(b.media).toFixed(1)}" width="${barW}" height="${Math.max(toY(minY) - toY(b.media), 0).toFixed(1)}" fill="${b.color}" opacity="0.85" rx="3"/>
      ${bigote}
      <text x="${b.x}" y="${(toY(minY) + 14).toFixed(1)}" text-anchor="middle" font-size="9.5" fill="#6b7280">${esc(corta(b.nombre, 30))}</text>
      <text x="${b.x}" y="${(toY(b.ci ? b.ci.upper : b.media) - 7).toFixed(1)}" text-anchor="middle" font-size="10" font-weight="bold" fill="#111827">${f(b.media)}</text>`;
  }).join('');

  return envolver(W, H, `
    <rect width="${W}" height="${H}" fill="white" rx="8"/>
    ${rejilla}
    ${barras}
    <line x1="${padL}" y1="${toY(minY).toFixed(1)}" x2="${W - padR}" y2="${toY(minY).toFixed(1)}" stroke="#9ca3af" stroke-width="1.5"/>
    <text x="10" y="${padT - 6}" font-size="9" fill="#6b7280">${esc(unidad)}</text>
    <text x="${W - padR}" y="${H - 6}" text-anchor="end" font-size="8.5" fill="#6b7280">Barras de error: IC 95 % de la media · escala sin origen en cero</text>
  `);
}

/**
 * Media observada (con su IC 95 %) frente a un valor objetivo de referencia.
 *
 * DECISIÓN DE REPRESENTACIÓN: el objetivo se dibuja como LÍNEA, no como una
 * segunda barra. Un peso objetivo de guía genética no es una muestra: no tiene
 * incertidumbre ni n, y darle el mismo peso visual que a la media observada
 * insinuaría una comparación entre dos mediciones que no existe.
 */
export function mediaVsObjetivoSvg(
  media: number,
  ci: { lower: number; upper: number } | null,
  objetivo: number,
  etiquetaObjetivo: string,
  unidad: string,
  decimales: number,
): string {
  const W = 620, H = 200, padL = 58, padR = 120, padT = 20, padB = 40;
  const chartH = H - padT - padB;

  const vals = [media, objetivo, ci?.lower, ci?.upper].filter(
    (v): v is number => typeof v === 'number' && Number.isFinite(v),
  );
  let minY = Math.min(...vals);
  let maxY = Math.max(...vals);
  const margen = (maxY - minY) * 0.35 || Math.abs(maxY) * 0.05 || 1;
  minY -= margen;
  maxY += margen;

  const toY = (v: number) => padT + chartH * (1 - (v - minY) / (maxY - minY));
  const f = (v: number) => v.toFixed(decimales);

  const rejilla = Array.from({ length: 5 }, (_, i) => {
    const v = minY + ((maxY - minY) * i) / 4;
    const y = toY(v);
    return `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${W - padR}" y2="${y.toFixed(1)}" stroke="#e5e7eb" stroke-width="1"/>
      <text x="${padL - 5}" y="${(y + 3).toFixed(1)}" text-anchor="end" font-size="9" fill="#6b7280">${f(v)}</text>`;
  }).join('');

  const cx = padL + (W - padR - padL) / 2;
  const barW = 110;
  const yObj = toY(objetivo);
  const diff = media - objetivo;
  const colorBarra = Math.abs(diff / objetivo) <= 0.05 ? '#16a34a' : Math.abs(diff / objetivo) <= 0.10 ? '#f59e0b' : '#dc2626';

  const bigote = ci
    ? `<g stroke="#111827" stroke-width="1.6">
         <line x1="${cx}" y1="${toY(ci.lower).toFixed(1)}" x2="${cx}" y2="${toY(ci.upper).toFixed(1)}"/>
         <line x1="${cx - 10}" y1="${toY(ci.lower).toFixed(1)}" x2="${cx + 10}" y2="${toY(ci.lower).toFixed(1)}"/>
         <line x1="${cx - 10}" y1="${toY(ci.upper).toFixed(1)}" x2="${cx + 10}" y2="${toY(ci.upper).toFixed(1)}"/>
       </g>`
    : '';

  return envolver(W, H, `
    <rect width="${W}" height="${H}" fill="white" rx="8"/>
    ${rejilla}
    <rect x="${cx - barW / 2}" y="${toY(media).toFixed(1)}" width="${barW}" height="${Math.max(toY(minY) - toY(media), 0).toFixed(1)}" fill="${colorBarra}" opacity="0.85" rx="3"/>
    ${bigote}
    <line x1="${padL}" y1="${yObj.toFixed(1)}" x2="${W - padR}" y2="${yObj.toFixed(1)}" stroke="#1d4ed8" stroke-width="2" stroke-dasharray="7,4"/>
    <text x="${W - padR + 6}" y="${(yObj + 3).toFixed(1)}" font-size="9" font-weight="bold" fill="#1d4ed8">${esc(etiquetaObjetivo)}</text>
    <text x="${W - padR + 6}" y="${(yObj + 15).toFixed(1)}" font-size="9" fill="#1d4ed8">${f(objetivo)} ${esc(unidad)}</text>
    <text x="${cx}" y="${(toY(ci ? ci.upper : media) - 7).toFixed(1)}" text-anchor="middle" font-size="10" font-weight="bold" fill="#111827">${f(media)} ${esc(unidad)}</text>
    <text x="${cx}" y="${(toY(minY) + 14).toFixed(1)}" text-anchor="middle" font-size="9.5" fill="#6b7280">Media observada del lote</text>
    <line x1="${padL}" y1="${toY(minY).toFixed(1)}" x2="${W - padR}" y2="${toY(minY).toFixed(1)}" stroke="#9ca3af" stroke-width="1.5"/>
    <text x="10" y="${padT - 6}" font-size="9" fill="#6b7280">${esc(unidad)}</text>
    <text x="${W - padR}" y="${H - 6}" text-anchor="end" font-size="8.5" fill="#6b7280">Barra de error: IC 95 % · escala sin origen en cero</text>
  `);
}

/**
 * Diagrama de caja: mediana, cuartiles, cercos de Tukey y atípicos.
 * Da imagen a los estadísticos de posición que el reporte ya tabula.
 */
export function boxplotSvg(
  q1: number,
  mediana: number,
  q3: number,
  min: number,
  max: number,
  atipicos: number[],
  unidad: string,
  decimales: number,
): string {
  const W = 620, H = 150, padL = 20, padR = 20, padT = 30, padB = 42;
  const iqr = q3 - q1;
  // Cercos de Tukey, recortados al dato real más extremo dentro del cerco
  const cercoInf = Math.max(min, q1 - 1.5 * iqr);
  const cercoSup = Math.min(max, q3 + 1.5 * iqr);

  const todos = [min, max, ...atipicos];
  let lo = Math.min(...todos);
  let hi = Math.max(...todos);
  const margen = (hi - lo) * 0.08 || 1;
  lo -= margen;
  hi += margen;

  const toX = (v: number) => padL + ((v - lo) / (hi - lo)) * (W - padL - padR);
  const f = (v: number) => v.toFixed(decimales);
  const yc = padT + (H - padT - padB) / 2;
  const alto = 34;

  const marcas = Array.from({ length: 6 }, (_, i) => {
    const v = lo + ((hi - lo) * i) / 5;
    return `<line x1="${toX(v).toFixed(1)}" y1="${H - padB + 4}" x2="${toX(v).toFixed(1)}" y2="${H - padB + 8}" stroke="#9ca3af" stroke-width="1"/>
      <text x="${toX(v).toFixed(1)}" y="${H - padB + 20}" text-anchor="middle" font-size="9" fill="#6b7280">${f(v)}</text>`;
  }).join('');

  const puntos = atipicos
    .map((v) => `<circle cx="${toX(v).toFixed(1)}" cy="${yc}" r="3.5" fill="none" stroke="#dc2626" stroke-width="1.6"/>`)
    .join('');

  return envolver(W, H, `
    <rect width="${W}" height="${H}" fill="white" rx="8"/>
    <line x1="${toX(cercoInf).toFixed(1)}" y1="${yc}" x2="${toX(q1).toFixed(1)}" y2="${yc}" stroke="#374151" stroke-width="1.4"/>
    <line x1="${toX(q3).toFixed(1)}" y1="${yc}" x2="${toX(cercoSup).toFixed(1)}" y2="${yc}" stroke="#374151" stroke-width="1.4"/>
    <line x1="${toX(cercoInf).toFixed(1)}" y1="${yc - 9}" x2="${toX(cercoInf).toFixed(1)}" y2="${yc + 9}" stroke="#374151" stroke-width="1.4"/>
    <line x1="${toX(cercoSup).toFixed(1)}" y1="${yc - 9}" x2="${toX(cercoSup).toFixed(1)}" y2="${yc + 9}" stroke="#374151" stroke-width="1.4"/>
    <rect x="${toX(q1).toFixed(1)}" y="${yc - alto / 2}" width="${Math.max(toX(q3) - toX(q1), 1).toFixed(1)}" height="${alto}" fill="#4CAF50" fill-opacity="0.35" stroke="#2E7D32" stroke-width="1.4" rx="2"/>
    <line x1="${toX(mediana).toFixed(1)}" y1="${yc - alto / 2}" x2="${toX(mediana).toFixed(1)}" y2="${yc + alto / 2}" stroke="#111827" stroke-width="2.2"/>
    ${puntos}
    <text x="${toX(q1).toFixed(1)}" y="${yc - alto / 2 - 6}" text-anchor="middle" font-size="8.5" fill="#374151">Q1 ${f(q1)}</text>
    <text x="${toX(mediana).toFixed(1)}" y="${yc + alto / 2 + 12}" text-anchor="middle" font-size="8.5" font-weight="bold" fill="#111827">Mediana ${f(mediana)}</text>
    <text x="${toX(q3).toFixed(1)}" y="${yc - alto / 2 - 6}" text-anchor="middle" font-size="8.5" fill="#374151">Q3 ${f(q3)}</text>
    <line x1="${padL}" y1="${H - padB + 4}" x2="${W - padR}" y2="${H - padB + 4}" stroke="#9ca3af" stroke-width="1.2"/>
    ${marcas}
    <text x="${W - padR}" y="16" text-anchor="end" font-size="8.5" fill="#6b7280">Caja: Q1–Q3 · bigotes: cercos de 1.5×IQR · círculos: atípicos${unidad ? ` · ${esc(unidad)}` : ''}</text>
  `);
}

/** Gráfico Q-Q: cuantiles observados frente a los teóricos normales. */
export function qqPlotSvg(
  puntos: Array<{ theoretical: number; observed: number }>,
  unidad: string,
  decimales: number,
): string {
  if (puntos.length < 3) return '';
  const W = 620, H = 300, padL = 58, padR = 18, padT = 18, padB = 46;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const xs = puntos.map((p) => p.theoretical);
  const ys = puntos.map((p) => p.observed);
  const lo = Math.min(...xs, ...ys);
  const hi = Math.max(...xs, ...ys);
  const margen = (hi - lo) * 0.06 || 1;
  const min = lo - margen;
  const max = hi + margen;

  const toX = (v: number) => padL + ((v - min) / (max - min)) * chartW;
  const toY = (v: number) => padT + chartH * (1 - (v - min) / (max - min));
  const f = (v: number) => v.toFixed(decimales);

  const marcas = Array.from({ length: 5 }, (_, i) => {
    const v = min + ((max - min) * i) / 4;
    return `<line x1="${padL}" y1="${toY(v).toFixed(1)}" x2="${W - padR}" y2="${toY(v).toFixed(1)}" stroke="#f3f4f6" stroke-width="1"/>
      <text x="${padL - 5}" y="${(toY(v) + 3).toFixed(1)}" text-anchor="end" font-size="9" fill="#6b7280">${f(v)}</text>
      <text x="${toX(v).toFixed(1)}" y="${H - padB + 16}" text-anchor="middle" font-size="9" fill="#6b7280">${f(v)}</text>`;
  }).join('');

  const circulos = puntos
    .map((p) => `<circle cx="${toX(p.theoretical).toFixed(1)}" cy="${toY(p.observed).toFixed(1)}" r="2.6" fill="#2E7D32" fill-opacity="0.75"/>`)
    .join('');

  return envolver(W, H, `
    <rect width="${W}" height="${H}" fill="white" rx="8"/>
    ${marcas}
    <line x1="${toX(min).toFixed(1)}" y1="${toY(min).toFixed(1)}" x2="${toX(max).toFixed(1)}" y2="${toY(max).toFixed(1)}" stroke="#1d4ed8" stroke-width="1.6" stroke-dasharray="6,4"/>
    ${circulos}
    <line x1="${padL}" y1="${toY(min).toFixed(1)}" x2="${W - padR}" y2="${toY(min).toFixed(1)}" stroke="#9ca3af" stroke-width="1.2"/>
    <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${toY(min).toFixed(1)}" stroke="#9ca3af" stroke-width="1.2"/>
    <text x="${W / 2}" y="${H - 6}" text-anchor="middle" font-size="9.5" fill="#374151">Cuantiles teóricos de una normal${unidad ? ` (${esc(unidad)})` : ''}</text>
    <text x="12" y="${padT + 10}" font-size="9.5" fill="#374151">Observado</text>
    <text x="${W - padR}" y="${padT + 10}" text-anchor="end" font-size="8.5" fill="#1d4ed8">Línea: ajuste normal perfecto</text>
  `);
}

/**
 * Banda de uniformidad frente al intervalo de confianza de la media.
 *
 * Es el gráfico más didáctico del reporte académico: pone ambos rangos en el
 * MISMO eje para que se vea que miden cosas distintas —la banda describe la
 * dispersión de las aves; el IC, la incertidumbre sobre la media— y que el IC
 * es mucho más estrecho. Confundirlos es el error conceptual que la aplicación
 * viene señalando desde la auditoría.
 */
export function bandaVsIcSvg(
  media: number,
  limInf: number,
  limSup: number,
  ciLower: number,
  ciUpper: number,
  criterioPct: number,
  unidad: string,
  decimales: number,
): string {
  const W = 620, H = 190, padL = 118, padR = 24, padT = 26, padB = 44;
  let lo = Math.min(limInf, ciLower);
  let hi = Math.max(limSup, ciUpper);
  const margen = (hi - lo) * 0.12 || 1;
  lo -= margen;
  hi += margen;

  const toX = (v: number) => padL + ((v - lo) / (hi - lo)) * (W - padL - padR);
  const f = (v: number) => v.toFixed(decimales);
  const yBanda = padT + 22;
  const yIc = padT + 74;

  const marcas = Array.from({ length: 6 }, (_, i) => {
    const v = lo + ((hi - lo) * i) / 5;
    return `<line x1="${toX(v).toFixed(1)}" y1="${padT - 6}" x2="${toX(v).toFixed(1)}" y2="${H - padB + 6}" stroke="#f3f4f6" stroke-width="1"/>
      <text x="${toX(v).toFixed(1)}" y="${H - padB + 20}" text-anchor="middle" font-size="9" fill="#6b7280">${f(v)}</text>`;
  }).join('');

  const barra = (y: number, a: number, b: number, color: string, relleno: string) => `
    <rect x="${toX(a).toFixed(1)}" y="${y - 11}" width="${Math.max(toX(b) - toX(a), 2).toFixed(1)}" height="22" fill="${relleno}" stroke="${color}" stroke-width="1.4" rx="3"/>
    <text x="${toX(a).toFixed(1)}" y="${y + 24}" text-anchor="middle" font-size="8.5" fill="#6b7280">${f(a)}</text>
    <text x="${toX(b).toFixed(1)}" y="${y + 24}" text-anchor="middle" font-size="8.5" fill="#6b7280">${f(b)}</text>`;

  return envolver(W, H, `
    <rect width="${W}" height="${H}" fill="white" rx="8"/>
    ${marcas}
    ${barra(yBanda, limInf, limSup, '#2E7D32', 'rgba(76,175,80,0.30)')}
    ${barra(yIc, ciLower, ciUpper, '#1d4ed8', 'rgba(37,99,235,0.30)')}
    <line x1="${toX(media).toFixed(1)}" y1="${padT - 6}" x2="${toX(media).toFixed(1)}" y2="${H - padB + 6}" stroke="#111827" stroke-width="1.4" stroke-dasharray="5,4"/>
    <text x="${toX(media).toFixed(1)}" y="${padT - 10}" text-anchor="middle" font-size="8.5" font-weight="bold" fill="#111827">media ${f(media)}</text>
    <text x="${padL - 8}" y="${yBanda + 4}" text-anchor="end" font-size="9.5" font-weight="bold" fill="#2E7D32">Banda ±${criterioPct}%</text>
    <text x="${padL - 8}" y="${yIc + 4}" text-anchor="end" font-size="9.5" font-weight="bold" fill="#1d4ed8">IC 95% de la media</text>
    <text x="${W - padR}" y="${H - 6}" text-anchor="end" font-size="8.5" fill="#6b7280">Ambos en la misma escala${unidad ? ` (${esc(unidad)})` : ''}</text>
  `);
}

export interface SerieLinea {
  label: string;
  color: string;
  /** null = sin dato en esa fecha; el trazo se interrumpe. */
  valores: Array<number | null>;
  discontinua?: boolean;
}

/**
 * Gráfico de líneas para series temporales (evolución de un lote).
 *
 * La escala vertical NO arranca en cero: en seguimiento de un lote interesa
 * la forma de la curva y su distancia al objetivo, no la magnitud absoluta.
 * Se advierte en el pie.
 */
export function lineasEvolucionSvg(
  etiquetas: string[],
  series: SerieLinea[],
  unidad: string,
  decimales: number,
  titulo: string,
): string {
  const puntos = series.flatMap((s) => s.valores).filter((v): v is number => v !== null && Number.isFinite(v));
  if (puntos.length === 0 || etiquetas.length === 0) return '';

  const W = 620, H = 270, padL = 52, padR = 16, padT = 30, padB = 58;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  let minY = Math.min(...puntos);
  let maxY = Math.max(...puntos);
  const todosNoNegativos = minY >= 0;
  if (minY === maxY) { minY -= 1; maxY += 1; }
  const margen = (maxY - minY) * 0.12;
  minY -= margen;
  maxY += margen;
  // El margen inferior no puede llevar el eje por debajo de cero cuando la
  // magnitud no admite negativos (porcentajes, pesos): un eje que muestra
  // «−11 %» de uniformidad no significa nada.
  if (todosNoNegativos && minY < 0) minY = 0;

  const n = etiquetas.length;
  const toX = (i: number) => padL + (n === 1 ? chartW / 2 : (i / (n - 1)) * chartW);
  const toY = (v: number) => padT + chartH * (1 - (v - minY) / (maxY - minY));
  const f = (v: number) => v.toFixed(decimales);

  const rejilla = Array.from({ length: 5 }, (_, i) => {
    const v = minY + ((maxY - minY) * i) / 4;
    const y = toY(v);
    return `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${W - padR}" y2="${y.toFixed(1)}" stroke="#e5e7eb" stroke-width="1"/>
      <text x="${padL - 5}" y="${(y + 3).toFixed(1)}" text-anchor="end" font-size="9" fill="#6b7280">${f(v)}</text>`;
  }).join('');

  const trazos = series.map((s) => {
    const pares = s.valores
      .map((v, i) => ({ i, v }))
      .filter((p): p is { i: number; v: number } => p.v !== null && Number.isFinite(p.v as number));
    if (pares.length === 0) return '';
    const d = pares.map((p, k) => `${k === 0 ? 'M' : 'L'}${toX(p.i).toFixed(1)},${toY(p.v).toFixed(1)}`).join(' ');
    const circulos = pares
      .map((p) => `<circle cx="${toX(p.i).toFixed(1)}" cy="${toY(p.v).toFixed(1)}" r="3" fill="${s.color}"/>`)
      .join('');
    return `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round"${s.discontinua ? ' stroke-dasharray="6,4"' : ''}/>${circulos}`;
  }).join('');

  const ejeX = etiquetas.map((l, i) =>
    `<text x="${toX(i).toFixed(1)}" y="${(toY(minY) + 14).toFixed(1)}" text-anchor="end" font-size="8" fill="#6b7280" transform="rotate(-35 ${toX(i).toFixed(1)} ${(toY(minY) + 14).toFixed(1)})">${esc(corta(l, 12))}</text>`,
  ).join('');

  const leyenda = series.map((s, i) =>
    `<line x1="${padL + i * 170}" y1="12" x2="${padL + i * 170 + 18}" y2="12" stroke="${s.color}" stroke-width="2.5"${s.discontinua ? ' stroke-dasharray="6,4"' : ''}/>
     <text x="${padL + i * 170 + 22}" y="15" font-size="9.5" fill="#374151">${esc(corta(s.label, 24))}</text>`,
  ).join('');

  return envolver(W, H, `
    <rect width="${W}" height="${H}" fill="white" rx="8"/>
    ${rejilla}
    ${trazos}
    <line x1="${padL}" y1="${toY(minY).toFixed(1)}" x2="${W - padR}" y2="${toY(minY).toFixed(1)}" stroke="#9ca3af" stroke-width="1.2"/>
    ${ejeX}
    ${leyenda}
    <text x="10" y="${padT - 12}" font-size="9" fill="#6b7280">${esc(unidad)}</text>
    <text x="${W - padR}" y="${H - 5}" text-anchor="end" font-size="8.5" fill="#6b7280">${esc(titulo)} · escala sin origen en cero</text>
  `);
}

/** Barras de la ganancia diaria entre pesajes consecutivos. */
export function gananciaDiariaBarSvg(
  periodos: Array<{ label: string; gDia: number | null }>,
  unidad: string,
): string {
  const datos = periodos.filter((p): p is { label: string; gDia: number } => p.gDia !== null && Number.isFinite(p.gDia));
  if (datos.length === 0) return '';

  const W = 620, H = 230, padL = 46, padR = 14, padT = 18, padB = 62;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const vals = datos.map((d) => d.gDia);
  const maxAbs = Math.max(...vals.map(Math.abs), 1);
  const hayNegativos = vals.some((v) => v < 0);
  const tope = Math.ceil(maxAbs / 5) * 5;
  const minY = hayNegativos ? -tope : 0;
  const maxY = tope;

  const toY = (v: number) => padT + chartH * (1 - (v - minY) / (maxY - minY));
  const grupoW = chartW / datos.length;
  const barW = Math.min(46, grupoW - 10);
  const yCero = toY(0);

  const rejilla = Array.from({ length: 5 }, (_, i) => {
    const v = minY + ((maxY - minY) * i) / 4;
    const y = toY(v);
    return `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${W - padR}" y2="${y.toFixed(1)}" stroke="#e5e7eb" stroke-width="1"/>
      <text x="${padL - 5}" y="${(y + 3).toFixed(1)}" text-anchor="end" font-size="9" fill="#6b7280">${v.toFixed(0)}</text>`;
  }).join('');

  const barras = datos.map((d, i) => {
    const centro = padL + i * grupoW + grupoW / 2;
    const x = centro - barW / 2;
    const y = d.gDia >= 0 ? toY(d.gDia) : yCero;
    const alto = Math.abs(toY(d.gDia) - yCero);
    const color = d.gDia >= 0 ? '#2E7D32' : '#dc2626';
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(alto, 1).toFixed(1)}" fill="${color}" rx="2"/>
      <text x="${centro.toFixed(1)}" y="${(d.gDia >= 0 ? y - 4 : y + alto + 11).toFixed(1)}" text-anchor="middle" font-size="9" font-weight="bold" fill="#374151">${d.gDia.toFixed(1)}</text>
      <text x="${centro.toFixed(1)}" y="${(yCero + (hayNegativos ? chartH * 0.5 : 0) + 16).toFixed(1)}" text-anchor="end" font-size="8" fill="#6b7280" transform="rotate(-35 ${centro.toFixed(1)} ${(yCero + (hayNegativos ? chartH * 0.5 : 0) + 16).toFixed(1)})">${esc(corta(d.label, 16))}</text>`;
  }).join('');

  return envolver(W, H, `
    <rect width="${W}" height="${H}" fill="white" rx="8"/>
    ${rejilla}
    ${barras}
    <line x1="${padL}" y1="${yCero.toFixed(1)}" x2="${W - padR}" y2="${yCero.toFixed(1)}" stroke="#9ca3af" stroke-width="1.5"/>
    <text x="10" y="${padT - 4}" font-size="9" fill="#6b7280">${esc(unidad)}/día</text>
  `);
}

/** Genera los cortes efectivos legibles para el pie de un gráfico. */
export function describeBins(bins: Bin[], unidad: string, dec: number): string {
  return bins
    .map((b) => {
      const f = (v: number) => v.toFixed(dec);
      if (b.min === null && b.max === null) return `${b.label}: todos`;
      if (b.min === null) return `${b.label}: < ${f(b.max!)}`;
      if (b.max === null) return `${b.label}: ≥ ${f(b.min)}`;
      return `${b.label}: ${f(b.min)}–${f(b.max)}`;
    })
    .join(' · ') + (unidad ? ` (${unidad})` : '');
}

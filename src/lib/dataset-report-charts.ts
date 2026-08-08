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

/**
 * Gráficos SVG como cadenas para los reportes imprimibles (Fase 6).
 * Sin dependencias de DOM: funcionan en cualquier contexto y se incrustan
 * directamente en el HTML del reporte.
 */

import { normalPdf } from '@/lib/statistics/distributions';
import { buildHistogram } from '@/lib/statistics/histogram';
import { median } from '@/lib/statistics/descriptive';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Curva normal ajustada con banda de uniformidad sombreada. */
export function uniformityCurveSvg(
  media: number,
  desvEst: number,
  limInf: number,
  limSup: number,
  uniformidad: number,
  criterioPct: number,
): string {
  const sigma = desvEst > 0 ? desvEst : media * 0.05 || 50;
  const width = 620;
  const height = 300;
  const padL = 30;
  const padR = 20;
  const padT = 30;
  const padB = 50;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;
  const minVal = media - 3.5 * sigma;
  const maxVal = media + 3.5 * sigma;

  const pts: Array<{ x: number; y: number }> = [];
  for (let i = 0; i <= 120; i++) {
    const x = minVal + ((maxVal - minVal) * i) / 120;
    pts.push({ x, y: normalPdf(x, media, sigma) });
  }
  const maxY = Math.max(...pts.map((p) => p.y), 1e-9);
  const toX = (v: number) => padL + ((v - minVal) / (maxVal - minVal)) * chartW;
  const toY = (v: number) => padT + chartH - (v / maxY) * chartH;

  const parts: string[] = [];
  parts.push(`<rect width="${width}" height="${height}" fill="white" rx="8"/>`);

  const inRange = pts.filter((p) => p.x >= limInf && p.x <= limSup);
  if (inRange.length > 1) {
    let poly = inRange.map((p) => `${toX(p.x).toFixed(1)},${toY(p.y).toFixed(1)}`).join(' ');
    poly += ` ${toX(inRange[inRange.length - 1].x).toFixed(1)},${toY(0).toFixed(1)} ${toX(inRange[0].x).toFixed(1)},${toY(0).toFixed(1)}`;
    parts.push(`<polygon points="${poly}" fill="rgba(76,175,80,0.3)"/>`);
  }
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(p.x).toFixed(1)},${toY(p.y).toFixed(1)}`).join(' ');
  parts.push(`<path d="${path}" fill="none" stroke="#2E7D32" stroke-width="2.5" stroke-linejoin="round"/>`);

  const refLine = (value: number, color: string, dash: string, label: string) => {
    const x = toX(value);
    const y = toY(normalPdf(value, media, sigma));
    parts.push(`<line x1="${x.toFixed(1)}" y1="${toY(0).toFixed(1)}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${color}" stroke-width="2" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`);
    parts.push(`<text x="${x.toFixed(1)}" y="${(y - 6).toFixed(1)}" text-anchor="middle" fill="${color}" font-size="11" font-weight="bold" font-family="Segoe UI, sans-serif">${esc(label)}</text>`);
  };
  refLine(media, '#333', '5,5', `μ: ${media.toFixed(1)}`);
  refLine(limInf, '#e53935', '', `−${criterioPct}%: ${limInf.toFixed(1)}`);
  refLine(limSup, '#4CAF50', '', `+${criterioPct}%: ${limSup.toFixed(1)}`);

  for (let i = 0; i <= 7; i++) {
    const v = minVal + ((maxVal - minVal) * i) / 7;
    parts.push(`<line x1="${toX(v).toFixed(1)}" y1="${toY(0).toFixed(1)}" x2="${toX(v).toFixed(1)}" y2="${(toY(0) + 5).toFixed(1)}" stroke="#999" stroke-width="1"/>`);
    parts.push(`<text x="${toX(v).toFixed(1)}" y="${(toY(0) + 18).toFixed(1)}" text-anchor="middle" fill="#555" font-size="10" font-family="Segoe UI, sans-serif">${v.toFixed(0)}</text>`);
  }
  parts.push(`<text x="${width - padR}" y="${height - 8}" text-anchor="end" fill="#333" font-size="12" font-weight="bold" font-family="Segoe UI, sans-serif">Uniformidad: ${uniformidad.toFixed(1)}%</text>`);
  parts.push(`<text x="${width / 2}" y="${height - 5}" text-anchor="middle" fill="#333" font-size="12" font-weight="bold" font-family="Segoe UI, sans-serif">Peso (g)</text>`);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">${parts.join('')}</svg>`;
}

/** Histograma empírico con curva normal superpuesta (densidad). */
export function histogramSvg(pesos: number[], media: number, desvEst: number, limInf: number, limSup: number): string {
  const hist = buildHistogram(pesos, 'auto');
  if (!hist) return '';
  const width = 620;
  const height = 300;
  const padL = 40;
  const padR = 16;
  const padT = 24;
  const padB = 44;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;
  const minX = hist.bins[0].x0;
  const maxX = hist.bins[hist.bins.length - 1].x1;

  let maxY = Math.max(...hist.bins.map((b) => b.density));
  if (desvEst > 0) maxY = Math.max(maxY, normalPdf(media, media, desvEst));
  if (maxY <= 0) maxY = 1;

  const toX = (v: number) => padL + ((v - minX) / (maxX - minX)) * chartW;
  const toY = (v: number) => padT + chartH - (v / maxY) * chartH * 0.94;

  const parts: string[] = [];
  parts.push(`<rect width="${width}" height="${height}" fill="white" rx="8"/>`);
  for (const b of hist.bins) {
    const x = toX(b.x0);
    const w = Math.max(toX(b.x1) - toX(b.x0) - 1, 1);
    const y = toY(b.density);
    parts.push(`<rect x="${(x + 0.5).toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${Math.max(toY(0) - y, 0).toFixed(1)}" fill="rgba(46,125,50,0.45)" stroke="#2E7D32" stroke-width="1"/>`);
  }
  if (desvEst > 0) {
    const curve: string[] = [];
    for (let i = 0; i <= 120; i++) {
      const x = minX + ((maxX - minX) * i) / 120;
      curve.push(`${i === 0 ? 'M' : 'L'}${toX(x).toFixed(1)},${toY(normalPdf(x, media, desvEst)).toFixed(1)}`);
    }
    parts.push(`<path d="${curve.join(' ')}" fill="none" stroke="#1d4ed8" stroke-width="2.2" stroke-linejoin="round"/>`);
  }
  const med = median(pesos);
  const refs: Array<[number, string, string]> = [
    [media, '#333', 'μ'],
    [med, '#7c3aed', 'Med'],
    [limInf, '#e53935', '−'],
    [limSup, '#2E7D32', '+'],
  ];
  for (const [v, color, label] of refs) {
    if (v >= minX && v <= maxX) {
      parts.push(`<line x1="${toX(v).toFixed(1)}" y1="${padT}" x2="${toX(v).toFixed(1)}" y2="${toY(0).toFixed(1)}" stroke="${color}" stroke-width="1.5" stroke-dasharray="5,4" opacity="0.8"/>`);
      parts.push(`<text x="${toX(v).toFixed(1)}" y="${padT - 4}" text-anchor="middle" fill="${color}" font-size="10" font-weight="bold" font-family="Segoe UI, sans-serif">${esc(label)}</text>`);
    }
  }
  parts.push(`<line x1="${padL}" y1="${toY(0).toFixed(1)}" x2="${width - padR}" y2="${toY(0).toFixed(1)}" stroke="#999" stroke-width="1"/>`);
  for (let i = 0; i <= 7; i++) {
    const v = minX + ((maxX - minX) * i) / 7;
    parts.push(`<text x="${toX(v).toFixed(1)}" y="${(toY(0) + 14).toFixed(1)}" text-anchor="middle" fill="#666" font-size="9" font-family="Segoe UI, sans-serif">${v.toFixed(0)}</text>`);
  }
  parts.push(`<text x="${width / 2}" y="${height - 4}" text-anchor="middle" fill="#444" font-size="11" font-weight="bold" font-family="Segoe UI, sans-serif">Histograma (${hist.bins.length} clases) con curva normal — μ, mediana y límites ±</text>`);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">${parts.join('')}</svg>`;
}

/** Codifica un SVG como data URI para <img>. */
export function svgToDataUri(svg: string): string {
  if (typeof window === 'undefined') return '';
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

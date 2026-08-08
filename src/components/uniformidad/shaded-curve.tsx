'use client';

/**
 * Curva de densidad (normal o t) con área sombreada, en SVG puro.
 * Reutilizada por la calculadora de probabilidades y la prueba t.
 */

import { normalPdf, tPdf } from '@/lib/statistics/distributions';

export interface ShadedCurveProps {
  kind: 'normal' | 't';
  mu?: number; // normal
  sigma?: number; // normal
  df?: number; // t
  /** Región(es) sombreada(s): pares [desde, hasta] en la escala de la curva */
  shaded: Array<[number, number]>;
  /** Marcas verticales con etiqueta */
  markers?: Array<{ x: number; label: string; color?: string }>;
  xLabel?: string;
  ariaLabel?: string;
}

export function ShadedCurve({ kind, mu = 0, sigma = 1, df = 10, shaded, markers = [], xLabel, ariaLabel }: ShadedCurveProps) {
  const width = 560;
  const height = 240;
  const padL = 14;
  const padR = 14;
  const padT = 16;
  const padB = 42;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;

  const density = (x: number) => (kind === 'normal' ? normalPdf(x, mu, sigma) : tPdf(x, df));
  const center = kind === 'normal' ? mu : 0;
  const spread = kind === 'normal' ? sigma : Math.sqrt(Math.max(df / Math.max(df - 2, 0.5), 1.2));
  const minX = center - 4 * spread;
  const maxX = center + 4 * spread;

  const N = 160;
  const pts: Array<[number, number]> = [];
  let maxY = 0;
  for (let i = 0; i <= N; i++) {
    const x = minX + ((maxX - minX) * i) / N;
    const y = density(x);
    if (y > maxY) maxY = y;
    pts.push([x, y]);
  }
  if (maxY <= 0) return null;

  const toX = (x: number) => padL + ((Math.min(Math.max(x, minX), maxX) - minX) / (maxX - minX)) * chartW;
  const toY = (y: number) => padT + chartH - (y / maxY) * chartH * 0.94;

  const curvePath = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${toX(x).toFixed(2)},${toY(y).toFixed(2)}`).join(' ');

  const shadedPaths = shaded.map(([a, b]) => {
    const lo = Math.max(Math.min(a, b), minX);
    const hi = Math.min(Math.max(a, b), maxX);
    if (hi <= lo) return null;
    const seg = pts.filter(([x]) => x >= lo && x <= hi);
    const first: [number, number] = [lo, density(lo)];
    const last: [number, number] = [hi, density(hi)];
    const all = [first, ...seg, last];
    let path = `M${toX(lo).toFixed(2)},${toY(0).toFixed(2)} `;
    path += all.map(([x, y]) => `L${toX(x).toFixed(2)},${toY(y).toFixed(2)}`).join(' ');
    path += ` L${toX(hi).toFixed(2)},${toY(0).toFixed(2)} Z`;
    return path;
  });

  const ticks = 7;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-auto"
      role="img"
      aria-label={ariaLabel ?? 'Curva de densidad con área sombreada'}
    >
      <rect width={width} height={height} fill="white" rx={8} />
      {shadedPaths.map((p, i) =>
        p ? <path key={i} d={p} fill="rgba(220, 38, 38, 0.35)" stroke="none" /> : null,
      )}
      <path d={curvePath} fill="none" stroke="#2E7D32" strokeWidth={2.5} strokeLinejoin="round" />
      <line x1={padL} y1={toY(0)} x2={width - padR} y2={toY(0)} stroke="#999" strokeWidth={1} />
      {Array.from({ length: ticks + 1 }, (_, i) => {
        const v = minX + ((maxX - minX) * i) / ticks;
        return (
          <g key={i}>
            <line x1={toX(v)} y1={toY(0)} x2={toX(v)} y2={toY(0) + 4} stroke="#999" strokeWidth={1} />
            <text x={toX(v)} y={toY(0) + 16} textAnchor="middle" fontSize={10} fill="#666">
              {Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(2)}
            </text>
          </g>
        );
      })}
      {markers.map((mk, i) => (
        <g key={`m${i}`}>
          <line
            x1={toX(mk.x)}
            y1={toY(0)}
            x2={toX(mk.x)}
            y2={toY(density(mk.x))}
            stroke={mk.color ?? '#1d4ed8'}
            strokeWidth={2}
            strokeDasharray="4,3"
          />
          <text
            x={toX(mk.x)}
            y={Math.max(toY(density(mk.x)) - 6, 12)}
            textAnchor="middle"
            fontSize={11}
            fontWeight="bold"
            fill={mk.color ?? '#1d4ed8'}
          >
            {mk.label}
          </text>
        </g>
      ))}
      {xLabel && (
        <text x={width / 2} y={height - 4} textAnchor="middle" fontSize={12} fontWeight="bold" fill="#444">
          {xLabel}
        </text>
      )}
    </svg>
  );
}

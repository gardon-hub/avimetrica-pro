'use client';

/**
 * Evolución temporal de un lote con varios pesajes: peso promedio vs. curva
 * objetivo de la línea, CV y uniformidad por fecha, y ganancia entre pesajes.
 */

import { useMemo } from 'react';
import { PesajeFull } from '@/lib/lotes-api';
import { calculateStats } from '@/lib/calculations';
import { getTargetWeight } from '@/lib/diagnostic-engine';

interface SeriesPoint {
  fecha: Date;
  label: string;
  edadSemanas: number | null;
  n: number;
  media: number;
  cv: number;
  uniformidad: number;
  objetivo: number | null;
}

function buildSeries(pesajes: PesajeFull[], lineaGenetica: string): SeriesPoint[] {
  return pesajes
    .filter((p) => p.pesos.length > 0)
    .map((p) => {
      const activos = p.pesos.filter((w) => !w.excluido).map((w) => w.gramos);
      const st = calculateStats(activos, p.criterioPct);
      const objetivo = p.edadSemanas ? getTargetWeight(lineaGenetica, p.edadSemanas)?.pesoOptimo ?? null : null;
      return {
        fecha: new Date(p.fecha),
        label: new Date(p.fecha).toLocaleDateString(),
        edadSemanas: p.edadSemanas,
        n: st.totalAves,
        media: st.promedio,
        cv: st.cv,
        uniformidad: st.uniformidad,
        objetivo,
      };
    })
    .sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
}

function LineChartSVG({
  points,
  series,
  yLabel,
  ariaLabel,
}: {
  points: SeriesPoint[];
  series: Array<{ key: 'media' | 'cv' | 'uniformidad' | 'objetivo'; color: string; label: string; dash?: string }>;
  yLabel: string;
  ariaLabel: string;
}) {
  const width = 560;
  const height = 260;
  const padL = 48;
  const padR = 16;
  const padT = 20;
  const padB = 46;

  const values = series.flatMap((s) => points.map((p) => p[s.key]).filter((v): v is number => v !== null && Number.isFinite(v)));
  if (values.length === 0) return null;
  let minY = Math.min(...values);
  let maxY = Math.max(...values);
  if (minY === maxY) {
    minY -= 1;
    maxY += 1;
  }
  const spanPad = (maxY - minY) * 0.1;
  minY -= spanPad;
  maxY += spanPad;

  const toX = (i: number) => padL + (points.length === 1 ? (width - padL - padR) / 2 : (i / (points.length - 1)) * (width - padL - padR));
  const toY = (v: number) => padT + (height - padT - padB) * (1 - (v - minY) / (maxY - minY));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img" aria-label={ariaLabel}>
      <rect width={width} height={height} fill="white" rx={8} />
      {Array.from({ length: 5 }, (_, i) => {
        const v = minY + ((maxY - minY) * i) / 4;
        return (
          <g key={i}>
            <line x1={padL} y1={toY(v)} x2={width - padR} y2={toY(v)} stroke="#eee" strokeWidth={1} />
            <text x={padL - 5} y={toY(v) + 3} textAnchor="end" fontSize={9} fill="#777">{v.toFixed(v >= 100 ? 0 : 1)}</text>
          </g>
        );
      })}
      {series.map((s) => {
        const pts = points
          .map((p, i) => ({ i, v: p[s.key] }))
          .filter((q): q is { i: number; v: number } => q.v !== null && Number.isFinite(q.v as number));
        if (pts.length === 0) return null;
        const path = pts.map((q, k) => `${k === 0 ? 'M' : 'L'}${toX(q.i).toFixed(1)},${toY(q.v).toFixed(1)}`).join(' ');
        return (
          <g key={s.key}>
            <path d={path} fill="none" stroke={s.color} strokeWidth={2} strokeDasharray={s.dash ?? 'none'} strokeLinejoin="round" />
            {pts.map((q) => (
              <circle key={q.i} cx={toX(q.i)} cy={toY(q.v)} r={3.2} fill={s.color}>
                <title>{`${points[q.i].label}${points[q.i].edadSemanas ? ` (sem ${points[q.i].edadSemanas})` : ''}: ${q.v.toFixed(1)} — ${s.label}`}</title>
              </circle>
            ))}
          </g>
        );
      })}
      {points.map((p, i) => (
        <text key={i} x={toX(i)} y={height - padB + 14} textAnchor="middle" fontSize={8.5} fill="#666" transform={`rotate(-30 ${toX(i)} ${height - padB + 14})`}>
          {p.label}
        </text>
      ))}
      <text x={width / 2} y={height - 4} textAnchor="middle" fontSize={11} fontWeight="bold" fill="#444">{yLabel}</text>
      {/* leyenda */}
      {series.map((s, i) => (
        <g key={`lg${i}`}>
          <line x1={padL + i * 150} y1={12} x2={padL + i * 150 + 18} y2={12} stroke={s.color} strokeWidth={2.5} strokeDasharray={s.dash ?? 'none'} />
          <text x={padL + i * 150 + 22} y={15} fontSize={10} fill="#555">{s.label}</text>
        </g>
      ))}
    </svg>
  );
}

export function EvolutionCharts({ pesajes, lineaGenetica }: { pesajes: PesajeFull[]; lineaGenetica: string }) {
  const serie = useMemo(() => buildSeries(pesajes, lineaGenetica), [pesajes, lineaGenetica]);

  const gains = useMemo(() => {
    const out: Array<{ desde: string; hasta: string; dias: number; deltaG: number; porDia: number | null }> = [];
    for (let i = 1; i < serie.length; i++) {
      const dias = Math.round((serie[i].fecha.getTime() - serie[i - 1].fecha.getTime()) / 86400000);
      const deltaG = serie[i].media - serie[i - 1].media;
      out.push({
        desde: serie[i - 1].label,
        hasta: serie[i].label,
        dias,
        deltaG,
        porDia: dias > 0 ? deltaG / dias : null,
      });
    }
    return out;
  }, [serie]);

  if (serie.length < 2) {
    return (
      <p className="text-xs text-muted-foreground">
        Se necesitan al menos 2 pesajes con fechas distintas para ver la evolución.
      </p>
    );
  }

  const hasObjetivo = serie.some((p) => p.objetivo !== null);

  return (
    <div className="space-y-4">
      <div>
        <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Peso promedio por fecha</div>
        <LineChartSVG
          points={serie}
          series={[
            { key: 'media', color: '#2E7D32', label: 'Media del lote (g)' },
            ...(hasObjetivo ? [{ key: 'objetivo' as const, color: '#1d4ed8', label: 'Objetivo de la línea (g)', dash: '6,4' }] : []),
          ]}
          yLabel="Peso (g)"
          ariaLabel="Evolución del peso promedio del lote comparado con el objetivo de la línea genética"
        />
      </div>
      <div>
        <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Uniformidad y CV por fecha</div>
        <LineChartSVG
          points={serie}
          series={[
            { key: 'uniformidad', color: '#2E7D32', label: 'Uniformidad (%)' },
            { key: 'cv', color: '#dc2626', label: 'CV (%)' },
          ]}
          yLabel="%"
          ariaLabel="Evolución de la uniformidad y el coeficiente de variación del lote"
        />
      </div>
      {gains.length > 0 && (
        <div className="overflow-x-auto">
          <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Ganancia entre pesajes</div>
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr className="border-b font-bold text-muted-foreground">
                <th className="py-1 text-left">Período</th>
                <th className="py-1 text-right">Días</th>
                <th className="py-1 text-right">Δ media (g)</th>
                <th className="py-1 text-right">g/día</th>
              </tr>
            </thead>
            <tbody>
              {gains.map((g, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-1">{g.desde} → {g.hasta}</td>
                  <td className="py-1 text-right tabular-nums">{g.dias}</td>
                  <td className="py-1 text-right tabular-nums">{g.deltaG >= 0 ? '+' : ''}{g.deltaG.toFixed(1)}</td>
                  <td className="py-1 text-right tabular-nums">{g.porDia === null ? '—' : g.porDia.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[10px] text-muted-foreground mt-1 leading-snug">
            La ganancia se calcula entre medias de pesajes (muestras distintas), no entre aves individuales:
            interpretarla como estimación, sujeta al error de muestreo de ambos pesajes.
          </p>
        </div>
      )}
    </div>
  );
}

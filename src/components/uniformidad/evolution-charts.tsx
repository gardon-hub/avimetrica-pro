'use client';

/**
 * Evolución temporal de un lote con varios pesajes: peso promedio vs. curva
 * objetivo de la línea, CV y uniformidad por fecha, y ganancia entre pesajes.
 */

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { PesajeFull } from '@/lib/lotes-api';
import { calculateStats } from '@/lib/calculations';
import { getTargetWeight } from '@/lib/diagnostic-engine';
import { buildEvolucionReportHtml } from '@/lib/evolucion-report';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

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
  puntoTooltip,
}: {
  puntoTooltip: (p: SeriesPoint, valor: number, serie: string) => string;
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
                <title>{puntoTooltip(points[q.i], q.v, s.label)}</title>
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

export function EvolutionCharts({
  pesajes,
  lineaGenetica,
  lote,
}: {
  pesajes: PesajeFull[];
  lineaGenetica: string;
  /** Datos del lote para el encabezado del reporte imprimible. */
  lote?: { codigo: string; granja: string | null; galpon: string | null };
}) {
  const t = useTranslations('evolution');
  const serie = useMemo(() => buildSeries(pesajes, lineaGenetica), [pesajes, lineaGenetica]);

  const puntoTooltip = (p: SeriesPoint, valor: number, serieLabel: string) =>
    p.edadSemanas
      ? t('pointTooltipAge', { fecha: p.label, semanas: p.edadSemanas, valor: valor.toFixed(1), serie: serieLabel })
      : t('pointTooltip', { fecha: p.label, valor: valor.toFixed(1), serie: serieLabel });

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
      <p className="text-xs text-muted-foreground">{t('needTwo')}</p>
    );
  }

  const hasObjetivo = serie.some((p) => p.objetivo !== null);

  const imprimir = () => {
    const html = buildEvolucionReportHtml({
      lote: lote?.codigo ?? '—',
      granja: lote?.granja ?? '',
      galpon: lote?.galpon ?? '',
      lineaGenetica,
      criterioPct: pesajes[0]?.criterioPct ?? 10,
      serie: serie.map((p) => ({
        label: p.label,
        edadSemanas: p.edadSemanas,
        n: p.n,
        media: p.media,
        cv: p.cv,
        uniformidad: p.uniformidad,
        objetivo: p.objetivo,
      })),
      ganancias: gains,
    });
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.onload = () => setTimeout(() => w.print(), 400);
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">{t('weightChart')}</div>
        <LineChartSVG
          points={serie}
          puntoTooltip={puntoTooltip}
          series={[
            { key: 'media', color: '#2E7D32', label: t('seriesMean') },
            ...(hasObjetivo ? [{ key: 'objetivo' as const, color: '#1d4ed8', label: t('seriesTarget'), dash: '6,4' }] : []),
          ]}
          yLabel={t('yWeight')}
          ariaLabel={t('weightAlt')}
        />
      </div>
      <div>
        <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">{t('unifChart')}</div>
        <LineChartSVG
          points={serie}
          puntoTooltip={puntoTooltip}
          series={[
            { key: 'uniformidad', color: '#2E7D32', label: t('seriesUnif') },
            { key: 'cv', color: '#dc2626', label: t('seriesCv') },
          ]}
          yLabel="%"
          ariaLabel={t('unifAlt')}
        />
      </div>
      {gains.length > 0 && (
        <div className="overflow-x-auto">
          <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">{t('gainsTitle')}</div>
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr className="border-b font-bold text-muted-foreground">
                <th className="py-1 text-left">{t('colPeriod')}</th>
                <th className="py-1 text-right">{t('colDays')}</th>
                <th className="py-1 text-right">{t('colDelta')}</th>
                <th className="py-1 text-right">{t('colPerDay')}</th>
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
          <p className="text-[10px] text-muted-foreground mt-1 leading-snug">{t('gainsNote')}</p>
        </div>
      )}

      <Button onClick={imprimir} className="w-full h-10 text-sm bg-gray-800 hover:bg-gray-900 text-white">
        <Printer className="h-4 w-4 mr-1.5" /> {t('print')}
      </Button>
    </div>
  );
}

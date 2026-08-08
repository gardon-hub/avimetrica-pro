'use client';

/**
 * Control estadístico del lote (Fase 7).
 *
 * Decisiones de dominio:
 * - No se grafica una carta X̄ sobre el peso crudo: en aves en crecimiento la
 *   media tiene tendencia natural y violaría el supuesto de proceso estable.
 * - Se usan cartas de individuales (I-MR) sobre magnitudes aproximadamente
 *   estables entre pesajes: el CV (%) y la desviación porcentual respecto al
 *   objetivo de la línea.
 * - Si no hay suficientes pesajes (≥8) la herramienta explica por qué no es
 *   apropiada en lugar de dibujar límites poco confiables.
 */

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { PesajeFull } from '@/lib/lotes-api';
import { calculateStats } from '@/lib/calculations';
import { getTargetWeight } from '@/lib/diagnostic-engine';
import { imrChart, nelsonRules, NelsonViolation, IMRChart } from '@/lib/statistics/spc';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Info } from 'lucide-react';

const MIN_SUBGROUPS = 8;

interface SeriesDef {
  key: string;
  title: string;
  unit: string;
  values: number[];
  labels: string[];
}

function ControlChartSVG({ chart, def, violations }: { chart: IMRChart; def: SeriesDef; violations: NelsonViolation[] }) {
  const t = useTranslations('spc');
  const width = 560;
  const height = 250;
  const padL = 46;
  const padR = 60;
  const padT = 16;
  const padB = 40;

  const all = [...chart.points, chart.ucl, chart.lcl, chart.center];
  let minY = Math.min(...all);
  let maxY = Math.max(...all);
  if (minY === maxY) { minY -= 1; maxY += 1; }
  const span = (maxY - minY) * 0.08;
  minY -= span;
  maxY += span;

  const n = chart.points.length;
  const toX = (i: number) => padL + (n === 1 ? (width - padL - padR) / 2 : (i / (n - 1)) * (width - padL - padR));
  const toY = (v: number) => padT + (height - padT - padB) * (1 - (v - minY) / (maxY - minY));

  const badIdx = new Set(violations.map((v) => v.index));
  const path = chart.points.map((v, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ');

  const refLine = (v: number, color: string, label: string, dash = '6,4') => (
    <g key={label}>
      <line x1={padL} y1={toY(v)} x2={width - padR} y2={toY(v)} stroke={color} strokeWidth={1.4} strokeDasharray={dash} />
      <text x={width - padR + 4} y={toY(v) + 3} fontSize={9} fontWeight="bold" fill={color}>{label} {v.toFixed(2)}</text>
    </g>
  );

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img"
      aria-label={t('chartAlt', { serie: def.title, n: violations.length })}>
      <rect width={width} height={height} fill="white" rx={8} />
      {refLine(chart.ucl, '#dc2626', t('ucl'))}
      {refLine(chart.center, '#555', t('center'), '2,3')}
      {refLine(chart.lcl, '#dc2626', t('lcl'))}
      <path d={path} fill="none" stroke="#2E7D32" strokeWidth={1.8} strokeLinejoin="round" />
      {chart.points.map((v, i) => (
        <circle key={i} cx={toX(i)} cy={toY(v)} r={badIdx.has(i) ? 4.5 : 3.2}
          fill={badIdx.has(i) ? '#dc2626' : '#2E7D32'}>
          <title>
            {t('pointTooltip', { fecha: def.labels[i], valor: v.toFixed(2), unidad: def.unit })}
            {badIdx.has(i) ? t('pointSignal') : ''}
          </title>
        </circle>
      ))}
      {def.labels.map((l, i) => (
        <text key={i} x={toX(i)} y={height - padB + 13} textAnchor="middle" fontSize={8}
          fill="#666" transform={`rotate(-30 ${toX(i)} ${height - padB + 13})`}>{l}</text>
      ))}
      <text x={width / 2} y={height - 4} textAnchor="middle" fontSize={11} fontWeight="bold" fill="#444">
        {t('chartCaption', { serie: def.title, unidad: def.unit })}
      </text>
    </svg>
  );
}

export function SpcPanel({ pesajes, lineaGenetica }: { pesajes: PesajeFull[]; lineaGenetica: string }) {
  const t = useTranslations('spc');

  const series = useMemo((): SeriesDef[] => {
    const valid = pesajes
      .filter((p) => p.pesos.filter((w) => !w.excluido).length >= 2)
      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
    const labels = valid.map((p) => new Date(p.fecha).toLocaleDateString());
    const stats = valid.map((p) => calculateStats(p.pesos.filter((w) => !w.excluido).map((w) => w.gramos), p.criterioPct));

    const out: SeriesDef[] = [
      { key: 'cv', title: t('seriesCv'), unit: '%', values: stats.map((s) => s.cv), labels },
      { key: 'unif', title: t('seriesUniformity'), unit: '%', values: stats.map((s) => s.uniformidad), labels },
    ];

    // Desviación % vs. objetivo solo si TODOS los pesajes tienen edad y referencia
    const targets = valid.map((p) => (p.edadSemanas ? getTargetWeight(lineaGenetica, p.edadSemanas) : null));
    if (targets.every((t) => t !== null)) {
      out.push({
        key: 'target',
        title: t('seriesTarget'),
        unit: '%',
        values: stats.map((s, i) => ((s.promedio - targets[i]!.pesoOptimo) / targets[i]!.pesoOptimo) * 100),
        labels,
      });
    }
    return out;
  }, [pesajes, lineaGenetica, t]);

  const nValid = series[0]?.values.length ?? 0;

  if (nValid < MIN_SUBGROUPS) {
    return (
      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-xs text-blue-900 leading-relaxed space-y-1">
          <p><b>{t('notYetTitle')}</b></p>
          <p>{t('notYetBody', { n: nValid, min: MIN_SUBGROUPS })}</p>
          <p>{t.rich('notYetHint', { b: (c) => <b>{c}</b> })}</p>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-5">
      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-[11px] text-blue-900 leading-snug">
          {t('whyNotXbar')}
        </AlertDescription>
      </Alert>

      {series.map((def) => {
        const chart = imrChart(def.values);
        if (!chart) return null;
        const violations = nelsonRules(chart.points, chart.center, chart.ucl, chart.lcl);
        return (
          <div key={def.key} className="space-y-1.5">
            <ControlChartSVG chart={chart} def={def} violations={violations} />
            {violations.length > 0 ? (
              <Alert className="border-amber-300 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-[11px] text-amber-900 space-y-0.5">
                  {violations.map((v, i) => (
                    <div key={i}>
                      {v.rule === 1
                        ? t('rule1', { punto: v.index + 1, valor: (v.value ?? 0).toFixed(2) })
                        : v.rule === 2
                          ? t(v.side === 'above' ? 'rule2Above' : 'rule2Below', { punto: v.index + 1 })
                          : t(v.direction === 'up' ? 'rule3Up' : 'rule3Down', { punto: v.index + 1 })}
                    </div>
                  ))}
                  <div className="pt-0.5">{t('signalNote')}</div>
                </AlertDescription>
              </Alert>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                {t('noSignals', { serie: def.title.toLowerCase() })}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

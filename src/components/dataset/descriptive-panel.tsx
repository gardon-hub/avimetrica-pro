'use client';

/**
 * Resumen descriptivo + histograma para cualquier dominio (Fase 9).
 * Usa el mismo motor estadístico verificado que el módulo de aves.
 */

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { describe } from '@/lib/statistics/descriptive';
import { buildHistogram } from '@/lib/statistics/histogram';
import { meanConfidenceInterval } from '@/lib/statistics/inference';
import { shapiroWilk } from '@/lib/statistics/shapiro-wilk';
import { detectOutliers } from '@/lib/statistics/outliers';
import { normalPdf } from '@/lib/statistics/distributions';
import type { VariableDefinition } from '@/lib/domains/types';
import { Sigma } from 'lucide-react';

function HistogramaSVG({
  valores,
  media,
  sd,
  unidad,
}: {
  valores: number[];
  media: number;
  sd: number;
  unidad: string;
}) {
  const t = useTranslations('datasetDescriptive');
  const hist = useMemo(() => buildHistogram(valores, 'auto'), [valores]);
  if (!hist) return null;

  const W = 560, H = 240, padL = 40, padR = 16, padT = 14, padB = 40;
  const minX = hist.bins[0].x0;
  const maxX = hist.bins[hist.bins.length - 1].x1;
  let maxY = Math.max(...hist.bins.map((b) => b.density));
  if (sd > 0) maxY = Math.max(maxY, normalPdf(media, media, sd));
  if (maxY <= 0) maxY = 1;

  const toX = (v: number) => padL + ((v - minX) / (maxX - minX)) * (W - padL - padR);
  const toY = (v: number) => padT + (H - padT - padB) * (1 - (v / maxY) * 0.94);

  const curva =
    sd > 0
      ? Array.from({ length: 121 }, (_, i) => {
          const x = minX + ((maxX - minX) * i) / 120;
          return `${i === 0 ? 'M' : 'L'}${toX(x).toFixed(1)},${toY(normalPdf(x, media, sd)).toFixed(1)}`;
        }).join(' ')
      : null;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img"
      aria-label={t('histogramAlt', { clases: hist.bins.length })}>
      <rect width={W} height={H} className="fill-white dark:fill-transparent" rx={8} />
      {hist.bins.map((b, i) => {
        const x = toX(b.x0), w = Math.max(toX(b.x1) - toX(b.x0) - 1, 1), y = toY(b.density);
        return (
          <rect key={i} x={x + 0.5} y={y} width={w} height={Math.max(toY(0) - y, 0)}
            fill="rgba(46,125,50,0.45)" stroke="#2E7D32" strokeWidth={1}>
            <title>
              {t('binTooltip', {
                desde: b.x0.toFixed(1),
                hasta: b.x1.toFixed(1),
                unidad,
                n: b.count,
                pct: b.percent.toFixed(1),
              })}
            </title>
          </rect>
        );
      })}
      {curva && <path d={curva} fill="none" stroke="#1d4ed8" strokeWidth={2.2} strokeLinejoin="round" />}
      <line x1={padL} y1={toY(0)} x2={W - padR} y2={toY(0)} stroke="#999" strokeWidth={1} />
      {Array.from({ length: 8 }, (_, i) => {
        const v = minX + ((maxX - minX) * i) / 7;
        return (
          <text key={i} x={toX(v)} y={toY(0) + 14} textAnchor="middle" fontSize={9} fill="#666">
            {v.toFixed(0)}
          </text>
        );
      })}
      <text x={W / 2} y={H - 4} textAnchor="middle" fontSize={11} fontWeight="bold" fill="#444">
        {t(curva ? 'histogramCaptionCurve' : 'histogramCaption', { clases: hist.bins.length, unidad })}
      </text>
    </svg>
  );
}

export function DescriptivePanel({ valores, variable }: { valores: number[]; variable: VariableDefinition }) {
  const t = useTranslations('datasetDescriptive');
  const d = useMemo(() => describe(valores), [valores]);
  const ci = useMemo(() => meanConfidenceInterval(valores, 0.95), [valores]);
  const sw = useMemo(() => shapiroWilk(valores), [valores]);
  const out = useMemo(() => detectOutliers(valores), [valores]);

  if (!d) {
    return (
      <div className="bg-card rounded-lg border shadow-sm p-4 mb-4">
        <p className="text-xs text-muted-foreground text-center">{t('empty')}</p>
      </div>
    );
  }

  const dec = variable.decimals;
  const u = variable.unit;
  const f = (v: number, d2 = dec) => (Number.isFinite(v) ? v.toFixed(d2) : '—');

  const filas: Array<[string, string]> = [
    [t('n'), String(d.n)],
    [t('mean'), `${f(d.mean)} ${u}`],
    [t('median'), `${f(d.median)} ${u}`],
    [t('sd'), `${f(d.sdSample)} ${u}`],
    [t('cv'), `${f(d.cv, 2)} %`],
    [t('sem'), `${f(d.sem)} ${u}`],
    [t('minMax'), `${f(d.min)} – ${f(d.max)} ${u}`],
    [t('range'), `${f(d.range)} ${u}`],
    [t('quartiles'), `${f(d.q1)} / ${f(d.q3)} (${f(d.iqr)})`],
    [t('percentiles'), `${f(d.percentiles[5])} / ${f(d.percentiles[95])}`],
    [t('skewness'), d.skewness === null ? '—' : f(d.skewness, 3)],
    [t('kurtosis'), d.kurtosis === null ? '—' : f(d.kurtosis, 3)],
    [t('ci95'), ci ? `${f(ci.lower)} – ${f(ci.upper)} ${u}` : '—'],
  ];
  const mitad = Math.ceil(filas.length / 2);

  const tabla = (rs: Array<[string, string]>) => (
    <table className="w-full text-[11px] border-collapse">
      <tbody>
        {rs.map(([k, v]) => (
          <tr key={k} className="border-b border-border/50">
            <td className="py-1 text-muted-foreground">{k}</td>
            <td className="py-1 text-right font-semibold tabular-nums">{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="bg-card rounded-lg border shadow-sm p-3 sm:p-4 mb-4">
      <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
        <Sigma className="h-4 w-4" /> {t('title')}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
        {tabla(filas.slice(0, mitad))}
        {tabla(filas.slice(mitad))}
      </div>

      {d.n >= 5 && (
        <div className="mt-3">
          <HistogramaSVG valores={valores} media={d.mean} sd={d.sdSample} unidad={u} />
        </div>
      )}

      <div className="mt-3 text-[11px] space-y-1 bg-muted/50 rounded-md p-2.5">
        {sw ? (
          <div>
            <b>{t('normalityLabel')}</b>{' '}
            {t('normalityValues', {
              w: sw.W.toFixed(4),
              p: sw.pValue < 0.0001 ? '< 0.0001' : sw.pValue.toFixed(4),
            })}{' '}
            {t(sw.pValue >= 0.05 ? 'normalityOk' : 'normalityDeviates')}
          </div>
        ) : (
          <div className="text-muted-foreground">{t('normalityNeedMore')}</div>
        )}
        <div>
          <b>{t('outliersLabel')}</b>{' '}
          {out.flags.length === 0
            ? t('outliersNone')
            : t('outliersSome', {
                n: out.flags.length,
                lista: out.flags.map((x) => `#${x.index + 1} (${f(x.value)})`).join(', '),
              })}
        </div>
        {d.n < 30 && <div className="text-amber-700">{t('smallSample', { n: d.n })}</div>}
      </div>
    </div>
  );
}

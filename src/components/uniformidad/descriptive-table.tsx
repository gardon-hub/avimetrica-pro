'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useUniformidadStore } from '@/lib/store';
import { describe, proportionWithinPct } from '@/lib/statistics/descriptive';
import { meanConfidenceInterval } from '@/lib/statistics/inference';
import { getTargetWeight, isApproximateLine } from '@/lib/diagnostic-engine';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

function fmt(v: number | null | undefined, dec = 2): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  if (!Number.isFinite(v)) return v > 0 ? '+∞' : '−∞';
  return v.toFixed(dec);
}

export function DescriptiveTable() {
  const { pesos, lineaGenetica, edadSemanas } = useUniformidadStore();
  const t = useTranslations('descriptive');
  const [isCensus, setIsCensus] = useState(false);

  const d = useMemo(() => describe(pesos), [pesos]);
  const ci = useMemo(() => meanConfidenceInterval(pesos, 0.95), [pesos]);
  const target = useMemo(() => {
    const sem = parseInt(edadSemanas, 10);
    return Number.isFinite(sem) ? getTargetWeight(lineaGenetica, sem) : null;
  }, [lineaGenetica, edadSemanas]);

  if (!d) return null;

  const sd = isCensus ? d.sdPopulation : d.sdSample;
  const variance = isCensus ? d.variancePopulation : d.varianceSample;

  const rows: [string, string][] = [
    [t('n'), String(d.n)],
    [t('sum'), fmt(d.sum, 1) + ' g'],
    [t('mean'), fmt(d.mean) + ' g'],
    [t('median'), fmt(d.median) + ' g'],
    [t('modes'), d.modes.length ? d.modes.map((m) => fmt(m, 1)).join(', ') + ' g' : t('noRepeats')],
    [t('min'), fmt(d.min, 1) + ' g'],
    [t('max'), fmt(d.max, 1) + ' g'],
    [t('range'), fmt(d.range, 1) + ' g'],
    [isCensus ? t('variancePopulation') : t('varianceSample'), fmt(variance) + ' g²'],
    [isCensus ? t('sdPopulation') : t('sdSample'), fmt(sd) + ' g'],
    [t('cv'), d.mean !== 0 ? fmt((sd / d.mean) * 100) + ' %' : '—'],
    [t('sem'), fmt(d.sem) + ' g'],
    [t('q1'), fmt(d.q1) + ' g'],
    [t('q3'), fmt(d.q3) + ' g'],
    [t('iqr'), fmt(d.iqr) + ' g'],
    [t('percentile', { p: 5 }), fmt(d.percentiles[5]) + ' g'],
    [t('percentile', { p: 10 }), fmt(d.percentiles[10]) + ' g'],
    [t('percentile', { p: 90 }), fmt(d.percentiles[90]) + ' g'],
    [t('percentile', { p: 95 }), fmt(d.percentiles[95]) + ' g'],
    [t('skewness'), d.skewness === null ? t('notEnough', { min: 3 }) : fmt(d.skewness, 3)],
    [t('kurtosis'), d.kurtosis === null ? t('notEnough', { min: 4 }) : fmt(d.kurtosis, 3)],
    [
      t('ci95'),
      ci ? `${fmt(ci.lower)} – ${fmt(ci.upper)} g` : t('notEnough', { min: 2 }),
    ],
  ];

  const bands: [string, number][] = [5, 7.5, 10, 15].map((p) => [
    `±${p}%`,
    proportionWithinPct(pesos, p),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Checkbox
          id="census-mode"
          checked={isCensus}
          onCheckedChange={(v) => setIsCensus(v === true)}
        />
        <Label htmlFor="census-mode" className="text-xs text-muted-foreground leading-snug cursor-pointer">
          {t.rich('censusLabel', { b: (c) => <b>{c}</b> })}
        </Label>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <tbody>
            {rows.map(([label, value]) => (
              <tr key={label} className="border-b border-border/60 last:border-0">
                <td className="py-1.5 pr-2 text-muted-foreground">{label}</td>
                <td className="py-1.5 text-right font-semibold tabular-nums">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1.5">
          {t('bandsTitle')}
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          {bands.map(([label, value]) => (
            <div key={label} className="bg-muted/50 rounded-md py-2">
              <div className="text-[10px] text-muted-foreground font-bold">{label}</div>
              <div className="text-sm font-bold tabular-nums">{fmt(value, 1)}%</div>
            </div>
          ))}
        </div>
      </div>

      {target && (
        <div className="text-xs bg-muted/50 rounded-md p-3 space-y-1">
          <div className="font-bold text-muted-foreground uppercase tracking-wide">
            {t('targetTitle', { linea: lineaGenetica, semanas: edadSemanas })}
          </div>
          <div>
            {t.rich('targetWeight', {
              optimo: fmt(target.pesoOptimo, 0),
              min: fmt(target.pesoMin, 0),
              max: fmt(target.pesoMax, 0),
              b: (c) => <b>{c}</b>,
            })}
            {isApproximateLine(lineaGenetica) && (
              <span className="text-amber-700 font-semibold"> {t('approximate')}</span>
            )}
          </div>
          <div>
            {t.rich('difference', {
              gramos: fmt(d.mean - target.pesoOptimo, 1),
              pct: fmt(((d.mean - target.pesoOptimo) / target.pesoOptimo) * 100, 1),
              b: (c) => <b>{c}</b>,
            })}
          </div>
          <div>
            {t.rich('withinGuide', {
              dentro: fmt((pesos.filter((p) => p >= target.pesoMin && p <= target.pesoMax).length / d.n) * 100, 1),
              debajo: fmt((pesos.filter((p) => p < target.pesoOptimo).length / d.n) * 100, 1),
              encima: fmt((pesos.filter((p) => p > target.pesoOptimo).length / d.n) * 100, 1),
              b: (c) => <b>{c}</b>,
            })}
          </div>
          {Number.isFinite(d.sdSample) && d.sdSample > 0 && (
            <div>
              {t.rich('standardized', {
                z: fmt((d.mean - target.pesoOptimo) / d.sdSample, 2),
                b: (c) => <b>{c}</b>,
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
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

/**
 * Tabla descriptiva completa, genérica para cualquier variable: recibe los
 * valores y su unidad. Solo el bloque de comparación contra el peso objetivo
 * es avícola, y aparece únicamente si quien la monta pasa `objetivo`
 * (línea genética + edad) — así la usan también huevos y estadística.
 */
export function DescriptiveTable({
  valores,
  unidad,
  nLabel,
  objetivo,
  generico,
}: {
  valores: number[];
  unidad: string;
  /** Rótulo de la fila n («n (aves pesadas)» / «n (observaciones)»). */
  nLabel: string;
  /** Solo aves: activa la comparación contra la guía de la línea. */
  objetivo?: { linea: string; semanas: string };
  /** true = la casilla de censo habla de «población», no de «lote». */
  generico?: boolean;
}) {
  const t = useTranslations('descriptive');
  const [isCensus, setIsCensus] = useState(false);

  const d = useMemo(() => describe(valores), [valores]);
  const ci = useMemo(() => meanConfidenceInterval(valores, 0.95), [valores]);
  const target = useMemo(() => {
    if (!objetivo) return null;
    const sem = parseInt(objetivo.semanas, 10);
    return Number.isFinite(sem) ? getTargetWeight(objetivo.linea, sem) : null;
  }, [objetivo]);

  if (!d) return null;

  const u = unidad ? ` ${unidad}` : '';
  const u2 = unidad ? ` ${unidad}²` : '';
  const sd = isCensus ? d.sdPopulation : d.sdSample;
  const variance = isCensus ? d.variancePopulation : d.varianceSample;

  const rows: [string, string][] = [
    [nLabel, String(d.n)],
    [t('sum'), fmt(d.sum, 1) + u],
    [t('mean'), fmt(d.mean) + u],
    [t('median'), fmt(d.median) + u],
    [t('modes'), d.modes.length ? d.modes.map((m) => fmt(m, 1)).join(', ') + u : t('noRepeats')],
    [t('min'), fmt(d.min, 1) + u],
    [t('max'), fmt(d.max, 1) + u],
    [t('range'), fmt(d.range, 1) + u],
    [isCensus ? t('variancePopulation') : t('varianceSample'), fmt(variance) + u2],
    [isCensus ? t('sdPopulation') : t('sdSample'), fmt(sd) + u],
    [t('cv'), d.mean !== 0 ? fmt((sd / d.mean) * 100) + ' %' : '—'],
    [t('sem'), fmt(d.sem) + u],
    [t('q1'), fmt(d.q1) + u],
    [t('q3'), fmt(d.q3) + u],
    [t('iqr'), fmt(d.iqr) + u],
    [t('percentile', { p: 5 }), fmt(d.percentiles[5]) + u],
    [t('percentile', { p: 10 }), fmt(d.percentiles[10]) + u],
    [t('percentile', { p: 90 }), fmt(d.percentiles[90]) + u],
    [t('percentile', { p: 95 }), fmt(d.percentiles[95]) + u],
    [t('skewness'), d.skewness === null ? t('notEnough', { min: 3 }) : fmt(d.skewness, 3)],
    [t('kurtosis'), d.kurtosis === null ? t('notEnough', { min: 4 }) : fmt(d.kurtosis, 3)],
    [
      t('ci95'),
      ci ? `${fmt(ci.lower)} – ${fmt(ci.upper)}${u}` : t('notEnough', { min: 2 }),
    ],
  ];

  const bands: [string, number][] = [5, 7.5, 10, 15].map((p) => [
    `±${p}%`,
    proportionWithinPct(valores, p),
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
          {t.rich(generico ? 'censusLabelGeneric' : 'censusLabel', { b: (c) => <b>{c}</b> })}
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

      {objetivo && target && (
        <div className="text-xs bg-muted/50 rounded-md p-3 space-y-1">
          <div className="font-bold text-muted-foreground uppercase tracking-wide">
            {t('targetTitle', { linea: objetivo.linea, semanas: objetivo.semanas })}
          </div>
          <div>
            {t.rich('targetWeight', {
              optimo: fmt(target.pesoOptimo, 0),
              min: fmt(target.pesoMin, 0),
              max: fmt(target.pesoMax, 0),
              b: (c) => <b>{c}</b>,
            })}
            {isApproximateLine(objetivo.linea) && (
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
              dentro: fmt((valores.filter((p) => p >= target.pesoMin && p <= target.pesoMax).length / d.n) * 100, 1),
              debajo: fmt((valores.filter((p) => p < target.pesoOptimo).length / d.n) * 100, 1),
              encima: fmt((valores.filter((p) => p > target.pesoOptimo).length / d.n) * 100, 1),
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

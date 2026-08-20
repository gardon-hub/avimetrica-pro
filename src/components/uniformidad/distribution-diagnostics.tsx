'use client';

/**
 * Diagnóstico de distribución: boxplot horizontal, gráfico Q-Q,
 * prueba de normalidad D'Agostino-Pearson y detección de atípicos.
 */

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { describe } from '@/lib/statistics/descriptive';
import { dagostinoPearson, qqPoints } from '@/lib/statistics/normality';
import { shapiroWilk } from '@/lib/statistics/shapiro-wilk';
import { detectOutliers } from '@/lib/statistics/outliers';
import { calculateStats } from '@/lib/calculations';
import { getTargetWeight } from '@/lib/diagnostic-engine';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Info } from 'lucide-react';
import { fmtPFrase } from '@/lib/p-value';

function BoxplotSVG({ pesos, etiqueta }: { pesos: number[]; etiqueta: string }) {
  const t = useTranslations('diagnostics');
  const d = describe(pesos)!;
  const out = detectOutliers(pesos);
  const width = 560;
  const height = 130;
  const padX = 30;
  const cy = 58;

  const lowFence = out.fences?.iqrLower15 ?? d.min;
  const highFence = out.fences?.iqrUpper15 ?? d.max;
  const nonOutliers = pesos.filter((p) => p >= lowFence && p <= highFence);
  const whiskerLo = nonOutliers.length ? Math.min(...nonOutliers) : d.min;
  const whiskerHi = nonOutliers.length ? Math.max(...nonOutliers) : d.max;

  const minX = Math.min(d.min, whiskerLo);
  const maxX = Math.max(d.max, whiskerHi);
  const span = maxX - minX || 1;
  const toX = (v: number) => padX + ((v - minX) / span) * (width - 2 * padX);

  const boxTop = cy - 22;
  const boxBot = cy + 22;
  const outlierPts = out.flags.map((f) => f.value);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img"
      aria-label={t('boxplotAlt', {
        mediana: d.median.toFixed(1),
        q1: d.q1.toFixed(1),
        q3: d.q3.toFixed(1),
        atipicos: outlierPts.length,
      })}>
      <rect width={width} height={height} fill="white" rx={8} />
      <line x1={toX(whiskerLo)} y1={cy} x2={toX(d.q1)} y2={cy} stroke="#555" strokeWidth={1.5} />
      <line x1={toX(d.q3)} y1={cy} x2={toX(whiskerHi)} y2={cy} stroke="#555" strokeWidth={1.5} />
      <line x1={toX(whiskerLo)} y1={cy - 10} x2={toX(whiskerLo)} y2={cy + 10} stroke="#555" strokeWidth={1.5} />
      <line x1={toX(whiskerHi)} y1={cy - 10} x2={toX(whiskerHi)} y2={cy + 10} stroke="#555" strokeWidth={1.5} />
      <rect x={toX(d.q1)} y={boxTop} width={Math.max(toX(d.q3) - toX(d.q1), 1)} height={boxBot - boxTop} fill="rgba(46,125,50,0.25)" stroke="#2E7D32" strokeWidth={1.5} />
      <line x1={toX(d.median)} y1={boxTop} x2={toX(d.median)} y2={boxBot} stroke="#2E7D32" strokeWidth={2.5} />
      <circle cx={toX(d.mean)} cy={cy} r={3.5} fill="#1d4ed8" />
      {outlierPts.map((v, i) => (
        <circle key={i} cx={toX(v)} cy={cy} r={3.5} fill="none" stroke="#dc2626" strokeWidth={1.8}>
          <title>{t('boxplotOutlier', { valor: v.toFixed(1) })}</title>
        </circle>
      ))}
      {[minX, d.q1, d.median, d.q3, maxX].map((v, i) => (
        <text key={i} x={toX(v)} y={height - 14} textAnchor="middle" fontSize={9.5} fill="#666">{v.toFixed(0)}</text>
      ))}
      <text x={width / 2} y={height - 2} textAnchor="middle" fontSize={11} fontWeight="bold" fill="#444">{t('boxplotCaption', { etiqueta })}</text>
    </svg>
  );
}

function QQPlotSVG({ pesos, unidad }: { pesos: number[]; unidad: string }) {
  const t = useTranslations('diagnostics');
  const u = unidad ? `(${unidad})` : '';
  const d = describe(pesos)!;
  const sd = Number.isFinite(d.sdSample) && d.sdSample > 0 ? d.sdSample : 1;
  const pts = qqPoints(pesos, d.mean, sd);
  const width = 560;
  const height = 320;
  const pad = 42;

  const allX = pts.map((p) => p.theoretical);
  const allY = pts.map((p) => p.observed);
  const minV = Math.min(...allX, ...allY);
  const maxV = Math.max(...allX, ...allY);
  const span = maxV - minV || 1;
  const toX = (v: number) => pad + ((v - minV) / span) * (width - 2 * pad);
  const toY = (v: number) => height - pad - ((v - minV) / span) * (height - 2 * pad);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img"
      aria-label={t('qqAlt')}>
      <rect width={width} height={height} fill="white" rx={8} />
      <line x1={toX(minV)} y1={toY(minV)} x2={toX(maxV)} y2={toY(maxV)} stroke="#dc2626" strokeWidth={1.5} strokeDasharray="6,4" />
      {pts.map((p, i) => (
        <circle key={i} cx={toX(p.theoretical)} cy={toY(p.observed)} r={3} fill="rgba(46,125,50,0.7)">
          <title>{t('qqPoint', { esperado: p.theoretical.toFixed(1), observado: p.observed.toFixed(1) })}</title>
        </circle>
      ))}
      <text x={width / 2} y={height - 6} textAnchor="middle" fontSize={11} fontWeight="bold" fill="#444">{t('qqXAxis', { unidad: u })}</text>
      <text x={12} y={height / 2} textAnchor="middle" fontSize={11} fontWeight="bold" fill="#444" transform={`rotate(-90 12 ${height / 2})`}>{t('qqYAxis', { unidad: u })}</text>
    </svg>
  );
}

/**
 * Genérico para cualquier variable. Lo avícola es opcional: la columna
 * «vs. objetivo» aparece solo si se pasa `objetivo`, y la fila de
 * uniformidad de la tabla con/sin atípicos solo si se pasa `bandaPct`.
 */
export function DistributionDiagnostics({
  valores,
  unidad,
  idColLabel,
  valorColLabel,
  objetivo,
  bandaPct,
}: {
  valores: number[];
  unidad: string;
  /** Rótulo de la columna identificadora («# Ave» / «# Obs»). */
  idColLabel: string;
  /** Rótulo de la columna de valor («Peso (g)» / «Estatura (cm)»). */
  valorColLabel: string;
  /** Solo aves: línea y edad para la columna «vs. objetivo». */
  objetivo?: { linea: string; semanas: string };
  /** Solo aves: criterio ±% para la fila de uniformidad. */
  bandaPct?: number;
}) {
  const t = useTranslations('diagnostics');
  const tMetodos = useTranslations('outlierMethods');
  const [excluded, setExcluded] = useState<Set<number>>(new Set());

  const normality = useMemo(() => dagostinoPearson(valores), [valores]);
  const sw = useMemo(() => shapiroWilk(valores), [valores]);
  const outliers = useMemo(() => detectOutliers(valores), [valores]);
  const d = useMemo(() => describe(valores), [valores]);

  const target = useMemo(() => {
    if (!objetivo) return null;
    const sem = parseInt(objetivo.semanas, 10);
    return Number.isFinite(sem) ? getTargetWeight(objetivo.linea, sem) : null;
  }, [objetivo]);

  const statsCon = useMemo(() => calculateStats(valores, bandaPct), [valores, bandaPct]);
  const statsWithout = useMemo(() => {
    if (excluded.size === 0) return null;
    const filtered = valores.filter((_, i) => !excluded.has(i));
    if (filtered.length < 2) return null;
    return calculateStats(filtered, bandaPct);
  }, [valores, excluded, bandaPct]);

  if (valores.length < 4 || !d) {
    return <p className="text-sm text-muted-foreground text-center py-4">{t('needFour')}</p>;
  }

  const skewNote =
    d.skewness !== null && Math.abs(d.skewness) > 1
      ? t(d.skewness > 0 ? 'skewMarkedRight' : 'skewMarkedLeft', { g1: d.skewness.toFixed(2) })
      : d.skewness !== null && Math.abs(d.skewness) > 0.5
        ? t('skewModerate', { g1: d.skewness.toFixed(2) })
        : null;
  const kurtNote =
    d.kurtosis !== null && d.kurtosis > 1
      ? t('heavyTails', { g2: d.kurtosis.toFixed(2) })
      : null;

  return (
    <div className="space-y-5">
      <div>
        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">{t('boxplot')}</div>
        <BoxplotSVG pesos={valores} etiqueta={valorColLabel} />
      </div>

      <div>
        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">{t('qq')}</div>
        <QQPlotSVG pesos={valores} unidad={unidad} />
      </div>

      <div className="bg-muted/50 rounded-md p-3 text-xs space-y-1.5">
        <div className="font-bold uppercase tracking-wide text-muted-foreground">{t('normality')}</div>
        {sw && (
          <div>
            {t.rich('shapiro', {
              w: sw.W.toFixed(4),
              p: fmtPFrase(sw.pValue),
              b: (c) => <b>{c}</b>,
            })}
          </div>
        )}
        {normality && (
          <div>
            {t.rich('dagostino', {
              metodo: normality.method,
              k: normality.statistic.toFixed(3),
              p: fmtPFrase(normality.pValue),
              b: (c) => <b>{c}</b>,
            })}
          </div>
        )}
        {sw || normality ? (
          <>
            <p className="leading-snug">
              {t((sw ?? normality)!.pValue >= 0.05 ? 'normalNotRejected' : 'normalRejected')}
            </p>
            {sw && normality && (sw.pValue >= 0.05) !== (normality.pValue >= 0.05) && (
              <p className="text-amber-700 leading-snug">{t('testsDisagree')}</p>
            )}
            {normality && !normality.reliable && (
              <p className="text-amber-700">{t('k2Unreliable')}</p>
            )}
            <p className="text-muted-foreground leading-snug">{t('normalityCaveat')}</p>
          </>
        ) : (
          <p>{t('normalityNeedMore')}</p>
        )}
        {skewNote && <p className="leading-snug">📐 {skewNote}</p>}
        {kurtNote && <p className="leading-snug">📐 {kurtNote}</p>}
      </div>

      <div>
        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1.5">
          {t('outliersTitle', { n: outliers.flags.length })}
        </div>
        {outliers.flags.length === 0 ? (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Info className="h-3.5 w-3.5" /> {t('noOutliers')}</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] border-collapse">
                <thead>
                  <tr className="border-b font-bold text-muted-foreground">
                    <th className="py-1 text-left">{t('colExclude')}</th>
                    <th className="py-1 text-left">{idColLabel}</th>
                    <th className="py-1 text-right">{valorColLabel}</th>
                    <th className="py-1 text-right">{t('colVsMean')}</th>
                    {target && <th className="py-1 text-right">{t('colVsTarget')}</th>}
                    <th className="py-1 text-left pl-3">{t('colMethods')}</th>
                  </tr>
                </thead>
                <tbody>
                  {outliers.flags.map((f) => (
                    <tr key={f.index} className="border-b border-border/50">
                      <td className="py-1.5">
                        <Checkbox
                          checked={excluded.has(f.index)}
                          onCheckedChange={(v) => {
                            const next = new Set(excluded);
                            if (v === true) next.add(f.index);
                            else next.delete(f.index);
                            setExcluded(next);
                          }}
                          aria-label={t('excludeAria', { n: f.index + 1 })}
                        />
                      </td>
                      <td className="py-1.5">{f.index + 1}</td>
                      <td className="py-1.5 text-right font-semibold tabular-nums">{f.value.toFixed(1)}</td>
                      <td className="py-1.5 text-right tabular-nums">{f.deviationFromMean >= 0 ? '+' : ''}{f.deviationFromMean.toFixed(1)}{unidad ? ` ${unidad}` : ''}</td>
                      {target && (
                        <td className="py-1.5 text-right tabular-nums">
                          {f.value - target.pesoOptimo >= 0 ? '+' : ''}{(f.value - target.pesoOptimo).toFixed(1)}{unidad ? ` ${unidad}` : ''}
                        </td>
                      )}
                      <td className="py-1.5 pl-3">{f.methods.map((m) => tMetodos(m)).join(' · ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Alert className="mt-2 border-blue-200 bg-blue-50">
              <AlertTriangle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-[11px] text-blue-900 leading-snug">
                {t.rich('outlierCaveat', { b: (c) => <b>{c}</b> })}
              </AlertDescription>
            </Alert>
            {statsWithout && (
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-[11px] border-collapse">
                  <thead>
                    <tr className="border-b font-bold text-muted-foreground">
                      <th className="py-1 text-left">{t('colMetric')}</th>
                      <th className="py-1 text-right">{t('colWithAll', { n: statsCon.totalAves })}</th>
                      <th className="py-1 text-right">{t('colWithout', { n: statsWithout.totalAves })}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {([
                      [t('metricMean'), statsCon.promedio.toFixed(1), statsWithout.promedio.toFixed(1)],
                      [t('metricSd'), statsCon.desvEst.toFixed(2), statsWithout.desvEst.toFixed(2)],
                      [t('metricCv'), statsCon.cv.toFixed(2), statsWithout.cv.toFixed(2)],
                      ...(bandaPct !== undefined
                        ? [[t('metricUniformity', { pct: bandaPct }), statsCon.uniformidad.toFixed(1), statsWithout.uniformidad.toFixed(1)] as [string, string, string]]
                        : []),
                    ] as Array<[string, string, string]>).map(([label, a, b]) => (
                      <tr key={label} className="border-b border-border/50">
                        <td className="py-1">{label}</td>
                        <td className="py-1 text-right tabular-nums">{a}</td>
                        <td className="py-1 text-right tabular-nums font-semibold">{b}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

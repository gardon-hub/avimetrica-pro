'use client';

/**
 * Histograma REAL de los pesos (distribución empírica), con opción de
 * superponer la curva normal ajustada. Reglas de clases: automática,
 * Sturges, Freedman-Diaconis o manual.
 */

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { buildHistogram, BinRule } from '@/lib/statistics/histogram';
import { normalPdf } from '@/lib/statistics/distributions';
import { median, mean, sdSample } from '@/lib/statistics/descriptive';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

type DisplayMode = 'count' | 'percent' | 'density';

/**
 * Genérico para cualquier variable: recibe los valores. Las líneas de la
 * banda de uniformidad (−X% / +X%) solo se dibujan si quien lo monta pasa
 * `banda` — es un concepto del módulo de aves.
 */
export function HistogramChart({
  valores,
  banda,
}: {
  valores: number[];
  banda?: { inf: number; sup: number; pct: number };
}) {
  const t = useTranslations('histogram');
  const [rule, setRule] = useState<BinRule>('auto');
  const [manualBins, setManualBins] = useState('8');
  const [mode, setMode] = useState<DisplayMode>('count');
  const [overlay, setOverlay] = useState(true);

  const hist = useMemo(
    () => buildHistogram(valores, rule, parseInt(manualBins, 10) || 8),
    [valores, rule, manualBins],
  );
  const med = useMemo(() => median(valores), [valores]);

  if (!hist || valores.length < 2) {
    return <p className="text-sm text-muted-foreground text-center py-4">{t('needTwo')}</p>;
  }

  const mu = mean(valores);
  const sigmaMuestral = sdSample(valores);
  const sigma = Number.isFinite(sigmaMuestral) ? sigmaMuestral : 0;

  // Geometría SVG
  const width = 560;
  const height = 300;
  const padL = 44;
  const padR = 14;
  const padT = 18;
  const padB = 46;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;

  const first = hist.bins[0];
  const last = hist.bins[hist.bins.length - 1];
  const minX = first.x0;
  const maxX = last.x1;

  const valueOf = (b: { count: number; percent: number; density: number }) =>
    mode === 'count' ? b.count : mode === 'percent' ? b.percent : b.density;

  // Escalar curva normal al modo elegido: densidad → density; para count/percent
  // multiplicar por n·ancho (count) o 100·ancho (percent)
  const curveScale = mode === 'density' ? 1 : mode === 'count' ? hist.n * hist.binWidth : 100 * hist.binWidth;

  let maxY = Math.max(...hist.bins.map(valueOf));
  if (overlay && sigma > 0) {
    maxY = Math.max(maxY, normalPdf(mu, mu, sigma) * curveScale);
  }
  if (maxY <= 0) maxY = 1;

  const toX = (x: number) => padL + ((x - minX) / (maxX - minX)) * chartW;
  const toY = (y: number) => padT + chartH - (y / maxY) * chartH * 0.94;

  const curvePts: string[] = [];
  if (overlay && sigma > 0) {
    const N = 120;
    for (let i = 0; i <= N; i++) {
      const x = minX + ((maxX - minX) * i) / N;
      const y = normalPdf(x, mu, sigma) * curveScale;
      curvePts.push(`${i === 0 ? 'M' : 'L'}${toX(x).toFixed(2)},${toY(y).toFixed(2)}`);
    }
  }

  const yTicks = 4;
  const modeLabel = mode === 'count' ? t('axisFrequency') : mode === 'percent' ? '%' : t('axisDensity');

  const refLines: Array<{ x: number; color: string; label: string }> = [
    { x: mu, color: '#333', label: `μ ${mu.toFixed(0)}` },
    { x: med, color: '#7c3aed', label: `${t('median')} ${med.toFixed(0)}` },
    ...(banda
      ? [
          { x: banda.inf, color: '#e53935', label: `−${banda.pct}%` },
          { x: banda.sup, color: '#2E7D32', label: `+${banda.pct}%` },
        ]
      : []),
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-end">
        <div className="flex flex-col gap-1">
          <Label className="text-[10px] uppercase font-bold text-muted-foreground">{t('bins')}</Label>
          <Select value={rule} onValueChange={(v) => setRule(v as BinRule)}>
            <SelectTrigger className="h-9 w-44 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">{t('auto')}</SelectItem>
              <SelectItem value="sturges">Sturges</SelectItem>
              <SelectItem value="freedman-diaconis">Freedman-Diaconis</SelectItem>
              <SelectItem value="manual">{t('manual')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {rule === 'manual' && (
          <Input
            type="number"
            min={1}
            max={50}
            value={manualBins}
            onChange={(e) => setManualBins(e.target.value)}
            className="h-9 w-20 text-xs"
            aria-label={t('binCount')}
          />
        )}
        <div className="flex flex-col gap-1">
          <Label className="text-[10px] uppercase font-bold text-muted-foreground">{t('show')}</Label>
          <Select value={mode} onValueChange={(v) => setMode(v as DisplayMode)}>
            <SelectTrigger className="h-9 w-36 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="count">{t('counts')}</SelectItem>
              <SelectItem value="percent">{t('percents')}</SelectItem>
              <SelectItem value="density">{t('density')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1.5 pb-2">
          <Checkbox id="overlay-normal" checked={overlay} onCheckedChange={(v) => setOverlay(v === true)} />
          <Label htmlFor="overlay-normal" className="text-xs cursor-pointer">{t('normalCurve')}</Label>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        role="img"
        aria-label={t(overlay ? 'svgAltOverlay' : 'svgAlt', { n: hist.n, clases: hist.bins.length })}
      >
        <rect width={width} height={height} fill="white" rx={8} />
        {Array.from({ length: yTicks + 1 }, (_, i) => {
          const v = (maxY * i) / yTicks;
          return (
            <g key={i}>
              <line x1={padL} y1={toY(v)} x2={width - padR} y2={toY(v)} stroke="#eee" strokeWidth={1} />
              <text x={padL - 5} y={toY(v) + 3} textAnchor="end" fontSize={9} fill="#777">
                {mode === 'density' ? v.toExponential(1) : v.toFixed(mode === 'percent' ? 1 : 0)}
              </text>
            </g>
          );
        })}
        {hist.bins.map((b, i) => (
          <rect
            key={i}
            x={toX(b.x0) + 0.5}
            y={toY(valueOf(b))}
            width={Math.max(toX(b.x1) - toX(b.x0) - 1, 1)}
            height={Math.max(toY(0) - toY(valueOf(b)), 0)}
            fill="rgba(46, 125, 50, 0.45)"
            stroke="#2E7D32"
            strokeWidth={1}
          >
            <title>
              {t('binTooltip', {
                desde: b.x0.toFixed(1),
                hasta: b.x1.toFixed(1),
                n: b.count,
                pct: b.percent.toFixed(1),
              })}
            </title>
          </rect>
        ))}
        {overlay && curvePts.length > 0 && (
          <path d={curvePts.join(' ')} fill="none" stroke="#1d4ed8" strokeWidth={2.2} strokeLinejoin="round" />
        )}
        {refLines.map((r, i) =>
          r.x >= minX && r.x <= maxX ? (
            <g key={`r${i}`}>
              <line x1={toX(r.x)} y1={padT} x2={toX(r.x)} y2={toY(0)} stroke={r.color} strokeWidth={1.5} strokeDasharray="5,4" opacity={0.8} />
              <text x={toX(r.x)} y={padT - 4 + (i % 2) * 11} textAnchor="middle" fontSize={9.5} fontWeight="bold" fill={r.color}>
                {r.label}
              </text>
            </g>
          ) : null,
        )}
        <line x1={padL} y1={toY(0)} x2={width - padR} y2={toY(0)} stroke="#999" strokeWidth={1} />
        {hist.bins.length <= 14
          ? hist.bins.map((b, i) => (
              <text key={`t${i}`} x={toX(b.x0)} y={toY(0) + 14} textAnchor="middle" fontSize={8.5} fill="#666" transform={`rotate(-35 ${toX(b.x0)} ${toY(0) + 14})`}>
                {b.x0.toFixed(0)}
              </text>
            ))
          : Array.from({ length: 8 }, (_, i) => {
              const v = minX + ((maxX - minX) * i) / 7;
              return (
                <text key={`t${i}`} x={toX(v)} y={toY(0) + 14} textAnchor="middle" fontSize={9} fill="#666">
                  {v.toFixed(0)}
                </text>
              );
            })}
        <text x={width / 2} y={height - 4} textAnchor="middle" fontSize={12} fontWeight="bold" fill="#444">
          {t('caption', {
            modo: modeLabel,
            clases: hist.bins.length,
            regla: hist.rule === 'manual' ? t('manual').toLowerCase() : hist.rule,
          })}
        </text>
      </svg>
      <p className="text-[11px] text-muted-foreground leading-snug">
        {t('legendBars', { n: hist.n })} {overlay && `${t('legendCurve')} `}
        {t(banda ? 'legendLines' : 'legendLinesNoBand')}
      </p>
    </div>
  );
}

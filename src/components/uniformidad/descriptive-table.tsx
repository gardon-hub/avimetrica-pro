'use client';

import { useMemo, useState } from 'react';
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
    ['n (aves pesadas)', String(d.n)],
    ['Suma', fmt(d.sum, 1) + ' g'],
    ['Media', fmt(d.mean) + ' g'],
    ['Mediana', fmt(d.median) + ' g'],
    ['Moda(s)', d.modes.length ? d.modes.map((m) => fmt(m, 1)).join(', ') + ' g' : 'sin repetición'],
    ['Mínimo', fmt(d.min, 1) + ' g'],
    ['Máximo', fmt(d.max, 1) + ' g'],
    ['Rango', fmt(d.range, 1) + ' g'],
    [isCensus ? 'Varianza poblacional (n)' : 'Varianza muestral (n−1)', fmt(variance) + ' g²'],
    [isCensus ? 'Desv. estándar poblacional' : 'Desv. estándar muestral', fmt(sd) + ' g'],
    ['Coef. de variación (CV)', d.mean !== 0 ? fmt((sd / d.mean) * 100) + ' %' : '—'],
    ['Error estándar de la media', fmt(d.sem) + ' g'],
    ['Cuartil 1 (P25)', fmt(d.q1) + ' g'],
    ['Cuartil 3 (P75)', fmt(d.q3) + ' g'],
    ['Rango intercuartílico (IQR)', fmt(d.iqr) + ' g'],
    ['Percentil 5', fmt(d.percentiles[5]) + ' g'],
    ['Percentil 10', fmt(d.percentiles[10]) + ' g'],
    ['Percentil 90', fmt(d.percentiles[90]) + ' g'],
    ['Percentil 95', fmt(d.percentiles[95]) + ' g'],
    ['Asimetría (G1)', d.skewness === null ? '— (n<3)' : fmt(d.skewness, 3)],
    ['Curtosis en exceso (G2)', d.kurtosis === null ? '— (n<4)' : fmt(d.kurtosis, 3)],
    [
      'IC 95% para la media',
      ci ? `${fmt(ci.lower)} – ${fmt(ci.upper)} g` : '— (n<2)',
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
          Se pesó <b>todo el lote</b> (censo) — usar fórmulas poblacionales (n).
          Si es una muestra, dejar sin marcar (fórmulas muestrales, n−1).
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
          Proporción de aves dentro de media ± X%
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
            Comparación con el objetivo de {lineaGenetica} ({edadSemanas} sem)
          </div>
          <div>
            Peso objetivo: <b>{fmt(target.pesoOptimo, 0)} g</b> (rango guía {fmt(target.pesoMin, 0)}–{fmt(target.pesoMax, 0)} g)
            {isApproximateLine(lineaGenetica) && (
              <span className="text-amber-700 font-semibold"> ⚠️ datos aproximados, sin guía oficial auditada</span>
            )}
          </div>
          <div>
            Diferencia: <b>{fmt(d.mean - target.pesoOptimo, 1)} g</b> ({fmt(((d.mean - target.pesoOptimo) / target.pesoOptimo) * 100, 1)}%)
          </div>
          <div>
            Dentro del rango guía: <b>{fmt((pesos.filter((p) => p >= target.pesoMin && p <= target.pesoMax).length / d.n) * 100, 1)}%</b> de las aves
            · por debajo del objetivo: {fmt((pesos.filter((p) => p < target.pesoOptimo).length / d.n) * 100, 1)}%
            · por encima: {fmt((pesos.filter((p) => p > target.pesoOptimo).length / d.n) * 100, 1)}%
          </div>
          {Number.isFinite(d.sdSample) && d.sdSample > 0 && (
            <div>
              Índice estandarizado vs. objetivo: <b>{fmt((d.mean - target.pesoOptimo) / d.sdSample, 2)}</b> desviaciones estándar
            </div>
          )}
        </div>
      )}
    </div>
  );
}

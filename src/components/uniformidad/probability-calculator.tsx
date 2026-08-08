'use client';

/**
 * "Distribuciones y probabilidades" — inspirado en las capacidades de
 * Minitab (Gráficas de distribución de probabilidad): colas derecha,
 * izquierda, ambas y región central, definidas por probabilidad o por
 * valor X, sobre Normal (del lote o manual), Normal estándar y t de Student.
 * Todos los cálculos son locales y deterministas.
 */

import { useMemo, useState } from 'react';
import { useUniformidadStore } from '@/lib/store';
import {
  TailMode,
  normalTailFromP,
  normalTailFromX,
  tTailFromP,
  tTailFromX,
} from '@/lib/statistics/distributions';
import { ShadedCurve } from './shaded-curve';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

type DistChoice = 'lote' | 'normal-manual' | 'normal-estandar' | 't';
type DefineBy = 'probability' | 'x';

const TAIL_LABELS: Record<TailMode, string> = {
  right: 'Cola derecha',
  left: 'Cola izquierda',
  both: 'Ambas colas',
  center: 'Región central',
};

function fmtNum(v: number, dec = 4): string {
  if (!Number.isFinite(v)) return v > 0 ? '+∞' : '−∞';
  return v.toFixed(dec);
}

export function ProbabilityCalculator() {
  const { pesos, stats } = useUniformidadStore();
  const hasLote = pesos.length >= 2 && stats.desvEst > 0;

  const [dist, setDist] = useState<DistChoice>(hasLote ? 'lote' : 'normal-estandar');
  const [tail, setTail] = useState<TailMode>('right');
  const [defineBy, setDefineBy] = useState<DefineBy>('probability');
  const [pInput, setPInput] = useState('0.05');
  const [x1Input, setX1Input] = useState('');
  const [x2Input, setX2Input] = useState('');
  const [muInput, setMuInput] = useState('1450');
  const [sigmaInput, setSigmaInput] = useState('85');
  const [dfInput, setDfInput] = useState('10');

  const { mu, sigma, df, isT, unit } = useMemo(() => {
    switch (dist) {
      case 'lote':
        return { mu: stats.promedio, sigma: stats.desvEst, df: 0, isT: false, unit: 'g' };
      case 'normal-manual':
        return { mu: parseFloat(muInput), sigma: parseFloat(sigmaInput), df: 0, isT: false, unit: 'g' };
      case 'normal-estandar':
        return { mu: 0, sigma: 1, df: 0, isT: false, unit: 'Z' };
      case 't':
        return { mu: 0, sigma: 1, df: parseFloat(dfInput), isT: true, unit: 't' };
    }
  }, [dist, stats, muInput, sigmaInput, dfInput]);

  const result = useMemo(() => {
    if (isT) {
      if (!Number.isFinite(df) || df <= 0) return null;
      if (defineBy === 'probability') {
        const p = parseFloat(pInput);
        if (!Number.isFinite(p) || p <= 0 || p >= 1) return null;
        return tTailFromP(tail, df, p);
      }
      const x1 = parseFloat(x1Input);
      if (!Number.isFinite(x1)) return null;
      const x2 = tail === 'center' ? parseFloat(x2Input) : undefined;
      if (tail === 'center' && !Number.isFinite(x2!)) return null;
      return tTailFromX(tail, df, x1, x2);
    }
    if (!Number.isFinite(mu) || !Number.isFinite(sigma) || sigma <= 0) return null;
    if (defineBy === 'probability') {
      const p = parseFloat(pInput);
      if (!Number.isFinite(p) || p <= 0 || p >= 1) return null;
      return normalTailFromP(tail, mu, sigma, p);
    }
    const x1 = parseFloat(x1Input);
    if (!Number.isFinite(x1)) return null;
    const x2 = tail === 'center' ? parseFloat(x2Input) : undefined;
    if (tail === 'center' && !Number.isFinite(x2!)) return null;
    return normalTailFromX(tail, mu, sigma, x1, x2);
  }, [isT, df, mu, sigma, tail, defineBy, pInput, x1Input, x2Input]);

  const shadedRegions = useMemo((): Array<[number, number]> => {
    if (!result) return [];
    const [a, b] = result.bounds;
    const lo = isT ? -50 : mu - 6 * sigma;
    const hi = isT ? 50 : mu + 6 * sigma;
    switch (tail) {
      case 'right':
        return [[a, hi]];
      case 'left':
        return [[lo, b]];
      case 'both':
        return [
          [lo, a],
          [b, hi],
        ];
      case 'center':
        return [[a, b]];
    }
  }, [result, tail, isT, mu, sigma]);

  const explanation = useMemo(() => {
    if (!result) return '';
    const [a, b] = result.bounds;
    const p = result.probability;
    const pct = (p * 100).toFixed(2);
    const vUnit = unit === 'g' ? ' g' : '';
    const name = isT ? `t de Student (gl=${df})` : dist === 'normal-estandar' ? 'normal estándar' : `normal (μ=${fmtNum(mu, 1)}, σ=${fmtNum(sigma, 1)})`;
    switch (tail) {
      case 'right':
        return `Bajo la distribución ${name}, el ${pct}% del área queda a la derecha de ${fmtNum(a, unit === 'g' ? 1 : 4)}${vUnit}. ${dist === 'lote' ? `Es decir, teóricamente ~${pct}% de las aves pesaría más de ${fmtNum(a, 1)} g.` : ''}`;
      case 'left':
        return `Bajo la distribución ${name}, el ${pct}% del área queda a la izquierda de ${fmtNum(b, unit === 'g' ? 1 : 4)}${vUnit}. ${dist === 'lote' ? `Es decir, teóricamente ~${pct}% de las aves pesaría menos de ${fmtNum(b, 1)} g.` : ''}`;
      case 'both':
        return `Bajo la distribución ${name}, el ${pct}% del área queda repartido en las dos colas: por debajo de ${fmtNum(a, unit === 'g' ? 1 : 4)}${vUnit} y por encima de ${fmtNum(b, unit === 'g' ? 1 : 4)}${vUnit}.`;
      case 'center':
        return `Bajo la distribución ${name}, el ${pct}% del área queda entre ${fmtNum(a, unit === 'g' ? 1 : 4)} y ${fmtNum(b, unit === 'g' ? 1 : 4)}${vUnit}. ${dist === 'lote' ? `Es decir, teóricamente ~${pct}% de las aves pesaría en ese rango.` : ''}`;
    }
  }, [result, tail, unit, isT, df, dist, mu, sigma]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <Label className="text-[10px] uppercase font-bold text-muted-foreground">Distribución</Label>
          <Select value={dist} onValueChange={(v) => setDist(v as DistChoice)}>
            <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="lote" disabled={!hasLote}>
                Normal del lote {hasLote ? `(μ=${stats.promedio.toFixed(1)}, σ=${stats.desvEst.toFixed(1)})` : '(sin datos suficientes)'}
              </SelectItem>
              <SelectItem value="normal-manual">Normal con parámetros manuales</SelectItem>
              <SelectItem value="normal-estandar">Normal estándar (μ=0, σ=1)</SelectItem>
              <SelectItem value="t">t de Student</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-[10px] uppercase font-bold text-muted-foreground">Área sombreada</Label>
          <Select value={tail} onValueChange={(v) => setTail(v as TailMode)}>
            <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(TAIL_LABELS) as TailMode[]).map((k) => (
                <SelectItem key={k} value={k}>{TAIL_LABELS[k]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {dist === 'normal-manual' && (
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Media (g)</Label>
            <Input type="number" value={muInput} onChange={(e) => setMuInput(e.target.value)} className="h-9 text-xs" />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Desv. estándar (g)</Label>
            <Input type="number" min={0.001} value={sigmaInput} onChange={(e) => setSigmaInput(e.target.value)} className="h-9 text-xs" />
          </div>
        </div>
      )}
      {dist === 't' && (
        <div className="flex flex-col gap-1 max-w-40">
          <Label className="text-[10px] uppercase font-bold text-muted-foreground">Grados de libertad</Label>
          <Input type="number" min={1} value={dfInput} onChange={(e) => setDfInput(e.target.value)} className="h-9 text-xs" />
        </div>
      )}

      <RadioGroup
        value={defineBy}
        onValueChange={(v) => setDefineBy(v as DefineBy)}
        className="flex flex-wrap gap-4"
      >
        <div className="flex items-center gap-1.5">
          <RadioGroupItem value="probability" id="by-prob" />
          <Label htmlFor="by-prob" className="text-xs cursor-pointer">Definir por probabilidad</Label>
        </div>
        <div className="flex items-center gap-1.5">
          <RadioGroupItem value="x" id="by-x" />
          <Label htmlFor="by-x" className="text-xs cursor-pointer">Definir por valor {unit === 'g' ? 'X (g)' : unit}</Label>
        </div>
      </RadioGroup>

      {defineBy === 'probability' ? (
        <div className="flex flex-col gap-1 max-w-40">
          <Label className="text-[10px] uppercase font-bold text-muted-foreground">Probabilidad (0–1)</Label>
          <Input type="number" min={0.0001} max={0.9999} step={0.01} value={pInput} onChange={(e) => setPInput(e.target.value)} className="h-9 text-xs" />
        </div>
      ) : (
        <div className="flex gap-3">
          <div className="flex flex-col gap-1 max-w-40">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">{tail === 'center' ? 'Valor X₁' : 'Valor X'}</Label>
            <Input type="number" value={x1Input} onChange={(e) => setX1Input(e.target.value)} className="h-9 text-xs" placeholder={unit === 'g' ? 'p.ej. 1350' : 'p.ej. 1.645'} />
          </div>
          {tail === 'center' && (
            <div className="flex flex-col gap-1 max-w-40">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Valor X₂</Label>
              <Input type="number" value={x2Input} onChange={(e) => setX2Input(e.target.value)} className="h-9 text-xs" />
            </div>
          )}
        </div>
      )}

      {result ? (
        <>
          <div className="bg-muted/50 rounded-md p-3 text-sm space-y-1">
            <div>
              Probabilidad del área sombreada: <b className="tabular-nums">{fmtNum(result.probability, 5)}</b>{' '}
              ({(result.probability * 100).toFixed(2)}%)
            </div>
            <div className="tabular-nums text-xs text-muted-foreground">
              {tail === 'right' && <>Valor crítico: <b>{fmtNum(result.bounds[0], unit === 'g' ? 2 : 5)}</b>{unit === 'g' ? ' g' : ` (${unit})`}</>}
              {tail === 'left' && <>Valor crítico: <b>{fmtNum(result.bounds[1], unit === 'g' ? 2 : 5)}</b>{unit === 'g' ? ' g' : ` (${unit})`}</>}
              {(tail === 'both' || tail === 'center') && (
                <>Límites: <b>{fmtNum(result.bounds[0], unit === 'g' ? 2 : 5)}</b> y <b>{fmtNum(result.bounds[1], unit === 'g' ? 2 : 5)}</b>{unit === 'g' ? ' g' : ` (${unit})`}</>
              )}
            </div>
            <p className="text-xs leading-snug">{explanation}</p>
          </div>
          <ShadedCurve
            kind={isT ? 't' : 'normal'}
            mu={mu}
            sigma={sigma}
            df={df}
            shaded={shadedRegions}
            markers={
              tail === 'both' || tail === 'center'
                ? [
                    { x: result.bounds[0], label: fmtNum(result.bounds[0], unit === 'g' ? 0 : 3) },
                    { x: result.bounds[1], label: fmtNum(result.bounds[1], unit === 'g' ? 0 : 3) },
                  ]
                : [
                    {
                      x: tail === 'right' ? result.bounds[0] : result.bounds[1],
                      label: fmtNum(tail === 'right' ? result.bounds[0] : result.bounds[1], unit === 'g' ? 0 : 3),
                    },
                  ]
            }
            xLabel={unit === 'g' ? 'Peso (g)' : unit === 'Z' ? 'Z' : `t (gl=${df})`}
            ariaLabel={explanation}
          />
        </>
      ) : (
        <p className="text-xs text-muted-foreground">Completa los parámetros para calcular.</p>
      )}
    </div>
  );
}

'use client';

/**
 * Prueba t de una muestra para cualquier variable (Fase 10).
 *
 * Pensado también como recurso didáctico: muestra el estadístico, los grados
 * de libertad, el valor p y el intervalo de confianza, y redacta la conclusión
 * con el lenguaje estadísticamente correcto — nunca "se acepta H₀".
 */

import type { DatasetStore } from '@/lib/dataset-store';
import { oneSampleTTest, tTestAssumptionWarnings, type Alternative } from '@/lib/statistics/inference';
import { fmtPFrase } from '@/lib/p-value';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FlaskConical, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

const NIVELES = [
  { v: '0.90', label: '90 %' },
  { v: '0.95', label: '95 %' },
  { v: '0.99', label: '99 %' },
];

/** Cada hipótesis alterna con sus claves de rótulo y descripción. */
const ALTERNATIVAS: Array<{ v: Alternative; label: string; desc: string }> = [
  { v: 'two-sided', label: 'twoSided', desc: 'twoSidedDesc' },
  { v: 'greater', label: 'greater', desc: 'greaterDesc' },
  { v: 'less', label: 'less', desc: 'lessDesc' },
];

export function InferencePanel({ store }: { store: DatasetStore }) {
  const { valores, variable, muHipotetica, setMuHipotetica } = store();
  const tr = useTranslations('datasetInference');
  const [alternativa, setAlternativa] = useState<Alternative>('two-sided');
  const [nivel, setNivel] = useState('0.95');

  const conf = parseFloat(nivel);
  const alfa = 1 - conf;
  const mu0 = muHipotetica;
  const resultado = mu0 !== null && valores.length >= 2
    ? oneSampleTTest(valores, mu0, alternativa, conf)
    : null;
  const supuestos = tTestAssumptionWarnings(valores);

  const u = variable.unit;
  const dec = variable.decimals;
  const f = (v: number, d = dec) => (Number.isFinite(v) ? v.toFixed(d) : v > 0 ? '+∞' : '−∞');

  const simbolo = alternativa === 'two-sided' ? '≠' : alternativa === 'greater' ? '>' : '<';

  return (
    <div className="bg-card rounded-lg border shadow-sm p-3 sm:p-4 mb-4">
      <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
        <FlaskConical className="h-4 w-4" /> {tr('title')}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div className="flex flex-col gap-1">
          <Label className="text-[10px] uppercase font-bold text-muted-foreground">
            {u ? tr('mu0WithUnit', { unidad: u }) : tr('mu0')}
          </Label>
          <Input
            type="number"
            value={mu0 ?? ''}
            onChange={(e) => setMuHipotetica(e.target.value === '' ? null : parseFloat(e.target.value))}
            placeholder={tr('mu0Placeholder')}
            className="h-9 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-[10px] uppercase font-bold text-muted-foreground">{tr('confidence')}</Label>
          <Select value={nivel} onValueChange={setNivel}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {NIVELES.map((n) => <SelectItem key={n.v} value={n.v}>{n.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 mb-3">
        <Label className="text-[10px] uppercase font-bold text-muted-foreground">{tr('alternative')}</Label>
        <RadioGroup value={alternativa} onValueChange={(v) => setAlternativa(v as Alternative)} className="flex flex-col gap-1.5">
          {ALTERNATIVAS.map((a) => (
            <div key={a.v} className="flex items-start gap-1.5">
              <RadioGroupItem value={a.v} id={`alt-${a.v}`} className="mt-0.5" />
              <Label htmlFor={`alt-${a.v}`} className="text-xs cursor-pointer leading-snug">
                <b>{tr(a.label)}:</b> {tr(a.desc)}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {mu0 === null ? (
        <p className="text-xs text-muted-foreground">{tr('needMu0')}</p>
      ) : !resultado ? (
        <p className="text-xs text-muted-foreground">{tr('needValues')}</p>
      ) : (
        <div className="bg-muted/50 rounded-md p-3 text-xs space-y-1.5">
          <div className="font-mono text-[11px]">
            H₀: μ = {f(mu0)} {u} &nbsp;·&nbsp; H₁: μ {simbolo} {f(mu0)} {u} &nbsp;·&nbsp; α = {alfa.toFixed(2)}
          </div>
          <div className="tabular-nums">
            {tr.rich('statsLine', {
              t: resultado.t.toFixed(4),
              gl: resultado.df,
              p: fmtPFrase(resultado.pValue),
              b: (c) => <b>{c}</b>,
            })}
          </div>
          <div className="tabular-nums">
            {tr('observedMean')} <b>{f(resultado.mean)} {u}</b> · {tr('difference')}{' '}
            <b>{resultado.diff >= 0 ? '+' : ''}{f(resultado.diff)} {u}</b> · {tr('standardError')}{' '}
            <b>{f(resultado.se)} {u}</b>
          </div>
          <div className="tabular-nums">
            {tr('ci', { pct: (conf * 100).toFixed(0) })} <b>{f(resultado.ciLower)} – {f(resultado.ciUpper)} {u}</b>
            {Number.isFinite(resultado.cohenD) && <> · {tr('cohenD')} <b>{resultado.cohenD.toFixed(2)}</b></>}
          </div>

          <p className="leading-snug pt-1 border-t">
            <b>{tr('conclusionLabel')}</b>{' '}
            {tr(resultado.rejectNull ? 'reject' : 'notReject', {
              alfa: alfa.toFixed(2),
              mu0: f(mu0),
              unidad: u,
              p: fmtPFrase(resultado.pValue),
            })}
          </p>
          {!resultado.rejectNull && (
            <p className="text-[11px] text-muted-foreground leading-snug">
              {tr.rich('notRejectCaveat', { mu0: f(mu0), unidad: u, b: (c) => <b>{c}</b> })}
            </p>
          )}

          {(supuestos.verySmallSample || supuestos.smallSample || supuestos.markedSkewness) && (
            <Alert className="border-amber-300 bg-amber-50 mt-1">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-[11px] text-amber-900 space-y-0.5">
                {supuestos.verySmallSample && <div>{tr('warnVerySmall')}</div>}
                {supuestos.smallSample && !supuestos.verySmallSample && <div>{tr('warnSmall')}</div>}
                {supuestos.markedSkewness && <div>{tr('warnSkew')}</div>}
                <div>{tr('warnIndependence')}</div>
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </div>
  );
}

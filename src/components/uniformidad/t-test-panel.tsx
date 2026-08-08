'use client';

/**
 * Prueba t de una muestra: compara el peso promedio observado contra el
 * objetivo de la línea genética o un valor hipotético del usuario.
 * La conclusión distingue "no rechazar H0" de "aceptar H0".
 */

import { useMemo, useState } from 'react';
import { useUniformidadStore } from '@/lib/store';
import { oneSampleTTest, tTestAssumptionWarnings, Alternative } from '@/lib/statistics/inference';
import { tInv } from '@/lib/statistics/distributions';
import { detectOutliers } from '@/lib/statistics/outliers';
import { getTargetWeight, isApproximateLine } from '@/lib/diagnostic-engine';
import { ShadedCurve } from './shaded-curve';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

const ALT_LABELS: Record<Alternative, string> = {
  'two-sided': 'μ ≠ μ₀ (bilateral)',
  greater: 'μ > μ₀ (unilateral derecha)',
  less: 'μ < μ₀ (unilateral izquierda)',
};

function fmtP(p: number): string {
  if (p < 0.0001) return '< 0.0001';
  return p.toFixed(4);
}

export function TTestPanel() {
  const { pesos, lineaGenetica, edadSemanas } = useUniformidadStore();

  const target = useMemo(() => {
    const sem = parseInt(edadSemanas, 10);
    return Number.isFinite(sem) ? getTargetWeight(lineaGenetica, sem) : null;
  }, [lineaGenetica, edadSemanas]);

  const [mu0Source, setMu0Source] = useState<'objetivo' | 'manual'>(target ? 'objetivo' : 'manual');
  const [mu0Manual, setMu0Manual] = useState('');
  const [alternative, setAlternative] = useState<Alternative>('two-sided');
  const [confidence, setConfidence] = useState('0.95');

  const mu0 = mu0Source === 'objetivo' && target ? target.pesoOptimo : parseFloat(mu0Manual);
  const confLevel = parseFloat(confidence);
  const alpha = 1 - confLevel;

  const result = useMemo(() => {
    if (!Number.isFinite(mu0) || pesos.length < 2) return null;
    return oneSampleTTest(pesos, mu0, alternative, confLevel);
  }, [pesos, mu0, alternative, confLevel]);

  const warnings = useMemo(() => tTestAssumptionWarnings(pesos), [pesos]);
  const outliers = useMemo(() => detectOutliers(pesos), [pesos]);

  const criticalRegion = useMemo((): { shaded: Array<[number, number]>; markers: Array<{ x: number; label: string; color?: string }> } | null => {
    if (!result) return null;
    const df = result.df;
    const tMark = { x: result.t, label: `t=${result.t.toFixed(2)}`, color: '#7c3aed' };
    switch (alternative) {
      case 'two-sided': {
        const tc = tInv(1 - alpha / 2, df);
        return {
          shaded: [[-50, -tc], [tc, 50]],
          markers: [
            { x: -tc, label: `−${tc.toFixed(3)}`, color: '#dc2626' },
            { x: tc, label: tc.toFixed(3), color: '#dc2626' },
            tMark,
          ],
        };
      }
      case 'greater': {
        const tc = tInv(1 - alpha, df);
        return { shaded: [[tc, 50]], markers: [{ x: tc, label: tc.toFixed(3), color: '#dc2626' }, tMark] };
      }
      case 'less': {
        const tc = tInv(alpha, df);
        return { shaded: [[-50, tc]], markers: [{ x: tc, label: tc.toFixed(3), color: '#dc2626' }, tMark] };
      }
    }
  }, [result, alternative, alpha]);

  const conclusion = useMemo(() => {
    if (!result) return null;
    const alphaTxt = alpha.toFixed(2);
    const mu0Txt = `${mu0.toFixed(0)} g`;
    if (result.rejectNull) {
      const dir =
        alternative === 'greater'
          ? 'es mayor que'
          : alternative === 'less'
            ? 'es menor que'
            : 'difiere de';
      return {
        decision: `Se rechaza H₀ (p = ${fmtP(result.pValue)} < α = ${alphaTxt}).`,
        text: `Con un nivel de significancia de ${alphaTxt}, existe evidencia estadística de que el peso promedio del lote ${dir} ${mu0Txt}. La diferencia observada es ${result.diff >= 0 ? '+' : ''}${result.diff.toFixed(1)} g (${((result.diff / mu0) * 100).toFixed(1)}%).`,
      };
    }
    const dir =
      alternative === 'greater'
        ? 'es mayor que'
        : alternative === 'less'
          ? 'es menor que'
          : 'difiere de';
    return {
      decision: `No se rechaza H₀ (p = ${fmtP(result.pValue)} ≥ α = ${alphaTxt}).`,
      text: `Con un nivel de significancia de ${alphaTxt}, no se encontró evidencia estadística suficiente para concluir que el peso promedio del lote ${dir} ${mu0Txt}. Esto NO demuestra que las medias sean iguales: solo que los datos no permiten afirmar la diferencia.`,
    };
  }, [result, alpha, mu0, alternative]);

  const effectLabel = useMemo(() => {
    if (!result) return '';
    const d = Math.abs(result.cohenD);
    if (d < 0.2) return 'insignificante';
    if (d < 0.5) return 'pequeño';
    if (d < 0.8) return 'mediano';
    return 'grande';
  }, [result]);

  if (pesos.length < 2) {
    return <p className="text-sm text-muted-foreground text-center py-4">Se necesitan al menos 2 pesos.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <Label className="text-[10px] uppercase font-bold text-muted-foreground">Media hipotética (μ₀)</Label>
          <RadioGroup value={mu0Source} onValueChange={(v) => setMu0Source(v as 'objetivo' | 'manual')} className="flex flex-col gap-1.5 mt-1">
            <div className="flex items-center gap-1.5">
              <RadioGroupItem value="objetivo" id="mu0-obj" disabled={!target} />
              <Label htmlFor="mu0-obj" className="text-xs cursor-pointer">
                {target
                  ? <>Peso objetivo de la línea: <b>{target.pesoOptimo.toFixed(0)} g</b>{isApproximateLine(lineaGenetica) && <span className="text-amber-700"> ⚠️ aproximado</span>}</>
                  : 'Peso objetivo (indica línea y edad primero)'}
              </Label>
            </div>
            <div className="flex items-center gap-1.5">
              <RadioGroupItem value="manual" id="mu0-man" />
              <Label htmlFor="mu0-man" className="text-xs cursor-pointer">Valor manual:</Label>
              <Input
                type="number"
                value={mu0Manual}
                onChange={(e) => { setMu0Manual(e.target.value); setMu0Source('manual'); }}
                className="h-8 w-28 text-xs"
                placeholder="p.ej. 1450"
              />
              <span className="text-xs text-muted-foreground">g</span>
            </div>
          </RadioGroup>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Hipótesis alterna</Label>
            <Select value={alternative} onValueChange={(v) => setAlternative(v as Alternative)}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(ALT_LABELS) as Alternative[]).map((k) => (
                  <SelectItem key={k} value={k}>{ALT_LABELS[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Confianza</Label>
            <Select value={confidence} onValueChange={setConfidence}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0.90">90%</SelectItem>
                <SelectItem value="0.95">95%</SelectItem>
                <SelectItem value="0.99">99%</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {!Number.isFinite(mu0) ? (
        <p className="text-xs text-muted-foreground">Indica la media hipotética μ₀ para ejecutar la prueba.</p>
      ) : !result ? (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            No se puede ejecutar la prueba: se requieren al menos 2 pesos con variabilidad (SD &gt; 0).
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            {[
              ['t', result.t.toFixed(4)],
              ['gl', String(result.df)],
              ['Valor p', fmtP(result.pValue)],
              ['Diferencia', `${result.diff >= 0 ? '+' : ''}${result.diff.toFixed(1)} g`],
              ['Error estándar', `${result.se.toFixed(2)} g`],
              ['Media muestral', `${result.mean.toFixed(1)} g`],
              [
                `IC ${(confLevel * 100).toFixed(0)}%`,
                `${Number.isFinite(result.ciLower) ? result.ciLower.toFixed(1) : '−∞'} – ${Number.isFinite(result.ciUpper) ? result.ciUpper.toFixed(1) : '+∞'}`,
              ],
              ['d de Cohen', `${result.cohenD.toFixed(2)} (${effectLabel})`],
            ].map(([label, value]) => (
              <div key={label} className="bg-muted/50 rounded-md py-2 px-1">
                <div className="text-[10px] text-muted-foreground font-bold uppercase">{label}</div>
                <div className="text-xs font-bold tabular-nums">{value}</div>
              </div>
            ))}
          </div>

          <div className={`rounded-md p-3 text-xs leading-relaxed border ${result.rejectNull ? 'bg-blue-50 border-blue-200 text-blue-900' : 'bg-gray-50 border-gray-200 text-gray-800'}`}>
            <div className="font-bold mb-1">{conclusion?.decision}</div>
            <p>{conclusion?.text}</p>
          </div>

          {(warnings.verySmallSample || warnings.markedSkewness || outliers.flags.length > 0 || warnings.smallSample) && (
            <Alert className="border-amber-300 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-xs text-amber-900 space-y-0.5">
                {warnings.verySmallSample && <div>• Muestra muy pequeña (n={pesos.length} &lt; 10): la prueba tiene poca potencia y depende fuertemente de la normalidad.</div>}
                {!warnings.verySmallSample && warnings.smallSample && <div>• Muestra pequeña (n={pesos.length} &lt; 30): verificar normalidad en la pestaña de diagnóstico antes de confiar en el resultado.</div>}
                {warnings.markedSkewness && <div>• Distribución marcadamente asimétrica: el valor p puede no ser confiable con esta muestra.</div>}
                {outliers.flags.length > 0 && <div>• {outliers.flags.length} posible(s) valor(es) atípico(s) que pueden influir en el resultado (ver pestaña Atípicos).</div>}
                <div>• La prueba asume observaciones independientes y muestreo representativo (idealmente aleatorio).</div>
              </AlertDescription>
            </Alert>
          )}

          {criticalRegion && (
            <div>
              <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">
                Región crítica (α = {alpha.toFixed(2)}) y estadístico observado
              </div>
              <ShadedCurve
                kind="t"
                df={result.df}
                shaded={criticalRegion.shaded}
                markers={criticalRegion.markers}
                xLabel={`t (gl=${result.df})`}
                ariaLabel={`Región crítica de la prueba t con ${result.df} grados de libertad y el estadístico observado t=${result.t.toFixed(2)}`}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

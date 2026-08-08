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
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FlaskConical, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

const NIVELES = [
  { v: '0.90', label: '90 %' },
  { v: '0.95', label: '95 %' },
  { v: '0.99', label: '99 %' },
];

function fmtP(p: number): string {
  return p < 0.0001 ? '< 0.0001' : p.toFixed(4);
}

export function InferencePanel({ store }: { store: DatasetStore }) {
  const { valores, variable, muHipotetica, setMuHipotetica } = store();
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
        <FlaskConical className="h-4 w-4" /> Prueba de hipótesis (t de una muestra)
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div className="flex flex-col gap-1">
          <Label className="text-[10px] uppercase font-bold text-muted-foreground">
            Media hipotética μ₀ {u && `(${u})`}
          </Label>
          <Input
            type="number"
            value={mu0 ?? ''}
            onChange={(e) => setMuHipotetica(e.target.value === '' ? null : parseFloat(e.target.value))}
            placeholder="Valor a contrastar"
            className="h-9 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-[10px] uppercase font-bold text-muted-foreground">Nivel de confianza</Label>
          <Select value={nivel} onValueChange={setNivel}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {NIVELES.map((n) => <SelectItem key={n.v} value={n.v}>{n.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 mb-3">
        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Hipótesis alterna</Label>
        <RadioGroup value={alternativa} onValueChange={(v) => setAlternativa(v as Alternative)} className="flex flex-col gap-1.5">
          {([
            ['two-sided', 'Bilateral', 'μ ≠ μ₀ — la media difiere del valor, en cualquier dirección'],
            ['greater', 'Unilateral derecha', 'μ > μ₀ — solo interesa si la media es mayor'],
            ['less', 'Unilateral izquierda', 'μ < μ₀ — solo interesa si la media es menor'],
          ] as Array<[Alternative, string, string]>).map(([v, t, d]) => (
            <div key={v} className="flex items-start gap-1.5">
              <RadioGroupItem value={v} id={`alt-${v}`} className="mt-0.5" />
              <Label htmlFor={`alt-${v}`} className="text-xs cursor-pointer leading-snug">
                <b>{t}:</b> {d}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {mu0 === null ? (
        <p className="text-xs text-muted-foreground">
          Escribe una media hipotética μ₀ para contrastar la media observada contra ese valor.
        </p>
      ) : !resultado ? (
        <p className="text-xs text-muted-foreground">
          Se requieren al menos 2 valores con variabilidad (desviación estándar distinta de cero).
        </p>
      ) : (
        <div className="bg-muted/50 rounded-md p-3 text-xs space-y-1.5">
          <div className="font-mono text-[11px]">
            H₀: μ = {f(mu0)} {u} &nbsp;·&nbsp; H₁: μ {simbolo} {f(mu0)} {u} &nbsp;·&nbsp; α = {alfa.toFixed(2)}
          </div>
          <div className="tabular-nums">
            t = <b>{resultado.t.toFixed(4)}</b> · gl = <b>{resultado.df}</b> · valor p = <b>{fmtP(resultado.pValue)}</b>
          </div>
          <div className="tabular-nums">
            Media observada: <b>{f(resultado.mean)} {u}</b> · Diferencia:{' '}
            <b>{resultado.diff >= 0 ? '+' : ''}{f(resultado.diff)} {u}</b> · Error estándar:{' '}
            <b>{f(resultado.se)} {u}</b>
          </div>
          <div className="tabular-nums">
            IC {(conf * 100).toFixed(0)} %: <b>{f(resultado.ciLower)} a {f(resultado.ciUpper)} {u}</b>
            {Number.isFinite(resultado.cohenD) && <> · d de Cohen: <b>{resultado.cohenD.toFixed(2)}</b></>}
          </div>

          <p className="leading-snug pt-1 border-t">
            <b>Conclusión:</b>{' '}
            {resultado.rejectNull
              ? `Con α = ${alfa.toFixed(2)}, se rechaza H₀: hay evidencia estadística de que la media difiere de ${f(mu0)} ${u} en el sentido planteado (p = ${fmtP(resultado.pValue)}).`
              : `Con α = ${alfa.toFixed(2)}, no se rechaza H₀: no hay evidencia suficiente para afirmar que la media difiera de ${f(mu0)} ${u} (p = ${fmtP(resultado.pValue)}).`}
          </p>
          {!resultado.rejectNull && (
            <p className="text-[11px] text-muted-foreground leading-snug">
              Ojo: «no rechazar H₀» <b>no</b> equivale a «aceptar H₀». No se demuestra que la media sea
              exactamente {f(mu0)} {u}; solo que los datos no aportan evidencia suficiente en contra —
              lo que también puede deberse a una muestra pequeña.
            </p>
          )}

          {(supuestos.verySmallSample || supuestos.smallSample || supuestos.markedSkewness) && (
            <Alert className="border-amber-300 bg-amber-50 mt-1">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-[11px] text-amber-900 space-y-0.5">
                {supuestos.verySmallSample && <div>• n &lt; 10: la prueba depende fuertemente de que los datos sean normales.</div>}
                {supuestos.smallSample && !supuestos.verySmallSample && <div>• n &lt; 30: verifica normalidad y atípicos antes de confiar en el resultado.</div>}
                {supuestos.markedSkewness && <div>• Distribución marcadamente asimétrica con muestra pequeña.</div>}
                <div>• La prueba asume observaciones independientes: revisa cómo se obtuvo la muestra.</div>
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </div>
  );
}

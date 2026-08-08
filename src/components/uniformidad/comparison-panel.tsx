'use client';

/**
 * Comparación estadística de dos pesajes. Antes de ejecutar exige declarar
 * el diseño (independientes / pareadas / repeticiones / no sé) y explica la
 * diferencia. Usa Welch para independientes y t pareada cuando corresponde.
 */

import { useEffect, useMemo, useState } from 'react';
import { PesajeConLote } from '@/lib/lotes-api';
import { calculateStats } from '@/lib/calculations';
import { median } from '@/lib/statistics/descriptive';
import { twoSampleTTest, pairedTTest, meanConfidenceInterval } from '@/lib/statistics/inference';
import { buildPesajesComparisonReportHtml } from '@/lib/pesajes-comparison-report';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Printer } from 'lucide-react';

type Design = 'independientes' | 'pareadas' | 'repeticiones' | 'ns';

function fmtP(p: number): string {
  return p < 0.0001 ? '< 0.0001' : p.toFixed(4);
}

function pesajeLabel(p: PesajeConLote, withLote: boolean): string {
  const fecha = new Date(p.fecha).toLocaleDateString();
  const sem = p.edadSemanas ? ` · sem ${p.edadSemanas}` : '';
  const lote = withLote && p.lote ? `${p.lote.codigo} · ` : '';
  return `${lote}${fecha}${sem} · ${p.pesos.length} aves`;
}

/**
 * Comparación de dos pesajes. `pesajes` puede mezclar lotes distintos
 * (cuando incluyen su campo `lote`); en ese caso, si los pesajes elegidos
 * pertenecen a lotes diferentes solo cabe el diseño "independientes".
 */
export function ComparisonPanel({
  pesajes,
  showLote = false,
  loteActual,
}: {
  pesajes: PesajeConLote[];
  showLote?: boolean;
  /**
   * Lote seleccionado en el historial. Al comparar dentro de un mismo lote los
   * pesajes llegan SIN la relación `lote` (solo la trae el endpoint ?all=1),
   * así que sin este respaldo el reporte mostraría «—» en lote y línea.
   */
  loteActual?: { codigo: string; lineaGenetica: string };
}) {
  const [idA, setIdA] = useState<string>('');
  const [idB, setIdB] = useState<string>('');
  const [design, setDesign] = useState<Design | ''>('');

  const pesajeA = pesajes.find((p) => p.id === idA);
  const pesajeB = pesajes.find((p) => p.id === idB);

  const crossLote = Boolean(
    pesajeA && pesajeB && pesajeA.loteId !== pesajeB.loteId,
  );

  useEffect(() => {
    // Entre lotes distintos las aves son necesariamente distintas:
    // el único diseño válido es "independientes"
    if (crossLote && design !== 'independientes') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- corrección de estado dependiente de la selección
      setDesign('independientes');
    }
  }, [crossLote, design]);

  const result = useMemo(() => {
    if (!pesajeA || !pesajeB || pesajeA.id === pesajeB.id || !design || design === 'ns') return null;
    const a = pesajeA.pesos.filter((w) => !w.excluido).map((w) => w.gramos);
    const b = pesajeB.pesos.filter((w) => !w.excluido).map((w) => w.gramos);
    if (a.length < 2 || b.length < 2) return null;

    const statsA = calculateStats(a, pesajeA.criterioPct);
    const statsB = calculateStats(b, pesajeB.criterioPct);
    const descr = {
      medianA: median(a),
      medianB: median(b),
      statsA,
      statsB,
      ciA: meanConfidenceInterval(a, 0.95),
      ciB: meanConfidenceInterval(b, 0.95),
    };

    if (design === 'pareadas') {
      if (a.length !== b.length) {
        return { descr, error: `Para una prueba pareada ambos pesajes deben tener el mismo número de aves en el mismo orden (aquí: ${a.length} vs. ${b.length}).`, test: null, paired: true as const };
      }
      return { descr, error: null, test: pairedTTest(a, b, 'two-sided', 0.95), paired: true as const };
    }
    // 'independientes' y 'repeticiones' usan Welch; para repeticiones se
    // advierte que la independencia entre mediciones puede no cumplirse.
    return { descr, error: null, test: twoSampleTTest(a, b, 'two-sided', 0.95), paired: false as const };
  }, [pesajeA, pesajeB, design]);

  const imprimir = () => {
    if (!pesajeA || !pesajeB || !result || !design || design === 'ns') return;
    const resumen = (p: PesajeConLote, stats: typeof result.descr.statsA, mediana: number, ci: { lower: number; upper: number } | null) => ({
      etiqueta: pesajeLabel(p, showLote),
      fecha: new Date(p.fecha).toLocaleDateString(),
      edadSemanas: p.edadSemanas,
      lote: p.lote?.codigo ?? loteActual?.codigo ?? '—',
      stats,
      mediana,
      ci,
    });
    const html = buildPesajesComparisonReportHtml({
      lineaGenetica: pesajeA.lote?.lineaGenetica ?? loteActual?.lineaGenetica ?? '—',
      a: resumen(pesajeA, result.descr.statsA, result.descr.medianA, result.descr.ciA),
      b: resumen(pesajeB, result.descr.statsB, result.descr.medianB, result.descr.ciB),
      test: result.test,
      pareada: result.paired,
      diseno: design,
      entreLotes: crossLote,
      lineasDistintas:
        pesajeA.lote && pesajeB.lote && pesajeA.lote.lineaGenetica !== pesajeB.lote.lineaGenetica
          ? `Las líneas genéticas difieren (${pesajeA.lote.lineaGenetica} vs. ${pesajeB.lote.lineaGenetica}).`
          : undefined,
    });
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.onload = () => setTimeout(() => w.print(), 400);
  };

  if (pesajes.length < 2) {
    return <p className="text-xs text-muted-foreground">Se necesitan al menos 2 pesajes para comparar.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <Label className="text-[10px] uppercase font-bold text-muted-foreground">Pesaje A</Label>
          <Select value={idA} onValueChange={setIdA}>
            <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Seleccionar…" /></SelectTrigger>
            <SelectContent>
              {pesajes.map((p) => (
                <SelectItem key={p.id} value={p.id} disabled={p.id === idB}>{pesajeLabel(p, showLote)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-[10px] uppercase font-bold text-muted-foreground">Pesaje B</Label>
          <Select value={idB} onValueChange={setIdB}>
            <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Seleccionar…" /></SelectTrigger>
            <SelectContent>
              {pesajes.map((p) => (
                <SelectItem key={p.id} value={p.id} disabled={p.id === idA}>{pesajeLabel(p, showLote)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {crossLote && (
        <Alert className="border-blue-200 bg-blue-50">
          <AlertDescription className="text-[11px] text-blue-900 leading-snug">
            Los pesajes pertenecen a lotes distintos ({pesajeA?.lote?.codigo ?? 'A'} vs. {pesajeB?.lote?.codigo ?? 'B'}):
            las muestras son <b>independientes</b> por definición y se usará la prueba t de Welch.
            {pesajeA?.lote && pesajeB?.lote && pesajeA.lote.lineaGenetica !== pesajeB.lote.lineaGenetica && (
              <> ⚠️ Las líneas genéticas difieren ({pesajeA.lote.lineaGenetica} vs. {pesajeB.lote.lineaGenetica}): una diferencia de peso puede deberse a la genética y no al manejo.</>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-1.5">
        <Label className="text-[10px] uppercase font-bold text-muted-foreground">
          ¿Cómo se relacionan las observaciones de los dos pesajes?
        </Label>
        <RadioGroup value={design} onValueChange={(v) => setDesign(v as Design)} className="flex flex-col gap-1.5">
          <div className="flex items-start gap-1.5">
            <RadioGroupItem value="independientes" id="d-indep" className="mt-0.5" />
            <Label htmlFor="d-indep" className="text-xs cursor-pointer leading-snug">
              <b>Independientes:</b> aves distintas en cada pesaje (p.ej. dos muestras al azar, dos lotes, dos galpones).
            </Label>
          </div>
          <div className="flex items-start gap-1.5">
            <RadioGroupItem value="pareadas" id="d-par" className="mt-0.5" disabled={crossLote} />
            <Label htmlFor="d-par" className={`text-xs leading-snug ${crossLote ? 'opacity-50' : 'cursor-pointer'}`}>
              <b>Pareadas:</b> las MISMAS aves pesadas dos veces, registradas en el mismo orden (ave 1 con ave 1, etc.).
            </Label>
          </div>
          <div className="flex items-start gap-1.5">
            <RadioGroupItem value="repeticiones" id="d-rep" className="mt-0.5" disabled={crossLote} />
            <Label htmlFor="d-rep" className={`text-xs leading-snug ${crossLote ? 'opacity-50' : 'cursor-pointer'}`}>
              <b>Repeticiones del mismo grupo:</b> mismo lote en fechas distintas, pero sin identificar aves individuales.
            </Label>
          </div>
          <div className="flex items-start gap-1.5">
            <RadioGroupItem value="ns" id="d-ns" className="mt-0.5" />
            <Label htmlFor="d-ns" className="text-xs cursor-pointer leading-snug">
              <b>No estoy seguro.</b>
            </Label>
          </div>
        </RadioGroup>
      </div>

      {design === 'ns' && (
        <Alert className="border-blue-200 bg-blue-50">
          <AlertDescription className="text-[11px] text-blue-900 leading-snug">
            La elección importa: con aves <b>pareadas</b> la prueba analiza las diferencias individuales
            (más potente); con muestras <b>independientes</b> compara los promedios de dos grupos distintos.
            Si pesaste una muestra al azar en cada fecha sin identificar aves, elige
            &quot;Repeticiones del mismo grupo&quot;.
          </AlertDescription>
        </Alert>
      )}

      {result && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr className="border-b font-bold text-muted-foreground">
                  <th className="py-1 text-left">Métrica</th>
                  <th className="py-1 text-right">Pesaje A</th>
                  <th className="py-1 text-right">Pesaje B</th>
                  <th className="py-1 text-right">Diferencia (A−B)</th>
                </tr>
              </thead>
              <tbody>
                {([
                  ['n', String(result.descr.statsA.totalAves), String(result.descr.statsB.totalAves), '—'],
                  ['Media (g)', result.descr.statsA.promedio.toFixed(1), result.descr.statsB.promedio.toFixed(1), (result.descr.statsA.promedio - result.descr.statsB.promedio).toFixed(1)],
                  ['Mediana (g)', result.descr.medianA.toFixed(1), result.descr.medianB.toFixed(1), (result.descr.medianA - result.descr.medianB).toFixed(1)],
                  ['SD muestral (g)', result.descr.statsA.desvEst.toFixed(2), result.descr.statsB.desvEst.toFixed(2), (result.descr.statsA.desvEst - result.descr.statsB.desvEst).toFixed(2)],
                  ['CV (%)', result.descr.statsA.cv.toFixed(2), result.descr.statsB.cv.toFixed(2), (result.descr.statsA.cv - result.descr.statsB.cv).toFixed(2)],
                  ['Uniformidad (%)', result.descr.statsA.uniformidad.toFixed(1), result.descr.statsB.uniformidad.toFixed(1), (result.descr.statsA.uniformidad - result.descr.statsB.uniformidad).toFixed(1)],
                ] as Array<[string, string, string, string]>).map(([m, a2, b2, dd]) => (
                  <tr key={m} className="border-b border-border/50">
                    <td className="py-1">{m}</td>
                    <td className="py-1 text-right tabular-nums">{a2}</td>
                    <td className="py-1 text-right tabular-nums">{b2}</td>
                    <td className="py-1 text-right tabular-nums font-semibold">{dd}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {result.error ? (
            <Alert className="border-amber-300 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-xs text-amber-900">{result.error}</AlertDescription>
            </Alert>
          ) : result.test ? (
            <div className="bg-muted/50 rounded-md p-3 text-xs space-y-1.5">
              <div className="font-bold uppercase tracking-wide text-muted-foreground">
                {result.paired ? 'Prueba t pareada (sobre diferencias individuales)' : 'Prueba t de dos muestras (Welch, varianzas no asumidas iguales)'}
              </div>
              <div className="tabular-nums">
                t = <b>{result.test.t.toFixed(4)}</b> · gl = <b>{result.test.df.toFixed(result.paired ? 0 : 1)}</b> · valor p = <b>{fmtP(result.test.pValue)}</b>
              </div>
              <div className="tabular-nums">
                Diferencia de medias: <b>{result.test.diff >= 0 ? '+' : ''}{result.test.diff.toFixed(1)} g</b> ·
                IC 95%: <b>{result.test.ciLower.toFixed(1)} a {result.test.ciUpper.toFixed(1)} g</b>
                {Number.isFinite(result.test.cohenD) && <> · d de Cohen: <b>{result.test.cohenD.toFixed(2)}</b></>}
              </div>
              <p className="leading-snug">
                {result.test.rejectNull
                  ? `Con α = 0.05, existe evidencia estadística de una diferencia entre los dos pesajes (p = ${fmtP(result.test.pValue)}).`
                  : `Con α = 0.05, no se encontró evidencia estadística suficiente de diferencia entre los dos pesajes (p = ${fmtP(result.test.pValue)}). Esto no demuestra que sean iguales.`}
              </p>
              {design === 'repeticiones' && (
                <p className="text-amber-700 leading-snug">
                  ⚠️ Al ser el mismo grupo medido dos veces sin identificar aves, la independencia entre
                  muestras es cuestionable: interpretar el valor p como orientativo, no como concluyente.
                </p>
              )}
              {(result.descr.statsA.totalAves < 30 || result.descr.statsB.totalAves < 30) && (
                <p className="text-amber-700 leading-snug">
                  ⚠️ Al menos una muestra tiene n &lt; 30: verificar normalidad y atípicos antes de confiar en el resultado.
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Ambos pesajes necesitan al menos 2 pesos con variabilidad.</p>
          )}

          <Button onClick={imprimir} className="w-full h-10 text-sm bg-gray-800 hover:bg-gray-900 text-white">
            <Printer className="h-4 w-4 mr-1.5" /> Imprimir comparación / PDF
          </Button>
        </>
      )}
    </div>
  );
}

'use client';

/**
 * Comparación entre dos muestreos guardados (huevos o docencia).
 *
 * Mantiene el mismo rigor que la comparación de aves: obliga a declarar el
 * diseño antes de ejecutar la prueba, usa Welch para muestras independientes
 * y t pareada solo cuando corresponde. Añade la comparación de la
 * distribución por categorías, que es lo propio del muestreo de huevos.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ClassificationScheme } from '@/lib/classification';
import { classify } from '@/lib/classification';
import { describe } from '@/lib/statistics/descriptive';
import { twoSampleTTest, pairedTTest, meanConfidenceInterval } from '@/lib/statistics/inference';
import { CategoriasBarChart, MediasBarChart } from './comparison-charts';
import { buildComparisonReportHtml } from '@/lib/comparison-report';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { GitCompare, AlertTriangle, Info } from 'lucide-react';

type Design = 'independientes' | 'pareadas' | 'repeticiones' | 'ns';

interface Cargado {
  id: string;
  nombre: string;
  valores: number[];
  unidad: string;
  decimales: number;
  scheme: ClassificationScheme | null;
}

function fmtP(p: number): string {
  return p < 0.0001 ? '< 0.0001' : p.toFixed(4);
}

export function DatasetComparison({
  dominio,
  refrescarToken,
}: {
  dominio: 'huevos' | 'generico';
  /** Cambia cuando se guarda o borra un conjunto, para recargar la lista. */
  refrescarToken?: number;
}) {
  const [lista, setLista] = useState<Array<{ id: string; nombre: string; variableUnit: string }>>([]);
  const [idA, setIdA] = useState('');
  const [idB, setIdB] = useState('');
  const [a, setA] = useState<Cargado | null>(null);
  const [b, setB] = useState<Cargado | null>(null);
  const [design, setDesign] = useState<Design | ''>('');

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const res = await fetch(`/api/datasets?dominio=${dominio}`);
        if (!cancelado && res.ok) setLista(await res.json());
      } catch { /* opcional */ }
    })();
    return () => { cancelado = true; };
  }, [dominio, refrescarToken]);

  const cargar = useCallback(async (id: string): Promise<Cargado | null> => {
    if (!id) return null;
    try {
      const res = await fetch(`/api/datasets?id=${id}`);
      if (!res.ok) return null;
      const d = await res.json();
      return {
        id: d.id,
        nombre: d.nombre,
        valores: JSON.parse(d.valores),
        unidad: d.variableUnit,
        decimales: d.decimales,
        scheme: d.scheme ? JSON.parse(d.scheme) : null,
      };
    } catch {
      return null;
    }
  }, []);

  useEffect(() => { cargar(idA).then(setA); }, [idA, cargar]);
  useEffect(() => { cargar(idB).then(setB); }, [idB, cargar]);

  const resultado = useMemo(() => {
    if (!a || !b || a.id === b.id || !design || design === 'ns') return null;
    if (a.valores.length < 2 || b.valores.length < 2) return null;

    const dA = describe(a.valores)!;
    const dB = describe(b.valores)!;

    if (design === 'pareadas') {
      if (a.valores.length !== b.valores.length) {
        return {
          dA, dB, test: null, paired: true as const,
          error: `Para una prueba pareada ambos muestreos deben tener el mismo número de observaciones en el mismo orden (aquí: ${a.valores.length} vs. ${b.valores.length}).`,
        };
      }
      return { dA, dB, test: pairedTTest(a.valores, b.valores, 'two-sided', 0.95), paired: true as const, error: null };
    }
    return { dA, dB, test: twoSampleTTest(a.valores, b.valores, 'two-sided', 0.95), paired: false as const, error: null };
  }, [a, b, design]);

  /** IC 95 % de cada media, para las barras de error del gráfico. */
  const intervalos = useMemo(
    () => ({
      a: a ? meanConfidenceInterval(a.valores, 0.95) : null,
      b: b ? meanConfidenceInterval(b.valores, 0.95) : null,
    }),
    [a, b],
  );

  /** Distribución por categorías de ambos, usando el esquema del muestreo A. */
  const categorias = useMemo(() => {
    if (!a || !b || !a.scheme) return null;
    const cA = classify(a.valores, a.scheme);
    const cB = classify(b.valores, a.scheme);
    return cA.bins.map((bin, i) => ({
      label: bin.label,
      pctA: bin.pct,
      pctB: cB.bins[i]?.pct ?? 0,
      nA: bin.count,
      nB: cB.bins[i]?.count ?? 0,
    }));
  }, [a, b]);

  const imprimir = () => {
    if (!a || !b || !resultado || !design || design === 'ns') return;
    const html = buildComparisonReportHtml({
      tituloModulo: dominio === 'huevos' ? 'Peso y clasificación de huevo' : 'Modo Estadística',
      nombreA: a.nombre,
      nombreB: b.nombre,
      dA: resultado.dA,
      dB: resultado.dB,
      ciA: intervalos.a,
      ciB: intervalos.b,
      test: resultado.test,
      pareada: resultado.paired,
      diseno: design,
      categorias,
      unidad: a.unidad,
      decimales: a.decimales,
    });
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.onload = () => setTimeout(() => w.print(), 400);
  };

  if (lista.length < 2) {
    return (
      <div className="bg-card rounded-lg border shadow-sm p-3 sm:p-4 mb-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
          <GitCompare className="h-4 w-4" /> Comparar muestreos
        </h2>
        <p className="text-xs text-muted-foreground">
          Guarda al menos dos muestreos para poder compararlos entre fechas o lotes.
        </p>
      </div>
    );
  }

  const u = a?.unidad ?? '';
  const dec = a?.decimales ?? 1;
  const f = (v: number, d = dec) => (Number.isFinite(v) ? v.toFixed(d) : '—');

  return (
    <div className="bg-card rounded-lg border shadow-sm p-3 sm:p-4 mb-4">
      <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
        <GitCompare className="h-4 w-4" /> Comparar muestreos
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        {([['A', idA, setIdA, idB], ['B', idB, setIdB, idA]] as const).map(([etiqueta, valor, set, otro]) => (
          <div key={etiqueta} className="flex flex-col gap-1">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Muestreo {etiqueta}</Label>
            <Select value={valor} onValueChange={set}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Seleccionar…" /></SelectTrigger>
              <SelectContent>
                {lista.map((x) => (
                  <SelectItem key={x.id} value={x.id} disabled={x.id === otro}>{x.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1.5 mb-3">
        <Label className="text-[10px] uppercase font-bold text-muted-foreground">
          ¿Cómo se relacionan las observaciones de los dos muestreos?
        </Label>
        <RadioGroup value={design} onValueChange={(v) => setDesign(v as Design)} className="flex flex-col gap-1.5">
          {([
            ['independientes', 'Independientes', 'unidades distintas en cada muestreo (dos fechas, dos lotes, dos galpones).'],
            ['pareadas', 'Pareadas', 'las MISMAS unidades medidas dos veces, en el mismo orden.'],
            ['repeticiones', 'Repeticiones del mismo grupo', 'mismo lote en fechas distintas, sin identificar unidades.'],
            ['ns', 'No estoy seguro', ''],
          ] as Array<[Design, string, string]>).map(([v, t, d]) => (
            <div key={v} className="flex items-start gap-1.5">
              <RadioGroupItem value={v} id={`dc-${v}`} className="mt-0.5" />
              <Label htmlFor={`dc-${v}`} className="text-xs cursor-pointer leading-snug">
                <b>{t}{d && ':'}</b> {d}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {design === 'ns' && (
        <Alert className="border-blue-200 bg-blue-50 mb-3">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-[11px] text-blue-900 leading-snug">
            La elección importa: con observaciones <b>pareadas</b> la prueba analiza las diferencias
            individuales (más potente); con muestras <b>independientes</b> compara los promedios de dos
            grupos distintos. Si tomaste una muestra nueva en cada fecha sin identificar las unidades,
            elige «Repeticiones del mismo grupo».
          </AlertDescription>
        </Alert>
      )}

      {resultado && (
        <>
          <div className="overflow-x-auto mb-3">
            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr className="border-b font-bold text-muted-foreground">
                  <th className="py-1 text-left">Métrica</th>
                  <th className="py-1 text-right">A</th>
                  <th className="py-1 text-right">B</th>
                  <th className="py-1 text-right">A − B</th>
                </tr>
              </thead>
              <tbody>
                {([
                  ['n', String(resultado.dA.n), String(resultado.dB.n), '—'],
                  ['Media', f(resultado.dA.mean), f(resultado.dB.mean), f(resultado.dA.mean - resultado.dB.mean)],
                  ['Mediana', f(resultado.dA.median), f(resultado.dB.median), f(resultado.dA.median - resultado.dB.median)],
                  ['Desv. estándar', f(resultado.dA.sdSample), f(resultado.dB.sdSample), f(resultado.dA.sdSample - resultado.dB.sdSample)],
                  ['CV (%)', f(resultado.dA.cv, 2), f(resultado.dB.cv, 2), f(resultado.dA.cv - resultado.dB.cv, 2)],
                  ['Mínimo', f(resultado.dA.min), f(resultado.dB.min), '—'],
                  ['Máximo', f(resultado.dA.max), f(resultado.dB.max), '—'],
                ] as Array<[string, string, string, string]>).map(([m, x, y, z]) => (
                  <tr key={m} className="border-b border-border/50">
                    <td className="py-1">{m}</td>
                    <td className="py-1 text-right tabular-nums">{x}</td>
                    <td className="py-1 text-right tabular-nums">{y}</td>
                    <td className="py-1 text-right tabular-nums font-semibold">{z}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {a && b && (
            <div className="mb-3">
              <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">
                Medias comparadas
              </div>
              <MediasBarChart
                mediaA={resultado.dA.mean}
                mediaB={resultado.dB.mean}
                ciA={intervalos.a}
                ciB={intervalos.b}
                nombreA={a.nombre}
                nombreB={b.nombre}
                unidad={u}
                decimales={dec}
              />
              <p className="text-[10px] text-muted-foreground mt-1 leading-snug">
                Si las barras de error se solapan ampliamente, la diferencia entre medias es dudosa;
                el valor p de la prueba es el criterio formal. La escala no arranca en cero para no
                aplanar diferencias pequeñas.
              </p>
            </div>
          )}

          {categorias && a && b && (
            <div className="mb-3">
              <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">
                Distribución por categorías (criterio del muestreo A)
              </div>
              <CategoriasBarChart categorias={categorias} nombreA={a.nombre} nombreB={b.nombre} />
            </div>
          )}

          {categorias && (
            <div className="overflow-x-auto mb-3">
              <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">
                Detalle por categoría
              </div>
              <table className="w-full text-[11px] border-collapse">
                <thead>
                  <tr className="border-b font-bold text-muted-foreground">
                    <th className="py-1 text-left">Categoría</th>
                    <th className="py-1 text-right">A (n)</th>
                    <th className="py-1 text-right">A (%)</th>
                    <th className="py-1 text-right">B (n)</th>
                    <th className="py-1 text-right">B (%)</th>
                    <th className="py-1 text-right">Δ %</th>
                  </tr>
                </thead>
                <tbody>
                  {categorias.map((c) => {
                    const delta = c.pctB - c.pctA;
                    return (
                      <tr key={c.label} className="border-b border-border/50">
                        <td className="py-1">{c.label}</td>
                        <td className="py-1 text-right tabular-nums">{c.nA}</td>
                        <td className="py-1 text-right tabular-nums">{c.pctA.toFixed(1)}</td>
                        <td className="py-1 text-right tabular-nums">{c.nB}</td>
                        <td className="py-1 text-right tabular-nums">{c.pctB.toFixed(1)}</td>
                        <td className={`py-1 text-right tabular-nums font-semibold ${delta > 0 ? 'text-green-700' : delta < 0 ? 'text-red-600' : ''}`}>
                          {delta >= 0 ? '+' : ''}{delta.toFixed(1)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="text-[10px] text-muted-foreground mt-1 leading-snug">
                Δ % es el cambio en la proporción de B respecto de A. Es descriptivo: no constituye una
                prueba de hipótesis sobre las proporciones.
              </p>
            </div>
          )}

          {resultado.error ? (
            <Alert className="border-amber-300 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-xs text-amber-900">{resultado.error}</AlertDescription>
            </Alert>
          ) : resultado.test ? (
            <div className="bg-muted/50 rounded-md p-3 text-xs space-y-1.5">
              <div className="font-bold uppercase tracking-wide text-muted-foreground">
                {resultado.paired
                  ? 'Prueba t pareada (sobre diferencias individuales)'
                  : 'Prueba t de dos muestras (Welch, sin asumir varianzas iguales)'}
              </div>
              <div className="tabular-nums">
                t = <b>{resultado.test.t.toFixed(4)}</b> · gl = <b>{resultado.test.df.toFixed(resultado.paired ? 0 : 1)}</b> ·
                valor p = <b>{fmtP(resultado.test.pValue)}</b>
              </div>
              <div className="tabular-nums">
                Diferencia de medias: <b>{resultado.test.diff >= 0 ? '+' : ''}{f(resultado.test.diff)} {u}</b> ·
                IC 95 %: <b>{f(resultado.test.ciLower)} a {f(resultado.test.ciUpper)} {u}</b>
                {Number.isFinite(resultado.test.cohenD) && <> · d de Cohen: <b>{resultado.test.cohenD.toFixed(2)}</b></>}
              </div>
              <p className="leading-snug">
                {resultado.test.rejectNull
                  ? `Con α = 0.05, hay evidencia estadística de una diferencia entre los dos muestreos (p = ${fmtP(resultado.test.pValue)}).`
                  : `Con α = 0.05, no se encontró evidencia suficiente de diferencia entre los dos muestreos (p = ${fmtP(resultado.test.pValue)}). Esto no demuestra que sean iguales.`}
              </p>
              {design === 'repeticiones' && (
                <p className="text-amber-700 leading-snug">
                  ⚠️ Al ser el mismo grupo medido dos veces sin identificar unidades, la independencia entre
                  muestras es cuestionable: interpreta el valor p como orientativo.
                </p>
              )}
              {(resultado.dA.n < 30 || resultado.dB.n < 30) && (
                <p className="text-amber-700 leading-snug">
                  ⚠️ Al menos un muestreo tiene n &lt; 30: verifica normalidad y atípicos antes de confiar en el resultado.
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Ambos muestreos necesitan al menos 2 observaciones con variabilidad.
            </p>
          )}

          <Button
            onClick={imprimir}
            className="w-full h-10 text-sm mt-3 bg-gray-800 hover:bg-gray-900 text-white"
          >
            <Printer className="h-4 w-4 mr-1.5" /> Imprimir comparación / PDF
          </Button>
        </>
      )}
    </div>
  );
}

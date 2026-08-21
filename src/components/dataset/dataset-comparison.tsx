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
import { translateBinLabel } from '@/lib/domains/preset-i18n';
import { describe } from '@/lib/statistics/descriptive';
import { twoSampleTTest, pairedTTest, meanConfidenceInterval } from '@/lib/statistics/inference';
import { fmtPFrase } from '@/lib/p-value';
import { CategoriasBarChart, MediasBarChart } from './comparison-charts';
import { buildComparisonReportHtml } from '@/lib/comparison-report';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { GitCompare, AlertTriangle, Info } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

type Design = 'independientes' | 'pareadas' | 'repeticiones' | 'ns';

/**
 * Cada diseño con sus claves de rótulo y descripción. El valor almacenado
 * (`v`) es del dominio y no cambia con el idioma; el texto sale del catálogo.
 */
const DISEÑOS: Array<{ v: Design; label: string; desc: string | null }> = [
  { v: 'independientes', label: 'independent', desc: 'independentDesc' },
  { v: 'pareadas', label: 'paired', desc: 'pairedDesc' },
  { v: 'repeticiones', label: 'repeated', desc: 'repeatedDesc' },
  { v: 'ns', label: 'unsure', desc: null },
];

interface Cargado {
  id: string;
  nombre: string;
  valores: number[];
  unidad: string;
  decimales: number;
  scheme: ClassificationScheme | null;
}

export function DatasetComparison({
  dominio,
  refrescarToken,
}: {
  dominio: 'huevos' | 'generico';
  /** Cambia cuando se guarda o borra un conjunto, para recargar la lista. */
  refrescarToken?: number;
}) {
  const t = useTranslations('datasetComparison');
  // El generador del reporte necesita el traductor de la RAÍZ del catálogo y
  // el idioma activo: así el documento sale en el idioma elegido.
  const tRaiz = useTranslations();
  const locale = useLocale();
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
        const { listDatasets } = await import('@/lib/local-api');
        const datos = await listDatasets(dominio);
        if (!cancelado) setLista(datos);
      } catch { /* opcional */ }
    })();
    return () => { cancelado = true; };
  }, [dominio, refrescarToken]);

  const cargar = useCallback(async (id: string): Promise<Cargado | null> => {
    if (!id) return null;
    try {
      const { getDataset } = await import('@/lib/local-api');
      const d = await getDataset(id);
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
          error: t('pairedMismatch', { a: a.valores.length, b: b.valores.length }),
        };
      }
      return { dA, dB, test: pairedTTest(a.valores, b.valores, 'two-sided', 0.95), paired: true as const, error: null };
    }
    return { dA, dB, test: twoSampleTTest(a.valores, b.valores, 'two-sided', 0.95), paired: false as const, error: null };
  }, [a, b, design, t]);

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
      label: translateBinLabel(bin.label, tRaiz),
      pctA: bin.pct,
      pctB: cB.bins[i]?.pct ?? 0,
      nA: bin.count,
      nB: cB.bins[i]?.count ?? 0,
    }));
  }, [a, b, tRaiz]);

  const imprimir = () => {
    if (!a || !b || !resultado || !design || design === 'ns') return;
    const html = buildComparisonReportHtml({
      tituloModulo: tRaiz(dominio === 'huevos' ? 'nav.huevos.long' : 'nav.generico.long'),
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
    }, { locale, t: tRaiz });
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
          <GitCompare className="h-4 w-4" /> {t('title')}
        </h2>
        <p className="text-xs text-muted-foreground">{t('needTwo')}</p>
      </div>
    );
  }

  const u = a?.unidad ?? '';
  const dec = a?.decimales ?? 1;
  const f = (v: number, d = dec) => (Number.isFinite(v) ? v.toFixed(d) : '—');

  return (
    <div className="bg-card rounded-lg border shadow-sm p-3 sm:p-4 mb-4">
      <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
        <GitCompare className="h-4 w-4" /> {t('title')}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        {([['A', idA, setIdA, idB], ['B', idB, setIdB, idA]] as const).map(([etiqueta, valor, set, otro]) => (
          <div key={etiqueta} className="flex flex-col gap-1">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">{t('sampling', { etiqueta })}</Label>
            <Select value={valor} onValueChange={set}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder={t('selectPlaceholder')} /></SelectTrigger>
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
          {t('designQuestion')}
        </Label>
        <RadioGroup value={design} onValueChange={(v) => setDesign(v as Design)} className="flex flex-col gap-1.5">
          {DISEÑOS.map(({ v, label, desc }) => (
            <div key={v} className="flex items-start gap-1.5">
              <RadioGroupItem value={v} id={`dc-${v}`} className="mt-0.5" />
              <Label htmlFor={`dc-${v}`} className="text-xs cursor-pointer leading-snug">
                <b>{t(label)}{desc && ':'}</b> {desc && t(desc)}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {design === 'ns' && (
        <Alert className="border-blue-200 bg-blue-50 mb-3">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-[11px] text-blue-900 leading-snug">
            {t.rich('unsureHelp', { b: (c) => <b>{c}</b> })}
          </AlertDescription>
        </Alert>
      )}

      {resultado && (
        <>
          <div className="overflow-x-auto mb-3">
            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr className="border-b font-bold text-muted-foreground">
                  <th className="py-1 text-left">{t('colMetric')}</th>
                  <th className="py-1 text-right">A</th>
                  <th className="py-1 text-right">B</th>
                  <th className="py-1 text-right">{t('colDiff')}</th>
                </tr>
              </thead>
              <tbody>
                {([
                  [t('metricN'), String(resultado.dA.n), String(resultado.dB.n), '—'],
                  [t('metricMean'), f(resultado.dA.mean), f(resultado.dB.mean), f(resultado.dA.mean - resultado.dB.mean)],
                  [t('metricMedian'), f(resultado.dA.median), f(resultado.dB.median), f(resultado.dA.median - resultado.dB.median)],
                  [t('metricSd'), f(resultado.dA.sdSample), f(resultado.dB.sdSample), f(resultado.dA.sdSample - resultado.dB.sdSample)],
                  [t('metricCv'), f(resultado.dA.cv, 2), f(resultado.dB.cv, 2), f(resultado.dA.cv - resultado.dB.cv, 2)],
                  [t('metricMin'), f(resultado.dA.min), f(resultado.dB.min), '—'],
                  [t('metricMax'), f(resultado.dA.max), f(resultado.dB.max), '—'],
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
                {t('meansTitle')}
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
                {t('meansNote')}
              </p>
            </div>
          )}

          {categorias && a && b && (
            <div className="mb-3">
              <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">
                {t('categoriesTitle')}
              </div>
              <CategoriasBarChart categorias={categorias} nombreA={a.nombre} nombreB={b.nombre} />
            </div>
          )}

          {categorias && (
            <div className="overflow-x-auto mb-3">
              <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">
                {t('categoriesDetail')}
              </div>
              <table className="w-full text-[11px] border-collapse">
                <thead>
                  <tr className="border-b font-bold text-muted-foreground">
                    <th className="py-1 text-left">{t('colCategory')}</th>
                    <th className="py-1 text-right">{t('colAn')}</th>
                    <th className="py-1 text-right">{t('colApct')}</th>
                    <th className="py-1 text-right">{t('colBn')}</th>
                    <th className="py-1 text-right">{t('colBpct')}</th>
                    <th className="py-1 text-right">{t('colDelta')}</th>
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
                {t('deltaNote')}
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
                {t(resultado.paired ? 'pairedTest' : 'welchTest')}
              </div>
              <div className="tabular-nums">
                {t.rich('statsLine', {
                  t: resultado.test.t.toFixed(4),
                  gl: resultado.test.df.toFixed(resultado.paired ? 0 : 1),
                  p: fmtPFrase(resultado.test.pValue),
                  b: (c) => <b>{c}</b>,
                })}
              </div>
              <div className="tabular-nums">
                {t('meanDiff')} <b>{resultado.test.diff >= 0 ? '+' : ''}{f(resultado.test.diff)} {u}</b> ·{' '}
                {t('ci95')} <b>{f(resultado.test.ciLower)} – {f(resultado.test.ciUpper)} {u}</b>
                {Number.isFinite(resultado.test.cohenD) && <> · {t('cohenD')} <b>{resultado.test.cohenD.toFixed(2)}</b></>}
              </div>
              <p className="leading-snug">
                {t(resultado.test.rejectNull ? 'reject' : 'notReject', { p: fmtPFrase(resultado.test.pValue) })}
              </p>
              {design === 'repeticiones' && (
                <p className="text-amber-700 leading-snug">{t('repeatedWarning')}</p>
              )}
              {(resultado.dA.n < 30 || resultado.dB.n < 30) && (
                <p className="text-amber-700 leading-snug">{t('smallSample')}</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">{t('needVariability')}</p>
          )}

          <Button
            onClick={imprimir}
            className="w-full h-10 text-sm mt-3 bg-gray-800 hover:bg-gray-900 text-white"
          >
            <Printer className="h-4 w-4 mr-1.5" /> {t('print')}
          </Button>
        </>
      )}
    </div>
  );
}

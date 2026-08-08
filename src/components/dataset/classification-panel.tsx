'use client';

/**
 * Panel de clasificación por categorías (Fase 9).
 *
 * Sirve a cualquier dominio: muestra la distribución de frecuencias según el
 * esquema activo (norma USDA, banda relativa o cortes personalizados), con su
 * procedencia visible y un editor para adaptar los cortes.
 */

import { useState } from 'react';
import type { DatasetStore } from '@/lib/dataset-store';
import type { Domain } from '@/lib/domains/types';
import { findPreset } from '@/lib/domains/types';
import { validateBins, type Bin } from '@/lib/classification';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tags, ChevronDown, Info, AlertTriangle, Plus, Trash2 } from 'lucide-react';

const PALETA = ['#38bdf8', '#22c55e', '#84cc16', '#f59e0b', '#f97316', '#ef4444', '#a855f7', '#94a3b8'];

function fmtRango(bin: Bin, unidad: string, dec: number): string {
  const f = (v: number) => v.toFixed(dec);
  if (bin.min === null && bin.max === null) return 'todos los valores';
  if (bin.min === null) return `< ${f(bin.max!)} ${unidad}`;
  if (bin.max === null) return `≥ ${f(bin.min)} ${unidad}`;
  return `${f(bin.min)} – < ${f(bin.max)} ${unidad}`;
}

export function ClassificationPanel({ store, domain }: { store: DatasetStore; domain: Domain }) {
  const { valores, variable, presetId, scheme, clasificacion, setPreset, setScheme } = store();
  const [editorAbierto, setEditorAbierto] = useState(false);

  const preset = findPreset(domain, presetId);

  // Bins editables: solo tiene sentido para esquemas absolutos
  const binsEditables = scheme.type === 'absolute-bins' ? scheme.bins : null;
  // Sin useMemo a propósito: validar un puñado de categorías es trivial y la
  // memoización manual impedía al React Compiler optimizar el componente.
  const validacion = binsEditables
    ? validateBins(binsEditables)
    : { ok: true, errors: [] as string[] };

  const maxPct = Math.max(...clasificacion.bins.map((b) => b.pct), 1);

  const actualizarBin = (i: number, patch: Partial<Bin>) => {
    if (!binsEditables) return;
    const nuevos = binsEditables.map((b, j) => (j === i ? { ...b, ...patch } : b));
    setScheme({ type: 'absolute-bins', bins: nuevos });
  };

  const agregarBin = () => {
    if (!binsEditables) return;
    const ultimo = binsEditables[binsEditables.length - 1];
    const nuevoMin = ultimo?.max ?? 0;
    setScheme({
      type: 'absolute-bins',
      bins: [
        ...binsEditables,
        {
          label: `Categoría ${binsEditables.length + 1}`,
          min: nuevoMin,
          max: null,
          color: PALETA[binsEditables.length % PALETA.length],
        },
      ],
    });
  };

  const eliminarBin = (i: number) => {
    if (!binsEditables) return;
    setScheme({ type: 'absolute-bins', bins: binsEditables.filter((_, j) => j !== i) });
  };

  return (
    <div className="bg-card rounded-lg border shadow-sm p-3 sm:p-4 mb-4">
      <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
        <Tags className="h-4 w-4" /> Clasificación por categorías
      </h2>

      <div className="flex flex-col gap-1 mb-3">
        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Criterio</Label>
        <Select value={presetId} onValueChange={setPreset}>
          <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {domain.classificationPresets.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.label}{p.official ? ' — norma oficial' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {preset && (
        <Alert className={preset.official ? 'border-green-200 bg-green-50 mb-3' : 'border-blue-200 bg-blue-50 mb-3'}>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-[11px] leading-snug">
            <b>{preset.official ? 'Norma oficial.' : 'Criterio no normativo.'}</b> {preset.source}
            {preset.note && <div className="mt-1">{preset.note}</div>}
          </AlertDescription>
        </Alert>
      )}

      {valores.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-3">
          Registra valores para ver la distribución por categorías.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr className="border-b font-bold text-muted-foreground">
                <th className="py-1 text-left">Categoría</th>
                <th className="py-1 text-left">Rango</th>
                <th className="py-1 text-right">n</th>
                <th className="py-1 text-right pr-3">%</th>
                <th className="py-1 text-left w-24 pl-1">Distribución</th>
              </tr>
            </thead>
            <tbody>
              {clasificacion.bins.map((b, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-1.5 font-semibold">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-sm mr-1.5 align-middle"
                      style={{ backgroundColor: b.color ?? PALETA[i % PALETA.length] }}
                      aria-hidden="true"
                    />
                    {b.label}
                  </td>
                  <td className="py-1.5 text-muted-foreground tabular-nums">
                    {fmtRango(clasificacion.effectiveBins[i], variable.unit, variable.decimals)}
                  </td>
                  <td className="py-1.5 text-right tabular-nums font-semibold">{b.count}</td>
                  <td className="py-1.5 text-right tabular-nums pr-3">{b.pct.toFixed(1)}</td>
                  <td className="py-1.5 pl-1">
                    <div className="bg-muted rounded-sm h-3 w-full overflow-hidden" role="img"
                      aria-label={`${b.label}: ${b.pct.toFixed(1)} por ciento`}>
                      <div
                        className="h-full rounded-sm"
                        style={{
                          width: `${(b.pct / maxPct) * 100}%`,
                          backgroundColor: b.color ?? PALETA[i % PALETA.length],
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {clasificacion.unclassified > 0 && (
                <tr className="border-b border-border/50 text-amber-700">
                  <td className="py-1.5 font-semibold">Sin clasificar</td>
                  <td className="py-1.5">fuera de todas las categorías</td>
                  <td className="py-1.5 text-right tabular-nums font-semibold">{clasificacion.unclassified}</td>
                  <td className="py-1.5 text-right tabular-nums pr-3">
                    {((clasificacion.unclassified / clasificacion.n) * 100).toFixed(1)}
                  </td>
                  <td />
                </tr>
              )}
            </tbody>
          </table>

          {clasificacion.modeLabel && (
            <p className="text-[11px] text-muted-foreground mt-2 leading-snug">
              Categoría predominante: <b>{clasificacion.modeLabel}</b>.
              {clasificacion.unclassified > 0 && (
                <> Hay <b>{clasificacion.unclassified}</b> valor(es) fuera de todas las categorías —
                revisa si son correctos o si el criterio necesita ajustarse.</>
              )}
            </p>
          )}
        </div>
      )}

      {binsEditables && (
        <Collapsible open={editorAbierto} onOpenChange={setEditorAbierto} className="mt-3">
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full h-9 text-xs font-semibold border-dashed">
              Editar los cortes de las categorías
              <ChevronDown className={`h-3.5 w-3.5 ml-2 transition-transform ${editorAbierto ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 space-y-2">
            <p className="text-[10px] text-muted-foreground leading-snug">
              Cada categoría incluye su límite inferior y excluye el superior. Deja un límite vacío
              para dejarlo abierto (sin tope). Al editar, el criterio deja de coincidir con la norma
              seleccionada.
            </p>
            {binsEditables.map((b, i) => (
              <div key={i} className="flex gap-1.5 items-center">
                <Input
                  value={b.label}
                  onChange={(e) => actualizarBin(i, { label: e.target.value })}
                  className="h-8 text-[11px] flex-1"
                  aria-label={`Nombre de la categoría ${i + 1}`}
                />
                <Input
                  type="number"
                  value={b.min ?? ''}
                  placeholder="mín"
                  onChange={(e) => actualizarBin(i, { min: e.target.value === '' ? null : parseFloat(e.target.value) })}
                  className="h-8 text-[11px] w-20"
                  aria-label={`Límite inferior de ${b.label}`}
                />
                <Input
                  type="number"
                  value={b.max ?? ''}
                  placeholder="máx"
                  onChange={(e) => actualizarBin(i, { max: e.target.value === '' ? null : parseFloat(e.target.value) })}
                  className="h-8 text-[11px] w-20"
                  aria-label={`Límite superior de ${b.label}`}
                />
                <button
                  onClick={() => eliminarBin(i)}
                  className="text-red-400 hover:text-red-600 px-1"
                  aria-label={`Eliminar la categoría ${b.label}`}
                  title="Eliminar categoría"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <Button variant="outline" onClick={agregarBin} className="w-full h-8 text-xs">
              <Plus className="h-3.5 w-3.5 mr-1" /> Añadir categoría
            </Button>
            {!validacion.ok && (
              <Alert className="border-amber-300 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-[11px] text-amber-900 space-y-0.5">
                  {validacion.errors.map((e, i) => <div key={i}>• {e}</div>)}
                </AlertDescription>
              </Alert>
            )}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

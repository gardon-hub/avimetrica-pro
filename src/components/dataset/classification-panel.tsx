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
import { translateBinLabel } from '@/lib/domains/preset-i18n';
import { validateBins, type Bin, type BinIssue } from '@/lib/classification';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tags, ChevronDown, Info, AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

const PALETA = ['#38bdf8', '#22c55e', '#84cc16', '#f59e0b', '#f97316', '#ef4444', '#a855f7', '#94a3b8'];

function fmtRango(bin: Bin, unidad: string, dec: number, todos: string): string {
  const f = (v: number) => v.toFixed(dec);
  if (bin.min === null && bin.max === null) return todos;
  if (bin.min === null) return `< ${f(bin.max!)} ${unidad}`;
  if (bin.max === null) return `≥ ${f(bin.min)} ${unidad}`;
  return `${f(bin.min)} – < ${f(bin.max)} ${unidad}`;
}

export function ClassificationPanel({ store, domain }: { store: DatasetStore; domain: Domain }) {
  const { valores, variable, presetId, scheme, clasificacion, setPreset, setScheme } = store();
  const t = useTranslations('classification');
  const tPresets = useTranslations('presets');
  const tRaiz = useTranslations();
  const [editorAbierto, setEditorAbierto] = useState(false);

  const preset = findPreset(domain, presetId);
  const tBin = (label: string) => translateBinLabel(label, tRaiz);

  // Bins editables: solo tiene sentido para esquemas absolutos
  const binsEditables = scheme.type === 'absolute-bins' ? scheme.bins : null;
  // Sin useMemo a propósito: validar un puñado de categorías es trivial y la
  // memoización manual impedía al React Compiler optimizar el componente.
  const validacion = binsEditables
    ? validateBins(binsEditables)
    : { ok: true, issues: [] as BinIssue[] };

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
          label: t('newBinLabel', { n: binsEditables.length + 1 }),
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
        <Tags className="h-4 w-4" /> {t('title')}
      </h2>

      <div className="flex flex-col gap-1 mb-3">
        <Label className="text-[10px] uppercase font-bold text-muted-foreground">{t('criterion')}</Label>
        <Select value={presetId} onValueChange={setPreset}>
          <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {domain.classificationPresets.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.official
                  ? t('officialSuffix', { label: tPresets(`${domain.id}.${p.id}.label`) })
                  : tPresets(`${domain.id}.${p.id}.label`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {preset && (
        <Alert className={preset.official ? 'border-green-200 bg-green-50 mb-3' : 'border-blue-200 bg-blue-50 mb-3'}>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-[11px] leading-snug">
            <b>{t(preset.official ? 'officialLabel' : 'nonNormativeLabel')}</b>{' '}
            {tPresets(`${domain.id}.${preset.id}.source`)}
            {preset.note && <div className="mt-1">{tPresets(`${domain.id}.${preset.id}.note`)}</div>}
          </AlertDescription>
        </Alert>
      )}

      {valores.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-3">{t('empty')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr className="border-b font-bold text-muted-foreground">
                <th className="py-1 text-left">{t('colCategory')}</th>
                <th className="py-1 text-left">{t('colRange')}</th>
                <th className="py-1 text-right">{t('colN')}</th>
                <th className="py-1 text-right pr-3">{t('colPct')}</th>
                <th className="py-1 text-left w-24 pl-1">{t('colDistribution')}</th>
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
                    {tBin(b.label)}
                  </td>
                  <td className="py-1.5 text-muted-foreground tabular-nums">
                    {fmtRango(clasificacion.effectiveBins[i], variable.unit, variable.decimals, t('allValues'))}
                  </td>
                  <td className="py-1.5 text-right tabular-nums font-semibold">{b.count}</td>
                  <td className="py-1.5 text-right tabular-nums pr-3">{b.pct.toFixed(1)}</td>
                  <td className="py-1.5 pl-1">
                    <div className="bg-muted rounded-sm h-3 w-full overflow-hidden" role="img"
                      aria-label={t('barAria', { categoria: tBin(b.label), pct: b.pct.toFixed(1) })}>
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
                  <td className="py-1.5 font-semibold">{t('unclassified')}</td>
                  <td className="py-1.5">{t('unclassifiedRange')}</td>
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
              {t.rich('predominant', { categoria: tBin(clasificacion.modeLabel), b: (c) => <b>{c}</b> })}
              {clasificacion.unclassified > 0 && (
                <>{' '}{t.rich('predominantWithUnclassified', {
                  n: clasificacion.unclassified,
                  b: (c) => <b>{c}</b>,
                })}</>
              )}
            </p>
          )}
        </div>
      )}

      {binsEditables && (
        <Collapsible open={editorAbierto} onOpenChange={setEditorAbierto} className="mt-3">
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full h-9 text-xs font-semibold border-dashed">
              {t('editCuts')}
              <ChevronDown className={`h-3.5 w-3.5 ml-2 transition-transform ${editorAbierto ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 space-y-2">
            <p className="text-[10px] text-muted-foreground leading-snug">{t('editHelp')}</p>
            {binsEditables.map((b, i) => (
              <div key={i} className="flex gap-1.5 items-center">
                <Input
                  value={b.label}
                  onChange={(e) => actualizarBin(i, { label: e.target.value })}
                  className="h-8 text-[11px] flex-1"
                  aria-label={t('binName', { n: i + 1 })}
                />
                <Input
                  type="number"
                  value={b.min ?? ''}
                  placeholder={t('minPlaceholder')}
                  onChange={(e) => actualizarBin(i, { min: e.target.value === '' ? null : parseFloat(e.target.value) })}
                  className="h-8 text-[11px] w-20"
                  aria-label={t('lowerBound', { categoria: b.label })}
                />
                <Input
                  type="number"
                  value={b.max ?? ''}
                  placeholder={t('maxPlaceholder')}
                  onChange={(e) => actualizarBin(i, { max: e.target.value === '' ? null : parseFloat(e.target.value) })}
                  className="h-8 text-[11px] w-20"
                  aria-label={t('upperBound', { categoria: b.label })}
                />
                <button
                  onClick={() => eliminarBin(i)}
                  className="text-red-400 hover:text-red-600 px-1"
                  aria-label={t('deleteBin', { categoria: b.label })}
                  title={t('deleteBinTitle')}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <Button variant="outline" onClick={agregarBin} className="w-full h-8 text-xs">
              <Plus className="h-3.5 w-3.5 mr-1" /> {t('addBin')}
            </Button>
            {!validacion.ok && (
              <Alert className="border-amber-300 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-[11px] text-amber-900 space-y-0.5">
                  {validacion.issues.map((issue, i) => (
                    <div key={i}>
                      {t(
                        {
                          empty: 'issueEmpty',
                          unnamed: 'issueUnnamed',
                          inverted: 'issueInverted',
                          duplicated: 'issueDuplicated',
                          overlap: 'issueOverlap',
                        }[issue.code],
                        issue.params,
                      )}
                    </div>
                  ))}
                </AlertDescription>
              </Alert>
            )}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

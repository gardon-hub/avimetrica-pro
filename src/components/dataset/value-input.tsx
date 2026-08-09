'use client';

/**
 * Captura de valores para cualquier dominio (Fase 9): ingreso individual
 * rápido, pegado masivo y lista editable. Reutiliza la validación de rango
 * plausible declarada por el dominio para ADVERTIR, nunca para bloquear.
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { DatasetStore } from '@/lib/dataset-store';
import type { Domain } from '@/lib/domains/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { Plus, ClipboardPaste, ChevronDown, Trash2, AlertTriangle, RotateCcw } from 'lucide-react';

function parseNumeros(texto: string): number[] {
  return texto
    .split(/[\s,;\t\n\r]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => parseFloat(t.includes('.') ? t : t.replace(',', '.')))
    .filter((v) => Number.isFinite(v));
}

export function ValueInput({ store, domain }: { store: DatasetStore; domain: Domain }) {
  const { valores, variable, addValor, addValores, removeValor, updateValor, reset } = store();
  const t = useTranslations('valueInput');
  const [entrada, setEntrada] = useState('');
  const [pegado, setPegado] = useState('');
  const [pegadoAbierto, setPegadoAbierto] = useState(false);

  const fueraDeRango = (v: number) =>
    (variable.plausibleMin !== undefined && v < variable.plausibleMin) ||
    (variable.plausibleMax !== undefined && v > variable.plausibleMax);

  const agregar = () => {
    const v = parseFloat(entrada.replace(',', '.'));
    if (!Number.isFinite(v)) {
      toast({ title: t('invalidTitle'), description: t('invalidBody'), variant: 'destructive' });
      return;
    }
    addValor(v);
    setEntrada('');
  };

  const previewPegado = parseNumeros(pegado);
  const sospechososPegado = previewPegado.filter(fueraDeRango);

  const importarPegado = () => {
    if (previewPegado.length === 0) return;
    addValores(previewPegado);
    toast({ title: t('added', { n: previewPegado.length }) });
    setPegado('');
    setPegadoAbierto(false);
  };

  const sospechosos = valores.filter(fueraDeRango).length;

  return (
    <div className="bg-card rounded-lg border shadow-sm p-3 sm:p-4 mb-4">
      <div className="flex gap-2 mb-3">
        <Input
          type="number"
          inputMode="decimal"
          value={entrada}
          onChange={(e) => setEntrada(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && agregar()}
          placeholder={t('placeholder', { variable: variable.label, unidad: variable.unit || t('unitsFallback') })}
          className="h-11 text-base"
          aria-label={t('placeholder', { variable: variable.label, unidad: variable.unit || t('unitsFallback') })}
        />
        <Button onClick={agregar} aria-label={t('addAria')} className="h-11 px-5 bg-green-600 hover:bg-green-700 text-white shrink-0">
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      <Collapsible open={pegadoAbierto} onOpenChange={setPegadoAbierto} className="mb-3">
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full h-10 text-sm font-semibold border-dashed">
            <ClipboardPaste className="h-4 w-4 mr-2" />
            {t('bulkTrigger')}
            <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${pegadoAbierto ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 space-y-2">
          <Textarea
            value={pegado}
            onChange={(e) => setPegado(e.target.value)}
            placeholder={t('bulkPlaceholder')}
            className="min-h-24 text-sm font-mono"
            aria-label={t('bulkTrigger')}
          />
          {pegado && (
            <div className="text-xs bg-muted/50 rounded-md p-2 space-y-0.5">
              <div>{t.rich('detected', { n: previewPegado.length, b: (c) => <b>{c}</b> })}</div>
              {sospechososPegado.length > 0 && (
                <div className="text-amber-700">
                  {t('outOfRange', {
                    n: sospechososPegado.length,
                    min: variable.plausibleMin ?? '',
                    max: variable.plausibleMax ?? '',
                    unidad: variable.unit,
                  })}
                </div>
              )}
            </div>
          )}
          <Button
            onClick={importarPegado}
            disabled={previewPegado.length === 0}
            className="w-full h-10 bg-green-600 hover:bg-green-700 text-white font-bold"
          >
            {t('addValues', { n: previewPegado.length })}
          </Button>
        </CollapsibleContent>
      </Collapsible>

      {valores.length > 0 && (
        <>
          {sospechosos > 0 && (
            <Alert className="border-amber-300 bg-amber-50 mb-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-[11px] text-amber-900">
                {t('suspicious', {
                  n: sospechosos,
                  variable: variable.label.toLowerCase(),
                  min: variable.plausibleMin ?? '',
                  max: variable.plausibleMax ?? '',
                  unidad: variable.unit,
                })}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">
              {t('registered', { n: valores.length })}
            </span>
            <Button
              variant="ghost"
              onClick={() => reset()}
              className="h-7 text-[11px] text-red-500 hover:text-red-700"
            >
              <RotateCcw className="h-3 w-3 mr-1" /> {t('clear')}
            </Button>
          </div>

          <div className="max-h-56 overflow-y-auto border rounded-md divide-y">
            {valores.map((v, i) => (
              <div key={i} className={`flex items-center gap-2 px-2 py-1 ${fueraDeRango(v) ? 'bg-amber-50' : ''}`}>
                <span className="text-[10px] text-muted-foreground w-8 shrink-0">#{i + 1}</span>
                <Input
                  type="number"
                  value={v}
                  onChange={(e) => updateValor(i, parseFloat(e.target.value) || 0)}
                  className="h-7 text-xs flex-1"
                  aria-label={t('valueAria', { n: i + 1 })}
                />
                <span className="text-[10px] text-muted-foreground shrink-0">{variable.unit}</span>
                <button
                  onClick={() => removeValor(i)}
                  className="text-red-300 hover:text-red-600 shrink-0 flex items-center justify-center pointer-coarse:min-h-11 pointer-coarse:min-w-11"
                  aria-label={t('deleteAria', { n: i + 1 })}
                >
                  <Trash2 className="h-3.5 w-3.5 pointer-coarse:h-5 pointer-coarse:w-5" />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

'use client';

/**
 * Captura de valores para cualquier dominio (Fase 9): ingreso individual
 * rápido, pegado masivo y lista editable. Reutiliza la validación de rango
 * plausible declarada por el dominio para ADVERTIR, nunca para bloquear.
 */

import { useState } from 'react';
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
  const [entrada, setEntrada] = useState('');
  const [pegado, setPegado] = useState('');
  const [pegadoAbierto, setPegadoAbierto] = useState(false);

  const fueraDeRango = (v: number) =>
    (variable.plausibleMin !== undefined && v < variable.plausibleMin) ||
    (variable.plausibleMax !== undefined && v > variable.plausibleMax);

  const agregar = () => {
    const v = parseFloat(entrada.replace(',', '.'));
    if (!Number.isFinite(v)) {
      toast({ title: 'Valor no válido', description: 'Escribe un número.', variant: 'destructive' });
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
    toast({ title: `${previewPegado.length} valores agregados` });
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
          placeholder={`${variable.label} en ${variable.unit || 'unidades'}`}
          className="h-11 text-base"
          aria-label={`${variable.label} en ${variable.unit || 'unidades'}`}
        />
        <Button onClick={agregar} className="h-11 px-5 bg-green-600 hover:bg-green-700 text-white shrink-0">
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      <Collapsible open={pegadoAbierto} onOpenChange={setPegadoAbierto} className="mb-3">
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full h-10 text-sm font-semibold border-dashed">
            <ClipboardPaste className="h-4 w-4 mr-2" />
            Pegado masivo (Excel / lista de texto)
            <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${pegadoAbierto ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 space-y-2">
          <Textarea
            value={pegado}
            onChange={(e) => setPegado(e.target.value)}
            placeholder="Pega aquí una columna de Excel o una lista separada por comas, espacios o saltos de línea."
            className="min-h-24 text-sm font-mono"
            aria-label="Valores para pegado masivo"
          />
          {pegado && (
            <div className="text-xs bg-muted/50 rounded-md p-2 space-y-0.5">
              <div>✅ <b>{previewPegado.length}</b> valores detectados</div>
              {sospechososPegado.length > 0 && (
                <div className="text-amber-700">
                  ⚠️ {sospechososPegado.length} fuera del rango plausible
                  ({variable.plausibleMin}–{variable.plausibleMax} {variable.unit}): revisa unidad y digitación.
                </div>
              )}
            </div>
          )}
          <Button
            onClick={importarPegado}
            disabled={previewPegado.length === 0}
            className="w-full h-10 bg-green-600 hover:bg-green-700 text-white font-bold"
          >
            Agregar {previewPegado.length} valores
          </Button>
        </CollapsibleContent>
      </Collapsible>

      {valores.length > 0 && (
        <>
          {sospechosos > 0 && (
            <Alert className="border-amber-300 bg-amber-50 mb-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-[11px] text-amber-900">
                {sospechosos} valor(es) fuera del rango plausible para {variable.label.toLowerCase()}
                ({variable.plausibleMin}–{variable.plausibleMax} {variable.unit}). No se bloquean: verifica si son
                reales o errores de digitación.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">
              {valores.length} valores registrados
            </span>
            <Button
              variant="ghost"
              onClick={() => reset()}
              className="h-7 text-[11px] text-red-500 hover:text-red-700"
            >
              <RotateCcw className="h-3 w-3 mr-1" /> Limpiar
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
                  aria-label={`Valor ${i + 1}`}
                />
                <span className="text-[10px] text-muted-foreground shrink-0">{variable.unit}</span>
                <button
                  onClick={() => removeValor(i)}
                  className="text-red-300 hover:text-red-600 shrink-0"
                  aria-label={`Eliminar el valor ${i + 1}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

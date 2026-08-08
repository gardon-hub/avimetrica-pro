'use client';

/**
 * Pegado masivo de pesos desde Excel, CSV o texto libre, con validación
 * previa: muestra qué se importará y qué se descartó antes de confirmar.
 * Soporta unidades g/kg/lb (se convierte todo a gramos) y coma decimal.
 */

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useUniformidadStore } from '@/lib/store';
import { toGrams, WeightUnit, GRAMS_PER } from '@/lib/units';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ClipboardPaste, ChevronDown } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ParseResult {
  valid: number[]; // en gramos
  invalid: string[];
  suspicious: number[]; // en gramos, fuera de [10, 8000]
}

function parseWeights(text: string, unit: WeightUnit): ParseResult {
  const tokens = text
    .split(/[\s,;\t\n\r]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  const valid: number[] = [];
  const invalid: string[] = [];
  const suspicious: number[] = [];
  for (const tok of tokens) {
    // Coma decimal solo si no hay punto (formato "1.234,5" no soportado a propósito:
    // se separa por comas arriba; "1450,5" llega como "1450" y "5" → mejor avisar)
    const normalized = tok.includes('.') ? tok : tok.replace(',', '.');
    const v = parseFloat(normalized);
    if (!Number.isFinite(v) || v <= 0) {
      invalid.push(tok);
      continue;
    }
    const grams = toGrams(v, unit);
    if (grams < 10 || grams > 8000) suspicious.push(grams);
    valid.push(grams);
  }
  return { valid, invalid, suspicious };
}

export function BulkImport() {
  const { addPesos } = useUniformidadStore();
  const t = useTranslations('bulkImport');
  const tUnidades = useTranslations('units');
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [unit, setUnit] = useState<WeightUnit>('g');

  const preview = useMemo(() => (text.trim() ? parseWeights(text, unit) : null), [text, unit]);

  const handleImport = () => {
    if (!preview || preview.valid.length === 0) return;
    addPesos(preview.valid.map((v) => Math.round(v * 10) / 10));
    toast({
      title: t('toastTitle', { n: preview.valid.length }),
      description:
        preview.invalid.length > 0
          ? t('toastSomeInvalid', { n: preview.invalid.length })
          : t('toastAllValid'),
    });
    setText('');
    setOpen(false);
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mb-4">
      <CollapsibleTrigger asChild>
        <Button variant="outline" className="w-full h-10 text-sm font-semibold border-dashed">
          <ClipboardPaste className="h-4 w-4 mr-2" />
          {t('trigger')}
          <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${open ? 'rotate-180' : ''}`} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3 space-y-3">
        <div className="flex flex-col gap-1">
          <Label className="text-[10px] uppercase font-bold text-muted-foreground">{t('unitLabel')}</Label>
          <Select value={unit} onValueChange={(v) => setUnit(v as WeightUnit)}>
            <SelectTrigger className="h-9 w-56 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(GRAMS_PER) as WeightUnit[]).map((u) => (
                <SelectItem key={u} value={u}>{tUnidades(u)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('placeholder')}
          className="min-h-28 text-sm font-mono"
        />
        {preview && (
          <div className="text-xs bg-muted/50 rounded-md p-2.5 space-y-1">
            <div>
              ✅ {t.rich('valid', { n: preview.valid.length, b: (c) => <b>{c}</b> })}
              {preview.valid.length > 0 && unit !== 'g' && <> {t('willConvert')}</>}
            </div>
            {preview.invalid.length > 0 && (
              <div className="text-red-700">
                ❌ {t('discarded', {
                  n: preview.invalid.length,
                  list: preview.invalid.slice(0, 8).join(', ') + (preview.invalid.length > 8 ? '…' : ''),
                })}
              </div>
            )}
            {preview.suspicious.length > 0 && (
              <div className="text-amber-700">
                ⚠️ {t('suspicious', {
                  n: preview.suspicious.length,
                  list: preview.suspicious.slice(0, 5).map((v) => v.toFixed(0)).join(', ') + (preview.suspicious.length > 5 ? '…' : ''),
                })}
              </div>
            )}
          </div>
        )}
        <Button
          onClick={handleImport}
          disabled={!preview || preview.valid.length === 0}
          className="w-full h-10 bg-green-600 hover:bg-green-700 text-white font-bold"
        >
          {t('import', { n: preview?.valid.length ?? 0 })}
        </Button>
      </CollapsibleContent>
    </Collapsible>
  );
}

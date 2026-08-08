'use client';

/**
 * Importación de pesos desde archivo CSV o XLSX (Fase 5).
 * - CSV/TXT: se parsea como texto (mismos separadores que el pegado masivo).
 * - XLSX: se lee la primera hoja, se listan las columnas con datos numéricos
 *   y el usuario elige cuál contiene los pesos. Validación previa siempre.
 */

import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { useUniformidadStore } from '@/lib/store';
import { useTranslations } from 'next-intl';
import { toGrams, WeightUnit, GRAMS_PER } from '@/lib/units';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { FileSpreadsheet, ChevronDown } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ColumnCandidate {
  index: number;
  header: string;
  numericCount: number;
  sample: number[];
}

interface FileState {
  filename: string;
  columns: ColumnCandidate[]; // vacío para CSV plano
  values: number[]; // valores de la columna elegida o del CSV
  rows: unknown[][]; // solo XLSX
}

function extractColumn(rows: unknown[][], colIndex: number): number[] {
  const out: number[] = [];
  for (const row of rows) {
    const cell = row[colIndex];
    if (typeof cell === 'number' && Number.isFinite(cell) && cell > 0) {
      out.push(cell);
    } else if (typeof cell === 'string') {
      const v = parseFloat(cell.replace(',', '.'));
      if (Number.isFinite(v) && v > 0) out.push(v);
    }
  }
  return out;
}

function parseTextNumbers(text: string): number[] {
  return text
    .split(/[\s,;\t\n\r]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => parseFloat(t.includes('.') ? t : t.replace(',', '.')))
    .filter((v) => Number.isFinite(v) && v > 0);
}

export function FileImport() {
  const { addPesos } = useUniformidadStore();
  const t = useTranslations('fileImport');
  const tUnidades = useTranslations('units');
  const [open, setOpen] = useState(false);
  const [unit, setUnit] = useState<WeightUnit>('g');
  const [file, setFile] = useState<FileState | null>(null);
  const [selectedCol, setSelectedCol] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (f: File) => {
    try {
      const isSheet = /\.(xlsx|xls)$/i.test(f.name);
      if (isSheet) {
        const buf = await f.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 }) as unknown[][];
        if (rows.length === 0) {
          toast({ title: t('noDataTitle'), description: t('noDataBody'), variant: 'destructive' });
          return;
        }
        // Detectar columnas candidatas (con ≥2 valores numéricos)
        const maxCols = Math.max(...rows.map((r) => r.length));
        const headerRow = rows[0];
        const candidates: ColumnCandidate[] = [];
        for (let c = 0; c < maxCols; c++) {
          const body = extractColumn(rows.slice(1), c);
          const withHeader = extractColumn(rows, c);
          // Si la primera fila es texto, es encabezado; si es número, cuenta como dato
          const headerCell = headerRow?.[c];
          const isHeaderText = typeof headerCell === 'string' && headerCell.trim() !== '';
          const values = isHeaderText ? body : withHeader;
          if (values.length >= 2) {
            candidates.push({
              index: c,
              header: isHeaderText
                ? String(headerCell)
                : t('genericColumn', { letra: XLSX.utils.encode_col(c) }),
              numericCount: values.length,
              sample: values.slice(0, 4),
            });
          }
        }
        if (candidates.length === 0) {
          toast({ title: t('noNumericTitle'), description: t('noNumericBody'), variant: 'destructive' });
          return;
        }
        // Preseleccionar: primero por encabezado tipo "peso", luego por cantidad de datos
        const byHeader = candidates.find((c) => /peso|weight|gramos|grams|\bkg\b|\blb\b/i.test(c.header));
        const best = byHeader ?? candidates.reduce((a, b) => (b.numericCount > a.numericCount ? b : a));
        setFile({ filename: f.name, columns: candidates, values: [], rows });
        setSelectedCol(String(best.index));
      } else {
        const text = await f.text();
        const values = parseTextNumbers(text);
        if (values.length === 0) {
          toast({ title: t('noDataTitle'), description: t('noDataBody'), variant: 'destructive' });
          return;
        }
        setFile({ filename: f.name, columns: [], values, rows: [] });
        setSelectedCol('');
      }
    } catch (err) {
      console.error(err);
      toast({ title: t('readError'), variant: 'destructive' });
    }
  };

  const currentValues: number[] = file
    ? file.columns.length > 0
      ? (() => {
          const col = file.columns.find((c) => String(c.index) === selectedCol);
          if (!col) return [];
          const headerCell = file.rows[0]?.[col.index];
          const skipHeader = typeof headerCell === 'string' && headerCell.trim() !== '';
          return extractColumn(skipHeader ? file.rows.slice(1) : file.rows, col.index);
        })()
      : file.values
    : [];

  const grams = currentValues.map((v) => toGrams(v, unit));
  const suspicious = grams.filter((g) => g < 10 || g > 8000);

  const handleImport = () => {
    if (grams.length === 0) return;
    addPesos(grams.map((v) => Math.round(v * 10) / 10));
    toast({
      title: t('toastTitle', { n: grams.length }),
      description: t('importedFrom', { archivo: file?.filename ?? '' }),
    });
    setFile(null);
    setSelectedCol('');
    if (inputRef.current) inputRef.current.value = '';
    setOpen(false);
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mb-4">
      <CollapsibleTrigger asChild>
        <Button variant="outline" className="w-full h-10 text-sm font-semibold border-dashed">
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          {t('trigger')}
          <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${open ? 'rotate-180' : ''}`} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">{t('file')}</Label>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.txt,.xlsx,.xls"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
              className="text-xs file:mr-2 file:rounded-md file:border-0 file:bg-green-600 file:text-white file:px-3 file:py-1.5 file:text-xs file:font-semibold hover:file:bg-green-700"
              aria-label={t('filePicker')}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">{t('unitLabel')}</Label>
            <Select value={unit} onValueChange={(v) => setUnit(v as WeightUnit)}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(GRAMS_PER) as WeightUnit[]).map((u) => (
                  <SelectItem key={u} value={u}>{tUnidades(u)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {file && file.columns.length > 0 && (
          <div className="flex flex-col gap-1">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">{t('column')}</Label>
            <Select value={selectedCol} onValueChange={setSelectedCol}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {file.columns.map((c) => (
                  <SelectItem key={c.index} value={String(c.index)}>
                    {t('columnOption', {
                      header: c.header,
                      n: c.numericCount,
                      sample: c.sample.map((s) => s.toFixed(0)).join(', '),
                    })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {file && (
          <div className="text-xs bg-muted/50 rounded-md p-2.5 space-y-1">
            <div>📄 {file.filename}</div>
            <div>
              ✅ {t.rich('ready', { n: grams.length, b: (c) => <b>{c}</b> })}
              {unit !== 'g' && ` ${t('willConvert')}`}
            </div>
            {suspicious.length > 0 && (
              <div className="text-amber-700">
                ⚠️ {t('suspicious', { n: suspicious.length })}
              </div>
            )}
          </div>
        )}

        <Button
          onClick={handleImport}
          disabled={grams.length === 0}
          className="w-full h-10 bg-green-600 hover:bg-green-700 text-white font-bold"
        >
          {t('import', { n: grams.length })}
        </Button>
      </CollapsibleContent>
    </Collapsible>
  );
}

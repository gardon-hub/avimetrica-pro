'use client';

/**
 * Definición de la variable en el Modo Estadística (Fase 10).
 * A diferencia de aves y huevos —donde la variable es fija— aquí la declara
 * el usuario: nombre, unidad y decimales de presentación.
 */

import type { DatasetStore } from '@/lib/dataset-store';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Ruler } from 'lucide-react';

const EJEMPLOS = [
  { label: 'Peso del huevo', unit: 'g', decimals: 1 },
  { label: 'Estatura', unit: 'cm', decimals: 1 },
  { label: 'Consumo de alimento', unit: 'g/ave/día', decimals: 1 },
  { label: 'Temperatura', unit: '°C', decimals: 1 },
  { label: 'Calificación', unit: 'puntos', decimals: 1 },
];

export function VariableForm({ store }: { store: DatasetStore }) {
  const { variable, setVariable } = store();

  return (
    <div className="bg-card rounded-lg border shadow-sm p-3 sm:p-4 mb-4">
      <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
        <Ruler className="h-4 w-4" /> Variable en estudio
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex flex-col gap-1 sm:col-span-2">
          <Label className="text-[10px] uppercase font-bold text-muted-foreground">Nombre de la variable</Label>
          <Input
            value={variable.label}
            onChange={(e) => setVariable({ label: e.target.value })}
            placeholder="Ej: Estatura, Consumo de alimento…"
            className="h-9 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-[10px] uppercase font-bold text-muted-foreground">Unidad</Label>
          <Input
            value={variable.unit}
            onChange={(e) => setVariable({ unit: e.target.value })}
            placeholder="g, cm, °C…"
            className="h-9 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-[10px] uppercase font-bold text-muted-foreground">Decimales</Label>
          <Select
            value={String(variable.decimals)}
            onValueChange={(v) => setVariable({ decimals: parseInt(v, 10) })}
          >
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[0, 1, 2, 3].map((d) => <SelectItem key={d} value={String(d)}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <span className="text-[10px] text-muted-foreground self-center">Ejemplos:</span>
        {EJEMPLOS.map((e) => (
          <button
            key={e.label}
            onClick={() => setVariable(e)}
            className="text-[10px] px-2 py-0.5 rounded-full border border-border hover:bg-muted transition-colors pointer-coarse:min-h-11 pointer-coarse:px-3 pointer-coarse:text-xs"
          >
            {e.label} ({e.unit})
          </button>
        ))}
      </div>

      <p className="text-[10px] text-muted-foreground mt-2 leading-snug">
        Los decimales afectan solo a la presentación: los cálculos se hacen siempre con precisión completa
        y se redondean únicamente al mostrarse.
      </p>
    </div>
  );
}

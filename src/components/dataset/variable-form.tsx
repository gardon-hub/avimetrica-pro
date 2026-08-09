'use client';

/**
 * Definición de la variable en el Modo Estadística (Fase 10).
 * A diferencia de aves y huevos —donde la variable es fija— aquí la declara
 * el usuario: nombre, unidad y decimales de presentación.
 */

import { useTranslations } from 'next-intl';
import type { DatasetStore } from '@/lib/dataset-store';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Ruler } from 'lucide-react';

/** Los ejemplos son texto de interfaz: nombre y unidad se traducen. */
const EJEMPLOS = [
  { nombre: 'exampleEggWeight', unidad: 'g', decimals: 1 },
  { nombre: 'exampleHeight', unidad: 'cm', decimals: 1 },
  { nombre: 'exampleFeed', unidad: 'unitFeed', decimals: 1 },
  { nombre: 'exampleTemperature', unidad: '°C', decimals: 1 },
  { nombre: 'exampleScore', unidad: 'unitPoints', decimals: 1 },
] as const;

export function VariableForm({ store }: { store: DatasetStore }) {
  const { variable, setVariable } = store();
  const t = useTranslations('variableForm');

  return (
    <div className="bg-card rounded-lg border shadow-sm p-3 sm:p-4 mb-4">
      <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
        <Ruler className="h-4 w-4" /> {t('title')}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex flex-col gap-1 sm:col-span-2">
          <Label className="text-[10px] uppercase font-bold text-muted-foreground">{t('name')}</Label>
          <Input
            value={variable.label}
            onChange={(e) => setVariable({ label: e.target.value })}
            placeholder={t('namePlaceholder')}
            className="h-9 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-[10px] uppercase font-bold text-muted-foreground">{t('unit')}</Label>
          <Input
            value={variable.unit}
            onChange={(e) => setVariable({ unit: e.target.value })}
            placeholder={t('unitPlaceholder')}
            className="h-9 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-[10px] uppercase font-bold text-muted-foreground">{t('decimals')}</Label>
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
        <span className="text-[10px] text-muted-foreground self-center">{t('examples')}</span>
        {EJEMPLOS.map((e) => {
          // Unidades como «g» o «°C» son símbolos y no llevan clave propia.
          const unidad = e.unidad.startsWith('unit') ? t(e.unidad) : e.unidad;
          const label = t(e.nombre);
          return (
            <button
              key={e.nombre}
              onClick={() => setVariable({ label, unit: unidad, decimals: e.decimals })}
              className="text-[10px] px-2 py-0.5 rounded-full border border-border hover:bg-muted transition-colors pointer-coarse:min-h-11 pointer-coarse:px-3 pointer-coarse:text-xs"
            >
              {label} ({unidad})
            </button>
          );
        })}
      </div>

      <p className="text-[10px] text-muted-foreground mt-2 leading-snug">
        {t('decimalsNote')}
      </p>
    </div>
  );
}

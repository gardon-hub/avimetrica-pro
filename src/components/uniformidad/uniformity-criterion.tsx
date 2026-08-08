'use client';

import { useUniformidadStore } from '@/lib/store';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';

const PRESETS = [5, 7.5, 10, 15];

/**
 * Selector del criterio de uniformidad (media ± X%). El predeterminado es
 * ±10% (criterio tradicional). No confundir con un intervalo de confianza.
 */
export function UniformityCriterion() {
  const { uniformityPct, setUniformityPct } = useUniformidadStore();
  const isPreset = PRESETS.includes(uniformityPct);
  const [custom, setCustom] = useState(isPreset ? '' : String(uniformityPct));

  const selectValue = isPreset ? String(uniformityPct) : 'custom';

  return (
    <div className="flex flex-col gap-1.5 mb-4">
      <Label className="text-xs uppercase font-bold text-muted-foreground tracking-wide">
        Criterio de uniformidad (banda alrededor de la media)
      </Label>
      <div className="flex gap-2 items-center">
        <Select
          value={selectValue}
          onValueChange={(v) => {
            if (v === 'custom') return;
            setUniformityPct(parseFloat(v));
          }}
        >
          <SelectTrigger className="h-10 flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5">Media ±5%</SelectItem>
            <SelectItem value="7.5">Media ±7.5%</SelectItem>
            <SelectItem value="10">Media ±10% (tradicional)</SelectItem>
            <SelectItem value="15">Media ±15%</SelectItem>
            <SelectItem value="custom">Personalizado…</SelectItem>
          </SelectContent>
        </Select>
        {selectValue === 'custom' && (
          <div className="flex items-center gap-1">
            <span className="text-sm text-muted-foreground">±</span>
            <Input
              type="number"
              min={1}
              max={50}
              step={0.5}
              value={custom}
              onChange={(e) => {
                setCustom(e.target.value);
                const v = parseFloat(e.target.value);
                if (Number.isFinite(v) && v > 0 && v <= 50) setUniformityPct(v);
              }}
              className="h-10 w-20"
              aria-label="Porcentaje personalizado"
            />
            <span className="text-sm text-muted-foreground">%</span>
          </div>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground leading-snug">
        La uniformidad es el % de aves dentro de media ±{uniformityPct}%. Es una banda
        descriptiva, <b>no</b> un intervalo de confianza.
      </p>
    </div>
  );
}

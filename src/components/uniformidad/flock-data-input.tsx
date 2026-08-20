'use client';

import { useTranslations } from 'next-intl';
import { useUniformidadStore } from '@/lib/store';
import { LineaGeneticaSelect } from '@/components/uniformidad/linea-genetica-select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function FlockDataInput() {
  const { lineaGenetica, edadSemanas, tipoOtraLinea, setLineaGenetica, setEdadSemanas, setTipoOtraLinea } = useUniformidadStore();
  const t = useTranslations('flock');

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs uppercase font-bold text-muted-foreground tracking-wide">
          {t('line')}
        </Label>
        <LineaGeneticaSelect
          value={lineaGenetica}
          onChange={setLineaGenetica}
          size="lg"
          tipoAve={tipoOtraLinea}
          onTipoAveChange={setTipoOtraLinea}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs uppercase font-bold text-muted-foreground tracking-wide">
          {t('age')}
        </Label>
        <Input
          type="number"
          min={0}
          step={1}
          placeholder={t('agePlaceholder')}
          value={edadSemanas}
          onChange={(e) => setEdadSemanas(e.target.value)}
          className="h-11 text-base"
        />
      </div>
    </div>
  );
}

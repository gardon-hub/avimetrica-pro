'use client';

/**
 * Selector de línea genética, agrupado por propósito (engorde / postura) y
 * con la opción de escribir una línea que no esté en el catálogo.
 *
 * Lo usan el editor principal y el formulario de lote: una sola pieza para
 * que ambos ofrezcan exactamente las mismas líneas (lib/lineas-geneticas.ts).
 *
 * Cómo funciona «otra línea»: el Select usa el centinela OTRA_LINEA, que
 * nunca se guarda; al elegirlo aparece un campo de texto y lo que el usuario
 * escribe se almacena tal cual (es dato suyo: no se traduce ni se
 * normaliza). El modo se recuerda en estado local para que el campo exista
 * también mientras está vacío; y si el valor guardado no está en el catálogo
 * —incluido el «Otra» legado de versiones viejas—, se entra al modo texto
 * automáticamente al montar.
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { LINEAS_ENGORDE, LINEAS_POSTURA, OTRA_LINEA, esLineaConocida } from '@/lib/lineas-geneticas';
import { PencilLine } from 'lucide-react';

export function LineaGeneticaSelect({
  value,
  onChange,
  size = 'lg',
  tipoAve,
  onTipoAveChange,
}: {
  value: string;
  onChange: (v: string) => void;
  /** lg = editor principal (h-11), sm = formularios (h-9). */
  size?: 'lg' | 'sm';
  /**
   * Propósito declarado para una línea propia. Solo se ofrece si quien monta
   * el selector pasa el enlace; el formulario de lote no lo necesita porque
   * ya declara el tipo de ave en su propio campo.
   */
  tipoAve?: 'broiler' | 'ponedora';
  onTipoAveChange?: (t: 'broiler' | 'ponedora') => void;
}) {
  const t = useTranslations('flock');
  const [modoOtra, setModoOtra] = useState(() => value !== '' && !esLineaConocida(value));
  const esOtra = modoOtra || (value !== '' && !esLineaConocida(value));
  const triggerCls = size === 'lg' ? 'h-11 text-base !w-full' : 'h-9 text-sm !w-full';
  const inputCls = size === 'lg' ? 'h-11 text-base' : 'h-9 text-sm';

  const alElegir = (v: string) => {
    if (v === OTRA_LINEA) {
      setModoOtra(true);
      onChange('');
    } else {
      setModoOtra(false);
      onChange(v);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <Select value={esOtra ? OTRA_LINEA : value} onValueChange={alElegir}>
        <SelectTrigger className={triggerCls}>
          <SelectValue placeholder={t('linePlaceholder')} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>{t('groupBroilers')}</SelectLabel>
            {LINEAS_ENGORDE.map((l) => (
              <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
            ))}
          </SelectGroup>
          <SelectGroup>
            <SelectLabel>{t('groupLayers')}</SelectLabel>
            {LINEAS_POSTURA.map((l) => (
              <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
            ))}
          </SelectGroup>
          <SelectGroup>
            <SelectLabel>{t('groupOther')}</SelectLabel>
            <SelectItem value={OTRA_LINEA}>
              <span className="flex items-center gap-1.5">
                <PencilLine className="h-3.5 w-3.5" /> {t('otherLine')}
              </span>
            </SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>

      {esOtra && (
        <>
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={t('otherLinePlaceholder')}
            className={inputCls}
            autoFocus={value === ''}
          />
          {onTipoAveChange && (
            <RadioGroup
              value={tipoAve ?? 'ponedora'}
              onValueChange={(v) => onTipoAveChange(v as 'broiler' | 'ponedora')}
              className="flex gap-4 pt-0.5"
            >
              <div className="flex items-center gap-1.5">
                <RadioGroupItem value="broiler" id="tipo-otra-broiler" />
                <Label htmlFor="tipo-otra-broiler" className="text-xs cursor-pointer">{t('purposeBroiler')}</Label>
              </div>
              <div className="flex items-center gap-1.5">
                <RadioGroupItem value="ponedora" id="tipo-otra-ponedora" />
                <Label htmlFor="tipo-otra-ponedora" className="text-xs cursor-pointer">{t('purposeLayer')}</Label>
              </div>
            </RadioGroup>
          )}
          <p className="text-[11px] text-muted-foreground leading-snug">{t('otherLineHint')}</p>
        </>
      )}
    </div>
  );
}

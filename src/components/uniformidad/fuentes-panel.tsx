'use client';

/** Sección visible de fuentes técnicas y trazabilidad (Fase 7 / sección 20). */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { FUENTES_TECNICAS, FECHA_INCORPORACION, VERSION_DATOS } from '@/lib/fuentes';
import { APP_VERSION } from '@/lib/report-data';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { BookOpen, ChevronDown } from 'lucide-react';

export function FuentesPanel() {
  const t = useTranslations('sources');
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-card rounded-lg border shadow-sm p-3 sm:p-4 mb-4">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full h-9 text-sm font-bold uppercase tracking-wide text-muted-foreground justify-between px-1">
            <span className="flex items-center gap-1.5"><BookOpen className="h-4 w-4" /> {t('title')}</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3 space-y-3">
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr className="border-b font-bold text-muted-foreground">
                  <th className="py-1.5 text-left">{t('colLine')}</th>
                  <th className="py-1.5 text-left">{t('colDocument')}</th>
                  <th className="py-1.5 text-left">{t('colOrigin')}</th>
                  <th className="py-1.5 text-left">{t('colStatus')}</th>
                </tr>
              </thead>
              <tbody>
                {FUENTES_TECNICAS.map((f) => (
                  <tr key={f.lineaGenetica} className="border-b border-border/50 align-top">
                    <td className="py-1.5 pr-2 font-semibold">{f.lineaGenetica}</td>
                    <td className="py-1.5 pr-2">{f.documento}</td>
                    <td className="py-1.5 pr-2">{f.detalle}</td>
                    <td className="py-1.5">
                      {f.estado === 'oficial' ? (
                        <span className="text-green-700 font-semibold">{t('official')}</span>
                      ) : (
                        <span className="text-amber-700 font-semibold">{t('approximate')}</span>
                      )}
                      {f.notas && <div className="text-muted-foreground">{f.notas}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-[11px] text-muted-foreground bg-muted/50 rounded-md p-2.5 space-y-0.5">
            <div>{t('dataDate', { fecha: FECHA_INCORPORACION })}</div>
            <div>{t.rich('versions', { datos: VERSION_DATOS, app: APP_VERSION, b: (c) => <b>{c}</b> })}</div>
            <div>{t('note')}</div>
            {/* Los títulos de documento y las notas de origen NO se traducen:
                son el registro de trazabilidad y reescribirlos falsearía de
                qué guía y en qué términos se tomó cada dato. */}
            <div>{t('recordLanguage')}</div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

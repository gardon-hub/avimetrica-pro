'use client';

/**
 * Interpretación académica (Fase 7): explicación paso a paso determinista,
 * generada localmente a partir de los resultados YA calculados
 * (lib/academic-mode.ts).
 *
 * Hasta 2026-08-18 existía además una pestaña «Asistente IA (opcional)» que
 * llamaba a /api/interpret. Al convertir la aplicación en sitio estático sin
 * servidor esa ruta dejó de existir, y la pestaña se retiró: un botón que
 * siempre falla no es una función opcional. Si algún día vuelve a haber un
 * despliegue con servidor, la historia está en git (commit 384618a y
 * anteriores).
 */

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useUniformidadStore } from '@/lib/store';
import { buildReportData } from '@/lib/report-data';
import { buildAcademicSections, type MensajeAcademico } from '@/lib/academic-mode';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { GraduationCap } from 'lucide-react';

export function AiPanel() {
  const { pesos, lineaGenetica, tipoOtraLinea, edadSemanas, uniformityPct, reportContext } = useUniformidadStore();
  const t = useTranslations('ai');
  // Las secciones llegan como mensajes {key, params} del espacio `academic`
  // (ver academic-mode.ts) y aquí se componen en el idioma activo.
  const ta = useTranslations('academic');
  const msg = (mm: MensajeAcademico) => ta(mm.key, mm.params);

  const data = useMemo(() => {
    if (pesos.length < 2) return null;
    return buildReportData({ pesos, lineaGenetica, tipoOtraLinea, edadSemanas, criterioPct: uniformityPct, contexto: reportContext });
  }, [pesos, lineaGenetica, tipoOtraLinea, edadSemanas, uniformityPct, reportContext]);

  const sections = useMemo(() => (data ? buildAcademicSections(data) : []), [data]);

  if (!data) return null;

  return (
    <div className="bg-card rounded-lg border shadow-sm p-3 sm:p-4 mb-4">
      <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
        <GraduationCap className="h-4 w-4" /> {t('title')}
      </h2>
      <p className="text-[11px] text-muted-foreground mb-2 leading-snug">
        {t('localIntro')}
      </p>
      <Accordion type="multiple" className="w-full">
        {sections.map((s, i) => (
          <AccordionItem key={i} value={`sec-${i}`}>
            <AccordionTrigger className="text-xs font-semibold py-2.5">{msg(s.titulo)}</AccordionTrigger>
            <AccordionContent className="text-[11px] space-y-1.5 leading-relaxed">
              <p><b>{t('whatWasComputed')}</b> {msg(s.queSeCalculo)}</p>
              <p className="font-mono bg-muted/60 rounded px-2 py-1">{msg(s.formula)}</p>
              <p><b>{t('result')}</b> {s.resultado.map(msg).join(' ')}</p>
              <p><b>{t('howToRead')}</b> {msg(s.interpretacion)}</p>
              <div>
                <b>{t('commonErrors')}</b>
                <ul className="list-disc pl-4 mt-0.5">
                  {s.erroresComunes.map((e, j) => (
                    <li key={j}>{msg(e)}</li>
                  ))}
                </ul>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

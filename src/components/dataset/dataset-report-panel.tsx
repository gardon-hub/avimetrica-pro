'use client';

/** Reporte imprimible y exportación a Excel de un muestreo. */

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { DatasetStore } from '@/lib/dataset-store';
import type { Domain } from '@/lib/domains/types';
import { findPreset } from '@/lib/domains/types';
import { buildDatasetReportHtml, type DatasetReportInput } from '@/lib/dataset-report';
import { downloadDatasetExcel } from '@/lib/dataset-excel';
import { Button } from '@/components/ui/button';
import { FileText, Printer, Sheet } from 'lucide-react';

export function DatasetReportPanel({ store, domain }: { store: DatasetStore; domain: Domain }) {
  const { valores, variable, scheme, presetId, contexto, muHipotetica } = store();
  const t = useTranslations('datasetReport');
  const tNav = useTranslations('nav');
  // El generador necesita el traductor de la raíz del catálogo (ver report-i18n).
  const tRaiz = useTranslations();
  const locale = useLocale();
  const [mostrar, setMostrar] = useState(false);

  const entrada: DatasetReportInput | null = useMemo(() => {
    if (valores.length === 0) return null;
    const preset = findPreset(domain, presetId);
    return {
      tituloModulo: t('docTitle', { modulo: tNav(`${domain.id}.long`) }),
      valores,
      variable,
      scheme,
      criterioLabel: preset?.label ?? t('customCriterion'),
      criterioFuente: preset?.source ?? t('customCriterionSource'),
      criterioOficial: preset?.official ?? false,
      contexto,
      muHipotetica,
    };
  }, [valores, variable, scheme, presetId, contexto, muHipotetica, domain, t, tNav]);

  const html = useMemo(
    () => (mostrar && entrada ? buildDatasetReportHtml(entrada, { locale, t: tRaiz }) : ''),
    [mostrar, entrada, locale, tRaiz],
  );

  const imprimir = () => {
    if (!html) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.onload = () => setTimeout(() => w.print(), 400);
  };

  return (
    <div className="bg-card rounded-lg border shadow-sm p-3 sm:p-4 mb-4">
      <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
        <FileText className="h-4 w-4" /> {t('title')}
      </h2>

      <Button
        onClick={() => setMostrar(true)}
        disabled={!entrada}
        className="w-full h-10 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white mb-3"
      >
        <FileText className="h-4 w-4 mr-1.5" /> {t('generate')}
      </Button>

      {entrada && mostrar && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button onClick={imprimir} className="flex-1 h-10 text-sm bg-gray-800 hover:bg-gray-900 text-white">
              <Printer className="h-4 w-4 mr-1.5" /> {t('print')}
            </Button>
            <Button
              onClick={() => downloadDatasetExcel(entrada)}
              variant="outline"
              className="flex-1 h-10 text-sm border-green-600 text-green-700 hover:bg-green-50 font-semibold"
            >
              <Sheet className="h-4 w-4 mr-1.5" /> {t('excel')}
            </Button>
          </div>
          <iframe
            srcDoc={html}
            title={t('previewTitle', { modulo: tNav(`${domain.id}.long`) })}
            className="w-full h-[520px] border rounded-md bg-white"
            sandbox=""
          />
          <p className="text-[10px] text-muted-foreground leading-snug">
            {t('note')}
            {locale !== 'es' && <> {t('spanishOnly')}</>}
          </p>
        </div>
      )}
    </div>
  );
}

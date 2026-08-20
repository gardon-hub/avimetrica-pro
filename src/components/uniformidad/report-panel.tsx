'use client';

/**
 * Panel de reportes (Fase 6). Tres variantes (resumido, técnico, académico),
 * vista previa fiel en iframe, impresión/PDF con el mismo HTML y exportación
 * a Excel. Sustituye al generador de reportes anterior.
 */

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useUniformidadStore } from '@/lib/store';
import { buildReportData, ReportVariant, VARIANT_KEYS } from '@/lib/report-data';
import { buildReportHtml } from '@/lib/report-html';
import { downloadExcel } from '@/lib/export-excel';
import { MUESTREO_KEYS } from '@/lib/lotes-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { FileText, Printer, Sheet, ChevronDown } from 'lucide-react';

export function ReportPanel() {
  const { pesos, lineaGenetica, tipoOtraLinea, edadSemanas, uniformityPct, reportContext, setReportContext } = useUniformidadStore();
  const tMuestreo = useTranslations('sampling');
  const tPanel = useTranslations('avesReportPanel');
  const tRep = useTranslations('reports.aves');
  // El generador necesita el traductor de la raíz (ver report-i18n.ts).
  const tRaiz = useTranslations();
  const locale = useLocale();
  const [variant, setVariant] = useState<ReportVariant>('tecnico');
  const [show, setShow] = useState(false);
  const [ctxOpen, setCtxOpen] = useState(false);

  const data = useMemo(() => {
    if (!show || pesos.length === 0) return null;
    return buildReportData({
      pesos,
      lineaGenetica,
      tipoOtraLinea,
      edadSemanas,
      criterioPct: uniformityPct,
      contexto: reportContext,
    });
  }, [show, pesos, lineaGenetica, tipoOtraLinea, edadSemanas, uniformityPct, reportContext]);

  const html = useMemo(
    () => (data ? buildReportHtml(data, variant, { locale, t: tRaiz }) : ''),
    [data, variant, locale, tRaiz],
  );

  const handlePrint = () => {
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
        <FileText className="h-4 w-4" /> {tPanel('title')}
      </h2>

      <Collapsible open={ctxOpen} onOpenChange={setCtxOpen} className="mb-3">
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full h-9 text-xs font-semibold border-dashed">
            {tPanel('headerData')}
            <ChevronDown className={`h-3.5 w-3.5 ml-2 transition-transform ${ctxOpen ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">{tPanel('lot')}</Label>
            <Input value={reportContext.lote ?? ''} onChange={(e) => setReportContext({ lote: e.target.value })} className="h-9 text-sm" />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">{tPanel('farm')}</Label>
            <Input value={reportContext.granja ?? ''} onChange={(e) => setReportContext({ granja: e.target.value })} className="h-9 text-sm" />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">{tPanel('house')}</Label>
            <Input value={reportContext.galpon ?? ''} onChange={(e) => setReportContext({ galpon: e.target.value })} className="h-9 text-sm" />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">{tPanel('responsible')}</Label>
            <Input value={reportContext.responsable ?? ''} onChange={(e) => setReportContext({ responsable: e.target.value })} className="h-9 text-sm" />
          </div>
          <div className="flex flex-col gap-1 sm:col-span-2">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">{tPanel('samplingMethod')}</Label>
            <Select
              value={reportContext.metodoMuestreo ?? 'ns'}
              onValueChange={(v) => setReportContext({ metodoMuestreo: v })}
            >
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MUESTREO_KEYS.map((v) => (
                  <SelectItem key={v} value={v}>{tMuestreo(v)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <Select value={variant} onValueChange={(v) => setVariant(v as ReportVariant)}>
          <SelectTrigger className="h-10 text-sm flex-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.keys(VARIANT_KEYS) as ReportVariant[]).map((v) => (
              <SelectItem key={v} value={v}>{tRep(VARIANT_KEYS[v])}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          onClick={() => setShow(true)}
          disabled={pesos.length === 0}
          className="h-10 px-5 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white"
        >
          <FileText className="h-4 w-4 mr-1.5" /> {tPanel('generate')}
        </Button>
      </div>

      {data && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button onClick={handlePrint} className="flex-1 h-10 text-sm bg-gray-800 hover:bg-gray-900 text-white">
              <Printer className="h-4 w-4 mr-1.5" /> {tPanel('print')}
            </Button>
            <Button onClick={() => downloadExcel(data, { locale, t: tRaiz })} variant="outline" className="flex-1 h-10 text-sm border-green-600 text-green-700 hover:bg-green-50 font-semibold">
              <Sheet className="h-4 w-4 mr-1.5" /> {tPanel('excel')}
            </Button>
          </div>
          <iframe
            srcDoc={html}
            title={tRep('title', { variante: tRep(VARIANT_KEYS[variant]) })}
            className="w-full h-[560px] border rounded-md bg-white"
            sandbox=""
          />
          <p className="text-[10px] text-muted-foreground leading-snug">
            La vista previa es el mismo documento que se imprime. Para PDF: Imprimir → &quot;Guardar como PDF&quot;.
            El Excel incluye hojas de Resumen, Descriptiva y Pesos individuales.
          </p>
        </div>
      )}
    </div>
  );
}

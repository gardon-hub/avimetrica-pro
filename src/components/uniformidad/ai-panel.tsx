'use client';

/**
 * Asistente e interpretación (Fase 7).
 * - "Modo académico (local)": explicación paso a paso determinista, siempre
 *   disponible, generada sin IA a partir de los resultados calculados.
 * - "Asistente IA" (opcional): envía el objeto de resultados YA calculados a
 *   /api/interpret; si el servicio no está configurado, lo indica sin romper nada.
 */

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import ReactMarkdown from 'react-markdown';
import { useUniformidadStore } from '@/lib/store';
import { buildReportData, ReportData } from '@/lib/report-data';
import { buildAcademicSections } from '@/lib/academic-mode';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { GraduationCap, Sparkles, Info } from 'lucide-react';

/** Resumen compacto para la IA: resultados calculados, sin la lista cruda de pesos. */
function buildResumenIA(d: ReportData) {
  return {
    lineaGenetica: d.lineaGenetica,
    lineaConReferenciaAproximada: d.lineaAproximada,
    edadSemanas: d.edadSemanas,
    criterioUniformidadPct: d.criterioPct,
    n: d.stats.totalAves,
    mediaG: d.stats.promedio,
    sdMuestralG: d.stats.desvEst,
    cvPct: d.stats.cv,
    uniformidadPct: d.stats.uniformidad,
    avesDebajo: d.stats.countDebajo,
    avesDentro: d.stats.countDentro,
    avesEncima: d.stats.countEncima,
    ic95Media: d.ci95,
    descriptiva: {
      mediana: d.descr.median,
      minimo: d.descr.min,
      maximo: d.descr.max,
      q1: d.descr.q1,
      q3: d.descr.q3,
      asimetriaG1: d.descr.skewness,
      curtosisG2: d.descr.kurtosis,
    },
    objetivo: d.target,
    diferenciaVsObjetivoG: d.targetDiffG,
    diferenciaVsObjetivoPct: d.targetDiffPct,
    pctDentroRangoGuia: d.pctDentroGuia,
    normalidadShapiroWilk: d.shapiro
      ? { W: d.shapiro.W, valorP: d.shapiro.pValue }
      : null,
    normalidadDAgostinoPearson: d.normality
      ? { estadisticoK2: d.normality.statistic, valorP: d.normality.pValue, confiable: d.normality.reliable }
      : null,
    pruebaTvsObjetivo: d.tTest
      ? { t: d.tTest.t, gl: d.tTest.df, valorP: d.tTest.pValue, ic: [d.tTest.ciLower, d.tTest.ciUpper], dCohen: d.tTest.cohenD, seRechazaH0: d.tTest.rejectNull }
      : null,
    atipicos: d.outliers.flags.map((f) => ({ ave: f.index + 1, pesoG: f.value, metodos: f.methods })),
    limitaciones: d.limitaciones,
  };
}

export function AiPanel() {
  const { pesos, lineaGenetica, edadSemanas, uniformityPct, reportContext } = useUniformidadStore();
  const t = useTranslations('ai');
  const locale = useLocale();
  const [aiText, setAiText] = useState<string>('');
  const [aiStatus, setAiStatus] = useState<'idle' | 'loading' | 'unavailable' | 'error' | 'done'>('idle');
  const [aiMessage, setAiMessage] = useState<string>('');
  const [modo, setModo] = useState<'interpretacion' | 'academico'>('interpretacion');

  const data = useMemo(() => {
    if (pesos.length < 2) return null;
    return buildReportData({ pesos, lineaGenetica, edadSemanas, criterioPct: uniformityPct, contexto: reportContext });
  }, [pesos, lineaGenetica, edadSemanas, uniformityPct, reportContext]);

  const sections = useMemo(() => (data ? buildAcademicSections(data) : []), [data]);

  const handleAsk = async () => {
    if (!data) return;
    setAiStatus('loading');
    setAiText('');
    setAiMessage('');
    try {
      const res = await fetch('/api/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumen: buildResumenIA(data), modo }),
      });
      const json = await res.json();
      if (res.status === 503) {
        setAiStatus('unavailable');
        setAiMessage(json.message ?? t('unavailable'));
      } else if (!res.ok) {
        setAiStatus('error');
        setAiMessage(json.error ?? t('error'));
      } else {
        setAiStatus('done');
        setAiText(json.texto);
      }
    } catch {
      setAiStatus('error');
      setAiMessage(t('noServer'));
    }
  };

  if (!data) return null;

  return (
    <div className="bg-card rounded-lg border shadow-sm p-3 sm:p-4 mb-4">
      <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
        <GraduationCap className="h-4 w-4" /> {t('title')}
      </h2>
      <Tabs defaultValue="academico-local">
        <TabsList className="w-full flex h-auto gap-1">
          <TabsTrigger value="academico-local" className="text-xs flex-1">{t('tabLocal')}</TabsTrigger>
          <TabsTrigger value="ia" className="text-xs flex-1">{t('tabAi')}</TabsTrigger>
        </TabsList>

        <TabsContent value="academico-local" className="pt-3">
          <p className="text-[11px] text-muted-foreground mb-2 leading-snug">
            {t('localIntro')}
          </p>
          {/* El texto explicativo lo produce lib/academic-mode.ts, que sigue en
              español por decisión de alcance: se avisa en vez de mezclar
              idiomas en silencio. */}
          {locale !== 'es' && (
            <p className="text-[11px] text-amber-700 mb-2 leading-snug">⚠️ {t('onlySpanish')}</p>
          )}
          <Accordion type="multiple" className="w-full">
            {sections.map((s, i) => (
              <AccordionItem key={i} value={`sec-${i}`}>
                <AccordionTrigger className="text-xs font-semibold py-2.5">{s.titulo}</AccordionTrigger>
                <AccordionContent className="text-[11px] space-y-1.5 leading-relaxed">
                  <p><b>{t('whatWasComputed')}</b> {s.queSeCalculo}</p>
                  <p className="font-mono bg-muted/60 rounded px-2 py-1">{s.formula}</p>
                  <p><b>{t('result')}</b> {s.resultado}</p>
                  <p><b>{t('howToRead')}</b> {s.interpretacion}</p>
                  <div>
                    <b>{t('commonErrors')}</b>
                    <ul className="list-disc pl-4 mt-0.5">
                      {s.erroresComunes.map((e, j) => (
                        <li key={j}>{e}</li>
                      ))}
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </TabsContent>

        <TabsContent value="ia" className="pt-3 space-y-3">
          <p className="text-[11px] text-muted-foreground leading-snug">
            {t.rich('aiIntro', { b: (c) => <b>{c}</b> })}
          </p>
          <div className="flex gap-2">
            <Button
              variant={modo === 'interpretacion' ? 'default' : 'outline'}
              onClick={() => setModo('interpretacion')}
              className="h-8 text-xs flex-1"
            >
              {t('modeInterpretation')}
            </Button>
            <Button
              variant={modo === 'academico' ? 'default' : 'outline'}
              onClick={() => setModo('academico')}
              className="h-8 text-xs flex-1"
            >
              {t('modeAcademic')}
            </Button>
          </div>
          <Button onClick={handleAsk} disabled={aiStatus === 'loading'} className="w-full h-9 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white">
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            {aiStatus === 'loading' ? t('generating') : t('generate')}
          </Button>

          {(aiStatus === 'unavailable' || aiStatus === 'error') && (
            <Alert className={aiStatus === 'unavailable' ? 'border-blue-200 bg-blue-50' : 'border-amber-300 bg-amber-50'}>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-[11px] leading-snug">{aiMessage}</AlertDescription>
            </Alert>
          )}

          {aiStatus === 'done' && aiText && (
            <div className="prose prose-sm max-w-none text-xs bg-muted/40 rounded-md p-3 [&_h1]:text-sm [&_h2]:text-xs [&_h3]:text-xs [&_h2]:font-bold [&_ul]:pl-4">
              <ReactMarkdown>{aiText}</ReactMarkdown>
              <p className="text-[10px] text-muted-foreground border-t pt-1.5 mt-2">
                {t('disclaimer')}
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

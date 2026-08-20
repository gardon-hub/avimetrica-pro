'use client';

/**
 * «Análisis estadístico» para huevos y estadística: la MISMA ventana con
 * pestañas del módulo de aves (tabla descriptiva completa con modo censo,
 * histograma configurable, diagnóstico de distribución y calculadora de
 * probabilidades), montada sobre los componentes genéricos.
 *
 * Sin pestaña de prueba t: esos módulos ya tienen su propio panel de
 * inferencia con μ₀ declarada, hipótesis alterna y nivel de confianza.
 */

import { useTranslations } from 'next-intl';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DescriptiveTable } from '@/components/uniformidad/descriptive-table';
import { HistogramChart } from '@/components/uniformidad/histogram-chart';
import { DistributionDiagnostics } from '@/components/uniformidad/distribution-diagnostics';
import { ProbabilityCalculator } from '@/components/uniformidad/probability-calculator';
import type { VariableDefinition } from '@/lib/domains/types';

export function DatasetAnalysis({
  valores,
  variable,
}: {
  valores: number[];
  variable: VariableDefinition;
}) {
  const t = useTranslations('analysis');
  const tDescr = useTranslations('descriptive');
  const tDiag = useTranslations('diagnostics');

  if (valores.length === 0) return null;

  const unidad = variable.unit;
  const valorColLabel = unidad ? `${variable.label} (${unidad})` : variable.label;

  return (
    <div className="bg-card rounded-lg border shadow-sm p-3 sm:p-4 mb-4">
      <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-3">
        {t('title')}
      </h2>
      <Tabs defaultValue="resumen">
        <TabsList className="w-full flex flex-wrap h-auto gap-1">
          <TabsTrigger value="resumen" className="text-xs flex-1">{t('tabs.summary')}</TabsTrigger>
          <TabsTrigger value="histograma" className="text-xs flex-1">{t('tabs.histogram')}</TabsTrigger>
          <TabsTrigger value="diagnostico" className="text-xs flex-1">{t('tabs.diagnostics')}</TabsTrigger>
          <TabsTrigger value="probabilidades" className="text-xs flex-1">{t('tabs.probabilities')}</TabsTrigger>
        </TabsList>
        <TabsContent value="resumen" className="pt-3">
          <DescriptiveTable valores={valores} unidad={unidad} nLabel={tDescr('nObs')} generico />
        </TabsContent>
        <TabsContent value="histograma" className="pt-3">
          <HistogramChart valores={valores} />
        </TabsContent>
        <TabsContent value="diagnostico" className="pt-3">
          <DistributionDiagnostics
            valores={valores}
            unidad={unidad}
            idColLabel={tDiag('colObservation')}
            valorColLabel={valorColLabel}
          />
        </TabsContent>
        <TabsContent value="probabilidades" className="pt-3">
          <ProbabilityCalculator valores={valores} unidad={unidad} contexto="datos" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

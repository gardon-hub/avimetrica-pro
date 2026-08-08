'use client';

/**
 * Panel "Análisis estadístico": agrupa en pestañas la estadística
 * descriptiva completa, el histograma real, el diagnóstico de distribución
 * (boxplot, Q-Q, normalidad, atípicos), la calculadora de distribuciones y
 * la prueba t de una muestra.
 */

import { useTranslations } from 'next-intl';
import { useUniformidadStore } from '@/lib/store';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DescriptiveTable } from './descriptive-table';
import { HistogramChart } from './histogram-chart';
import { DistributionDiagnostics } from './distribution-diagnostics';
import { ProbabilityCalculator } from './probability-calculator';
import { TTestPanel } from './t-test-panel';

export function AnalysisPanel() {
  const { pesos } = useUniformidadStore();
  const t = useTranslations('analysis');

  if (pesos.length === 0) {
    return null;
  }

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
          <TabsTrigger value="prueba-t" className="text-xs flex-1">{t('tabs.tTest')}</TabsTrigger>
        </TabsList>
        <TabsContent value="resumen" className="pt-3">
          <DescriptiveTable />
        </TabsContent>
        <TabsContent value="histograma" className="pt-3">
          <HistogramChart />
        </TabsContent>
        <TabsContent value="diagnostico" className="pt-3">
          <DistributionDiagnostics />
        </TabsContent>
        <TabsContent value="probabilidades" className="pt-3">
          <ProbabilityCalculator />
        </TabsContent>
        <TabsContent value="prueba-t" className="pt-3">
          <TTestPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

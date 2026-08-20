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
  const { pesos, stats, lineaGenetica, edadSemanas } = useUniformidadStore();
  const t = useTranslations('analysis');
  const tDescr = useTranslations('descriptive');
  const tDiag = useTranslations('diagnostics');

  if (pesos.length === 0) {
    return null;
  }

  const objetivo = { linea: lineaGenetica, semanas: edadSemanas };

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
          <DescriptiveTable valores={pesos} unidad="g" nLabel={tDescr('n')} objetivo={objetivo} />
        </TabsContent>
        <TabsContent value="histograma" className="pt-3">
          <HistogramChart
            valores={pesos}
            banda={{ inf: stats.limiteInf, sup: stats.limiteSup, pct: stats.criterioPct }}
          />
        </TabsContent>
        <TabsContent value="diagnostico" className="pt-3">
          <DistributionDiagnostics
            valores={pesos}
            unidad="g"
            idColLabel={tDiag('colBird')}
            valorColLabel={tDiag('colWeight')}
            objetivo={objetivo}
            bandaPct={stats.criterioPct}
          />
        </TabsContent>
        <TabsContent value="probabilidades" className="pt-3">
          <ProbabilityCalculator valores={pesos} unidad="g" contexto="aves" />
        </TabsContent>
        <TabsContent value="prueba-t" className="pt-3">
          <TTestPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

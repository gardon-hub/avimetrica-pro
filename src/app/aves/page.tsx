'use client';

import { LogoHeader } from '@/components/uniformidad/logo-header';
import { ModuleNav } from '@/components/shell/module-nav';
import { FlockDataInput } from '@/components/uniformidad/flock-data-input';
import { WeightInput } from '@/components/uniformidad/weight-input';
import { BulkImport } from '@/components/uniformidad/bulk-import';
import { FileImport } from '@/components/uniformidad/file-import';
import { HistorialPanel } from '@/components/uniformidad/historial-panel';
import { AiPanel } from '@/components/uniformidad/ai-panel';
import { FuentesPanel } from '@/components/uniformidad/fuentes-panel';
import { ResetButton } from '@/components/uniformidad/reset-button';
import { StatsGrid } from '@/components/uniformidad/stats-grid';
import { UniformityCriterion } from '@/components/uniformidad/uniformity-criterion';
import { WeightList } from '@/components/uniformidad/weight-list';
import { DistributionChart } from '@/components/uniformidad/distribution-chart';
import { AnalysisPanel } from '@/components/uniformidad/analysis-panel';
import { DiagnosticPanel } from '@/components/uniformidad/diagnostic-panel';
import { ReportPanel } from '@/components/uniformidad/report-panel';
import { SessionManager } from '@/components/uniformidad/session-manager';
import { Credits } from '@/components/uniformidad/credits';
import { useTranslations } from 'next-intl';

export default function AvesPage() {
  const t = useTranslations('footer');

  return (
    <div className="min-h-screen flex flex-col bg-muted/40">
      <main className="flex-1 w-full max-w-2xl mx-auto px-3 sm:px-4 py-4">
        <LogoHeader />
        <ModuleNav />
        <FlockDataInput />
        <WeightInput />
        <BulkImport />
        <FileImport />
        <ResetButton />
        <UniformityCriterion />
        <StatsGrid />
        <WeightList />
        <DistributionChart />
        <AnalysisPanel />
        <DiagnosticPanel />
        <AiPanel />
        <HistorialPanel />
        <SessionManager />
        <ReportPanel />
        <FuentesPanel />
        <Credits />
      </main>
      <footer className="w-full bg-green-700 text-white text-center py-2.5 text-xs sm:text-sm mt-auto">
        {t('line')}
      </footer>
    </div>
  );
}

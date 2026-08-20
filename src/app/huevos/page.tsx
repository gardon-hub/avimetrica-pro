'use client';

import { useState } from 'react';
import { LogoHeader } from '@/components/uniformidad/logo-header';
import { ModuleNav } from '@/components/shell/module-nav';
import { Credits } from '@/components/uniformidad/credits';
import { HowToCite } from '@/components/uniformidad/how-to-cite';
import { BackupPanel } from '@/components/shell/backup-panel';
import { ValueInput } from '@/components/dataset/value-input';
import { DatasetAnalysis } from '@/components/dataset/dataset-analysis';
import { InferencePanel } from '@/components/dataset/inference-panel';
import { ClassificationPanel } from '@/components/dataset/classification-panel';
import { DatasetContextForm } from '@/components/dataset/context-form';
import { DatasetLibrary } from '@/components/dataset/dataset-library';
import { DatasetComparison } from '@/components/dataset/dataset-comparison';
import { DatasetReportPanel } from '@/components/dataset/dataset-report-panel';
import { useHuevosStore } from '@/lib/stores/huevos';
import { DOMINIO_HUEVOS } from '@/lib/domains';
import { useTranslations } from 'next-intl';

export default function HuevosPage() {
  const { valores, variable } = useHuevosStore();
  const t = useTranslations();
  // Cambia al guardar o borrar un muestreo, para que la comparación recargue
  // su lista sin necesidad de refrescar la página.
  const [token, setToken] = useState(0);

  return (
    <div className="min-h-screen flex flex-col bg-muted/40">
      <main className="flex-1 w-full max-w-2xl mx-auto px-3 sm:px-4 py-4">
        <LogoHeader />
        <ModuleNav />

        <div className="bg-card rounded-lg border shadow-sm p-3 sm:p-4 mb-4">
          <h1 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            {t('nav.huevos.long')}
          </h1>
          <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
            {t('nav.huevos.description')}
          </p>
        </div>

        <DatasetContextForm store={useHuevosStore} />
        <ValueInput store={useHuevosStore} domain={DOMINIO_HUEVOS} />
        <ClassificationPanel store={useHuevosStore} domain={DOMINIO_HUEVOS} />
        <DatasetAnalysis valores={valores} variable={variable} />
        <InferencePanel store={useHuevosStore} />
        <DatasetReportPanel store={useHuevosStore} domain={DOMINIO_HUEVOS} />
        <DatasetLibrary
          store={useHuevosStore}
          dominio="huevos"
          titulo={t('library.savedSamplings')}
          onCambio={() => setToken((t) => t + 1)}
        />
        <DatasetComparison dominio="huevos" refrescarToken={token} />
        <BackupPanel />
        <HowToCite />
        <Credits />
      </main>
      <footer className="w-full bg-green-700 text-white text-center py-2.5 text-xs sm:text-sm mt-auto">
        {t('footer.line')}
      </footer>
    </div>
  );
}

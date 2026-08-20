'use client';

import { LogoHeader } from '@/components/uniformidad/logo-header';
import { ModuleNav } from '@/components/shell/module-nav';
import { Credits } from '@/components/uniformidad/credits';
import { HowToCite } from '@/components/uniformidad/how-to-cite';
import { BackupPanel } from '@/components/shell/backup-panel';
import { VariableForm } from '@/components/dataset/variable-form';
import { ValueInput } from '@/components/dataset/value-input';
import { DescriptivePanel } from '@/components/dataset/descriptive-panel';
import { ClassificationPanel } from '@/components/dataset/classification-panel';
import { InferencePanel } from '@/components/dataset/inference-panel';
import { DatasetContextForm } from '@/components/dataset/context-form';
import { DatasetLibrary } from '@/components/dataset/dataset-library';
import { DatasetComparison } from '@/components/dataset/dataset-comparison';
import { DatasetReportPanel } from '@/components/dataset/dataset-report-panel';
import { useEstadisticaStore } from '@/lib/stores/estadistica';
import { DOMINIO_GENERICO } from '@/lib/domains';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

export default function EstadisticaPage() {
  const { valores, variable } = useEstadisticaStore();
  const [token, setToken] = useState(0);
  const t = useTranslations();

  return (
    <div className="min-h-screen flex flex-col bg-muted/40">
      <main className="flex-1 w-full max-w-2xl mx-auto px-3 sm:px-4 py-4">
        <LogoHeader />
        <ModuleNav />

        <div className="bg-card rounded-lg border shadow-sm p-3 sm:p-4 mb-4">
          <h1 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            {t('nav.generico.long')}
          </h1>
          <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
            {t('nav.generico.description')} {t('nav.generico.sameEngine')}
          </p>
        </div>

        <VariableForm store={useEstadisticaStore} />
        <DatasetContextForm store={useEstadisticaStore} />
        <ValueInput store={useEstadisticaStore} domain={DOMINIO_GENERICO} />
        <DescriptivePanel valores={valores} variable={variable} />
        <InferencePanel store={useEstadisticaStore} />
        <ClassificationPanel store={useEstadisticaStore} domain={DOMINIO_GENERICO} />
        <DatasetReportPanel store={useEstadisticaStore} domain={DOMINIO_GENERICO} />
        <DatasetLibrary
          store={useEstadisticaStore}
          dominio="generico"
          onCambio={() => setToken((t) => t + 1)}
        />
        <DatasetComparison dominio="generico" refrescarToken={token} />
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

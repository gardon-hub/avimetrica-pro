'use client';

/**
 * Política de privacidad.
 *
 * Existe porque Google Play exige una URL pública de política de privacidad
 * para publicar la aplicación — y porque es honesto decirlo: la arquitectura
 * de Avimétrica Pro hace que NO haya nada que recolectar. Los datos viven en
 * el dispositivo del usuario y jamás se envían a un servidor.
 */

import { useTranslations } from 'next-intl';
import { LogoHeader } from '@/components/uniformidad/logo-header';
import { Credits } from '@/components/uniformidad/credits';

export default function PrivacidadPage() {
  const t = useTranslations('privacy');
  const tFooter = useTranslations('footer');

  const secciones = [
    'storageTitle', 'storageBody',
    'collectionTitle', 'collectionBody',
    'permissionsTitle', 'permissionsBody',
    'backupsTitle', 'backupsBody',
    'deletionTitle', 'deletionBody',
    'contactTitle', 'contactBody',
  ] as const;

  return (
    <div className="min-h-screen flex flex-col bg-muted/40">
      <main className="flex-1 w-full max-w-2xl mx-auto px-3 sm:px-4 py-4">
        <LogoHeader />
        <div className="bg-card rounded-lg border shadow-sm p-4 sm:p-6 mb-4">
          <h1 className="text-base font-bold uppercase tracking-wide text-muted-foreground mb-1">
            {t('title')}
          </h1>
          <p className="text-[11px] text-muted-foreground mb-4">{t('updated')}</p>

          <p className="text-sm leading-relaxed mb-4 font-semibold">{t('summary')}</p>

          {Array.from({ length: secciones.length / 2 }, (_, i) => (
            <section key={i} className="mb-4">
              <h2 className="text-sm font-bold mb-1">{t(secciones[i * 2])}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{t(secciones[i * 2 + 1])}</p>
            </section>
          ))}

          <Credits />
        </div>
      </main>
      <footer className="w-full bg-green-700 text-white text-center py-2.5 text-xs sm:text-sm mt-auto">
        {tFooter('line')}
      </footer>
    </div>
  );
}

'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { ThemeToggle } from './theme-toggle';
import { LanguageSwitcher } from '@/components/shell/language-switcher';
import { BASE_PATH } from '@/lib/base-path';

export function LogoHeader() {
  const t = useTranslations('app');

  return (
    <div className="relative flex flex-col items-center mb-4 mt-2">
      <div className="absolute right-0 top-0 flex items-center gap-1.5">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
      <div className="bg-white rounded-xl px-4 py-2 shadow-sm">
        <Image
          // Con images.unoptimized, next/image NO antepone el basePath: se
          // hace a mano (descubierto con el logo roto en GitHub Pages).
          src={`${BASE_PATH}/logo-avimetrica.png`}
          alt={t('logoAlt')}
          width={280}
          height={192}
          className="h-auto w-56 sm:w-64"
          priority
        />
      </div>
    </div>
  );
}

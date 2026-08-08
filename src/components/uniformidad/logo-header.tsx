'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { ThemeToggle } from './theme-toggle';
import { LanguageSwitcher } from '@/components/shell/language-switcher';

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
          src="/logo-avimetrica.png"
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

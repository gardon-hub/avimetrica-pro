'use client';

import { useTranslations } from 'next-intl';

export function Credits() {
  const t = useTranslations('credits');

  return (
    <div className="mt-6 pt-4 border-t border-border text-center text-muted-foreground text-xs leading-relaxed">
      <span className="font-bold text-foreground text-sm block mb-0.5">
        {t('author')}
      </span>
      <span className="italic">{t('role')}</span>
      <br />
      {t('institution')}
    </div>
  );
}

'use client';

import { useTranslations } from 'next-intl';

/**
 * Créditos de autoría.
 *
 * El grado académico se declara con exactitud: MSc. y candidato a Doctor, no
 * «PhD.». Es un dato que acaba en documentos citables, así que atribuir un
 * doctorado no concluido sería un error de fondo, no de estilo.
 */
export function Credits() {
  const t = useTranslations('credits');

  return (
    <div className="mt-6 pt-4 border-t border-border text-center text-muted-foreground text-xs leading-relaxed">
      <span className="font-bold text-foreground text-sm block">
        {t('author')}
      </span>
      <span className="italic block mb-1">{t('qualification')}</span>
      <span className="block">{t('role')}</span>
      <span className="block">{t('center')}</span>
      <span className="block">{t('faculty')}</span>
      <span className="block">{t('institution')}</span>
      <span className="block">{t('location')}</span>
    </div>
  );
}

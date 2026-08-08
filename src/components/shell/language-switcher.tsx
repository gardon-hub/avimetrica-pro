'use client';

/**
 * Selector de idioma.
 *
 * Escribe la cookie que lee `src/i18n/request.ts` y recarga la página.
 *
 * Se probó `router.refresh()` para evitar la recarga completa y NO es fiable:
 * el segundo cambio de idioma se quedaba con el catálogo anterior aunque la
 * cookie ya tuviera el valor nuevo (la caché de router del App Router devuelve
 * la carga RSC anterior). La recarga completa es determinista, y no cuesta
 * nada de estado porque los tres stores se persisten en localStorage
 * (`uniformidadAvesData`, `avimetricaHuevos`, `avimetricaEstadistica`): los
 * pesos ya capturados siguen ahí tras recargar.
 */

import { useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Languages } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LOCALES, LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, LOCALE_NAMES, type Locale } from '@/i18n/config';

export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const t = useTranslations('language');
  const [pending, startTransition] = useTransition();

  const cambiar = (nuevo: string) => {
    if (nuevo === locale) return;
    document.cookie = `${LOCALE_COOKIE}=${nuevo}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`;
    startTransition(() => {
      window.location.reload();
    });
  };

  return (
    <Select value={locale} onValueChange={cambiar} disabled={pending}>
      <SelectTrigger
        size="sm"
        aria-label={t('change')}
        className="w-auto gap-1.5 px-2 text-xs font-semibold"
      >
        <Languages className="h-4 w-4 shrink-0" aria-hidden="true" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {LOCALES.map((l) => (
          <SelectItem key={l} value={l} className="text-sm">
            {LOCALE_NAMES[l]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

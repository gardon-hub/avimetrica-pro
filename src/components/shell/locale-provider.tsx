'use client';

/**
 * Proveedor de idioma para la exportación estática (2026-08-18).
 *
 * Antes el idioma lo resolvía el servidor en cada petición
 * (src/i18n/request.ts leía la cookie con next-intl/server). Un sitio
 * estático no tiene petición: este proveedor lee la MISMA cookie
 * `avimetrica-locale` en el navegador.
 *
 * SECUENCIA EN DOS PASOS, a propósito: el primer render usa el idioma por
 * defecto (español), que es exactamente lo que trae el HTML prerenderizado —
 * así no hay desajuste de hidratación—, y el primer efecto cambia al idioma
 * de la cookie. Para es no hay parpadeo alguno; para en/pt dura un cuadro.
 *
 * Los TRES catálogos van empaquetados. Cuesta ~60 KB comprimidos de más, y a
 * cambio el cambio de idioma funciona sin conexión (PWA) y sin peticiones.
 */

import { useEffect, useState } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from '@/i18n/config';
import es from '@/messages/es.json';
import en from '@/messages/en.json';
import pt from '@/messages/pt.json';

const MESSAGES: Record<Locale, typeof es> = { es, en: en as typeof es, pt: pt as typeof es };

function localeDeCookie(): Locale {
  const valor = document.cookie
    .split('; ')
    .find((c) => c.startsWith(`${LOCALE_COOKIE}=`))
    ?.split('=')[1];
  return isLocale(valor) ? valor : DEFAULT_LOCALE;
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const elegido = localeDeCookie();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- segundo paso deliberado: la cookie solo existe en el navegador
    if (elegido !== DEFAULT_LOCALE) setLocale(elegido);
  }, []);

  // `lang` del <html> debe seguir al idioma para que lectores de pantalla y
  // correctores acierten; en estático no puede fijarlo el servidor.
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]}>
      {children}
    </NextIntlClientProvider>
  );
}

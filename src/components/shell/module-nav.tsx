'use client';

/**
 * Navegación entre los módulos de Avimétrica Pro (Fase 8).
 * Cada módulo es un dominio declarado en src/lib/domains/.
 *
 * Los rótulos NO salen del objeto Domain: ese objeto describe el dominio de
 * medición (variable, unidad, criterios y su procedencia), no la interfaz. El
 * texto visible se toma del catálogo de idiomas usando `d.id` como clave.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { DOMINIOS } from '@/lib/domains';
import { Bird, Egg, Sigma } from 'lucide-react';

const ICONOS = {
  aves: Bird,
  huevos: Egg,
  generico: Sigma,
} as const;

export function ModuleNav() {
  const pathname = usePathname();
  const t = useTranslations('nav');

  return (
    <nav aria-label={t('ariaLabel')} className="mb-4">
      <ul className="flex gap-1.5 bg-muted/60 rounded-lg p-1">
        {DOMINIOS.map((d) => {
          const Icono = ICONOS[d.id];
          const activo = pathname === d.route;
          return (
            <li key={d.id} className="flex-1">
              <Link
                href={d.route}
                aria-current={activo ? 'page' : undefined}
                title={t(`${d.id}.description`)}
                className={`flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-semibold transition-colors pointer-coarse:min-h-11 pointer-coarse:text-sm ${
                  activo
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                }`}
              >
                <Icono className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{t(`${d.id}.short`)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

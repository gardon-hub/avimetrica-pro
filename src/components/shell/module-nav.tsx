'use client';

/**
 * Navegación entre los módulos de Avimétrica Pro (Fase 8).
 * Cada módulo es un dominio declarado en src/lib/domains/.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DOMINIOS } from '@/lib/domains';
import { Bird, Egg, Sigma } from 'lucide-react';

const ICONOS = {
  aves: Bird,
  huevos: Egg,
  generico: Sigma,
} as const;

export function ModuleNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Módulos de análisis" className="mb-4">
      <ul className="flex gap-1.5 bg-muted/60 rounded-lg p-1">
        {DOMINIOS.map((d) => {
          const Icono = ICONOS[d.id];
          const activo = pathname === d.route;
          return (
            <li key={d.id} className="flex-1">
              <Link
                href={d.route}
                aria-current={activo ? 'page' : undefined}
                title={d.description}
                className={`flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-semibold transition-colors pointer-coarse:min-h-11 pointer-coarse:text-sm ${
                  activo
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                }`}
              >
                <Icono className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{d.shortLabel}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

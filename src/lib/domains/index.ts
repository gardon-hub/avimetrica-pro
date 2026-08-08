export * from './types';
export { DOMINIO_AVES } from './aves';
export { DOMINIO_HUEVOS, buildUsdaBins, minimoPorHuevoGramos, USDA_DOZEN_OUNCES, GRAMS_PER_OUNCE } from './huevos';
export { DOMINIO_GENERICO } from './generico';

import type { Domain, DomainId } from './types';
import { DOMINIO_AVES } from './aves';
import { DOMINIO_HUEVOS } from './huevos';
import { DOMINIO_GENERICO } from './generico';

/** Todos los dominios disponibles, en el orden de la navegación. */
export const DOMINIOS: Domain[] = [DOMINIO_AVES, DOMINIO_HUEVOS, DOMINIO_GENERICO];

export function getDomain(id: DomainId): Domain {
  const d = DOMINIOS.find((x) => x.id === id);
  if (!d) throw new Error(`Dominio desconocido: ${id}`);
  return d;
}

export function getDomainByRoute(route: string): Domain | undefined {
  return DOMINIOS.find((d) => d.route === route);
}

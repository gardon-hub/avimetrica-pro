'use client';

import { createDatasetStore } from '@/lib/dataset-store';
import { DOMINIO_HUEVOS } from '@/lib/domains';

/** Store del módulo de huevos. Independiente del store histórico de aves. */
export const useHuevosStore = createDatasetStore(DOMINIO_HUEVOS, 'avimetricaHuevos');

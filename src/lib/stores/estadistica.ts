'use client';

import { createDatasetStore } from '@/lib/dataset-store';
import { DOMINIO_GENERICO } from '@/lib/domains';

/** Store del Modo Estadística. La variable la define el usuario. */
export const useEstadisticaStore = createDatasetStore(DOMINIO_GENERICO, 'avimetricaEstadistica');

/** Tipos y helpers de cliente para la API de lotes y pesajes (Fase 5). */

export interface LoteResumen {
  id: string;
  codigo: string;
  granja: string | null;
  galpon: string | null;
  tipoAve: string;
  lineaGenetica: string;
  sexo: string;
  tamanoEstimado: number | null;
  observaciones: string | null;
  createdAt: string;
  updatedAt: string;
  pesajes: Array<{
    id: string;
    fecha: string;
    edadSemanas: number | null;
    _count: { pesos: number };
  }>;
}

export interface BirdWeightRow {
  id: string;
  orden: number;
  gramos: number;
  sector: string | null;
  excluido: boolean;
  motivoExcl: string | null;
}

export interface PesajeFull {
  id: string;
  loteId: string;
  fecha: string;
  edadSemanas: number | null;
  edadDias: number | null;
  unidadOriginal: string;
  metodoMuestreo: string | null;
  numSectores: number | null;
  responsable: string | null;
  observaciones: string | null;
  criterioPct: number;
  appVersion: string | null;
  refDataVersion: string | null;
  pesos: BirdWeightRow[];
}

/**
 * Claves válidas de cada catálogo, en su orden de presentación. Lo que sí
 * pertenece al dominio son los valores y su orden; los rótulos visibles viven
 * en los catálogos de idioma (`birdType`, `sex`, `sampling`).
 */
export const TIPO_AVE_KEYS = ['broiler', 'pollita', 'ponedora', 'reproductora'] as const;
export const SEXO_KEYS = ['hembras', 'machos', 'mixto', 'na'] as const;
export const MUESTREO_KEYS = ['aleatorio', 'sistematico', 'zonas', 'conveniencia', 'ns'] as const;

// Desde 2026-08-18 los datos viven en IndexedDB (ver local-db.ts): estas
// funciones delegan en la API local en vez de llamar a rutas de servidor.
// La importación es dinámica para no evaluar Dexie durante el prerenderizado.

export async function fetchLotes(): Promise<LoteResumen[]> {
  const { listLotes } = await import('@/lib/local-api');
  return listLotes();
}

export async function fetchPesajes(loteId: string): Promise<PesajeFull[]> {
  const { listPesajesByLote } = await import('@/lib/local-api');
  return listPesajesByLote(loteId);
}

export interface PesajeConLote extends PesajeFull {
  lote?: {
    id: string;
    codigo: string;
    lineaGenetica: string;
    granja: string | null;
    galpon: string | null;
  };
}

export async function fetchAllPesajes(): Promise<PesajeConLote[]> {
  const { listAllPesajes } = await import('@/lib/local-api');
  return listAllPesajes();
}

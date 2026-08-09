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

export async function fetchLotes(): Promise<LoteResumen[]> {
  const res = await fetch('/api/lotes');
  if (!res.ok) throw new Error('Error al cargar lotes');
  return res.json();
}

export async function fetchPesajes(loteId: string): Promise<PesajeFull[]> {
  const res = await fetch(`/api/pesajes?loteId=${encodeURIComponent(loteId)}`);
  if (!res.ok) throw new Error('Error al cargar pesajes');
  return res.json();
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
  const res = await fetch('/api/pesajes?all=1');
  if (!res.ok) throw new Error('Error al cargar pesajes');
  return res.json();
}

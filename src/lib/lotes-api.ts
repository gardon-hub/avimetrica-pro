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

export const TIPO_AVE_LABELS: Record<string, string> = {
  broiler: 'Pollo de engorde',
  pollita: 'Pollita de reemplazo',
  ponedora: 'Ponedora',
  reproductora: 'Reproductora',
};

export const SEXO_LABELS: Record<string, string> = {
  hembras: 'Hembras',
  machos: 'Machos',
  mixto: 'Mixto',
  na: 'No aplica',
};

export const MUESTREO_LABELS: Record<string, string> = {
  aleatorio: 'Aleatorio',
  sistematico: 'Sistemático',
  zonas: 'Por zonas',
  conveniencia: 'Conveniencia',
  ns: 'No especificado',
};

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

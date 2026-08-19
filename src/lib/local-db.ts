/**
 * Persistencia local en IndexedDB (Dexie) — sustituye a Prisma/SQLite.
 *
 * Decisión de arquitectura (2026-08-18): para poder publicar la aplicación
 * como sitio estático y que cada usuario conserve SUS datos en SU dispositivo,
 * la base de datos vive en el navegador. Las tablas replican el esquema
 * Prisma que había en prisma/schema.prisma (v0.7.x), incluidas sus decisiones:
 * granja/galpón como texto en el lote, valores del Dataset como JSON en
 * cadena, y exclusión documentada de pesos sin borrado.
 *
 * Las fechas se guardan como cadenas ISO — exactamente lo que las API
 * devolvían al serializar a JSON — para que los componentes no cambien.
 *
 * La instancia se crea perezosamente: los componentes cliente se prerenderizan
 * en la exportación estática y en ese contexto no existe indexedDB.
 */

import Dexie, { type EntityTable } from 'dexie';

export interface LoteRow {
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
}

export interface PesajeRow {
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
  createdAt: string;
  updatedAt: string;
}

export interface PesoRow {
  id: string;
  sessionId: string;
  orden: number;
  gramos: number;
  sector: string | null;
  /** 0 | 1 — IndexedDB no indexa booleanos; la API pública expone boolean. */
  excluido: number;
  motivoExcl: string | null;
}

export interface DatasetRow {
  id: string;
  nombre: string;
  descripcion: string | null;
  dominio: string;
  variableLabel: string;
  variableUnit: string;
  decimales: number;
  /** JSON: number[] — en cadena, como en Prisma. */
  valores: string;
  presetId: string | null;
  /** JSON del ClassificationScheme, en cadena. */
  scheme: string | null;
  origen: string | null;
  responsable: string | null;
  fecha: string | null;
  observaciones: string | null;
  muHipotetica: number | null;
  createdAt: string;
  updatedAt: string;
}

/** Modelo legado (v0.2): sesiones rápidas de pesaje sin lote. */
export interface FlockSessionRow {
  id: string;
  lineaGenetica: string;
  edadSemanas: number | null;
  /** JSON: number[] — en cadena. */
  pesos: string;
  createdAt: string;
  updatedAt: string;
}

type LocalDb = Dexie & {
  lotes: EntityTable<LoteRow, 'id'>;
  pesajes: EntityTable<PesajeRow, 'id'>;
  pesos: EntityTable<PesoRow, 'id'>;
  datasets: EntityTable<DatasetRow, 'id'>;
  flockSessions: EntityTable<FlockSessionRow, 'id'>;
};

let instancia: LocalDb | null = null;

export function getLocalDb(): LocalDb {
  if (!instancia) {
    const db = new Dexie('avimetrica-pro') as LocalDb;
    db.version(1).stores({
      lotes: 'id, updatedAt',
      pesajes: 'id, loteId, fecha',
      pesos: 'id, sessionId',
      datasets: 'id, dominio, updatedAt',
      flockSessions: 'id, updatedAt',
    });
    instancia = db;
  }
  return instancia;
}

export function nuevoId(): string {
  return crypto.randomUUID();
}

export function ahora(): string {
  return new Date().toISOString();
}

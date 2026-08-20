/**
 * Respaldo completo de los datos locales (IndexedDB) a un archivo JSON,
 * y su restauración.
 *
 * Motivo: en la versión publicada los datos viven en el navegador de cada
 * usuario; si borra los datos de navegación, pierde sus lotes. Este módulo
 * da la salida: exportar TODO a un archivo y poder restaurarlo aquí o en
 * otro dispositivo.
 *
 * Decisiones:
 * - El archivo lleva marcador de aplicación y número de FORMATO: un formato
 *   futuro incompatible se rechaza con un mensaje claro, nunca se adivina.
 * - La restauración es un UPSERT por id (bulkPut): añade lo que falta y
 *   restaura lo que existe, pero NO borra lo que no esté en el respaldo.
 *   Así, importar un respaldo viejo sobre datos nuevos no destruye nada —
 *   coherente con la política de la app de no borrar sin que el usuario
 *   lo pida explícitamente.
 * - La validación es estricta en lo estructural (tablas como arreglos,
 *   ids de cadena) y tolerante en lo demás: campos extra se conservan tal
 *   cual, pensando en formatos futuros que solo añadan campos.
 * - Este módulo NO toca el DOM ni dispara descargas: devuelve el objeto y
 *   el nombre de archivo, y el panel decide cómo entregarlo. Así la parte
 *   con lógica queda cubierta por pruebas.
 */

import type { LoteRow, PesajeRow, PesoRow, DatasetRow, FlockSessionRow } from '@/lib/local-db';
import { APP_VERSION } from '@/lib/report-data';

export const FORMATO_RESPALDO = 1;
const MARCADOR_APP = 'avimetrica-pro';

export interface RespaldoV1 {
  app: typeof MARCADOR_APP;
  formato: number;
  appVersion: string;
  exportadoEl: string;
  tablas: {
    lotes: LoteRow[];
    pesajes: PesajeRow[];
    pesos: PesoRow[];
    datasets: DatasetRow[];
    flockSessions: FlockSessionRow[];
  };
}

export interface ResumenRespaldo {
  lotes: number;
  pesajes: number;
  pesos: number;
  datasets: number;
  flockSessions: number;
  exportadoEl: string | null;
  appVersion: string | null;
}

export function resumenDe(r: RespaldoV1): ResumenRespaldo {
  return {
    lotes: r.tablas.lotes.length,
    pesajes: r.tablas.pesajes.length,
    pesos: r.tablas.pesos.length,
    datasets: r.tablas.datasets.length,
    flockSessions: r.tablas.flockSessions.length,
    exportadoEl: r.exportadoEl ?? null,
    appVersion: r.appVersion ?? null,
  };
}

export function construirRespaldo(tablas: RespaldoV1['tablas']): RespaldoV1 {
  return {
    app: MARCADOR_APP,
    formato: FORMATO_RESPALDO,
    appVersion: APP_VERSION,
    exportadoEl: new Date().toISOString(),
    tablas,
  };
}

export function nombreArchivoRespaldo(fecha = new Date()): string {
  return `avimetrica-respaldo-${fecha.toISOString().slice(0, 10)}.json`;
}

/**
 * Claves de error que el panel traduce (catálogo `backup.*`):
 * errNotBackup | errNewerFormat | errCorrupt
 */
export type ValidacionRespaldo =
  | { ok: true; respaldo: RespaldoV1; resumen: ResumenRespaldo }
  | { ok: false; error: 'errNotBackup' | 'errNewerFormat' | 'errCorrupt' };

const TABLAS: Array<keyof RespaldoV1['tablas']> = ['lotes', 'pesajes', 'pesos', 'datasets', 'flockSessions'];

function filasValidas(filas: unknown): filas is Array<{ id: string }> {
  return Array.isArray(filas) && filas.every(
    (f) => typeof f === 'object' && f !== null
      && typeof (f as { id?: unknown }).id === 'string' && (f as { id: string }).id.length > 0,
  );
}

export function validarRespaldo(dato: unknown): ValidacionRespaldo {
  if (typeof dato !== 'object' || dato === null) return { ok: false, error: 'errNotBackup' };
  const r = dato as Partial<RespaldoV1>;
  if (r.app !== MARCADOR_APP) return { ok: false, error: 'errNotBackup' };
  if (typeof r.formato !== 'number') return { ok: false, error: 'errCorrupt' };
  if (r.formato > FORMATO_RESPALDO) return { ok: false, error: 'errNewerFormat' };
  if (typeof r.tablas !== 'object' || r.tablas === null) return { ok: false, error: 'errCorrupt' };
  for (const t of TABLAS) {
    if (!filasValidas((r.tablas as Record<string, unknown>)[t])) return { ok: false, error: 'errCorrupt' };
  }
  const respaldo = r as RespaldoV1;
  return { ok: true, respaldo, resumen: resumenDe(respaldo) };
}

// ─── Operaciones contra IndexedDB (solo en el navegador) ──────────

export async function exportarRespaldo(): Promise<{ contenido: string; nombre: string }> {
  const { getLocalDb } = await import('@/lib/local-db');
  const db = getLocalDb();
  const respaldo = construirRespaldo({
    lotes: await db.lotes.toArray(),
    pesajes: await db.pesajes.toArray(),
    pesos: await db.pesos.toArray(),
    datasets: await db.datasets.toArray(),
    flockSessions: await db.flockSessions.toArray(),
  });
  return { contenido: JSON.stringify(respaldo, null, 2), nombre: nombreArchivoRespaldo() };
}

/** Upsert por id en una sola transacción; no borra nada. */
export async function aplicarRespaldo(r: RespaldoV1): Promise<void> {
  const { getLocalDb } = await import('@/lib/local-db');
  const db = getLocalDb();
  await db.transaction('rw', db.lotes, db.pesajes, db.pesos, db.datasets, db.flockSessions, async () => {
    await db.lotes.bulkPut(r.tablas.lotes);
    await db.pesajes.bulkPut(r.tablas.pesajes);
    await db.pesos.bulkPut(r.tablas.pesos);
    await db.datasets.bulkPut(r.tablas.datasets);
    await db.flockSessions.bulkPut(r.tablas.flockSessions);
  });
}

/** Conteo actual, para que el panel muestre qué hay antes de exportar. */
export async function resumenActual(): Promise<ResumenRespaldo> {
  const { getLocalDb } = await import('@/lib/local-db');
  const db = getLocalDb();
  return {
    lotes: await db.lotes.count(),
    pesajes: await db.pesajes.count(),
    pesos: await db.pesos.count(),
    datasets: await db.datasets.count(),
    flockSessions: await db.flockSessions.count(),
    exportadoEl: null,
    appVersion: null,
  };
}

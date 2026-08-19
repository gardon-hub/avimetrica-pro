/**
 * API de datos local — las mismas operaciones que ofrecían las rutas
 * /api/lotes, /api/pesajes, /api/pesos, /api/datasets y /api/sessions,
 * ahora contra IndexedDB (ver local-db.ts).
 *
 * Cada función replica la SEMÁNTICA de su ruta original: mismas
 * validaciones, mismos valores por defecto, mismo orden de resultados y
 * misma forma de los objetos devueltos (fechas como cadenas ISO, `valores`
 * como JSON en cadena). Así los componentes y tipos existentes no cambian.
 *
 * Los errores se lanzan como Error con el mismo mensaje que devolvía la
 * ruta; quien llama decide el toast.
 */

import { getLocalDb, nuevoId, ahora, type LoteRow, type PesajeRow, type DatasetRow, type FlockSessionRow } from '@/lib/local-db';
import type { LoteResumen, PesajeFull, PesajeConLote, BirdWeightRow } from '@/lib/lotes-api';
import { REFERENCE_DATA_VERSION } from '@/lib/diagnostic-engine';
import { APP_VERSION } from '@/lib/report-data';

/**
 * Una fecha solo-día ("YYYY-MM-DD") se ancla al mediodía local para que no
 * retroceda un día al mostrarse en zonas horarias UTC−n.
 */
function anclarFecha(fecha: unknown): string {
  if (!fecha) return ahora();
  const s = String(fecha);
  return new Date(/^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s}T12:00:00` : s).toISOString();
}

function aBool(v: number): boolean {
  return v === 1;
}

async function pesosDe(sessionId: string): Promise<BirdWeightRow[]> {
  const filas = await getLocalDb().pesos.where('sessionId').equals(sessionId).toArray();
  filas.sort((a, b) => a.orden - b.orden);
  return filas.map((p) => ({
    id: p.id, orden: p.orden, gramos: p.gramos, sector: p.sector,
    excluido: aBool(p.excluido), motivoExcl: p.motivoExcl,
  }));
}

// ─── Lotes ────────────────────────────────────────────────────────

export async function listLotes(): Promise<LoteResumen[]> {
  const db = getLocalDb();
  const lotes = await db.lotes.toArray();
  lotes.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return Promise.all(lotes.map(async (l) => {
    const pesajes = await db.pesajes.where('loteId').equals(l.id).toArray();
    pesajes.sort((a, b) => b.fecha.localeCompare(a.fecha));
    return {
      ...l,
      pesajes: await Promise.all(pesajes.map(async (p) => ({
        id: p.id, fecha: p.fecha, edadSemanas: p.edadSemanas,
        _count: { pesos: await db.pesos.where('sessionId').equals(p.id).count() },
      }))),
    };
  }));
}

export interface NuevoLote {
  codigo: string;
  granja?: string;
  galpon?: string;
  tipoAve?: string;
  lineaGenetica?: string;
  sexo?: string;
  tamanoEstimado?: string | number;
  observaciones?: string;
}

export async function createLote(body: NuevoLote): Promise<LoteRow> {
  if (!body.codigo || typeof body.codigo !== 'string' || !body.codigo.trim()) {
    throw new Error('El código del lote es obligatorio');
  }
  const t = ahora();
  const lote: LoteRow = {
    id: nuevoId(),
    codigo: body.codigo.trim(),
    granja: body.granja?.trim() || null,
    galpon: body.galpon?.trim() || null,
    tipoAve: body.tipoAve || 'broiler',
    lineaGenetica: body.lineaGenetica || 'Broiler - Cobb',
    sexo: body.sexo || 'mixto',
    tamanoEstimado: Number.isFinite(parseInt(String(body.tamanoEstimado), 10)) ? parseInt(String(body.tamanoEstimado), 10) : null,
    observaciones: body.observaciones?.trim() || null,
    createdAt: t,
    updatedAt: t,
  };
  await getLocalDb().lotes.add(lote);
  return lote;
}

/** Borra el lote y, en cascada, sus pesajes y pesos (onDelete: Cascade). */
export async function deleteLote(id: string): Promise<void> {
  const db = getLocalDb();
  await db.transaction('rw', db.lotes, db.pesajes, db.pesos, async () => {
    const pesajes = await db.pesajes.where('loteId').equals(id).primaryKeys();
    for (const pid of pesajes) {
      await db.pesos.where('sessionId').equals(pid).delete();
    }
    await db.pesajes.where('loteId').equals(id).delete();
    await db.lotes.delete(id);
  });
}

// ─── Pesajes ──────────────────────────────────────────────────────

export async function listPesajesByLote(loteId: string): Promise<PesajeFull[]> {
  const db = getLocalDb();
  const pesajes = await db.pesajes.where('loteId').equals(loteId).toArray();
  pesajes.sort((a, b) => a.fecha.localeCompare(b.fecha));
  return Promise.all(pesajes.map(async (p) => ({ ...p, pesos: await pesosDe(p.id) })));
}

export async function listAllPesajes(): Promise<PesajeConLote[]> {
  const db = getLocalDb();
  const pesajes = await db.pesajes.toArray();
  pesajes.sort((a, b) => a.fecha.localeCompare(b.fecha));
  return Promise.all(pesajes.map(async (p) => {
    const lote = await db.lotes.get(p.loteId);
    return {
      ...p,
      pesos: await pesosDe(p.id),
      lote: lote
        ? { id: lote.id, codigo: lote.codigo, lineaGenetica: lote.lineaGenetica, galpon: lote.galpon, granja: lote.granja }
        : undefined,
    };
  }));
}

export interface NuevoPesaje {
  loteId: string;
  fecha?: string;
  edadSemanas?: string | number;
  edadDias?: string | number;
  unidadOriginal?: string;
  metodoMuestreo?: string;
  numSectores?: string | number;
  responsable?: string;
  observaciones?: string;
  criterioPct?: string | number;
  pesos: unknown[];
}

export async function createPesaje(body: NuevoPesaje): Promise<PesajeFull> {
  if (!body.loteId) throw new Error('loteId requerido');
  if (!Array.isArray(body.pesos) || body.pesos.length === 0) {
    throw new Error('Se requiere al menos un peso');
  }
  const pesosNum = body.pesos.map((p) => Number(p)).filter((p) => Number.isFinite(p) && p > 0);
  if (pesosNum.length === 0) throw new Error('Ningún peso válido');

  const db = getLocalDb();
  const t = ahora();
  const pesaje: PesajeRow = {
    id: nuevoId(),
    loteId: body.loteId,
    fecha: anclarFecha(body.fecha),
    edadSemanas: Number.isFinite(parseFloat(String(body.edadSemanas))) ? parseFloat(String(body.edadSemanas)) : null,
    edadDias: Number.isFinite(parseInt(String(body.edadDias), 10)) ? parseInt(String(body.edadDias), 10) : null,
    unidadOriginal: body.unidadOriginal || 'g',
    metodoMuestreo: body.metodoMuestreo || null,
    numSectores: Number.isFinite(parseInt(String(body.numSectores), 10)) ? parseInt(String(body.numSectores), 10) : null,
    responsable: body.responsable?.trim() || null,
    observaciones: body.observaciones?.trim() || null,
    criterioPct: Number.isFinite(parseFloat(String(body.criterioPct))) ? parseFloat(String(body.criterioPct)) : 10,
    appVersion: APP_VERSION,
    refDataVersion: REFERENCE_DATA_VERSION,
    createdAt: t,
    updatedAt: t,
  };
  await db.transaction('rw', db.pesajes, db.pesos, db.lotes, async () => {
    await db.pesajes.add(pesaje);
    await db.pesos.bulkAdd(pesosNum.map((gramos, i) => ({
      id: nuevoId(), sessionId: pesaje.id, orden: i + 1, gramos,
      sector: null, excluido: 0, motivoExcl: null,
    })));
    // toca updatedAt del lote para que suba en el listado
    await db.lotes.update(body.loteId, { updatedAt: ahora() });
  });
  return { ...pesaje, pesos: await pesosDe(pesaje.id) };
}

export async function deletePesaje(id: string): Promise<void> {
  const db = getLocalDb();
  await db.transaction('rw', db.pesajes, db.pesos, async () => {
    await db.pesos.where('sessionId').equals(id).delete();
    await db.pesajes.delete(id);
  });
}

// ─── Pesos individuales (edición documentada) ─────────────────────

export interface PatchPeso {
  gramos?: unknown;
  sector?: unknown;
  excluido?: unknown;
  motivoExcl?: unknown;
}

export async function patchPeso(id: string, body: PatchPeso): Promise<BirdWeightRow> {
  const db = getLocalDb();
  const data: Partial<import('@/lib/local-db').PesoRow> = {};

  if (body.gramos !== undefined) {
    const g = Number(body.gramos);
    if (!Number.isFinite(g) || g <= 0) throw new Error('gramos debe ser un número positivo');
    data.gramos = g;
  }
  if (body.sector !== undefined) {
    data.sector = typeof body.sector === 'string' && body.sector.trim() ? body.sector.trim() : null;
  }
  if (body.excluido !== undefined) {
    data.excluido = body.excluido ? 1 : 0;
    // Al reincluir, se limpia el motivo; al excluir se conserva el enviado
    if (!body.excluido) data.motivoExcl = null;
  }
  if (body.motivoExcl !== undefined) {
    data.motivoExcl = typeof body.motivoExcl === 'string' && body.motivoExcl.trim() ? body.motivoExcl.trim() : null;
  }
  if (Object.keys(data).length === 0) throw new Error('Nada que actualizar');

  await db.pesos.update(id, data);
  const p = await db.pesos.get(id);
  if (!p) throw new Error('No encontrado');
  return { id: p.id, orden: p.orden, gramos: p.gramos, sector: p.sector, excluido: aBool(p.excluido), motivoExcl: p.motivoExcl };
}

/** Borrado real (solo para duplicados accidentales; se prefiere excluir). */
export async function deletePeso(id: string): Promise<void> {
  await getLocalDb().pesos.delete(id);
}

// ─── Conjuntos de datos (huevos y docencia) ───────────────────────

export interface DatasetLigero {
  id: string;
  nombre: string;
  descripcion: string | null;
  dominio: string;
  variableLabel: string;
  variableUnit: string;
  decimales: number;
  origen: string | null;
  responsable: string | null;
  fecha: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Listado ligero: sin los valores, que pueden ser largos. */
export async function listDatasets(dominio?: string): Promise<DatasetLigero[]> {
  const db = getLocalDb();
  const filas = dominio
    ? await db.datasets.where('dominio').equals(dominio).toArray()
    : await db.datasets.toArray();
  filas.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return filas.map(({ valores: _v, presetId: _p, scheme: _s, observaciones: _o, muHipotetica: _m, ...ligero }) => ligero);
}

export async function getDataset(id: string): Promise<DatasetRow> {
  const ds = await getLocalDb().datasets.get(id);
  if (!ds) throw new Error('No encontrado');
  return ds;
}

export interface NuevoDataset {
  nombre: string;
  descripcion?: string;
  dominio?: string;
  variableLabel?: string;
  variableUnit?: string;
  decimales?: string | number;
  valores: unknown[];
  presetId?: string | null;
  scheme?: unknown;
  origen?: string;
  responsable?: string;
  fecha?: string;
  observaciones?: string;
  muHipotetica?: string | number | null;
}

export async function createDataset(body: NuevoDataset): Promise<DatasetRow> {
  if (!body.nombre || typeof body.nombre !== 'string' || !body.nombre.trim()) {
    throw new Error('El nombre del conjunto es obligatorio');
  }
  if (!Array.isArray(body.valores)) throw new Error('valores debe ser un arreglo');
  const nums = body.valores.map(Number).filter((v) => Number.isFinite(v));

  const t = ahora();
  const ds: DatasetRow = {
    id: nuevoId(),
    nombre: body.nombre.trim(),
    descripcion: body.descripcion?.trim() || null,
    dominio: body.dominio === 'huevos' || body.dominio === 'aves' ? body.dominio : 'generico',
    variableLabel: body.variableLabel?.trim() || 'Variable',
    variableUnit: body.variableUnit?.trim() || '',
    decimales: Number.isFinite(parseInt(String(body.decimales), 10)) ? parseInt(String(body.decimales), 10) : 2,
    valores: JSON.stringify(nums),
    presetId: body.presetId || null,
    scheme: body.scheme ? JSON.stringify(body.scheme) : null,
    origen: body.origen?.trim() || null,
    responsable: body.responsable?.trim() || null,
    fecha: body.fecha ? anclarFecha(body.fecha) : null,
    observaciones: body.observaciones?.trim() || null,
    muHipotetica: Number.isFinite(parseFloat(String(body.muHipotetica))) ? parseFloat(String(body.muHipotetica)) : null,
    createdAt: t,
    updatedAt: t,
  };
  await getLocalDb().datasets.add(ds);
  return ds;
}

export async function deleteDataset(id: string): Promise<void> {
  await getLocalDb().datasets.delete(id);
}

// ─── Sesiones rápidas (modelo legado v0.2) ────────────────────────

export async function listFlockSessions(): Promise<FlockSessionRow[]> {
  const filas = await getLocalDb().flockSessions.toArray();
  filas.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return filas;
}

export async function createFlockSession(body: {
  lineaGenetica?: string;
  edadSemanas?: string | number;
  pesos?: number[];
}): Promise<FlockSessionRow> {
  const t = ahora();
  const s: FlockSessionRow = {
    id: nuevoId(),
    lineaGenetica: body.lineaGenetica || 'Broiler - Cobb',
    edadSemanas: body.edadSemanas ? parseInt(String(body.edadSemanas), 10) : null,
    pesos: JSON.stringify(body.pesos || []),
    createdAt: t,
    updatedAt: t,
  };
  await getLocalDb().flockSessions.add(s);
  return s;
}

export async function deleteFlockSession(id?: string): Promise<void> {
  const db = getLocalDb();
  if (id) await db.flockSessions.delete(id);
  else await db.flockSessions.clear();
}

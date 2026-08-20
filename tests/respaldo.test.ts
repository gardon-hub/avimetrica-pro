/**
 * Validación del respaldo completo (lib/respaldo.ts).
 *
 * Lo que importa proteger: que un archivo ajeno, dañado o de un formato
 * futuro se RECHACE con su clave de error correcta antes de tocar la base,
 * y que un respaldo legítimo pase entero (campos extra incluidos, pensando
 * en formatos futuros que solo añadan campos).
 */

import { describe, it, expect } from 'vitest';
import {
  construirRespaldo, validarRespaldo, resumenDe, nombreArchivoRespaldo,
  FORMATO_RESPALDO, type RespaldoV1,
} from '../src/lib/respaldo';

function tablasDemo(): RespaldoV1['tablas'] {
  return {
    lotes: [{
      id: 'l1', codigo: 'Lote A', granja: null, galpon: null, tipoAve: 'broiler',
      lineaGenetica: 'Broiler - Cobb', sexo: 'mixto', tamanoEstimado: null,
      observaciones: null, createdAt: '2026-08-18T12:00:00.000Z', updatedAt: '2026-08-18T12:00:00.000Z',
    }],
    pesajes: [{
      id: 'p1', loteId: 'l1', fecha: '2026-08-18T18:00:00.000Z', edadSemanas: 6,
      edadDias: null, unidadOriginal: 'g', metodoMuestreo: null, numSectores: null,
      responsable: null, observaciones: null, criterioPct: 10, appVersion: '0.7.1',
      refDataVersion: '1', createdAt: '2026-08-18T12:00:00.000Z', updatedAt: '2026-08-18T12:00:00.000Z',
    }],
    pesos: [
      { id: 'w1', sessionId: 'p1', orden: 1, gramos: 2400, sector: null, excluido: 0, motivoExcl: null },
      { id: 'w2', sessionId: 'p1', orden: 2, gramos: 2450, sector: null, excluido: 0, motivoExcl: null },
    ],
    datasets: [],
    flockSessions: [],
  };
}

describe('respaldo completo', () => {
  it('un respaldo recién construido valida y su resumen cuenta bien', () => {
    const r = construirRespaldo(tablasDemo());
    const v = validarRespaldo(JSON.parse(JSON.stringify(r)));
    expect(v.ok).toBe(true);
    if (v.ok) {
      expect(v.resumen).toMatchObject({ lotes: 1, pesajes: 1, pesos: 2, datasets: 0, flockSessions: 0 });
      expect(v.resumen.exportadoEl).toBe(r.exportadoEl);
    }
  });

  it('conserva campos extra de formatos futuros compatibles', () => {
    const r = construirRespaldo(tablasDemo()) as RespaldoV1 & { extra?: string };
    r.extra = 'algo nuevo';
    (r.tablas.lotes[0] as unknown as Record<string, unknown>).campoNuevo = 42;
    const v = validarRespaldo(r);
    expect(v.ok).toBe(true);
    if (v.ok) {
      expect((v.respaldo.tablas.lotes[0] as unknown as Record<string, unknown>).campoNuevo).toBe(42);
    }
  });

  it('rechaza archivos que no son un respaldo (errNotBackup)', () => {
    expect(validarRespaldo(null)).toEqual({ ok: false, error: 'errNotBackup' });
    expect(validarRespaldo([1, 2, 3])).toEqual({ ok: false, error: 'errNotBackup' });
    expect(validarRespaldo({ app: 'otra-app', formato: 1, tablas: {} })).toEqual({ ok: false, error: 'errNotBackup' });
  });

  it('rechaza un formato más nuevo con su clave propia (errNewerFormat)', () => {
    const r = construirRespaldo(tablasDemo());
    const v = validarRespaldo({ ...r, formato: FORMATO_RESPALDO + 1 });
    expect(v).toEqual({ ok: false, error: 'errNewerFormat' });
  });

  it('rechaza estructuras dañadas (errCorrupt)', () => {
    const base = construirRespaldo(tablasDemo());
    // formato no numérico
    expect(validarRespaldo({ ...base, formato: '1' })).toEqual({ ok: false, error: 'errCorrupt' });
    // falta una tabla
    const sinPesos = JSON.parse(JSON.stringify(base));
    delete sinPesos.tablas.pesos;
    expect(validarRespaldo(sinPesos)).toEqual({ ok: false, error: 'errCorrupt' });
    // una tabla no es arreglo
    expect(validarRespaldo({ ...base, tablas: { ...base.tablas, lotes: 'x' } })).toEqual({ ok: false, error: 'errCorrupt' });
    // una fila sin id
    const filaSinId = JSON.parse(JSON.stringify(base));
    delete filaSinId.tablas.pesos[0].id;
    expect(validarRespaldo(filaSinId)).toEqual({ ok: false, error: 'errCorrupt' });
  });

  it('el nombre del archivo lleva la fecha del día', () => {
    expect(nombreArchivoRespaldo(new Date('2026-08-18T15:00:00Z'))).toBe('avimetrica-respaldo-2026-08-18.json');
  });

  it('resumenDe cuenta cada tabla', () => {
    const r = construirRespaldo(tablasDemo());
    expect(resumenDe(r).pesos).toBe(2);
  });
});

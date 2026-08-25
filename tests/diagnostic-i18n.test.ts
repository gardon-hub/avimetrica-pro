/**
 * El motor de diagnóstico emite mensajes {key, params} (2026-08-25): estas
 * pruebas garantizan que TODA clave que el motor pueda emitir existe en los
 * tres catálogos y se interpola sin dejar huecos «{param}» — el fallo que ni
 * typecheck ni lint pueden ver.
 *
 * La matriz de escenarios cubre los dos tipos de ave, todas las etapas,
 * los tres niveles de uniformidad, los sesgos (debajo/encima/simétrico),
 * CV normales y extremos, muestras chicas y grandes, y pesos por debajo,
 * dentro y por encima de la referencia — es decir, todas las ramas que
 * eligen claves distintas.
 */

import { describe, it, expect } from 'vitest';
import { createTranslator } from 'next-intl';
import es from '../src/messages/es.json';
import en from '../src/messages/en.json';
import pt from '../src/messages/pt.json';
import { generateDiagnostic, type DiagnosticInput, type MensajeDiagnostico } from '../src/lib/diagnostic-engine';

const CATALOGOS = [['es', es], ['en', en], ['pt', pt]] as const;

function escenarios(): DiagnosticInput[] {
  const out: DiagnosticInput[] = [];
  const lineas = ['Broiler - Cobb', 'Ponedora - Hy-Line Brown', 'Criolla mejorada UNAG'];
  const edades = [0, 1, 3, 5, 6, 12, 18, 22];
  const niveles = [
    { uniformidad: 92, cv: 5 },
    { uniformidad: 78, cv: 12 },
    { uniformidad: 55, cv: 17 },
  ];
  const sesgos = [
    { debajo: 12, encima: 0 },
    { debajo: 0, encima: 12 },
    { debajo: 6, encima: 6 },
  ];
  const promedios = [800, 1600, 2400, 3600]; // debajo / dentro / encima según edad
  const totales = [20, 60];

  for (const lineaGenetica of lineas) {
    for (const edadSemanas of edades) {
      for (const nivel of niveles) {
        for (const sesgo of sesgos) {
          for (const promedio of promedios) {
            for (const totalAves of totales) {
              const fuera = sesgo.debajo + sesgo.encima;
              out.push({
                lineaGenetica,
                edadSemanas,
                promedio,
                desvEst: promedio * (nivel.cv / 100),
                cv: nivel.cv,
                uniformidad: nivel.uniformidad,
                limiteInf: promedio * 0.9,
                limiteSup: promedio * 1.1,
                countDebajo: sesgo.debajo,
                countEncima: sesgo.encima,
                countDentro: totalAves - fuera,
                totalAves,
              });
            }
          }
        }
      }
    }
  }
  return out;
}

function mensajesDe(d: ReturnType<typeof generateDiagnostic>): MensajeDiagnostico[] {
  return [
    d.titulo,
    { key: d.stageKey },
    ...d.interpretacion,
    ...d.pesoComparacion,
    ...d.alertas,
    ...d.causas,
    ...d.recomendaciones,
    d.didactico,
  ];
}

describe('motor de diagnóstico: claves de catálogo', () => {
  const todos = escenarios();
  const emitidas = new Set<string>();
  const porClave = new Map<string, MensajeDiagnostico>();
  for (const input of todos) {
    for (const m of mensajesDe(generateDiagnostic(input))) {
      emitidas.add(m.key);
      if (!porClave.has(m.key)) porClave.set(m.key, m);
    }
  }

  it(`la matriz de ${todos.length} escenarios ejercita un buen surtido de claves`, () => {
    // Si esto baja, se rompió alguna rama del motor o la matriz quedó corta.
    expect(emitidas.size).toBeGreaterThan(90);
  });

  for (const [locale, catalogo] of CATALOGOS) {
    it(`toda clave emitida existe y se interpola en ${locale}`, () => {
      const t = createTranslator({ locale, messages: catalogo as never });
      for (const m of porClave.values()) {
        const texto = (t as unknown as (k: string, v?: Record<string, string | number>) => string)(
          `diagnosticEngine.${m.key}`,
          m.params,
        );
        expect(texto, m.key).not.toMatch(/diagnosticEngine\./); // clave sin resolver
        expect(texto, m.key).not.toMatch(/\{[a-zA-Z]+\}/); // parámetro sin interpolar
      }
    });
  }

  it('el nivel y las claves de título son coherentes', () => {
    const d = generateDiagnostic({
      lineaGenetica: 'Broiler - Cobb', edadSemanas: 5, promedio: 2428, desvEst: 60,
      cv: 2.5, uniformidad: 100, limiteInf: 2185, limiteSup: 2671,
      countDebajo: 0, countEncima: 0, countDentro: 32, totalAves: 32,
    });
    expect(d.level).toBe('excellent');
    expect(d.titulo.key).toBe('title.excellent');
    expect(d.stageKey).toBe('stage.engorde');
  });
});

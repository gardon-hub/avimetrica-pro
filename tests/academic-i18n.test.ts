/**
 * El modo académico emite mensajes {key, params} (2026-08-25): igual que con
 * el motor de diagnóstico, se verifica que toda clave que pueda emitir exista
 * y se interpole en los tres catálogos reales.
 *
 * Los escenarios cubren las ramas que cambian claves: con y sin referencia
 * de peso (línea con guía vs. criolla / sin edad), prueba t que rechaza y que
 * no, normalidad aceptada y rechazada, y presencia o ausencia de atípicos.
 */

import { describe, it, expect } from 'vitest';
import { createTranslator } from 'next-intl';
import es from '../src/messages/es.json';
import en from '../src/messages/en.json';
import pt from '../src/messages/pt.json';
import { buildReportData } from '../src/lib/report-data';
import { buildAcademicSections, type MensajeAcademico } from '../src/lib/academic-mode';

const CATALOGOS = [['es', es], ['en', en], ['pt', pt]] as const;

const NORMALES = Array.from({ length: 30 }, (_, i) => 2400 + (i % 10) * 12);
const CON_ATIPICO = [...NORMALES.slice(0, 28), 1200, 3900]; // rechaza normalidad y marca atípicos
const CASOS = [
  // Con referencia, cerca del objetivo (t no rechaza en semana 5)
  { pesos: NORMALES.map((p) => p + 60), lineaGenetica: 'Broiler - Cobb', edadSemanas: '5' },
  // Con referencia, lejísimos del objetivo (t rechaza)
  { pesos: NORMALES, lineaGenetica: 'Broiler - Cobb', edadSemanas: '6' },
  // Sin referencia (línea propia) y sin edad
  { pesos: NORMALES, lineaGenetica: 'Criolla mejorada UNAG', edadSemanas: '' },
  // Atípicos presentes + normalidad rechazada
  { pesos: CON_ATIPICO, lineaGenetica: 'Broiler - Cobb', edadSemanas: '5' },
  // Muestra mínima (sin K² de D'Agostino, IC presente)
  { pesos: [2400, 2410, 2450, 2500, 2390], lineaGenetica: 'Ponedora - Hy-Line Brown', edadSemanas: '22' },
];

function mensajesDe(secciones: ReturnType<typeof buildAcademicSections>): MensajeAcademico[] {
  return secciones.flatMap((s) => [
    s.titulo, s.queSeCalculo, s.formula, ...s.resultado, s.interpretacion, ...s.erroresComunes,
  ]);
}

describe('modo académico: claves de catálogo', () => {
  const porClave = new Map<string, MensajeAcademico>();
  for (const caso of CASOS) {
    const d = buildReportData({ ...caso, criterioPct: 10, contexto: {} })!;
    for (const m of mensajesDe(buildAcademicSections(d))) {
      if (!porClave.has(m.key)) porClave.set(m.key, m);
    }
  }

  it('los escenarios ejercitan un buen surtido de claves', () => {
    expect(porClave.size).toBeGreaterThan(45);
  });

  for (const [locale, catalogo] of CATALOGOS) {
    it(`toda clave emitida existe y se interpola en ${locale}`, () => {
      const t = createTranslator({ locale, messages: catalogo as never });
      for (const m of porClave.values()) {
        const texto = (t as unknown as (k: string, v?: Record<string, string | number>) => string)(
          `academic.${m.key}`,
          m.params,
        );
        expect(texto, m.key).not.toMatch(/academic\./);
        expect(texto, m.key).not.toMatch(/\{[a-zA-Z]+\}/);
      }
    });
  }

  it('ambas ramas de la prueba t y de la normalidad quedan cubiertas', () => {
    const claves = [...porClave.keys()];
    expect(claves).toContain('ttest.interpReject');
    expect(claves).toContain('ttest.interpNotReject');
    expect(claves).toContain('normal.interpOk');
    expect(claves).toContain('normal.interpRejected');
    expect(claves).toContain('outliers.titulo');
  });
});

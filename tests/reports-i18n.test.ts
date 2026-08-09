/**
 * Guarda contra los dos fallos de traducción que YA se colaron en documentos
 * impresos y que ni typecheck, ni lint, ni las pruebas de estadística detectan:
 *
 *  1. Una clave sin resolver impresa tal cual («reports.dataset.shapiro»),
 *     que ocurre cuando el mensaje lleva etiquetas y next-intl lo trata como
 *     rich text.
 *  2. Doble escapado («p = &lt; 0.0001» literal), cuando un valor ya viene con
 *     entidades HTML y la plantilla lo vuelve a escapar.
 *
 * Por eso NO se asierta sobre el texto traducible —que puede cambiar— sino
 * sobre el hecho de que el documento salga resuelto en los tres idiomas, con
 * los catálogos reales.
 */

import { describe, it, expect } from 'vitest';
import { createTranslator } from 'next-intl';
import es from '../src/messages/es.json';
import en from '../src/messages/en.json';
import pt from '../src/messages/pt.json';
import { buildPesajesComparisonReportHtml } from '../src/lib/pesajes-comparison-report';
import { calculateStats } from '../src/lib/calculations';
import { twoSampleTTest, meanConfidenceInterval } from '../src/lib/statistics/inference';
import { median } from '../src/lib/statistics/descriptive';

const CATALOGOS = [['es', es], ['en', en], ['pt', pt]] as const;

const A = [1180, 1220, 1150, 1300, 1240, 1190, 1260, 1210, 1170, 1230, 1290, 1205];
const B = [1320, 1380, 1290, 1450, 1400, 1310, 1420, 1360, 1330, 1390, 1440, 1355];

function reportePesajes(locale: string, messages: unknown): string {
  const t = createTranslator({ locale, messages: messages as never });
  return buildPesajesComparisonReportHtml(
    {
      lineaGenetica: 'Hy-Line Brown',
      a: { etiqueta: 'A', fecha: '2026-01-01', edadSemanas: 10, lote: 'L1', stats: calculateStats(A, 10), mediana: median(A), ci: meanConfidenceInterval(A, 0.95) },
      b: { etiqueta: 'B', fecha: '2026-02-01', edadSemanas: 14, lote: 'L2', stats: calculateStats(B, 10), mediana: median(B), ci: meanConfidenceInterval(B, 0.95) },
      test: twoSampleTTest(A, B, 'two-sided', 0.95),
      pareada: false,
      diseno: 'independientes',
      entreLotes: true,
      lineasDistintas: { a: 'Hy-Line Brown', b: 'Lohmann LSL' },
    },
    { locale, t: t as never },
  );
}

/** Texto del documento tal como lo vería el lector: sin etiquetas y con las
 *  entidades resueltas UNA vez, que es lo que hace el navegador. Lo que siga
 *  escapado después es doble escapado. */
function textoVisible(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

describe('reporte de comparación de pesajes: idiomas', () => {
  for (const [locale, messages] of CATALOGOS) {
    it(`sale resuelto en ${locale}`, () => {
      const html = reportePesajes(locale, messages);
      const texto = textoVisible(html);

      expect(texto.match(/reports\.[a-zA-Z.]+/g)).toBeNull();
      expect(texto.match(/credits\.[a-zA-Z.]+/g)).toBeNull();
      expect(texto.match(/&(lt|gt|amp);/g)).toBeNull();
      expect(html).toContain(`lang="${locale}"`);
    });
  }

  it('no deja el documento en un solo idioma', () => {
    const titulos = CATALOGOS.map(([locale, messages]) =>
      /<title>([^<]*)<\/title>/.exec(reportePesajes(locale, messages))![1],
    );
    expect(new Set(titulos).size).toBe(3);
  });
});

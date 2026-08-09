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
import * as XLSX from 'xlsx';
import { buildPesajesComparisonReportHtml } from '../src/lib/pesajes-comparison-report';
import { buildWorkbook } from '../src/lib/export-excel';
import { buildDatasetWorkbook } from '../src/lib/dataset-excel';
import { buildReportData } from '../src/lib/report-data';
import { calculateStats } from '../src/lib/calculations';
import { twoSampleTTest, meanConfidenceInterval } from '../src/lib/statistics/inference';
import { median } from '../src/lib/statistics/descriptive';
import { qqPoints } from '../src/lib/statistics/normality';
import {
  categoriasBarSvg, categoriasComparadasSvg, mediasComparadasSvg, mediaVsObjetivoSvg,
  boxplotSvg, qqPlotSvg, bandaVsIcSvg, lineasEvolucionSvg, gananciaDiariaBarSvg,
} from '../src/lib/dataset-report-charts';
import { classify } from '../src/lib/classification';
import { uniformityCurveSvg, histogramSvg } from '../src/lib/report-charts';

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

/** Cualquier clave del catálogo impresa tal cual, en cualquier espacio. */
const CLAVE_SIN_RESOLVER = /\b(reports|excel|credits|sampling|outlierMethods)\.[a-zA-Z]+(\.[a-zA-Z]+)*/;

describe('gráficos de los reportes: idiomas', () => {
  const bins = classify([1, 2, 3, 4, 5, 6], { type: 'relative-band', pct: 10 });

  for (const [locale, messages] of CATALOGOS) {
    it(`rotula todos los gráficos en ${locale}`, () => {
      const t = createTranslator({ locale, messages: messages as never }) as never as
        (k: string, v?: Record<string, string | number>) => string;
      const svgs = [
        categoriasBarSvg(bins.bins, 2, 8, t),
        categoriasComparadasSvg([{ label: 'A', pctA: 10, pctB: 20 }], 'A', 'B'),
        mediasComparadasSvg(10, 12, { lower: 9, upper: 11 }, { lower: 11, upper: 13 }, 'A', 'B', 'g', 1, t),
        mediaVsObjetivoSvg(10, { lower: 9, upper: 11 }, 12, 'objetivo', 'g', 1, t),
        boxplotSvg(2, 3, 4, 1, 6, [9], 'g', 1, t),
        qqPlotSvg(qqPoints([1, 2, 3, 4, 5, 6], 3.5, 1.87), 'g', 1, t),
        bandaVsIcSvg(10, 9, 11, 9.8, 10.2, 10, 'g', 1, t),
        lineasEvolucionSvg(['s1', 's2'], [{ label: 'media', color: '#000', valores: [1, 2] }], 'g', 1, 'título', t),
        gananciaDiariaBarSvg([{ label: 'p1', gDia: 12 }], 'g', t),
        uniformityCurveSvg(2400, 60, 2160, 2640, 95, 10, t),
        histogramSvg(Array.from({ length: 30 }, (_, i) => 2400 + (i % 10) * 12), 2450, 40, 2205, 2695, t),
      ];
      for (const svg of svgs) {
        expect(svg).not.toBe('');
        expect(svg).not.toMatch(CLAVE_SIN_RESOLVER);
      }
    });
  }
});

describe('libros de Excel: idiomas', () => {
  const pesos = Array.from({ length: 30 }, (_, i) => 2400 + (i % 10) * 12);

  /** Todo el texto del libro, hoja por hoja, como lo vería quien lo abre. */
  function textoLibro(wb: XLSX.WorkBook): string {
    return [
      ...wb.SheetNames,
      ...wb.SheetNames.flatMap((n) =>
        (XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1 }) as unknown[][]).flat().map(String),
      ),
    ].join('\n');
  }

  for (const [locale, messages] of CATALOGOS) {
    it(`el libro de aves sale resuelto en ${locale}`, () => {
      const t = createTranslator({ locale, messages: messages as never });
      const d = buildReportData({
        pesos, lineaGenetica: 'Broiler - Cobb', edadSemanas: '6', criterioPct: 10,
        contexto: { lote: 'L-1', metodoMuestreo: 'aleatorio' },
      })!;
      const texto = textoLibro(buildWorkbook(d, { locale, t: t as never }));
      expect(texto).not.toMatch(CLAVE_SIN_RESOLVER);
      expect(texto).not.toMatch(/&(lt|gt|amp);/);
    });

    it(`el libro de conjuntos sale resuelto en ${locale}`, () => {
      const t = createTranslator({ locale, messages: messages as never });
      const wb = buildDatasetWorkbook(
        {
          tituloModulo: 'Huevos',
          valores: [58, 61, 63, 55, 67, 70, 59, 62],
          variable: { label: 'Peso del huevo', unit: 'g', decimals: 1 },
          scheme: { type: 'absolute-bins', bins: [{ label: 'Medium', min: 49.6, max: 56.7 }, { label: 'Large', min: 56.7, max: null }] },
          criterioLabel: 'USDA',
          criterioFuente: 'USDA AMS',
          criterioOficial: true,
          contexto: { nombre: 'M1', origen: 'Granja', responsable: 'X', fecha: '2026-01-01', observaciones: '' },
          muHipotetica: null,
        },
        { locale, t: t as never },
      )!;
      const texto = textoLibro(wb);
      expect(texto).not.toMatch(CLAVE_SIN_RESOLVER);
      expect(texto).not.toMatch(/&(lt|gt|amp);/);
    });
  }
});

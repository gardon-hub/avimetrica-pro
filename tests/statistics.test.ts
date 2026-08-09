/**
 * Batería de pruebas del módulo estadístico.
 * Valores de referencia calculados con R 4.4 / SciPy 1.13 (documentado en
 * cada caso). Tolerancias acordes a la precisión declarada de cada función.
 */
import { describe as suite, it, expect } from 'vitest';
import {
  describe as describeStats,
  mean,
  median,
  percentile,
  sortAsc,
  varianceSample,
  variancePopulation,
  sdSample,
  skewness,
  kurtosisExcess,
  modes,
  proportionWithinPct,
} from '../src/lib/statistics/descriptive';
import {
  normalPdf,
  normalCdf,
  normalInv,
  tCdf,
  tInv,
  normalTailFromP,
  normalTailFromX,
} from '../src/lib/statistics/distributions';
import { oneSampleTTest, meanConfidenceInterval } from '../src/lib/statistics/inference';
import { detectOutliers, medianAbsoluteDeviation } from '../src/lib/statistics/outliers';
import { buildHistogram, sturgesBins } from '../src/lib/statistics/histogram';
import { dagostinoPearson, chiSquareCdf, qqPoints } from '../src/lib/statistics/normality';

suite('descriptiva básica', () => {
  const data = [2, 4, 4, 4, 5, 5, 7, 9]; // ejemplo clásico

  it('media', () => {
    expect(mean(data)).toBeCloseTo(5, 12);
  });

  it('varianza y SD poblacional (ejemplo clásico: SD=2)', () => {
    expect(variancePopulation(data)).toBeCloseTo(4, 12);
  });

  it('varianza y SD muestral', () => {
    // R: var(c(2,4,4,4,5,5,7,9)) = 4.571429
    expect(varianceSample(data)).toBeCloseTo(4.5714285714, 8);
    expect(sdSample(data)).toBeCloseTo(2.1380899353, 8);
  });

  it('mediana par e impar', () => {
    expect(median([1, 3, 5])).toBe(3);
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  it('percentiles R-7 (como quantile() de R por defecto)', () => {
    const d = sortAsc([15, 20, 35, 40, 50]);
    // R: quantile(c(15,20,35,40,50), .25) = 20, .75 = 40, .40 = 29
    expect(percentile(d, 25)).toBeCloseTo(20, 10);
    expect(percentile(d, 75)).toBeCloseTo(40, 10);
    expect(percentile(d, 40)).toBeCloseTo(29, 10);
  });

  it('modas', () => {
    expect(modes([1, 2, 2, 3, 3, 4])).toEqual([2, 3]);
    expect(modes([1, 2, 3])).toEqual([]);
  });

  it('asimetría G1 (SPSS/Minitab)', () => {
    // A mano: g1 = m3/m2^1.5 = 5.25/8 = 0.65625;
    // G1 = g1·sqrt(n(n-1))/(n-2) = 0.65625·sqrt(56)/6 = 0.8184876
    expect(skewness(data)!).toBeCloseTo(0.8184876, 6);
  });

  it('curtosis G2 (SPSS/Minitab)', () => {
    // A mano: g2 = m4/m2² - 3 = 44.5/16 - 3 = -0.21875;
    // G2 = ((n+1)g2+6)(n-1)/((n-2)(n-3)) = 4.03125·7/30 = 0.940625 exacto
    expect(kurtosisExcess(data)!).toBeCloseTo(0.940625, 10);
  });

  it('describe integra todo y maneja n=1', () => {
    const d1 = describeStats([100]);
    expect(d1!.n).toBe(1);
    expect(d1!.mean).toBe(100);
    expect(Number.isNaN(d1!.sdSample)).toBe(true); // muestral indefinida con n=1
    expect(d1!.sdPopulation).toBe(0);
    expect(describeStats([])).toBeNull();
  });

  it('proporción dentro de ±10%', () => {
    // media=107.5; ±10% → [96.75, 118.25]; dentro: 100 y 110 → 50%
    expect(proportionWithinPct([90, 100, 110, 130], 10)).toBeCloseTo(50, 10);
  });
});

suite('distribución normal', () => {
  it('PDF estándar en 0', () => {
    expect(normalPdf(0)).toBeCloseTo(0.3989422804014327, 12);
  });

  it('CDF: valores conocidos', () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 12);
    expect(normalCdf(1.96)).toBeCloseTo(0.9750021048517795, 7);
    expect(normalCdf(-1.6448536269514722)).toBeCloseTo(0.05, 7);
  });

  it('Z crítico cola derecha 0.05 ≈ 1.64485 (criterio de aceptación)', () => {
    expect(normalInv(0.95)).toBeCloseTo(1.6448536269514722, 8);
  });

  it('Z crítico bilateral alfa 0.05 ≈ ±1.95996', () => {
    expect(normalInv(0.975)).toBeCloseTo(1.959963984540054, 8);
    expect(normalInv(0.025)).toBeCloseTo(-1.959963984540054, 8);
  });

  it('inversa y CDF son consistentes en escala no estándar', () => {
    const x = normalInv(0.6879, 1450, 85);
    expect(normalCdf(x, 1450, 85)).toBeCloseTo(0.6879, 9);
  });

  it('colas estilo Minitab: cola derecha 0.05 de N(0,1)', () => {
    const r = normalTailFromP('right', 0, 1, 0.05)!;
    expect(r.bounds[0]).toBeCloseTo(1.6448536269514722, 8);
  });

  it('área central 0.90 de N(0,1) → ±1.64485', () => {
    const r = normalTailFromP('center', 0, 1, 0.9)!;
    expect(r.bounds[0]).toBeCloseTo(-1.6448536269514722, 8);
    expect(r.bounds[1]).toBeCloseTo(1.6448536269514722, 8);
  });

  it('probabilidad desde X: P(X<1350) con N(1450,85)', () => {
    // Verificado por serie de Taylor de erf: Φ((1350-1450)/85) = 0.1197034394
    const r = normalTailFromX('left', 1450, 85, 1350)!;
    expect(r.probability).toBeCloseTo(0.1197034394, 8);
  });
});

suite('t de Student', () => {
  it('CDF: valores de referencia (SciPy stats.t.cdf)', () => {
    expect(tCdf(0, 10)).toBeCloseTo(0.5, 12);
    expect(tCdf(2.228138851986273, 10)).toBeCloseTo(0.975, 8); // t crítico clásico
    expect(tCdf(-1.812461122811676, 10)).toBeCloseTo(0.05, 8);
  });

  it('cuantiles: t(0.975, 10) ≈ 2.2281, t(0.95, 5) ≈ 2.0150', () => {
    expect(tInv(0.975, 10)).toBeCloseTo(2.228138851986273, 8);
    expect(tInv(0.95, 5)).toBeCloseTo(2.015048372669157, 8);
  });

  it('t con df grande converge a la normal', () => {
    expect(tInv(0.95, 100000)).toBeCloseTo(1.6449, 3);
  });
});

suite('prueba t de una muestra', () => {
  // Caso contrastado por cálculo independiente (integración de Simpson de
  // la densidad t con 200,000 subintervalos, ver registro de auditoría):
  // media = 1442.6, sd = 12.4917750718, se = 3.9502461245
  // t = -1.8733009961, df = 9
  // p bilateral = 0.0938035232; p izquierda = 0.0469017616
  // IC 95% (t crítico 2.2621571628): [1433.663922, 1451.536078]
  const x = [1420, 1445, 1460, 1430, 1438, 1452, 1447, 1441, 1435, 1458];

  it('bilateral contra mu0=1450', () => {
    const r = oneSampleTTest(x, 1450, 'two-sided', 0.95)!;
    expect(r.mean).toBeCloseTo(1442.6, 10);
    expect(r.sd).toBeCloseTo(12.4917750718, 8);
    expect(r.t).toBeCloseTo(-1.8733009961, 8);
    expect(r.df).toBe(9);
    expect(r.pValue).toBeCloseTo(0.0938035232, 8);
    expect(r.ciLower).toBeCloseTo(1433.663922, 4);
    expect(r.ciUpper).toBeCloseTo(1451.536078, 4);
    expect(r.rejectNull).toBe(false);
  });

  it('unilateral izquierda', () => {
    const r = oneSampleTTest(x, 1450, 'less', 0.95)!;
    expect(r.pValue).toBeCloseTo(0.0469017616, 8);
    expect(r.rejectNull).toBe(true);
  });

  it('unilateral derecha', () => {
    const r = oneSampleTTest(x, 1450, 'greater', 0.95)!;
    expect(r.pValue).toBeCloseTo(0.9530982384, 8);
  });

  it('degenera con seguridad: n<2 o SD=0', () => {
    expect(oneSampleTTest([1450], 1400)).toBeNull();
    expect(oneSampleTTest([5, 5, 5], 4)).toBeNull();
  });

  it('IC de la media coincide con el cálculo independiente', () => {
    const ci = meanConfidenceInterval(x, 0.95)!;
    expect(ci.lower).toBeCloseTo(1433.663922, 4);
    expect(ci.upper).toBeCloseTo(1451.536078, 4);
  });
});

suite('valores atípicos', () => {
  it('regla 1.5×IQR marca el valor esperado', () => {
    const data = [10, 12, 12, 13, 12, 11, 14, 13, 15, 100];
    const r = detectOutliers(data);
    expect(r.flags.length).toBe(1);
    expect(r.flags[0].value).toBe(100);
    expect(r.flags[0].index).toBe(9);
    expect(r.flags[0].methods).toContain('iqr30');
    expect(r.flags[0].methods).toContain('modifiedZ');
  });

  it('MAD', () => {
    // mediana=3, desviaciones |x-3| = [2,1,0,1,2] → MAD = 1
    expect(medianAbsoluteDeviation([1, 2, 3, 4, 5])).toBe(1);
  });

  it('sin atípicos en datos homogéneos', () => {
    expect(detectOutliers([100, 101, 102, 103, 104, 105]).flags.length).toBe(0);
  });
});

suite('histograma', () => {
  it('Sturges: n=100 → 8 clases', () => {
    expect(sturgesBins(100)).toBe(8);
  });

  it('frecuencias suman n y densidad integra 1', () => {
    const data = Array.from({ length: 200 }, (_, i) => 1400 + (i % 50) * 4);
    const h = buildHistogram(data, 'auto')!;
    const total = h.bins.reduce((a, b) => a + b.count, 0);
    expect(total).toBe(200);
    const area = h.bins.reduce((a, b) => a + b.density * (b.x1 - b.x0), 0);
    expect(area).toBeCloseTo(1, 10);
  });

  it('todos los valores iguales no divide entre cero', () => {
    const h = buildHistogram([5, 5, 5], 'auto')!;
    expect(h.bins.length).toBe(1);
    expect(h.bins[0].count).toBe(3);
  });
});

suite('normalidad', () => {
  it('chi-cuadrado CDF: valores conocidos', () => {
    // SciPy: chi2.cdf(5.991464547107979, 2) = 0.95
    expect(chiSquareCdf(5.991464547107979, 2)).toBeCloseTo(0.95, 8);
  });

  it("D'Agostino-Pearson no rechaza datos normales simulados", () => {
    // Muestra determinista aproximadamente normal (cuantiles de N(0,1))
    const n = 50;
    const data = Array.from({ length: n }, (_, i) => normalInv((i + 0.5) / n, 1450, 60));
    const r = dagostinoPearson(data)!;
    expect(r.pValue).toBeGreaterThan(0.05);
  });

  it("D'Agostino-Pearson rechaza datos fuertemente asimétricos", () => {
    // Distribución exponencial via inversa: -ln(1-p)
    const n = 80;
    const data = Array.from({ length: n }, (_, i) => -Math.log(1 - (i + 0.5) / n) * 100);
    const r = dagostinoPearson(data)!;
    expect(r.pValue).toBeLessThan(0.01);
  });

  it('puntos Q-Q son crecientes y del tamaño correcto', () => {
    const pts = qqPoints([3, 1, 2, 5, 4], 3, 1.58);
    expect(pts.length).toBe(5);
    expect(pts[0].observed).toBe(1);
    expect(pts[4].observed).toBe(5);
    for (let i = 1; i < pts.length; i++) {
      expect(pts[i].theoretical).toBeGreaterThan(pts[i - 1].theoretical);
    }
  });
});

suite('conversión de unidades', () => {
  it('g ↔ kg ↔ lb', async () => {
    const { toGrams, fromGrams } = await import('../src/lib/units');
    expect(toGrams(1.5, 'kg')).toBeCloseTo(1500, 10);
    expect(toGrams(1, 'lb')).toBeCloseTo(453.59237, 5);
    expect(fromGrams(1500, 'kg')).toBeCloseTo(1.5, 10);
    expect(fromGrams(453.59237, 'lb')).toBeCloseTo(1, 8);
    expect(toGrams(250, 'g')).toBe(250);
  });
});

suite('prueba t de dos muestras (Welch) y pareada', () => {
  // Referencias calculadas por integración de Simpson independiente
  // (200,000 subintervalos), ver registro de auditoría Fase 5.
  const a = [1420, 1445, 1460, 1430, 1438, 1452, 1447, 1441, 1435, 1458];
  const b = [1400, 1425, 1410, 1430, 1415, 1440, 1405, 1420, 1435, 1418];

  it('Welch bilateral reproduce el cálculo independiente', async () => {
    const { twoSampleTTest } = await import('../src/lib/statistics/inference');
    const r = twoSampleTTest(a, b, 'two-sided', 0.95)!;
    expect(r.mean1).toBeCloseTo(1442.6, 10);
    expect(r.mean2).toBeCloseTo(1419.8, 10);
    expect(r.se).toBeCloseTo(5.6842863326, 8);
    expect(r.df).toBeCloseTo(17.9790780597, 8);
    expect(r.t).toBeCloseTo(4.0110576185, 8);
    expect(r.pValue).toBeCloseTo(0.0008210466, 8);
    expect(r.rejectNull).toBe(true);
  });

  it('Welch degenera con seguridad', async () => {
    const { twoSampleTTest } = await import('../src/lib/statistics/inference');
    expect(twoSampleTTest([1, 2], [5], 'two-sided')).toBeNull();
    expect(twoSampleTTest([5, 5, 5], [7, 7, 7])).toBeNull(); // ambas SD=0
  });

  it('pareada = t de una muestra sobre diferencias', async () => {
    const { pairedTTest } = await import('../src/lib/statistics/inference');
    const r = pairedTTest(a, b, 'two-sided', 0.95)!;
    expect(r.mean).toBeCloseTo(22.8, 10); // media de diferencias
    expect(r.t).toBeCloseTo(4.2587281423, 8);
    expect(r.df).toBe(9);
    expect(r.pValue).toBeCloseTo(0.0021151047, 8);
  });

  it('pareada exige igual longitud', async () => {
    const { pairedTTest } = await import('../src/lib/statistics/inference');
    expect(pairedTTest([1, 2, 3], [1, 2])).toBeNull();
  });
});

suite('reportes (Fase 6)', () => {
  const pesos = [
    2350, 2410, 2480, 2390, 2445, 2500, 2420, 2465, 2380, 2440,
    2510, 2430, 2455, 2395, 2470, 2405, 2485, 2435, 2450, 2415,
    2490, 2375, 2460, 2425, 2445, 2530, 2400, 2440, 2360, 2475,
  ];

  it('buildReportData ensambla resultados coherentes', async () => {
    const { buildReportData } = await import('../src/lib/report-data');
    const d = buildReportData({
      pesos,
      lineaGenetica: 'Broiler - Cobb',
      edadSemanas: '6',
      criterioPct: 10,
      contexto: { lote: 'L-1', metodoMuestreo: 'aleatorio' },
    })!;
    expect(d.stats.totalAves).toBe(30);
    expect(d.target).not.toBeNull();
    expect(d.tTest).not.toBeNull();
    expect(d.tTest!.mu0).toBeCloseTo(d.target!.pesoOptimo, 10);
    expect(d.targetDiffG).toBeCloseTo(d.stats.promedio - d.target!.pesoOptimo, 10);
    expect(d.normality).not.toBeNull();
    // n=30 y muestreo aleatorio: no debe aparecer la limitación de muestreo
    expect(d.limitaciones.some((l) => l.includes('conveniencia'))).toBe(false);
    expect(d.limitaciones.some((l) => l.includes('No se documentó'))).toBe(false);
  });

  it('buildReportData null sin pesos y limitaciones con n pequeño', async () => {
    const { buildReportData } = await import('../src/lib/report-data');
    expect(buildReportData({ pesos: [], lineaGenetica: 'Otra', edadSemanas: '', criterioPct: 10, contexto: {} })).toBeNull();
    const small = buildReportData({ pesos: [2400, 2450, 2500], lineaGenetica: 'Otra', edadSemanas: '', criterioPct: 10, contexto: {} })!;
    expect(small.limitaciones.some((l) => l.includes('n=3'))).toBe(true);
    expect(small.limitaciones.some((l) => l.includes('No se indicó la edad'))).toBe(true);
    expect(small.target).toBeNull();
    expect(small.tTest).toBeNull();
  });

  it('buildWorkbook produce las 3 hojas con los pesos completos', async () => {
    const { buildReportData } = await import('../src/lib/report-data');
    const { buildWorkbook } = await import('../src/lib/export-excel');
    const XLSX = await import('xlsx');
    const d = buildReportData({
      pesos,
      lineaGenetica: 'Broiler - Cobb',
      edadSemanas: '6',
      criterioPct: 10,
      contexto: {},
    })!;
    const wb = buildWorkbook(d);
    expect(wb.SheetNames).toEqual(['Resumen', 'Descriptiva', 'Pesos']);
    const rows = XLSX.utils.sheet_to_json(wb.Sheets['Pesos'], { header: 1 }) as unknown[][];
    expect(rows.length).toBe(31); // encabezado + 30 aves
    expect(rows[1][1]).toBe(2350);
  });
});

suite('plantillas de reporte', () => {
  it('las tres variantes generan HTML con sus secciones', async () => {
    const { buildReportData } = await import('../src/lib/report-data');
    const { buildReportHtml } = await import('../src/lib/report-html');
    const pesos = Array.from({ length: 30 }, (_, i) => 2400 + (i % 10) * 12);
    const d = buildReportData({
      pesos, lineaGenetica: 'Broiler - Cobb', edadSemanas: '6', criterioPct: 10,
      contexto: { lote: 'L-1' },
    })!;
    const resumido = buildReportHtml(d, 'resumido');
    const tecnico = buildReportHtml(d, 'tecnico');
    const academico = buildReportHtml(d, 'academico');
    expect(resumido).toContain('Resumen ejecutivo');
    expect(resumido).not.toContain('Resumen estadístico'); // sin descriptiva completa
    expect(tecnico).toContain('Resumen estadístico');
    expect(tecnico).toContain('Fuentes y trazabilidad');
    expect(tecnico).not.toContain('Metodología y fórmulas');
    expect(academico).toContain('Metodología y fórmulas');
    expect(academico).toContain('corrección de Bessel');
    // La banda de uniformidad nunca debe llamarse intervalo de confianza
    expect(tecnico).toContain('no es IC');
  });
});

suite('control estadístico (SPC)', () => {
  it('c4 reproduce los valores de tabla clásicos', async () => {
    const { c4 } = await import('../src/lib/statistics/spc');
    expect(c4(2)).toBeCloseTo(0.7978846, 6);
    expect(c4(5)).toBeCloseTo(0.9399856, 6);
    expect(c4(10)).toBeCloseTo(0.9726593, 6);
    expect(Number.isNaN(c4(1))).toBe(true);
  });

  it('I-MR: límites 2.66·MR̄ en serie conocida', async () => {
    const { imrChart } = await import('../src/lib/statistics/spc');
    // Serie: 10, 12, 11, 13 → MRs = [2, 1, 2], MR̄ = 5/3, media = 11.5
    const r = imrChart([10, 12, 11, 13])!;
    expect(r.center).toBeCloseTo(11.5, 10);
    expect(r.mrBar).toBeCloseTo(5 / 3, 10);
    expect(r.ucl).toBeCloseTo(11.5 + 2.66 * (5 / 3), 10);
    expect(r.lcl).toBeCloseTo(11.5 - 2.66 * (5 / 3), 10);
    expect(r.mr.ucl).toBeCloseTo(3.267 * (5 / 3), 10);
    expect(imrChart([5])).toBeNull();
  });

  it('X̄-S: estructura coherente y S̄ correcto', async () => {
    const { xbarSChart, c4 } = await import('../src/lib/statistics/spc');
    const g1 = [10, 12, 11, 13, 12];
    const g2 = [11, 13, 12, 14, 13];
    const g3 = [9, 11, 10, 12, 11];
    const r = xbarSChart([g1, g2, g3])!;
    expect(r.nAvg).toBe(5);
    expect(r.xbarbar).toBeCloseTo((11.6 + 12.6 + 10.6) / 3, 10);
    // Las tres SD muestrales son iguales (mismos desvíos internos)
    const c = c4(5);
    const a3 = 3 / (c * Math.sqrt(5));
    expect(r.xbar.ucl).toBeCloseTo(r.xbarbar + a3 * r.sbar, 10);
    expect(r.s.lcl).toBe(0); // B3 = 0 para n = 5
    expect(xbarSChart([[1, 2]])).toBeNull();
    expect(xbarSChart([[1], [2, 3]])).toBeNull();
  });

  it('reglas de Nelson 1, 2 y 3', async () => {
    const { nelsonRules } = await import('../src/lib/statistics/spc');
    // Regla 1: punto fuera
    const r1 = nelsonRules([0, 0, 10], 0, 3, -3);
    expect(r1.some((v) => v.rule === 1 && v.index === 2)).toBe(true);
    // Regla 2: nueve al mismo lado
    const r2 = nelsonRules(Array(9).fill(1), 0, 5, -5);
    expect(r2.some((v) => v.rule === 2)).toBe(true);
    // Regla 3: seis en ascenso
    const r3 = nelsonRules([1, 2, 3, 4, 5, 6], 3.5, 100, -100);
    expect(r3.some((v) => v.rule === 3)).toBe(true);
    // Serie estable: sin señales
    expect(nelsonRules([1, -1, 1, -1, 1, -1], 0, 5, -5).length).toBe(0);
  });
});

suite('Shapiro-Wilk (AS R94)', () => {
  it('n=3: coincide con la fórmula exacta calculada a mano', async () => {
    const { shapiroWilk } = await import('../src/lib/statistics/shapiro-wilk');
    // Para n=3: a = (−√½, 0, √½); con x=(1,2,4): num = √½·(4−1) = 3√½
    // W = (3√½)² / SS; media=7/3; SS = (16+1+25)/9 = 42/9 → W = 4.5/(42/9) = 27/28
    const r = shapiroWilk([1, 2, 4])!;
    expect(r.W).toBeCloseTo(27 / 28, 10);
    // p exacto: (6/π)·(asin(√W) − asin(√0.75))
    const pExact = (6 / Math.PI) * (Math.asin(Math.sqrt(27 / 28)) - Math.asin(Math.sqrt(0.75)));
    expect(r.pValue).toBeCloseTo(pExact, 10);
  });

  it('valores críticos de tabla: W=0.905 con n=20 y W=0.947 con n=50 dan p≈0.05', async () => {
    const { shapiroWilk } = await import('../src/lib/statistics/shapiro-wilk');
    const { normalInv } = await import('../src/lib/statistics/distributions');
    // Construimos datos normales "perfectos" y medimos qué p produce el W
    // transformado; en su lugar verificamos directamente la transformación
    // p(W): reproducimos el cálculo del p con W fijado al valor crítico de
    // tabla (Shapiro & Wilk 1965): p debe quedar cerca de 0.05.
    const pOfW = (W: number, n: number) => {
      const ln = Math.log(n);
      const mu = -1.5861 - 0.31082 * ln - 0.083751 * ln * ln + 0.0038915 * ln * ln * ln;
      const sigma = Math.exp(-0.4803 - 0.082676 * ln + 0.0030302 * ln * ln);
      const z = (Math.log(1 - W) - mu) / sigma;
      // 1 - Phi(z) usando la CDF del módulo
      return 1 - (0.5 * (1 + erfLocal(z / Math.SQRT2)));
    };
    function erfLocal(x: number): number {
      // serie de Taylor (independiente del módulo) para el contraste
      let s = x, term = x;
      for (let k = 1; k < 200; k++) { term *= -x * x / k; s += term / (2 * k + 1); }
      return (2 / Math.sqrt(Math.PI)) * s;
    }
    // Los W críticos al 5% de la tabla empírica original (Shapiro & Wilk
    // 1965) deben producir p del mismo orden que 0.05 bajo la transformación
    // de Royston. La aproximación moderna difiere algo de la tabla de 1965
    // (en n=50 Royston da ≈0.026 en el W tabulado) — es la misma diferencia
    // que muestran R y SciPy, no un error de implementación.
    expect(pOfW(0.905, 20)).toBeGreaterThan(0.02);
    expect(pOfW(0.905, 20)).toBeLessThan(0.10);
    expect(pOfW(0.947, 50)).toBeGreaterThan(0.01);
    expect(pOfW(0.947, 50)).toBeLessThan(0.10);
    // Y la implementación coincide con esa transformación para datos reales:
    const data = Array.from({ length: 50 }, (_, i) => normalInv((i + 0.5) / 50, 1450, 60));
    const r = shapiroWilk(data)!;
    expect(r.pValue).toBeCloseTo(pOfW(r.W, 50), 6);
  });

  it('datos normales (cuantiles) → W≈1 y p alto; exponenciales → p bajo', async () => {
    const { shapiroWilk } = await import('../src/lib/statistics/shapiro-wilk');
    const { normalInv } = await import('../src/lib/statistics/distributions');
    const normal = Array.from({ length: 50 }, (_, i) => normalInv((i + 0.5) / 50, 1450, 60));
    const rn = shapiroWilk(normal)!;
    expect(rn.W).toBeGreaterThan(0.98);
    expect(rn.pValue).toBeGreaterThan(0.1);
    const expo = Array.from({ length: 50 }, (_, i) => -Math.log(1 - (i + 0.5) / 50) * 100);
    const re = shapiroWilk(expo)!;
    expect(re.W).toBeLessThan(0.92);
    expect(re.pValue).toBeLessThan(0.01);
  });

  it('degenera con seguridad: n<3, n>5000, sin variabilidad', async () => {
    const { shapiroWilk } = await import('../src/lib/statistics/shapiro-wilk');
    expect(shapiroWilk([1, 2])).toBeNull();
    expect(shapiroWilk([5, 5, 5, 5])).toBeNull();
    expect(shapiroWilk(Array.from({ length: 5001 }, (_, i) => i))).toBeNull();
  });
});

suite('motor de clasificación (Fase 8)', () => {
  it('bins absolutos: asigna por [min, max) y cuenta correctamente', async () => {
    const { classify } = await import('../src/lib/classification');
    const bins = [
      { label: 'Chico', min: null, max: 50 },
      { label: 'Mediano', min: 50, max: 60 },
      { label: 'Grande', min: 60, max: null },
    ];
    const r = classify([45, 50, 55, 59.99, 60, 70], { type: 'absolute-bins', bins });
    expect(r.bins.map((b) => b.count)).toEqual([1, 3, 2]);
    expect(r.unclassified).toBe(0);
    expect(r.n).toBe(6);
    expect(r.modeLabel).toBe('Mediano');
    // El corte inferior es inclusivo y el superior exclusivo
    expect(r.bins[1].indices).toEqual([1, 2, 3]);
  });

  it('bins con hueco: los valores no cubiertos quedan sin clasificar', async () => {
    const { classify } = await import('../src/lib/classification');
    const bins = [
      { label: 'Bajo', min: 0, max: 10 },
      { label: 'Alto', min: 20, max: 30 },
    ];
    const r = classify([5, 15, 25], { type: 'absolute-bins', bins });
    expect(r.bins.map((b) => b.count)).toEqual([1, 1]);
    expect(r.unclassified).toBe(1);
    expect(r.unclassifiedIndices).toEqual([1]);
  });

  it('EQUIVALENCIA: la banda relativa reproduce calculateStats exactamente', async () => {
    const { classify } = await import('../src/lib/classification');
    const { calculateStats } = await import('../src/lib/calculations');
    // Conjuntos variados, incluyendo valores justo en los límites
    const casos = [
      [2350, 2410, 2480, 2390, 2445, 2500, 2420, 2465, 2380, 2440],
      [100, 110, 90, 105, 95, 120, 80, 100, 100, 100],
      [1000],
      [1500, 1500, 1500],
      [10, 1000, 2000, 3000, 10000],
    ];
    for (const pct of [5, 7.5, 10, 15]) {
      for (const datos of casos) {
        const st = calculateStats(datos, pct);
        const cl = classify(datos, { type: 'relative-band', pct });
        expect(cl.bins[0].count).toBe(st.countDebajo);
        expect(cl.bins[1].count).toBe(st.countDentro);
        expect(cl.bins[2].count).toBe(st.countEncima);
        expect(cl.unclassified).toBe(0);
        expect(cl.bins[1].pct).toBeCloseTo(st.uniformidad, 10);
      }
    }
  });

  it('EQUIVALENCIA en el límite exacto: un valor justo en media+X% cuenta como dentro', async () => {
    const { classify } = await import('../src/lib/classification');
    const { calculateStats } = await import('../src/lib/calculations');
    // media = 100 exacta; el límite superior con ±10% es 110 exacto
    const datos = [90, 100, 110];
    const st = calculateStats(datos, 10);
    const cl = classify(datos, { type: 'relative-band', pct: 10 });
    expect(st.countDentro).toBe(3);
    expect(cl.bins[1].count).toBe(3);
    expect(cl.bins[2].count).toBe(0);
  });

  it('uniformityPct coincide con calculateStats', async () => {
    const { uniformityPct } = await import('../src/lib/classification');
    const { calculateStats } = await import('../src/lib/calculations');
    const datos = [2350, 2410, 2480, 2390, 2445, 2500, 2420, 2465, 2380, 2440];
    expect(uniformityPct(datos, 10)).toBeCloseTo(calculateStats(datos, 10).uniformidad, 10);
    expect(uniformityPct([], 10)).toBe(0);
  });

  it('validateBins detecta nombres vacíos, repetidos, rangos invertidos y solapes', async () => {
    const { validateBins } = await import('../src/lib/classification');
    expect(validateBins([{ label: 'A', min: 0, max: 10 }]).ok).toBe(true);
    expect(validateBins([]).ok).toBe(false);
    expect(validateBins([{ label: '', min: 0, max: 10 }]).ok).toBe(false);
    expect(validateBins([{ label: 'A', min: 10, max: 5 }]).ok).toBe(false);
    const dup = validateBins([{ label: 'A', min: 0, max: 5 }, { label: 'a', min: 5, max: 10 }]);
    expect(dup.ok).toBe(false);
    const overlap = validateBins([{ label: 'A', min: 0, max: 10 }, { label: 'B', min: 5, max: 15 }]);
    expect(overlap.ok).toBe(false);
    // Se comprueba el código del problema, no su redacción: el texto vive en
    // los catálogos de idioma y cambia según el idioma elegido.
    expect(overlap.issues.some((i) => i.code === 'overlap')).toBe(true);
    expect(overlap.issues.find((i) => i.code === 'overlap')?.params).toEqual({ a: 'A', b: 'B' });
  });
});

suite('dominio huevos: norma USDA (Fase 9)', () => {
  it('la derivación oz/docena → g/huevo da los valores esperados', async () => {
    const { minimoPorHuevoGramos } = await import('../src/lib/domains/huevos');
    // (oz/12) × 28.349523125 — comprobado aritméticamente contra la norma
    expect(minimoPorHuevoGramos(30)).toBeCloseTo(70.8738078125, 9); // Jumbo
    expect(minimoPorHuevoGramos(27)).toBeCloseTo(63.7864270313, 9); // Extra Large
    expect(minimoPorHuevoGramos(24)).toBeCloseTo(56.6990462500, 9); // Large
    expect(minimoPorHuevoGramos(21)).toBeCloseTo(49.6116654688, 9); // Medium
    expect(minimoPorHuevoGramos(18)).toBeCloseTo(42.5242846875, 9); // Small
    expect(minimoPorHuevoGramos(15)).toBeCloseTo(35.4369039063, 9); // Peewee
  });

  it('los bins USDA son contiguos, ascendentes y sin solapes', async () => {
    const { buildUsdaBins } = await import('../src/lib/domains/huevos');
    const { validateBins } = await import('../src/lib/classification');
    const bins = buildUsdaBins();
    expect(bins.length).toBe(6);
    expect(bins[0].label).toBe('Peewee');
    expect(bins[5].label).toBe('Jumbo');
    // Contiguos: el max de cada uno es el min del siguiente
    for (let i = 0; i < bins.length - 1; i++) {
      expect(bins[i].max).toBeCloseTo(bins[i + 1].min!, 10);
    }
    // El último no tiene tope y el primero sí tiene piso (Peewee mínimo)
    expect(bins[5].max).toBeNull();
    expect(bins[0].min).toBeCloseTo(35.4369039063, 8);
    expect(validateBins(bins).ok).toBe(true);
  });

  it('clasifica una muestra de huevos en sus categorías USDA', async () => {
    const { classify } = await import('../src/lib/classification');
    const { DOMINIO_HUEVOS } = await import('../src/lib/domains/huevos');
    const preset = DOMINIO_HUEVOS.classificationPresets.find((p) => p.id === 'usda')!;
    //            Peewee  Small  Medium  Large  XL     Jumbo
    const pesos = [36,    45,    52,     58,    65,    72];
    const r = classify(pesos, preset.scheme);
    expect(r.bins.map((b) => b.count)).toEqual([1, 1, 1, 1, 1, 1]);
    expect(r.unclassified).toBe(0);
  });

  it('un huevo bajo el mínimo de Peewee queda sin clasificar (fiel a la norma)', async () => {
    const { classify } = await import('../src/lib/classification');
    const { DOMINIO_HUEVOS } = await import('../src/lib/domains/huevos');
    const preset = DOMINIO_HUEVOS.classificationPresets.find((p) => p.id === 'usda')!;
    const r = classify([30, 58], preset.scheme);
    expect(r.unclassified).toBe(1);
    expect(r.unclassifiedIndices).toEqual([0]);
  });

  it('un huevo justo en el mínimo de su clase pertenece a esa clase', async () => {
    const { classify } = await import('../src/lib/classification');
    const { DOMINIO_HUEVOS, minimoPorHuevoGramos } = await import('../src/lib/domains/huevos');
    const preset = DOMINIO_HUEVOS.classificationPresets.find((p) => p.id === 'usda')!;
    const exactoLarge = minimoPorHuevoGramos(24); // 56.699… g = mínimo de Large
    const r = classify([exactoLarge], preset.scheme);
    expect(r.bins.find((b) => b.label.startsWith('Large'))!.count).toBe(1);
  });

  it('el dominio expone USDA como oficial y los otros criterios como no oficiales', async () => {
    const { DOMINIO_HUEVOS } = await import('../src/lib/domains/huevos');
    expect(DOMINIO_HUEVOS.defaultPresetId).toBe('usda');
    const usda = DOMINIO_HUEVOS.classificationPresets.find((p) => p.id === 'usda')!;
    expect(usda.official).toBe(true);
    const otros = DOMINIO_HUEVOS.classificationPresets.filter((p) => p.id !== 'usda');
    expect(otros.every((p) => p.official === false)).toBe(true);
  });
});

suite('dominio genérico: Modo Estadística (Fase 10)', () => {
  it('el preset "sin clasificación" agrupa todo en una sola categoría', async () => {
    const { classify } = await import('../src/lib/classification');
    const { DOMINIO_GENERICO } = await import('../src/lib/domains/generico');
    const p = DOMINIO_GENERICO.classificationPresets.find((x) => x.id === 'ninguna')!;
    const r = classify([1, 50, 1000, -20], p.scheme);
    expect(r.bins.length).toBe(1);
    expect(r.bins[0].count).toBe(4);
    expect(r.unclassified).toBe(0);
    expect(DOMINIO_GENERICO.defaultPresetId).toBe('ninguna');
  });

  it('ningún preset del dominio genérico se declara norma oficial', async () => {
    const { DOMINIO_GENERICO } = await import('../src/lib/domains/generico');
    expect(DOMINIO_GENERICO.classificationPresets.every((p) => p.official === false)).toBe(true);
  });

  it('los tres dominios tienen rutas e ids únicos y un preset por defecto válido', async () => {
    const { DOMINIOS, defaultPreset } = await import('../src/lib/domains');
    expect(DOMINIOS.length).toBe(3);
    const ids = DOMINIOS.map((d) => d.id);
    const rutas = DOMINIOS.map((d) => d.route);
    expect(new Set(ids).size).toBe(3);
    expect(new Set(rutas).size).toBe(3);
    for (const d of DOMINIOS) {
      // El preset por defecto debe existir dentro del propio dominio
      expect(d.classificationPresets.some((p) => p.id === d.defaultPresetId)).toBe(true);
      expect(defaultPreset(d)).toBeTruthy();
    }
  });
});

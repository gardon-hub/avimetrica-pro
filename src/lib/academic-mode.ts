/**
 * Modo académico LOCAL (Fase 7 / sección 21).
 * Genera explicaciones paso a paso deterministas a partir de resultados ya
 * calculados: qué se calculó, con qué fórmula, qué significa el número
 * obtenido y qué errores comunes evitar. No usa IA ni servicios externos,
 * por lo que funciona siempre; el asistente de IA es un complemento opcional.
 */

import { ReportData } from '@/lib/report-data';

export interface AcademicSection {
  titulo: string;
  queSeCalculo: string;
  formula: string;
  resultado: string;
  interpretacion: string;
  erroresComunes: string[];
}

function f(v: number, dec = 2): string {
  return Number.isFinite(v) ? v.toFixed(dec) : '—';
}

export function buildAcademicSections(d: ReportData): AcademicSection[] {
  const s = d.descr;
  const out: AcademicSection[] = [];

  out.push({
    titulo: 'Media y desviación estándar',
    queSeCalculo: `El peso promedio de las ${s.n} aves pesadas y cuánto se alejan los pesos de ese promedio.`,
    formula: 'x̄ = Σxᵢ / n · s = √[ Σ(xᵢ − x̄)² / (n − 1) ]',
    resultado: `x̄ = ${f(s.mean, 1)} g; s = ${f(s.sdSample)} g.`,
    interpretacion: `En promedio las aves pesan ${f(s.mean, 1)} g y un ave "típica" se aleja unos ${f(s.sdSample, 0)} g de ese promedio. Se divide entre n−1 (${s.n - 1}) y no entre n porque se pesó una muestra, no todo el lote: sin esa corrección la dispersión se subestimaría.`,
    erroresComunes: [
      'Usar la fórmula poblacional (÷n) con datos de una muestra.',
      'Comparar desviaciones estándar de lotes con pesos promedio muy distintos sin pasar por el CV.',
    ],
  });

  out.push({
    titulo: 'Coeficiente de variación (CV)',
    queSeCalculo: 'La dispersión expresada como porcentaje de la media, para poder comparar lotes de distinto peso.',
    formula: 'CV = (s / x̄) × 100',
    resultado: `CV = (${f(s.sdSample)} / ${f(s.mean, 1)}) × 100 = ${f(s.cv)} %.`,
    interpretacion: `${f(s.cv)}% significa que la dispersión equivale a un ${f(s.cv)}% del peso promedio. En avicultura, CV bajo (≈8% o menos en muchas etapas) indica lote parejo; el umbral exacto depende de especie, línea y edad.`,
    erroresComunes: [
      'Interpretar el CV sin considerar la edad: en la primera semana el CV natural es más alto.',
      'Confundir CV (relativo) con la SD (absoluta, en gramos).',
    ],
  });

  out.push({
    titulo: `Uniformidad (media ±${d.criterioPct}%)`,
    queSeCalculo: `El porcentaje de aves cuyo peso cae dentro de la banda [x̄ − ${d.criterioPct}%, x̄ + ${d.criterioPct}%].`,
    formula: `banda = [x̄·${(1 - d.criterioPct / 100).toFixed(2)}, x̄·${(1 + d.criterioPct / 100).toFixed(2)}] = [${f(d.stats.limiteInf, 1)}, ${f(d.stats.limiteSup, 1)}] g`,
    resultado: `${d.stats.countDentro} de ${d.stats.totalAves} aves dentro de la banda → uniformidad = ${f(d.stats.uniformidad, 1)}%.`,
    interpretacion: 'Mide qué proporción del lote está "cerca" del promedio. El criterio tradicional avícola usa ±10%, y ≥85% se considera excelente en muchas guías; el criterio elegido siempre debe declararse junto al resultado.',
    erroresComunes: [
      'Confundir la banda de uniformidad con un intervalo de confianza: la banda describe las aves; el IC describe la incertidumbre sobre la media.',
      'Comparar uniformidades calculadas con criterios distintos (±5% vs. ±10%).',
    ],
  });

  if (d.ci95) {
    out.push({
      titulo: 'Intervalo de confianza (95%) para la media',
      queSeCalculo: 'El rango de valores plausibles para el peso promedio REAL de todo el lote, dado que solo se pesó una muestra.',
      formula: 'IC = x̄ ± t₍₀.₉₇₅, n−1₎ · (s / √n)',
      resultado: `IC 95% = [${f(d.ci95.lower, 1)}, ${f(d.ci95.upper, 1)}] g (error estándar = ${f(s.sem)} g).`,
      interpretacion: `Con 95% de confianza, el procedimiento captura la media verdadera del lote: si se repitiera el muestreo muchas veces, el 95% de los intervalos así construidos la contendría. No significa que el 95% de las aves pese entre esos valores.`,
      erroresComunes: [
        'Leer el IC como rango de pesos individuales (ese papel lo cumplen los percentiles).',
        'Afirmar que "hay 95% de probabilidad de que la media esté en este intervalo específico" — la confianza es del procedimiento, no de un intervalo concreto.',
      ],
    });
  }

  if (d.tTest && d.target) {
    const t = d.tTest;
    out.push({
      titulo: 'Prueba t de una muestra contra el objetivo',
      queSeCalculo: `Si la diferencia entre el promedio observado (${f(t.mean, 1)} g) y el objetivo de la línea (${f(t.mu0, 0)} g) puede explicarse por azar de muestreo.`,
      formula: 't = (x̄ − μ₀) / (s/√n), con gl = n − 1',
      resultado: `t = ${f(t.t, 3)} con ${t.df} gl → valor p = ${t.pValue < 0.0001 ? '< 0.0001' : f(t.pValue, 4)}.`,
      interpretacion: t.rejectNull
        ? `Como p < 0.05, la diferencia observada sería muy improbable si el lote realmente promediara ${f(t.mu0, 0)} g: hay evidencia de que el peso promedio difiere del objetivo.`
        : `Como p ≥ 0.05, los datos no permiten descartar que el promedio real sea ${f(t.mu0, 0)} g. Ojo: esto NO demuestra que sean iguales; puede faltar potencia (muestra pequeña).`,
      erroresComunes: [
        'Decir "se acepta H₀" o "las medias son iguales" cuando p ≥ α.',
        'Ignorar los supuestos: independencia de las observaciones y normalidad aproximada (crítica con n pequeño).',
        'Confundir significancia estadística con relevancia zootécnica: con n grande, una diferencia de pocos gramos puede dar p pequeño sin importancia práctica.',
      ],
    });
  }

  if (d.shapiro || d.normality) {
    const ref = d.shapiro ?? d.normality!;
    const partes: string[] = [];
    if (d.shapiro) partes.push(`Shapiro-Wilk: W = ${f(d.shapiro.W, 4)}, p = ${d.shapiro.pValue < 0.0001 ? '< 0.0001' : f(d.shapiro.pValue, 4)}`);
    if (d.normality) partes.push(`D'Agostino-Pearson: K² = ${f(d.normality.statistic, 3)}, p = ${d.normality.pValue < 0.0001 ? '< 0.0001' : f(d.normality.pValue, 4)}`);
    out.push({
      titulo: 'Evaluación de normalidad',
      queSeCalculo: 'Si la forma de la distribución de pesos es compatible con una campana normal.',
      formula: "Shapiro-Wilk: W = (Σaᵢ·x₍ᵢ₎)² / Σ(xᵢ − x̄)²   ·   D'Agostino-Pearson: K² = Z(g1)² + Z(g2)² ~ χ²(2)",
      resultado: partes.join('. ') + '.',
      interpretacion: ref.pValue >= 0.05
        ? 'No se rechaza la normalidad: los cálculos que la asumen (probabilidades teóricas, prueba t) son razonables para estos datos.'
        : 'Se rechaza la normalidad: revisar histograma y Q-Q para ver si hay asimetría, colas pesadas o posibles subpoblaciones antes de confiar en cálculos que asumen normalidad.',
      erroresComunes: [
        'Usar solo la prueba sin mirar el histograma y el Q-Q.',
        'Con muestras grandes, desviaciones triviales dan p significativo; con muestras chicas, desviaciones grandes pasan inadvertidas.',
        'Shapiro-Wilk es potente en muestras pequeñas-medianas; con n muy grande casi siempre rechaza — combinar con la magnitud de la desviación, no solo el p.',
      ],
    });
  }

  if (d.outliers.flags.length > 0) {
    out.push({
      titulo: 'Valores atípicos',
      queSeCalculo: `Observaciones inusualmente alejadas del resto (${d.outliers.flags.length} marcadas), por cercos de Tukey, |Z|>3 y Z modificada con MAD.`,
      formula: 'cercos: [Q1 − 1.5·IQR, Q3 + 1.5·IQR] · Z = (x − x̄)/s · Mᵢ = 0.6745(x − mediana)/MAD',
      resultado: d.outliers.flags.map((fl) => `ave #${fl.index + 1}: ${f(fl.value, 1)} g`).join(' · '),
      interpretacion: 'Un atípico puede ser un error de digitación/báscula o un ave genuinamente distinta (enferma, dominante). La decisión de excluir es del profesional y debe documentarse; excluir sin justificar sesga los resultados.',
      erroresComunes: [
        'Eliminar atípicos automáticamente para "mejorar" el CV.',
        'Ignorar que media, SD y CV son sensibles a un solo valor extremo (la mediana y el IQR no lo son).',
      ],
    });
  }

  return out;
}

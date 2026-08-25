/**
 * Modo académico LOCAL (Fase 7 / sección 21).
 * Genera explicaciones paso a paso deterministas a partir de resultados ya
 * calculados: qué se calculó, con qué fórmula, qué significa el número
 * obtenido y qué errores comunes evitar. No usa IA ni servicios externos,
 * por lo que funciona siempre.
 *
 * Desde 2026-08-25 NO redacta texto: emite mensajes {key, params} del
 * espacio `academic` del catálogo —la misma arquitectura que el motor de
 * diagnóstico— y el panel los compone en el idioma activo. Los números
 * viajan preformateados en params para conservar los decimales exactos.
 */

import { ReportData } from '@/lib/report-data';
import { fmtPFrase } from '@/lib/p-value';

/** Mensaje sin redactar: clave del espacio `academic` + parámetros. */
export interface MensajeAcademico {
  key: string;
  params?: Record<string, string | number>;
}

export interface AcademicSection {
  titulo: MensajeAcademico;
  queSeCalculo: MensajeAcademico;
  /** Fórmula matemática; va al catálogo porque contiene rótulos (gl, EEM…). */
  formula: MensajeAcademico;
  /** Oraciones del resultado, en orden. */
  resultado: MensajeAcademico[];
  interpretacion: MensajeAcademico;
  erroresComunes: MensajeAcademico[];
}

function f(v: number, dec = 2): string {
  return Number.isFinite(v) ? v.toFixed(dec) : '—';
}

export function buildAcademicSections(d: ReportData): AcademicSection[] {
  const s = d.descr;
  const out: AcademicSection[] = [];
  const m = (key: string, params?: Record<string, string | number>): MensajeAcademico => ({ key, params });

  out.push({
    titulo: m('media.titulo'),
    queSeCalculo: m('media.que', { n: s.n }),
    formula: m('media.formula'),
    resultado: [m('media.resultado', { mean: f(s.mean, 1), sd: f(s.sdSample) })],
    interpretacion: m('media.interp', { mean: f(s.mean, 1), sd0: f(s.sdSample, 0), nm1: s.n - 1 }),
    erroresComunes: [m('media.err1'), m('media.err2')],
  });

  out.push({
    titulo: m('cv.titulo'),
    queSeCalculo: m('cv.que'),
    formula: m('cv.formula'),
    resultado: [m('cv.resultado', { sd: f(s.sdSample), mean: f(s.mean, 1), cv: f(s.cv) })],
    interpretacion: m('cv.interp', { cv: f(s.cv) }),
    erroresComunes: [m('cv.err1'), m('cv.err2')],
  });

  out.push({
    titulo: m('unif.titulo', { pct: d.criterioPct }),
    queSeCalculo: m('unif.que', { pct: d.criterioPct }),
    formula: m('unif.formula', {
      fLow: (1 - d.criterioPct / 100).toFixed(2),
      fHigh: (1 + d.criterioPct / 100).toFixed(2),
      limInf: f(d.stats.limiteInf, 1),
      limSup: f(d.stats.limiteSup, 1),
    }),
    resultado: [m('unif.resultado', { dentro: d.stats.countDentro, total: d.stats.totalAves, unif: f(d.stats.uniformidad, 1) })],
    interpretacion: m('unif.interp'),
    erroresComunes: [m('unif.err1'), m('unif.err2')],
  });

  if (d.ci95) {
    out.push({
      titulo: m('ic.titulo'),
      queSeCalculo: m('ic.que'),
      formula: m('ic.formula'),
      resultado: [m('ic.resultado', { lower: f(d.ci95.lower, 1), upper: f(d.ci95.upper, 1), sem: f(s.sem) })],
      interpretacion: m('ic.interp'),
      erroresComunes: [m('ic.err1'), m('ic.err2')],
    });
  }

  if (d.tTest && d.target) {
    const t = d.tTest;
    out.push({
      titulo: m('ttest.titulo'),
      queSeCalculo: m('ttest.que', { mean: f(t.mean, 1), mu0: f(t.mu0, 0) }),
      formula: m('ttest.formula'),
      resultado: [m('ttest.resultado', { t: f(t.t, 3), df: t.df, p: fmtPFrase(t.pValue) })],
      interpretacion: t.rejectNull
        ? m('ttest.interpReject', { mu0: f(t.mu0, 0) })
        : m('ttest.interpNotReject', { mu0: f(t.mu0, 0) }),
      erroresComunes: [m('ttest.err1'), m('ttest.err2'), m('ttest.err3')],
    });
  }

  if (d.shapiro || d.normality) {
    const ref = (d.shapiro ?? d.normality)!;
    const resultado: MensajeAcademico[] = [];
    if (d.shapiro) resultado.push(m('normal.resShapiro', { w: f(d.shapiro.W, 4), p: fmtPFrase(d.shapiro.pValue) }));
    if (d.normality) resultado.push(m('normal.resDagostino', { k: f(d.normality.statistic, 3), p: fmtPFrase(d.normality.pValue) }));
    out.push({
      titulo: m('normal.titulo'),
      queSeCalculo: m('normal.que'),
      formula: m('normal.formula'),
      resultado,
      interpretacion: ref.pValue >= 0.05 ? m('normal.interpOk') : m('normal.interpRejected'),
      erroresComunes: [m('normal.err1'), m('normal.err2'), m('normal.err3')],
    });
  }

  if (d.outliers.flags.length > 0) {
    out.push({
      titulo: m('outliers.titulo'),
      queSeCalculo: m('outliers.que', { n: d.outliers.flags.length }),
      formula: m('outliers.formula'),
      resultado: d.outliers.flags.map((fl) => m('outliers.resultadoAve', { num: fl.index + 1, peso: f(fl.value, 1) })),
      interpretacion: m('outliers.interp'),
      erroresComunes: [m('outliers.err1'), m('outliers.err2')],
    });
  }

  return out;
}

/**
 * Exportación a Excel de un muestreo genérico (huevos o docencia).
 * Hojas: Resumen, Categorías y Datos.
 */

import * as XLSX from 'xlsx';
import { describe } from '@/lib/statistics/descriptive';
import { meanConfidenceInterval } from '@/lib/statistics/inference';
import { shapiroWilk } from '@/lib/statistics/shapiro-wilk';
import { detectOutliers } from '@/lib/statistics/outliers';
import { classify } from '@/lib/classification';
import type { DatasetReportInput } from '@/lib/dataset-report';

type Row = Array<string | number>;

function num(v: number, dec = 2): number | string {
  return Number.isFinite(v) ? Number(v.toFixed(dec)) : '—';
}

export function downloadDatasetExcel(input: DatasetReportInput): void {
  const { valores, variable, scheme, contexto } = input;
  const d = describe(valores);
  if (!d) return;

  const dec = variable.decimals;
  const u = variable.unit;
  const ci = meanConfidenceInterval(valores, 0.95);
  const sw = shapiroWilk(valores);
  const out = detectOutliers(valores);
  const cl = classify(valores, scheme);

  const wb = XLSX.utils.book_new();

  const resumen: Row[] = [
    [`Avimétrica Pro — ${input.tituloModulo}`],
    ['Generado', new Date().toLocaleString()],
    [],
    ['Variable', `${variable.label}${u ? ` (${u})` : ''}`],
    ['Muestreo', contexto.nombre || '—'],
    ['Origen', contexto.origen || '—'],
    ['Fecha', contexto.fecha || '—'],
    ['Responsable', contexto.responsable || '—'],
    [],
    ['n', d.n],
    ['Media', num(d.mean, dec)],
    ['Mediana', num(d.median, dec)],
    ['Desv. estándar muestral (n−1)', num(d.sdSample, dec)],
    ['Coeficiente de variación (%)', num(d.cv, 2)],
    ['Error estándar de la media', num(d.sem, dec)],
    ['Mínimo', num(d.min, dec)],
    ['Máximo', num(d.max, dec)],
    ['Rango', num(d.range, dec)],
    ['Q1', num(d.q1, dec)],
    ['Q3', num(d.q3, dec)],
    ['IQR', num(d.iqr, dec)],
    ['Asimetría (G1)', d.skewness === null ? '—' : num(d.skewness, 4)],
    ['Curtosis exceso (G2)', d.kurtosis === null ? '—' : num(d.kurtosis, 4)],
    ['IC 95 % de la media', ci ? `${num(ci.lower, dec)} – ${num(ci.upper, dec)}` : '—'],
    [],
    ['Criterio de clasificación', input.criterioLabel],
    ['Procedencia', input.criterioFuente],
    ['Norma oficial', input.criterioOficial ? 'Sí' : 'No'],
    [],
    ['Normalidad (Shapiro-Wilk)', sw ? `W = ${num(sw.W, 4)}, p = ${sw.pValue < 0.0001 ? '< 0.0001' : num(sw.pValue, 4)}` : 'No evaluada'],
    ['Posibles atípicos', out.flags.length],
  ];
  const wsR = XLSX.utils.aoa_to_sheet(resumen);
  wsR['!cols'] = [{ wch: 32 }, { wch: 46 }];
  XLSX.utils.book_append_sheet(wb, wsR, 'Resumen');

  const cats: Row[] = [['Categoría', 'Mínimo', 'Máximo', 'n', '%']];
  cl.bins.forEach((b, i) => {
    const eb = cl.effectiveBins[i];
    cats.push([
      b.label,
      eb.min === null ? 'sin límite' : num(eb.min, dec),
      eb.max === null ? 'sin límite' : num(eb.max, dec),
      b.count,
      num(b.pct, 1),
    ]);
  });
  if (cl.unclassified > 0) {
    cats.push(['Sin clasificar', '', '', cl.unclassified, num((cl.unclassified / cl.n) * 100, 1)]);
  }
  const wsC = XLSX.utils.aoa_to_sheet(cats);
  wsC['!cols'] = [{ wch: 28 }, { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 8 }];
  XLSX.utils.book_append_sheet(wb, wsC, 'Categorías');

  const flagIdx = new Set(out.flags.map((x) => x.index));
  const datos: Row[] = [['#', `${variable.label}${u ? ` (${u})` : ''}`, 'Categoría', 'Posible atípico']];
  valores.forEach((v, i) => {
    const bin = cl.bins.find((b) => b.indices.includes(i));
    datos.push([i + 1, v, bin?.label ?? 'Sin clasificar', flagIdx.has(i) ? 'Sí' : '']);
  });
  const wsD = XLSX.utils.aoa_to_sheet(datos);
  wsD['!cols'] = [{ wch: 6 }, { wch: 16 }, { wch: 28 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsD, 'Datos');

  const fecha = new Date().toISOString().slice(0, 10);
  const base = (contexto.nombre || variable.label).replace(/[^\w-]+/g, '_');
  XLSX.writeFile(wb, `${base}-${fecha}.xlsx`);
}

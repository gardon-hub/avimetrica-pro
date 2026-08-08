'use client';

/**
 * Control estadístico del lote (Fase 7).
 *
 * Decisiones de dominio:
 * - No se grafica una carta X̄ sobre el peso crudo: en aves en crecimiento la
 *   media tiene tendencia natural y violaría el supuesto de proceso estable.
 * - Se usan cartas de individuales (I-MR) sobre magnitudes aproximadamente
 *   estables entre pesajes: el CV (%) y la desviación porcentual respecto al
 *   objetivo de la línea.
 * - Si no hay suficientes pesajes (≥8) la herramienta explica por qué no es
 *   apropiada en lugar de dibujar límites poco confiables.
 */

import { useMemo } from 'react';
import { PesajeFull } from '@/lib/lotes-api';
import { calculateStats } from '@/lib/calculations';
import { getTargetWeight } from '@/lib/diagnostic-engine';
import { imrChart, nelsonRules, NelsonViolation, IMRChart } from '@/lib/statistics/spc';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Info } from 'lucide-react';

const MIN_SUBGROUPS = 8;

interface SeriesDef {
  key: string;
  title: string;
  unit: string;
  values: number[];
  labels: string[];
}

function ControlChartSVG({ chart, def, violations }: { chart: IMRChart; def: SeriesDef; violations: NelsonViolation[] }) {
  const width = 560;
  const height = 250;
  const padL = 46;
  const padR = 60;
  const padT = 16;
  const padB = 40;

  const all = [...chart.points, chart.ucl, chart.lcl, chart.center];
  let minY = Math.min(...all);
  let maxY = Math.max(...all);
  if (minY === maxY) { minY -= 1; maxY += 1; }
  const span = (maxY - minY) * 0.08;
  minY -= span;
  maxY += span;

  const n = chart.points.length;
  const toX = (i: number) => padL + (n === 1 ? (width - padL - padR) / 2 : (i / (n - 1)) * (width - padL - padR));
  const toY = (v: number) => padT + (height - padT - padB) * (1 - (v - minY) / (maxY - minY));

  const badIdx = new Set(violations.map((v) => v.index));
  const path = chart.points.map((v, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ');

  const refLine = (v: number, color: string, label: string, dash = '6,4') => (
    <g key={label}>
      <line x1={padL} y1={toY(v)} x2={width - padR} y2={toY(v)} stroke={color} strokeWidth={1.4} strokeDasharray={dash} />
      <text x={width - padR + 4} y={toY(v) + 3} fontSize={9} fontWeight="bold" fill={color}>{label} {v.toFixed(2)}</text>
    </g>
  );

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img"
      aria-label={`Carta de control de ${def.title}: ${violations.length} señal(es) de las reglas de Nelson`}>
      <rect width={width} height={height} fill="white" rx={8} />
      {refLine(chart.ucl, '#dc2626', 'LCS')}
      {refLine(chart.center, '#555', 'LC', '2,3')}
      {refLine(chart.lcl, '#dc2626', 'LCI')}
      <path d={path} fill="none" stroke="#2E7D32" strokeWidth={1.8} strokeLinejoin="round" />
      {chart.points.map((v, i) => (
        <circle key={i} cx={toX(i)} cy={toY(v)} r={badIdx.has(i) ? 4.5 : 3.2}
          fill={badIdx.has(i) ? '#dc2626' : '#2E7D32'}>
          <title>{`${def.labels[i]}: ${v.toFixed(2)} ${def.unit}${badIdx.has(i) ? ' — señal de control' : ''}`}</title>
        </circle>
      ))}
      {def.labels.map((l, i) => (
        <text key={i} x={toX(i)} y={height - padB + 13} textAnchor="middle" fontSize={8}
          fill="#666" transform={`rotate(-30 ${toX(i)} ${height - padB + 13})`}>{l}</text>
      ))}
      <text x={width / 2} y={height - 4} textAnchor="middle" fontSize={11} fontWeight="bold" fill="#444">
        {def.title} ({def.unit}) — carta de individuales, límites ±2.66·MR̄
      </text>
    </svg>
  );
}

export function SpcPanel({ pesajes, lineaGenetica }: { pesajes: PesajeFull[]; lineaGenetica: string }) {
  const series = useMemo((): SeriesDef[] => {
    const valid = pesajes
      .filter((p) => p.pesos.filter((w) => !w.excluido).length >= 2)
      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
    const labels = valid.map((p) => new Date(p.fecha).toLocaleDateString());
    const stats = valid.map((p) => calculateStats(p.pesos.filter((w) => !w.excluido).map((w) => w.gramos), p.criterioPct));

    const out: SeriesDef[] = [
      { key: 'cv', title: 'Coeficiente de variación', unit: '%', values: stats.map((s) => s.cv), labels },
      { key: 'unif', title: 'Uniformidad', unit: '%', values: stats.map((s) => s.uniformidad), labels },
    ];

    // Desviación % vs. objetivo solo si TODOS los pesajes tienen edad y referencia
    const targets = valid.map((p) => (p.edadSemanas ? getTargetWeight(lineaGenetica, p.edadSemanas) : null));
    if (targets.every((t) => t !== null)) {
      out.push({
        key: 'target',
        title: 'Desviación vs. objetivo de la línea',
        unit: '%',
        values: stats.map((s, i) => ((s.promedio - targets[i]!.pesoOptimo) / targets[i]!.pesoOptimo) * 100),
        labels,
      });
    }
    return out;
  }, [pesajes, lineaGenetica]);

  const nValid = series[0]?.values.length ?? 0;

  if (nValid < MIN_SUBGROUPS) {
    return (
      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-xs text-blue-900 leading-relaxed space-y-1">
          <p><b>La carta de control aún no es apropiada para este lote.</b></p>
          <p>
            Hay {nValid} pesaje(s) válido(s) y se requieren al menos {MIN_SUBGROUPS} para estimar límites de
            control mínimamente confiables (idealmente 20+). Con pocos subgrupos, los límites quedan tan
            inciertos que producirían falsas alarmas o darían falsa seguridad.
          </p>
          <p>
            Mientras tanto, la pestaña <b>Evolución</b> muestra la tendencia del peso, CV y uniformidad,
            que es la lectura correcta con pocos pesajes.
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-5">
      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-[11px] text-blue-900 leading-snug">
          No se grafica el peso promedio crudo: en aves en crecimiento la media sube de forma natural y una
          carta X̄ marcaría esa tendencia como &quot;fuera de control&quot;. Se controlan magnitudes
          aproximadamente estables entre pesajes: CV, uniformidad y desviación % contra el objetivo de la línea.
          Cada pesaje se trata como una observación individual (carta I-MR).
        </AlertDescription>
      </Alert>

      {series.map((def) => {
        const chart = imrChart(def.values);
        if (!chart) return null;
        const violations = nelsonRules(chart.points, chart.center, chart.ucl, chart.lcl);
        return (
          <div key={def.key} className="space-y-1.5">
            <ControlChartSVG chart={chart} def={def} violations={violations} />
            {violations.length > 0 ? (
              <Alert className="border-amber-300 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-[11px] text-amber-900 space-y-0.5">
                  {violations.map((v, i) => (
                    <div key={i}>• Regla de Nelson {v.rule}: {v.description}</div>
                  ))}
                  <div className="pt-0.5">
                    Una señal indica variación no aleatoria que conviene investigar (alimentación, ambiente,
                    salud, error de pesaje); no es por sí sola un diagnóstico.
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Sin señales de las reglas de Nelson 1-3: la variación de {def.title.toLowerCase()} entre
                pesajes es compatible con variación aleatoria.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

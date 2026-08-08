'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useUniformidadStore } from '@/lib/store';
import { pdf } from '@/lib/calculations';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  Filler,
  Title,
  Tooltip,
} from 'chart.js';
import type { Plugin, ChartType } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, LineController, Filler, Title, Tooltip);

const META_KEY = '__uniformidadMeta__';

interface ChartMeta {
  media: number;
  limInf: number;
  limSup: number;
  uniformidad: number;
  desvEst: number;
  criterioPct: number;
}

const referenceLinesPlugin: Plugin<ChartType> = {
  id: 'referenceLinesAndLabels',
  afterDraw: (chart) => {
    const meta = (chart as unknown as Record<string, ChartMeta>)[META_KEY];
    if (!meta) return;

    const { ctx } = chart;
    const xAxis = chart.scales.x;
    const yAxis = chart.scales.y;

    // Calculate the peak of the curve at each reference line
    const peakY = pdf(meta.media, meta.media, meta.desvEst);
    const peakPixel = yAxis.getPixelForValue(peakY);

    // Draw a reference line that goes from bottom to the curve's height at that x value
    const drawRefLine = (value: number, color: string, dash: number[], labelText: string) => {
      // Escala de categorías: la búsqueda es por etiqueta (string), el tipado de
      // Chart.js solo declara number
      const x = xAxis.getPixelForValue(value.toFixed(1) as unknown as number);
      if (isNaN(x)) return;

      // Calculate the curve height at this specific x value
      const curveY = pdf(value, meta.media, meta.desvEst || 50);
      const curvePixel = yAxis.getPixelForValue(curveY);

      ctx.save();
      ctx.beginPath();
      ctx.setLineDash(dash);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.moveTo(x, yAxis.bottom);
      ctx.lineTo(x, curvePixel);
      ctx.stroke();
      ctx.restore();

      // Draw label above the line endpoint (above the curve)
      ctx.save();
      ctx.fillStyle = color;
      ctx.font = "bold 12px 'Segoe UI', sans-serif";
      ctx.textAlign = 'center';
      ctx.fillText(labelText, x, curvePixel - 6);
      ctx.restore();
    };

    // Draw mean line - dashed, from bottom to the peak of the curve
    const xMedia = xAxis.getPixelForValue(meta.media.toFixed(1) as unknown as number);
    if (!isNaN(xMedia)) {
      ctx.save();
      ctx.beginPath();
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.moveTo(xMedia, yAxis.bottom);
      ctx.lineTo(xMedia, peakPixel);
      ctx.stroke();
      ctx.restore();

      // Label for mean at the top
      ctx.save();
      ctx.fillStyle = '#333';
      ctx.font = "bold 12px 'Segoe UI', sans-serif";
      ctx.textAlign = 'center';
      ctx.fillText(`μ: ${meta.media.toFixed(1)}`, xMedia, peakPixel - 6);
      ctx.restore();
    }

    // Draw limit lines - solid, from bottom to curve height
    drawRefLine(meta.limInf, '#e53935', [], `-${meta.criterioPct}%: ${meta.limInf.toFixed(1)}`);
    drawRefLine(meta.limSup, '#4CAF50', [], `+${meta.criterioPct}%: ${meta.limSup.toFixed(1)}`);

    // Uniformity label at the bottom right area
    const xSup = xAxis.getPixelForValue(meta.limSup.toFixed(1) as unknown as number);
    if (!isNaN(xSup)) {
      ctx.save();
      ctx.fillStyle = '#333';
      ctx.font = "bold 12px 'Segoe UI', sans-serif";
      ctx.textAlign = 'right';
      ctx.fillText(`Uniformidad: ${meta.uniformidad.toFixed(1)}%`, xAxis.right, yAxis.bottom + 18);
      ctx.restore();
    }
  },
};

// Register plugin once
let pluginRegistered = false;
if (!pluginRegistered) {
  ChartJS.register(referenceLinesPlugin);
  pluginRegistered = true;
}

export function DistributionChart() {
  const { pesos, stats } = useUniformidadStore();
  const chartRef = useRef<ChartJS<'line'> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const updateChart = useCallback(() => {
    if (!canvasRef.current) return;

    if (pesos.length < 2) {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
      return;
    }

    const { promedio: media, desvEst, limiteInf: limInf, limiteSup: limSup, uniformidad, criterioPct } = stats;
    const safeDesvEst = desvEst === 0 ? 50 : desvEst;
    const minVal = media - 3.5 * safeDesvEst;
    const maxVal = media + 3.5 * safeDesvEst;
    const numPoints = 100;
    const step = (maxVal - minVal) / numPoints;

    const labels: string[] = [];
    const dataPoints: number[] = [];
    const shadedData: (number | null)[] = [];

    for (let x = minVal; x <= maxVal; x += step) {
      labels.push(x.toFixed(1));
      const yVal = pdf(x, media, safeDesvEst);
      dataPoints.push(yVal);
      if (x >= limInf && x <= limSup) {
        shadedData.push(yVal);
      } else {
        shadedData.push(null);
      }
    }

    // Update existing chart
    if (chartRef.current) {
      chartRef.current.data.labels = labels;
      chartRef.current.data.datasets[0].data = dataPoints;
      chartRef.current.data.datasets[1].data = shadedData;
      (chartRef.current as unknown as Record<string, ChartMeta>)[META_KEY] = {
        media, limInf, limSup, uniformidad, desvEst: safeDesvEst, criterioPct,
      };
      chartRef.current.update('none');
      return;
    }

    const chart = new ChartJS(canvasRef.current, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Curva Normal',
            data: dataPoints,
            borderColor: '#2E7D32',
            borderWidth: 2.5,
            pointRadius: 0,
            fill: false,
            tension: 0.4,
          },
          {
            label: 'Área Uniforme',
            data: shadedData,
            borderColor: 'transparent',
            backgroundColor: 'rgba(76, 175, 80, 0.3)',
            borderWidth: 0,
            pointRadius: 0,
            fill: true,
            tension: 0.4,
            spanGaps: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 1.6,
        layout: {
          padding: { top: 25, bottom: 25, left: 5, right: 5 },
        },
        animation: { duration: 400 },
        scales: {
          y: {
            beginAtZero: true,
            display: false,
          },
          x: {
            title: {
              display: true,
              text: 'Peso (g)',
              font: { size: 14, weight: 'bold' as const },
              color: '#333',
            },
            ticks: {
              maxTicksLimit: 7,
              font: { size: 11 },
              color: '#555',
            },
            grid: { display: false },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false },
        },
      },
    });

    (chart as unknown as Record<string, ChartMeta>)[META_KEY] = {
      media, limInf, limSup, uniformidad, desvEst: safeDesvEst, criterioPct,
    };
    chartRef.current = chart;
  }, [pesos, stats]);

  useEffect(() => {
    updateChart();
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [updateChart]);

  if (pesos.length < 2) {
    return (
      <div className="bg-card rounded-lg border shadow-sm py-5 px-5 text-center text-muted-foreground mb-4 text-sm">
        Ingresa al menos 2 pesos para ver la gráfica
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border shadow-sm py-3 px-3 mb-4">
      <canvas ref={canvasRef} />
    </div>
  );
}

// Export a helper to get chart as image for the report
export function getChartAsImage(chartCanvas: HTMLCanvasElement | null): string {
  if (!chartCanvas) return '';
  try {
    return chartCanvas.toDataURL('image/png', 1.0);
  } catch {
    return '';
  }
}

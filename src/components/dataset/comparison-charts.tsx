'use client';

/**
 * Gráficos de barras para la comparación de dos muestreos.
 *
 * A diferencia de los gráficos SVG anteriores del proyecto —que fijan el fondo
 * en blanco y los textos en gris— estos usan clases del tema (fill-card,
 * fill-muted-foreground), de modo que se leen correctamente en modo claro y
 * oscuro sin duplicar código.
 */

const COLOR_A = '#2563eb'; // azul
const COLOR_B = '#f59e0b'; // ámbar

/** Recorta etiquetas largas; el texto completo queda en el tooltip. */
function corta(s: string, max = 14): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/**
 * Escala "bonita": devuelve el tope y el paso de forma que las marcas del eje
 * caigan en números redondos (5, 10, 20, 25, 50…) en vez de valores como
 * 17.5 o 52.5, que resultan de dividir un tope arbitrario entre 4.
 */
function escalaBonita(maxValor: number, maxMarcas = 5): { tope: number; paso: number } {
  const pasos = [1, 2, 5, 10, 20, 25, 50, 100];
  for (const paso of pasos) {
    if (paso * (maxMarcas - 1) >= maxValor) {
      return { tope: paso * (maxMarcas - 1), paso };
    }
  }
  const paso = Math.ceil(maxValor / (maxMarcas - 1));
  return { tope: paso * (maxMarcas - 1), paso };
}

export interface CategoriaComparada {
  label: string;
  pctA: number;
  pctB: number;
  nA: number;
  nB: number;
}

/**
 * Barras agrupadas: por cada categoría, el porcentaje de A junto al de B.
 * Es la lectura práctica de un muestreo de huevos — hacia dónde se movió la
 * distribución de tamaños entre dos fechas.
 */
export function CategoriasBarChart({
  categorias,
  nombreA,
  nombreB,
}: {
  categorias: CategoriaComparada[];
  nombreA: string;
  nombreB: string;
}) {
  if (categorias.length === 0) return null;

  const W = 560;
  const H = 260;
  const padL = 38;
  const padR = 12;
  const padT = 28;
  const padB = 58;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const maxPct = Math.max(...categorias.flatMap((c) => [c.pctA, c.pctB]), 1);
  const { tope: topY, paso } = escalaBonita(maxPct);
  const marcas = Math.round(topY / paso);

  const grupoW = chartW / categorias.length;
  const barW = Math.min(22, (grupoW - 8) / 2);
  const toY = (pct: number) => padT + chartH * (1 - pct / topY);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto"
      role="img"
      aria-label={`Gráfico de barras comparando el porcentaje por categoría entre ${nombreA} y ${nombreB}`}
    >
      <rect width={W} height={H} className="fill-card" rx={8} />

      {/* Rejilla y eje Y en porcentaje, con marcas en números redondos */}
      {Array.from({ length: marcas + 1 }, (_, i) => {
        const pct = paso * i;
        const y = toY(pct);
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={W - padR} y2={y} className="stroke-border" strokeWidth={1} />
            <text x={padL - 5} y={y + 3} textAnchor="end" fontSize={9} className="fill-muted-foreground">
              {pct.toFixed(0)}
            </text>
          </g>
        );
      })}

      {categorias.map((c, i) => {
        const x0 = padL + i * grupoW;
        const centro = x0 + grupoW / 2;
        const xA = centro - barW - 2;
        const xB = centro + 2;
        return (
          <g key={c.label}>
            <rect x={xA} y={toY(c.pctA)} width={barW} height={Math.max(toY(0) - toY(c.pctA), 0)} fill={COLOR_A} rx={2}>
              <title>{`${c.label} — ${nombreA}: ${c.nA} (${c.pctA.toFixed(1)} %)`}</title>
            </rect>
            <rect x={xB} y={toY(c.pctB)} width={barW} height={Math.max(toY(0) - toY(c.pctB), 0)} fill={COLOR_B} rx={2}>
              <title>{`${c.label} — ${nombreB}: ${c.nB} (${c.pctB.toFixed(1)} %)`}</title>
            </rect>
            <text
              x={centro}
              y={toY(0) + 12}
              textAnchor="end"
              fontSize={8.5}
              className="fill-muted-foreground"
              transform={`rotate(-35 ${centro} ${toY(0) + 12})`}
            >
              {corta(c.label)}
              <title>{c.label}</title>
            </text>
          </g>
        );
      })}

      <line x1={padL} y1={toY(0)} x2={W - padR} y2={toY(0)} className="stroke-border" strokeWidth={1.5} />

      {/* Leyenda */}
      <rect x={padL} y={8} width={10} height={10} fill={COLOR_A} rx={2} />
      <text x={padL + 14} y={17} fontSize={9.5} className="fill-muted-foreground">{corta(nombreA, 24)}</text>
      <rect x={padL + 180} y={8} width={10} height={10} fill={COLOR_B} rx={2} />
      <text x={padL + 194} y={17} fontSize={9.5} className="fill-muted-foreground">{corta(nombreB, 24)}</text>

      <text x={10} y={padT - 12} fontSize={9} className="fill-muted-foreground">%</text>
    </svg>
  );
}

/**
 * Medias con su intervalo de confianza del 95 %.
 * Visualiza el resultado de la prueba t: si las barras de error no se
 * solapan, la diferencia es clara; si se solapan mucho, conviene mirar el
 * valor p antes de concluir.
 */
export function MediasBarChart({
  mediaA,
  mediaB,
  ciA,
  ciB,
  nombreA,
  nombreB,
  unidad,
  decimales,
}: {
  mediaA: number;
  mediaB: number;
  ciA: { lower: number; upper: number } | null;
  ciB: { lower: number; upper: number } | null;
  nombreA: string;
  nombreB: string;
  unidad: string;
  decimales: number;
}) {
  const W = 560;
  const H = 200;
  const padL = 52;
  const padR = 16;
  const padT = 18;
  const padB = 42;
  const chartH = H - padT - padB;

  const valores = [mediaA, mediaB, ciA?.lower, ciA?.upper, ciB?.lower, ciB?.upper].filter(
    (v): v is number => typeof v === 'number' && Number.isFinite(v),
  );
  let minY = Math.min(...valores);
  let maxY = Math.max(...valores);
  // La escala NO arranca en cero a propósito: con medias grandes y diferencias
  // pequeñas, forzar el cero aplanaría el gráfico y ocultaría la comparación.
  const margen = (maxY - minY) * 0.25 || Math.abs(maxY) * 0.05 || 1;
  minY -= margen;
  maxY += margen;

  const toY = (v: number) => padT + chartH * (1 - (v - minY) / (maxY - minY));
  const f = (v: number) => v.toFixed(decimales);

  const barras = [
    { nombre: nombreA, media: mediaA, ci: ciA, color: COLOR_A, x: padL + 90 },
    { nombre: nombreB, media: mediaB, ci: ciB, color: COLOR_B, x: padL + 300 },
  ];
  const barW = 90;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto"
      role="img"
      aria-label={`Medias con intervalo de confianza del 95 %: ${nombreA} ${f(mediaA)} ${unidad}, ${nombreB} ${f(mediaB)} ${unidad}`}
    >
      <rect width={W} height={H} className="fill-card" rx={8} />

      {Array.from({ length: 5 }, (_, i) => {
        const v = minY + ((maxY - minY) * i) / 4;
        return (
          <g key={i}>
            <line x1={padL} y1={toY(v)} x2={W - padR} y2={toY(v)} className="stroke-border" strokeWidth={1} />
            <text x={padL - 5} y={toY(v) + 3} textAnchor="end" fontSize={9} className="fill-muted-foreground">
              {f(v)}
            </text>
          </g>
        );
      })}

      {barras.map((b) => (
        <g key={b.nombre}>
          <rect
            x={b.x - barW / 2}
            y={toY(b.media)}
            width={barW}
            height={Math.max(toY(minY) - toY(b.media), 0)}
            fill={b.color}
            opacity={0.85}
            rx={3}
          >
            <title>{`${b.nombre}: ${f(b.media)} ${unidad}${b.ci ? ` (IC 95 %: ${f(b.ci.lower)} – ${f(b.ci.upper)})` : ''}`}</title>
          </rect>
          {b.ci && (
            <g stroke="#111827" strokeWidth={1.6} className="dark:stroke-white">
              <line x1={b.x} y1={toY(b.ci.lower)} x2={b.x} y2={toY(b.ci.upper)} />
              <line x1={b.x - 9} y1={toY(b.ci.lower)} x2={b.x + 9} y2={toY(b.ci.lower)} />
              <line x1={b.x - 9} y1={toY(b.ci.upper)} x2={b.x + 9} y2={toY(b.ci.upper)} />
            </g>
          )}
          <text x={b.x} y={toY(minY) + 14} textAnchor="middle" fontSize={9.5} className="fill-muted-foreground">
            {corta(b.nombre, 26)}
          </text>
          {/* La cifra va por ENCIMA del extremo superior del IC, no de la
              barra, para que no se solape con el bigote de error. */}
          <text
            x={b.x}
            y={toY(b.ci ? b.ci.upper : b.media) - 7}
            textAnchor="middle"
            fontSize={10}
            fontWeight="bold"
            className="fill-foreground"
          >
            {f(b.media)}
          </text>
        </g>
      ))}

      <line x1={padL} y1={toY(minY)} x2={W - padR} y2={toY(minY)} className="stroke-border" strokeWidth={1.5} />
      <text x={10} y={padT - 4} fontSize={9} className="fill-muted-foreground">{unidad}</text>
      <text x={W - padR} y={H - 6} textAnchor="end" fontSize={8.5} className="fill-muted-foreground">
        Barras de error: IC 95 % de la media
      </text>
    </svg>
  );
}

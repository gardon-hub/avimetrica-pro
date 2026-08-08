'use client';

import { useUniformidadStore } from '@/lib/store';
import { generateDiagnostic, REFERENCE_DATA_VERSION } from '@/lib/diagnostic-engine';
import type { DiagnosticResult } from '@/lib/diagnostic-engine';
import {
  BookOpen,
  AlertTriangle,
  Search,
  TrendingUp,
  AlertCircle,
  Lightbulb,
  GraduationCap,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useState } from 'react';

function SectionBlock({
  icon,
  iconColor,
  title,
  children,
  defaultOpen = true,
}: {
  icon: React.ReactNode;
  iconColor: string;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="mb-2 last:mb-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 w-full text-left py-1 group pointer-coarse:min-h-11"
      >
        <span className={iconColor}>{icon}</span>
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex-1">
          {title}
        </span>
        {open ? (
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
        )}
      </button>
      {open && <div className="pl-5 pb-1.5">{children}</div>}
    </div>
  );
}

function LevelBadge({ level }: { level: DiagnosticResult['level'] }) {
  const config = {
    excellent: { label: 'Excelente', className: 'bg-green-100 text-green-800 border-green-300' },
    regular: { label: 'Regular', className: 'bg-amber-100 text-amber-800 border-amber-300' },
    poor: { label: 'Pobre', className: 'bg-red-100 text-red-800 border-red-300' },
  };
  const c = config[level];
  return (
    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${c.className}`}>
      {c.label}
    </span>
  );
}

export function DiagnosticPanel() {
  const { stats, lineaGenetica, edadSemanas } = useUniformidadStore();

  if (stats.totalAves === 0) return null;

  const edad = edadSemanas ? parseInt(edadSemanas, 10) : 0;

  const diagnostic = generateDiagnostic({
    lineaGenetica,
    edadSemanas: edad,
    promedio: stats.promedio,
    desvEst: stats.desvEst,
    cv: stats.cv,
    uniformidad: stats.uniformidad,
    limiteInf: stats.limiteInf,
    limiteSup: stats.limiteSup,
    countDebajo: stats.countDebajo,
    countEncima: stats.countEncima,
    countDentro: stats.countDentro,
    totalAves: stats.totalAves,
  });

  const borderColor =
    diagnostic.level === 'excellent'
      ? 'border-l-green-600'
      : diagnostic.level === 'regular'
        ? 'border-l-amber-500'
        : 'border-l-red-600';

  // Las variantes dark: no son cosmética: sin ellas el panel conservaba fondo
  // claro en modo oscuro mientras sus textos usan tokens del tema, y el título
  // (text-foreground) quedaba blanco sobre verde claro, es decir invisible.
  // Se sigue la convención que ya usa la lista de pesos: tinte -950 con alfa.
  const bgColor =
    diagnostic.level === 'excellent'
      ? 'bg-green-50 dark:bg-green-950/40'
      : diagnostic.level === 'regular'
        ? 'bg-amber-50 dark:bg-amber-950/40'
        : 'bg-red-50 dark:bg-red-950/40';

  return (
    <div className={`rounded-lg border border-l-4 ${borderColor} ${bgColor} py-3 px-4 mb-4`}>
      {/* Header */}
      <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-sm font-bold mb-2">
        <BookOpen className="h-4 w-4" />
        Diagnóstico Didáctico
        <span className="ml-auto text-[9px] font-normal text-muted-foreground" title="Versión de datos de referencia">v{REFERENCE_DATA_VERSION}</span>
      </div>

      {/* Title + Badge */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <p className="font-bold text-foreground text-sm flex-1 min-w-0">{diagnostic.title}</p>
        <LevelBadge level={diagnostic.level} />
      </div>

      {/* Stage indicator */}
      <div className="flex items-center gap-1.5 mb-3 text-xs text-muted-foreground">
        <TrendingUp className="h-3.5 w-3.5" />
        <span>
          Etapa: <strong className="text-muted-foreground">{diagnostic.stageLabel}</strong>
          {' · '}
          Tipo: <strong className="text-muted-foreground">{diagnostic.birdType === 'broiler' ? 'Broiler (Engorde)' : 'Ponedora (Postura)'}</strong>
        </span>
      </div>

      {/* Interpretación técnica */}
      <SectionBlock
        icon={<Search className="h-3.5 w-3.5" />}
        iconColor="text-blue-600"
        title="Interpretación Técnica"
      >
        <p className="text-muted-foreground text-xs leading-relaxed">
          {diagnostic.interpretacion}
        </p>
      </SectionBlock>

      {/* Comparación de peso */}
      <SectionBlock
        icon={<TrendingUp className="h-3.5 w-3.5" />}
        iconColor="text-purple-600"
        title="Peso vs. Referencia"
        defaultOpen={!!edad}
      >
        <p className="text-muted-foreground text-xs leading-relaxed">
          {diagnostic.pesoComparacion}
        </p>
      </SectionBlock>

      {/* Alertas */}
      {diagnostic.alertas.length > 0 && (
        <SectionBlock
          icon={<AlertTriangle className="h-3.5 w-3.5" />}
          iconColor="text-amber-500"
          title="Alertas"
        >
          <ul className="space-y-1">
            {diagnostic.alertas.map((alerta, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-amber-800">
                <AlertCircle className="h-3 w-3 mt-0.5 shrink-0 text-amber-500" />
                <span className="leading-relaxed">{alerta}</span>
              </li>
            ))}
          </ul>
        </SectionBlock>
      )}

      {/* Causas */}
      <SectionBlock
        icon={<AlertCircle className="h-3.5 w-3.5" />}
        iconColor="text-red-500"
        title="Posibles Causas"
        defaultOpen={diagnostic.level !== 'excellent'}
      >
        <ul className="space-y-0.5">
          {diagnostic.causas.map((causa, i) => (
            <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <span className="text-red-400 mt-0.5 shrink-0">•</span>
              <span className="leading-relaxed">{causa}</span>
            </li>
          ))}
        </ul>
      </SectionBlock>

      {/* Recomendaciones */}
      <SectionBlock
        icon={<Lightbulb className="h-3.5 w-3.5" />}
        iconColor="text-green-600"
        title="Recomendaciones de Manejo"
      >
        <ul className="space-y-0.5">
          {diagnostic.recomendaciones.map((rec, i) => (
            <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <span className="text-green-500 mt-0.5 shrink-0">✓</span>
              <span className="leading-relaxed">{rec}</span>
            </li>
          ))}
        </ul>
      </SectionBlock>

      {/* Comentario didáctico */}
      <SectionBlock
        icon={<GraduationCap className="h-3.5 w-3.5" />}
        iconColor="text-indigo-600"
        title="Nota Didáctica"
      >
        <p className="text-muted-foreground text-xs leading-relaxed italic border-l-2 border-indigo-300 pl-2.5">
          {diagnostic.didactico}
        </p>
      </SectionBlock>
    </div>
  );
}

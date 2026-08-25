'use client';

import { useTranslations } from 'next-intl';
import { useUniformidadStore } from '@/lib/store';
import { generateDiagnostic, REFERENCE_DATA_VERSION } from '@/lib/diagnostic-engine';
import type { DiagnosticResult, MensajeDiagnostico } from '@/lib/diagnostic-engine';
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

function LevelBadge({ level, label }: { level: DiagnosticResult['level']; label: string }) {
  const className = {
    excellent: 'bg-green-100 text-green-800 border-green-300',
    regular: 'bg-amber-100 text-amber-800 border-amber-300',
    poor: 'bg-red-100 text-red-800 border-red-300',
  }[level];
  return (
    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${className}`}>
      {label}
    </span>
  );
}

export function DiagnosticPanel() {
  const { stats, lineaGenetica, tipoOtraLinea, edadSemanas } = useUniformidadStore();
  // Todo el texto del diagnóstico —marco Y prosa del motor— sale del catálogo:
  // el motor devuelve mensajes {key, params} y aquí se componen (ver
  // MensajeDiagnostico en diagnostic-engine.ts).
  const t = useTranslations('diagnosticEngine');
  const msg = (m: MensajeDiagnostico) => t(m.key, m.params);
  const frase = (ms: MensajeDiagnostico[]) => ms.map(msg).join(' ');

  if (stats.totalAves === 0) return null;

  const edad = edadSemanas ? parseInt(edadSemanas, 10) : 0;

  const diagnostic = generateDiagnostic({
    lineaGenetica,
    tipoAveManual: tipoOtraLinea,
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
        {t('panel.title')}
        <span className="ml-auto text-[9px] font-normal text-muted-foreground" title={t('panel.refDataVersion')}>v{REFERENCE_DATA_VERSION}</span>
      </div>

      {/* Title + Badge */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <p className="font-bold text-foreground text-sm flex-1 min-w-0">
          {msg(diagnostic.titulo)} | {t(diagnostic.stageKey)}
        </p>
        <LevelBadge level={diagnostic.level} label={t(`level.${diagnostic.level}`)} />
      </div>

      {/* Stage indicator */}
      <div className="flex items-center gap-1.5 mb-3 text-xs text-muted-foreground">
        <TrendingUp className="h-3.5 w-3.5" />
        <span>
          {t('panel.stage')} <strong className="text-muted-foreground">{t(diagnostic.stageKey)}</strong>
          {' · '}
          {t('panel.type')} <strong className="text-muted-foreground">{t(`birdType.${diagnostic.birdType}`)}</strong>
        </span>
      </div>

      {/* Interpretación técnica */}
      <SectionBlock
        icon={<Search className="h-3.5 w-3.5" />}
        iconColor="text-blue-600"
        title={t('panel.interpretation')}
      >
        <p className="text-muted-foreground text-xs leading-relaxed">
          {frase(diagnostic.interpretacion)}
        </p>
      </SectionBlock>

      {/* Comparación de peso */}
      <SectionBlock
        icon={<TrendingUp className="h-3.5 w-3.5" />}
        iconColor="text-purple-600"
        title={t('panel.weightVsReference')}
        defaultOpen={!!edad}
      >
        <p className="text-muted-foreground text-xs leading-relaxed">
          {frase(diagnostic.pesoComparacion)}
        </p>
      </SectionBlock>

      {/* Alertas */}
      {diagnostic.alertas.length > 0 && (
        <SectionBlock
          icon={<AlertTriangle className="h-3.5 w-3.5" />}
          iconColor="text-amber-500"
          title={t('panel.alerts')}
        >
          <ul className="space-y-1">
            {diagnostic.alertas.map((alerta, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-amber-800 dark:text-amber-300">
                <AlertCircle className="h-3 w-3 mt-0.5 shrink-0 text-amber-500" />
                <span className="leading-relaxed">{msg(alerta)}</span>
              </li>
            ))}
          </ul>
        </SectionBlock>
      )}

      {/* Causas */}
      <SectionBlock
        icon={<AlertCircle className="h-3.5 w-3.5" />}
        iconColor="text-red-500"
        title={t('panel.causes')}
        defaultOpen={diagnostic.level !== 'excellent'}
      >
        <ul className="space-y-0.5">
          {diagnostic.causas.map((causa, i) => (
            <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <span className="text-red-400 mt-0.5 shrink-0">•</span>
              <span className="leading-relaxed">{msg(causa)}</span>
            </li>
          ))}
        </ul>
      </SectionBlock>

      {/* Recomendaciones */}
      <SectionBlock
        icon={<Lightbulb className="h-3.5 w-3.5" />}
        iconColor="text-green-600"
        title={t('panel.recommendations')}
      >
        <ul className="space-y-0.5">
          {diagnostic.recomendaciones.map((rec, i) => (
            <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <span className="text-green-500 mt-0.5 shrink-0">✓</span>
              <span className="leading-relaxed">{msg(rec)}</span>
            </li>
          ))}
        </ul>
      </SectionBlock>

      {/* Comentario didáctico */}
      <SectionBlock
        icon={<GraduationCap className="h-3.5 w-3.5" />}
        iconColor="text-indigo-600"
        title={t('panel.didacticNote')}
      >
        <p className="text-muted-foreground text-xs leading-relaxed italic border-l-2 border-indigo-300 pl-2.5">
          {msg(diagnostic.didactico)}
        </p>
      </SectionBlock>
    </div>
  );
}

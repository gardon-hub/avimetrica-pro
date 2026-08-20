import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { calculateStats, FlockStats, DEFAULT_UNIFORMITY_PCT } from '@/lib/calculations';
import type { ReportContext } from '@/lib/report-data';

interface UniformidadState {
  pesos: number[];
  lineaGenetica: string;
  /**
   * Propósito de una línea escrita por el usuario (fuera del catálogo): el
   * diagnóstico lo usa en vez de adivinar. Para líneas del catálogo se
   * ignora, porque el propósito va en el propio identificador.
   */
  tipoOtraLinea: 'broiler' | 'ponedora';
  edadSemanas: string;
  /** Criterio de uniformidad: media ± X% (10 = criterio tradicional) */
  uniformityPct: number;
  /** Contexto para reportes: lote, granja, galpón, responsable, muestreo */
  reportContext: ReportContext;
  stats: FlockStats;

  // Actions
  addPeso: (peso: number) => void;
  addPesos: (pesos: number[]) => void;
  removePeso: (index: number) => void;
  updatePeso: (index: number, nuevoPeso: number) => void;
  setPesos: (pesos: number[]) => void;
  setLineaGenetica: (linea: string) => void;
  setTipoOtraLinea: (tipo: 'broiler' | 'ponedora') => void;
  setEdadSemanas: (edad: string) => void;
  setUniformityPct: (pct: number) => void;
  setReportContext: (ctx: Partial<ReportContext>) => void;
  resetAll: () => void;
}

const emptyStats: FlockStats = calculateStats([]);

export const useUniformidadStore = create<UniformidadState>()(
  persist(
    (set, get) => ({
      pesos: [],
      lineaGenetica: 'Broiler - Cobb',
      tipoOtraLinea: 'ponedora',
      edadSemanas: '',
      uniformityPct: DEFAULT_UNIFORMITY_PCT,
      reportContext: {},
      stats: emptyStats,

      addPeso: (peso: number) => {
        const newPesos = [...get().pesos, peso];
        set({ pesos: newPesos, stats: calculateStats(newPesos, get().uniformityPct) });
      },

      addPesos: (nuevos: number[]) => {
        const newPesos = [...get().pesos, ...nuevos];
        set({ pesos: newPesos, stats: calculateStats(newPesos, get().uniformityPct) });
      },

      removePeso: (index: number) => {
        const newPesos = get().pesos.filter((_, i) => i !== index);
        set({ pesos: newPesos, stats: calculateStats(newPesos, get().uniformityPct) });
      },

      updatePeso: (index: number, nuevoPeso: number) => {
        const current = get().pesos;
        if (index < 0 || index >= current.length) return;
        const newPesos = [...current];
        newPesos[index] = nuevoPeso;
        set({ pesos: newPesos, stats: calculateStats(newPesos, get().uniformityPct) });
      },

      setPesos: (pesos: number[]) => {
        set({ pesos, stats: calculateStats(pesos, get().uniformityPct) });
      },

      setLineaGenetica: (linea: string) => {
        set({ lineaGenetica: linea });
      },

      setTipoOtraLinea: (tipo: 'broiler' | 'ponedora') => {
        set({ tipoOtraLinea: tipo });
      },

      setEdadSemanas: (edad: string) => {
        set({ edadSemanas: edad });
      },

      setUniformityPct: (pct: number) => {
        const safe = Number.isFinite(pct) && pct > 0 && pct <= 50 ? pct : DEFAULT_UNIFORMITY_PCT;
        set({ uniformityPct: safe, stats: calculateStats(get().pesos, safe) });
      },

      setReportContext: (ctx: Partial<ReportContext>) => {
        set({ reportContext: { ...get().reportContext, ...ctx } });
      },

      resetAll: () => {
        // El contexto del reporte (granja, responsable…) se conserva a propósito:
        // suele ser estable entre pruebas del mismo usuario
        set({
          pesos: [],
          lineaGenetica: 'Broiler - Cobb',
          edadSemanas: '',
          uniformityPct: DEFAULT_UNIFORMITY_PCT,
          stats: emptyStats,
        });
      },
    }),
    {
      name: 'uniformidadAvesData',
      // Sesiones guardadas antes de la v0.3 no traen uniformityPct:
      // se rellena con el predeterminado y se recalculan las estadísticas
      // (además migra la SD antigua poblacional → muestral).
      onRehydrateStorage: () => (state) => {
        if (state) {
          if (!Number.isFinite(state.uniformityPct) || state.uniformityPct <= 0) {
            state.uniformityPct = DEFAULT_UNIFORMITY_PCT;
          }
          state.stats = calculateStats(state.pesos, state.uniformityPct);
        }
      },
    }
  )
);

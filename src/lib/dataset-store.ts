'use client';

/**
 * Fábrica de stores de conjuntos de datos (Fase 8).
 *
 * El módulo de aves tiene su propio store histórico (`store.ts`) que se
 * conserva intacto para no arriesgar las sesiones ya guardadas. Los dominios
 * nuevos (huevos, estadística) comparten esta fábrica: un mismo comportamiento
 * —capturar valores, clasificarlos, describir la variable— parametrizado por
 * dominio, sin duplicar lógica.
 */

import { create, StoreApi, UseBoundStore } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ClassificationScheme } from '@/lib/classification';
import { classify, ClassificationResult } from '@/lib/classification';
import type { Domain, VariableDefinition } from '@/lib/domains/types';
import { defaultPreset } from '@/lib/domains/types';

export interface DatasetContext {
  /** Nombre del conjunto: "Muestreo 12/08", "Estatura 3° A". */
  nombre: string;
  /** Origen de los datos: granja, galpón, curso, experimento. */
  origen: string;
  responsable: string;
  fecha: string;
  observaciones: string;
}

export interface DatasetState {
  /** Valores capturados, siempre en la unidad de la variable. */
  valores: number[];
  /** Definición de la variable (los dominios fijos la traen del preset). */
  variable: VariableDefinition;
  /** Id del preset de clasificación activo. */
  presetId: string;
  /** Esquema activo; puede ser un preset o una edición del usuario. */
  scheme: ClassificationScheme;
  contexto: DatasetContext;

  // Derivado
  clasificacion: ClassificationResult;

  // Acciones
  addValor: (v: number) => void;
  addValores: (vs: number[]) => void;
  removeValor: (index: number) => void;
  updateValor: (index: number, v: number) => void;
  setValores: (vs: number[]) => void;
  setVariable: (v: Partial<VariableDefinition>) => void;
  setPreset: (presetId: string) => void;
  setScheme: (scheme: ClassificationScheme) => void;
  setContexto: (c: Partial<DatasetContext>) => void;
  reset: () => void;
}

const emptyContext: DatasetContext = {
  nombre: '',
  origen: '',
  responsable: '',
  fecha: '',
  observaciones: '',
};

export type DatasetStore = UseBoundStore<StoreApi<DatasetState>>;

export function createDatasetStore(domain: Domain, storageKey: string): DatasetStore {
  const preset = defaultPreset(domain);

  return create<DatasetState>()(
    persist(
      (set, get) => {
        /** Recalcula la clasificación tras cualquier cambio de datos o esquema. */
        const recalc = (valores: number[], scheme: ClassificationScheme) => ({
          valores,
          scheme,
          clasificacion: classify(valores, scheme),
        });

        return {
          valores: [],
          variable: { ...domain.variable },
          presetId: preset.id,
          scheme: preset.scheme,
          contexto: { ...emptyContext },
          clasificacion: classify([], preset.scheme),

          addValor: (v) => set(recalc([...get().valores, v], get().scheme)),

          addValores: (vs) => set(recalc([...get().valores, ...vs], get().scheme)),

          removeValor: (index) =>
            set(recalc(get().valores.filter((_, i) => i !== index), get().scheme)),

          updateValor: (index, v) => {
            const actuales = get().valores;
            if (index < 0 || index >= actuales.length) return;
            const nuevos = [...actuales];
            nuevos[index] = v;
            set(recalc(nuevos, get().scheme));
          },

          setValores: (vs) => set(recalc(vs, get().scheme)),

          setVariable: (v) => set({ variable: { ...get().variable, ...v } }),

          setPreset: (presetId) => {
            const p = domain.classificationPresets.find((x) => x.id === presetId);
            if (!p) return;
            set({ presetId, ...recalc(get().valores, p.scheme) });
          },

          /** Edición manual del esquema: marca el preset como personalizado. */
          setScheme: (scheme) => set({ ...recalc(get().valores, scheme) }),

          setContexto: (c) => set({ contexto: { ...get().contexto, ...c } }),

          reset: () =>
            set({
              variable: { ...domain.variable },
              presetId: preset.id,
              // El contexto se conserva: suele repetirse entre muestreos
              ...recalc([], preset.scheme),
            }),
        };
      },
      {
        name: storageKey,
        // La clasificación es derivada: no se persiste, se recalcula al
        // rehidratar para que nunca quede desincronizada de los valores.
        partialize: (s) => ({
          valores: s.valores,
          variable: s.variable,
          presetId: s.presetId,
          scheme: s.scheme,
          contexto: s.contexto,
        }) as unknown as DatasetState,
        onRehydrateStorage: () => (state) => {
          if (state) {
            state.clasificacion = classify(state.valores, state.scheme);
          }
        },
      },
    ),
  );
}

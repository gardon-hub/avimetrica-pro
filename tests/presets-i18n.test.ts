/**
 * Los textos canónicos de lib/domains/*.ts se traducen AL MOSTRAR
 * (preset-i18n.ts): estas pruebas garantizan que cada texto canónico que
 * puede llegar a pantalla tiene su clave en los TRES catálogos.
 *
 * Cubre: rótulos de categoría (binLabels), etiquetas de variable
 * (variables) y label/source/note de cada preset de huevos y estadística.
 * Si se añade un preset o una categoría nueva y falta su clave, esto es lo
 * que lo atrapa antes de publicar.
 */

import { describe, it, expect } from 'vitest';
import { createTranslator } from 'next-intl';
import es from '../src/messages/es.json';
import en from '../src/messages/en.json';
import pt from '../src/messages/pt.json';
import {
  BIN_LABEL_KEYS, VARIABLE_LABEL_KEYS, translateBinLabel, translateVariableLabel,
} from '../src/lib/domains/preset-i18n';
import { DOMINIO_HUEVOS } from '../src/lib/domains/huevos';
import { DOMINIO_GENERICO } from '../src/lib/domains/generico';

const CATALOGOS = [['es', es], ['en', en], ['pt', pt]] as const;

type T = (k: string) => string;
const traductor = (locale: string, messages: unknown): T =>
  createTranslator({ locale, messages: messages as never }) as unknown as T;

describe('presets de dominio: claves de catálogo', () => {
  for (const [locale, catalogo] of CATALOGOS) {
    const t = traductor(locale, catalogo);

    it(`todos los rótulos de categoría canónicos resuelven en ${locale}`, () => {
      for (const canonico of Object.keys(BIN_LABEL_KEYS)) {
        const texto = translateBinLabel(canonico, t);
        expect(texto, canonico).not.toMatch(/presets\./);
        expect(texto.length, canonico).toBeGreaterThan(0);
      }
    });

    it(`todas las etiquetas de variable canónicas resuelven en ${locale}`, () => {
      for (const canonico of Object.keys(VARIABLE_LABEL_KEYS)) {
        const texto = translateVariableLabel(canonico, t);
        expect(texto, canonico).not.toMatch(/presets\./);
        expect(texto.length, canonico).toBeGreaterThan(0);
      }
    });

    it(`label/source/note de cada preset resuelven en ${locale}`, () => {
      for (const dominio of [DOMINIO_HUEVOS, DOMINIO_GENERICO]) {
        for (const preset of dominio.classificationPresets) {
          for (const campo of ['label', 'source', 'note'] as const) {
            if (campo === 'note' && !preset.note) continue;
            const texto = t(`presets.${dominio.id}.${preset.id}.${campo}`);
            expect(texto, `${dominio.id}.${preset.id}.${campo}`).not.toMatch(/presets\./);
          }
        }
      }
    });
  }

  it('las variables de los dominios están en el mapa de traducción', () => {
    // Si un dominio cambia su etiqueta canónica y nadie actualiza el mapa,
    // la etiqueta llegaría a pantalla sin traducir.
    expect(Object.keys(VARIABLE_LABEL_KEYS)).toContain(DOMINIO_HUEVOS.variable.label);
    expect(Object.keys(VARIABLE_LABEL_KEYS)).toContain(DOMINIO_GENERICO.variable.label);
  });

  it('un rótulo escrito por el usuario pasa intacto', () => {
    const t = traductor('en', en);
    expect(translateBinLabel('Mi categoría rara', t)).toBe('Mi categoría rara');
    expect(translateVariableLabel('Estatura', t)).toBe('Estatura');
  });
});

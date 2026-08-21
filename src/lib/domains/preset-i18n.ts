/**
 * Traducción de los criterios de clasificación.
 *
 * Los presets (`src/lib/domains/*.ts`) declaran sus textos en español, que es
 * el idioma canónico del proyecto. Como los rótulos de las categorías viven
 * DENTRO del esquema persistido (el usuario puede editarlos y quedan guardados
 * en su navegador), no se pueden sustituir por claves sin romper los datos ya
 * guardados. En su lugar, la interfaz traduce AL MOSTRAR:
 *
 *  - label / source / note del preset: clave `presets.<dominio>.<presetId>.*`
 *    del catálogo de idiomas, resuelta por quien lo renderiza.
 *  - rótulos de categoría: este mapa convierte el texto canónico en una clave
 *    `presets.binLabels.*`; un rótulo editado por el usuario no aparece en el
 *    mapa y se muestra tal como lo escribió, en cualquier idioma.
 */

/** Rótulo canónico (es) → clave dentro de `presets.binLabels`. */
const BIN_LABEL_KEYS: Record<string, string> = {
  // Dominio genérico: preset "Sin clasificación"
  'Todos los datos': 'allData',
  // Clases USDA (huevos.ts)
  'Peewee': 'usdaPeewee',
  'Small (Pequeño)': 'usdaSmall',
  'Medium (Mediano)': 'usdaMedium',
  'Large (Grande)': 'usdaLarge',
  'Extra Large (Extra grande)': 'usdaXL',
  'Jumbo': 'usdaJumbo',
  // Banda relativa ±10 % (huevos.ts y generico.ts)
  'Bajo la media −10 %': 'bandBelow10',
  'Dentro de ±10 %': 'bandWithin10',
  'Sobre la media +10 %': 'bandAbove10',
  // Cortes personalizados de partida
  'Pequeño': 'sizeSmall',
  'Mediano': 'sizeMedium',
  'Grande': 'sizeLarge',
  'Bajo': 'low',
  'Alto': 'high',
  // Rótulos por omisión del motor (classification.ts, DEFAULT_BAND_LABELS)
  'Por debajo': 'defaultBelow',
  'Dentro del rango': 'defaultWithin',
  'Por encima': 'defaultAbove',
};

/** Traductor con las claves relativas a la raíz del catálogo. */
type RootTranslator = (key: string) => string;

/**
 * Traduce un rótulo de categoría si es uno de los canónicos; los rótulos
 * escritos por el usuario se devuelven intactos.
 */
export function translateBinLabel(label: string, t: RootTranslator): string {
  const key = BIN_LABEL_KEYS[label];
  return key ? t(`presets.binLabels.${key}`) : label;
}

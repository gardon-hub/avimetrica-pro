/**
 * Motor de Diagnóstico Didáctico para Uniformidad en Aves
 *
 * Genera diagnósticos técnicos específicos según:
 * - Edad del lote (semanas)
 * - Línea genética
 * - Peso promedio obtenido
 * - Uniformidad y CV
 * - Distribución dentro/fuera del rango ±10%
 *
 * ═══════════════════════════════════════════════════════════════════
 * DATOS DE REFERENCIA COMPLETOS — TODOS LOS PUNTOS SEMANALES
 * EXTRAÍDOS DIRECTAMENTE DE PDFs OFICIALES (sin interpolación)
 * ═══════════════════════════════════════════════════════════════════
 *
 * Fuentes:
 * - Cobb500 Broiler Supplement 2023 (Spanish) → Broiler - Cobb 500
 * - Ross 308 Performance Objectives 2022 (ESEU) → Broiler - Ross 308
 * - Hubbard → ⚠️ Datos aproximados (sin PDF oficial disponible)
 * - Hy-Line Brown Standard 2025 (BRN STD SPN, Dic 2025) → Ponedora - Hy-Line Brown
 * - Hy-Line W-36 → ⚠️ Datos aproximados (sin PDF oficial disponible)
 * - Lohmann Brown-Classic Guide (ESP) Tabla 17 → Ponedora - Lohmann Brown
 * - Lohmann LSL-Lite Guide (ESP) Tabla 17 → Ponedora - Lohmann LSL
 * - Dekalb Brown Cage Guide (ESP) → Ponedora - Dekalb Brown
 * - Dekalb White Cage Guide (ESP) → Ponedora - Dekalb White
 * - H&N Brown Nick Guide (ESP, 07/2020) Tabla 4 + Tabla 34 → Ponedora - Nick Brown
 * - H&N Super Nick Guide (ESP) Tabla 4 + Tabla 34 → Ponedora - Super Nick
 *
 * Cobertura semanal completa:
 * - Nick Brown: cría sem 1-20 + producción sem 21-100 (82 semanas de Tabla 34)
 * - Super Nick: cría sem 1-20 + producción sem 21-100 (82 semanas de Tabla 34)
 * - Lohmann Brown: cría sem 1-20 + producción sem 21-100 (100 semanas de Tabla 17)
 * - Lohmann LSL: cría sem 1-20 + producción sem 21-95 (95 semanas de Tabla 17)
 * - Hy-Line Brown: cría sem 1-17 + producción sem 18-100 (100 semanas, guía estándar Dic 2025)
 * - Dekalb Brown: cría sem 1-18 + producción sem 19-100 (100 semanas del guía)
 * - Dekalb White: cría sem 1-18 + producción sem 19-100 (100 semanas del guía)
 *
 * Nota sobre rangos min/max:
 * - Las guías de Lohmann proveen valores explícitos min/prom/max → se usan directamente.
 * - Las guías de Dekalb proveen rangos min-max en cría y peso objetivo en producción.
 * - La guía de Hy-Line Brown provee rangos min-max → pesoOptimo = punto medio de min y max.
 * - Las guías de H&N (Nick Brown, Super Nick) solo proveen peso objetivo → rangos calculados ±4% cría, ±3% producción.
 * - Cobb 500 y Ross 308 solo proveen peso as-hatched/mixed → rangos calculados ±5%.
 * - ⚠️ Hubbard y Hy-Line W-36 no tienen PDF disponible → datos aproximados con rangos estimados.
 *   Estos valores DEBEN verificarse cuando se disponga del PDF oficial.
 */

// ─── Tipos ────────────────────────────────────────────────────────

export type BirdType = 'broiler' | 'ponedora';
export type ProductiveStage = 'iniciacion' | 'crianza' | 'levante' | 'prepostura' | 'produccion' | 'engorde';
export type UniformityLevel = 'excellent' | 'regular' | 'poor';

export interface WeightReference {
  semana: number;
  pesoMin: number;
  pesoOptimo: number;
  pesoMax: number;
}

export interface DiagnosticResult {
  /** Título principal del diagnóstico */
  title: string;
  /** Nivel global de uniformidad */
  level: UniformityLevel;
  /** Tipo de ave identificado */
  birdType: BirdType;
  /** Etapa productiva identificada */
  stage: ProductiveStage;
  /** Nombre legible de la etapa */
  stageLabel: string;
  /** Interpretación técnica del resultado */
  interpretacion: string;
  /** Peso esperado vs peso real */
  pesoComparacion: string;
  /** Alertas si el peso no corresponde a la edad */
  alertas: string[];
  /** Posibles causas de baja uniformidad */
  causas: string[];
  /** Recomendaciones prácticas de manejo */
  recomendaciones: string[];
  /** Comentario didáctico sobre la importancia de la uniformidad */
  didactico: string;
}

// ─── Función auxiliar para calcular rangos ────────────────────────
// Usada cuando el documento oficial solo proporciona peso objetivo

function calcRange(pesoOptimo: number, pct: number): { pesoMin: number; pesoMax: number } {
  return {
    pesoMin: Math.round(pesoOptimo * (1 - pct / 100)),
    pesoMax: Math.round(pesoOptimo * (1 + pct / 100)),
  };
}

/** Versión de los datos de referencia — cambia cuando se actualizan las tablas */
export const REFERENCE_DATA_VERSION = '2025-05-17-v3';

// ─── Base de datos de pesos de referencia ─────────────────────────
// Todos los datos incluyen CADA punto semanal extraído de los PDFs oficiales.
// Con datos semanales completos, la interpolación ya no es necesaria para
// las líneas con datos completos — cada semana tiene su valor exacto.

// ═══════════════════════════════════════════════════════════════════
// BROILERS
// ═══════════════════════════════════════════════════════════════════

// Cobb 500 — Fuente: Cobb500 Broiler Supplement 2023 (Spanish), páginas 4-6
// Pesos as-hatched (mixtos), rangos ±5%
const BROILER_COBB: WeightReference[] = [
  { semana: 1, pesoMin: 192, pesoOptimo: 202, pesoMax: 212 },
  { semana: 2, pesoMin: 542, pesoOptimo: 570, pesoMax: 599 },
  { semana: 3, pesoMin: 1060, pesoOptimo: 1116, pesoMax: 1172 },
  { semana: 4, pesoMin: 1694, pesoOptimo: 1783, pesoMax: 1872 },
  { semana: 5, pesoMin: 2395, pesoOptimo: 2521, pesoMax: 2647 },
  { semana: 6, pesoMin: 3114, pesoOptimo: 3278, pesoMax: 3442 },
  { semana: 7, pesoMin: 3801, pesoOptimo: 4001, pesoMax: 4201 },
  { semana: 8, pesoMin: 4409, pesoOptimo: 4641, pesoMax: 4873 },
];

// Ross 308 — Fuente: Ross 308 Performance Objectives 2022 (ESEU), páginas 4-6
// Pesos mixed, rangos ±5%
const BROILER_ROSS: WeightReference[] = [
  { semana: 1, pesoMin: 202, pesoOptimo: 213, pesoMax: 224 },
  { semana: 2, pesoMin: 506, pesoOptimo: 533, pesoMax: 560 },
  { semana: 3, pesoMin: 961, pesoOptimo: 1012, pesoMax: 1063 },
  { semana: 4, pesoMin: 1535, pesoOptimo: 1616, pesoMax: 1697 },
  { semana: 5, pesoMin: 2181, pesoOptimo: 2296, pesoMax: 2411 },
  { semana: 6, pesoMin: 2848, pesoOptimo: 2998, pesoMax: 3148 },
  { semana: 7, pesoMin: 3497, pesoOptimo: 3681, pesoMax: 3865 },
  { semana: 8, pesoMin: 4102, pesoOptimo: 4318, pesoMax: 4534 },
];

// ⚠️ Hubbard — Sin PDF oficial disponible. Datos aproximados basados en Hubbard Flex
// Performance Objectives. Rangos estimados ±5%.
// NOTA: Estos valores DEBEN verificarse cuando se disponga del PDF oficial.
const BROILER_HUBBARD: WeightReference[] = [
  { semana: 1, pesoMin: 170, pesoOptimo: 179, pesoMax: 188 },
  { semana: 2, pesoMin: 448, pesoOptimo: 471, pesoMax: 495 },
  { semana: 3, pesoMin: 874, pesoOptimo: 920, pesoMax: 966 },
  { semana: 4, pesoMin: 1393, pesoOptimo: 1466, pesoMax: 1539 },
  { semana: 5, pesoMin: 1953, pesoOptimo: 2056, pesoMax: 2159 },
  { semana: 6, pesoMin: 2507, pesoOptimo: 2639, pesoMax: 2771 },
  { semana: 7, pesoMin: 3026, pesoOptimo: 3185, pesoMax: 3344 },
  { semana: 8, pesoMin: 3502, pesoOptimo: 3686, pesoMax: 3870 },
];

// ═══════════════════════════════════════════════════════════════════
// PONEDORAS — LÍNEAS MARRONES
// ═══════════════════════════════════════════════════════════════════

// Hy-Line Brown — Fuente: Hy-Line Brown Standard 2025 (BRN STD SPN.pdf, Dic 2025)
// El documento provee rangos min-max explícitos para cada semana.
// pesoOptimo = punto medio de min y max.
// Cría: semanas 1-17. Producción: semanas 18-100. Todos los puntos semanales incluidos.
const PONEDORA_HYLINE_BROWN: WeightReference[] = [
  { semana: 1, pesoMin: 69, pesoOptimo: 71, pesoMax: 73 },
  { semana: 2, pesoMin: 119, pesoOptimo: 123, pesoMax: 126 },
  { semana: 3, pesoMin: 186, pesoOptimo: 192, pesoMax: 197 },
  { semana: 4, pesoMin: 266, pesoOptimo: 274, pesoMax: 281 },
  { semana: 5, pesoMin: 357, pesoOptimo: 367, pesoMax: 377 },
  { semana: 6, pesoMin: 456, pesoOptimo: 469, pesoMax: 482 },
  { semana: 7, pesoMin: 561, pesoOptimo: 577, pesoMax: 593 },
  { semana: 8, pesoMin: 668, pesoOptimo: 687, pesoMax: 706 },
  { semana: 9, pesoMin: 772, pesoOptimo: 794, pesoMax: 816 },
  { semana: 10, pesoMin: 871, pesoOptimo: 896, pesoMax: 921 },
  { semana: 11, pesoMin: 963, pesoOptimo: 991, pesoMax: 1018 },
  { semana: 12, pesoMin: 1046, pesoOptimo: 1076, pesoMax: 1105 },
  { semana: 13, pesoMin: 1120, pesoOptimo: 1152, pesoMax: 1184 },
  { semana: 14, pesoMin: 1186, pesoOptimo: 1220, pesoMax: 1254 },
  { semana: 15, pesoMin: 1246, pesoOptimo: 1282, pesoMax: 1317 },
  { semana: 16, pesoMin: 1302, pesoOptimo: 1340, pesoMax: 1377 },
  { semana: 17, pesoMin: 1357, pesoOptimo: 1396, pesoMax: 1434 },
  { semana: 18, pesoMin: 1411, pesoOptimo: 1452, pesoMax: 1492 },
  { semana: 19, pesoMin: 1467, pesoOptimo: 1509, pesoMax: 1551 },
  { semana: 20, pesoMin: 1524, pesoOptimo: 1568, pesoMax: 1611 },
  { semana: 21, pesoMin: 1582, pesoOptimo: 1627, pesoMax: 1672 },
  { semana: 22, pesoMin: 1638, pesoOptimo: 1685, pesoMax: 1732 },
  { semana: 23, pesoMin: 1691, pesoOptimo: 1740, pesoMax: 1788 },
  { semana: 24, pesoMin: 1739, pesoOptimo: 1789, pesoMax: 1838 },
  { semana: 25, pesoMin: 1779, pesoOptimo: 1830, pesoMax: 1880 },
  { semana: 26, pesoMin: 1810, pesoOptimo: 1862, pesoMax: 1913 },
  { semana: 27, pesoMin: 1832, pesoOptimo: 1885, pesoMax: 1937 },
  { semana: 28, pesoMin: 1847, pesoOptimo: 1900, pesoMax: 1953 },
  { semana: 29, pesoMin: 1857, pesoOptimo: 1910, pesoMax: 1963 },
  { semana: 30, pesoMin: 1864, pesoOptimo: 1918, pesoMax: 1971 },
  { semana: 31, pesoMin: 1871, pesoOptimo: 1924, pesoMax: 1977 },
  { semana: 32, pesoMin: 1877, pesoOptimo: 1931, pesoMax: 1984 },
  { semana: 33, pesoMin: 1883, pesoOptimo: 1937, pesoMax: 1991 },
  { semana: 34, pesoMin: 1890, pesoOptimo: 1944, pesoMax: 1998 },
  { semana: 35, pesoMin: 1896, pesoOptimo: 1950, pesoMax: 2004 },
  { semana: 36, pesoMin: 1903, pesoOptimo: 1958, pesoMax: 2012 },
  { semana: 37, pesoMin: 1909, pesoOptimo: 1964, pesoMax: 2018 },
  { semana: 38, pesoMin: 1913, pesoOptimo: 1968, pesoMax: 2023 },
  { semana: 39, pesoMin: 1917, pesoOptimo: 1972, pesoMax: 2027 },
  { semana: 40, pesoMin: 1921, pesoOptimo: 1976, pesoMax: 2030 },
  { semana: 41, pesoMin: 1924, pesoOptimo: 1979, pesoMax: 2033 },
  { semana: 42, pesoMin: 1926, pesoOptimo: 1981, pesoMax: 2036 },
  { semana: 43, pesoMin: 1928, pesoOptimo: 1984, pesoMax: 2039 },
  { semana: 44, pesoMin: 1930, pesoOptimo: 1986, pesoMax: 2041 },
  { semana: 45, pesoMin: 1932, pesoOptimo: 1988, pesoMax: 2043 },
  { semana: 46, pesoMin: 1934, pesoOptimo: 1989, pesoMax: 2044 },
  { semana: 47, pesoMin: 1935, pesoOptimo: 1990, pesoMax: 2045 },
  { semana: 48, pesoMin: 1936, pesoOptimo: 1992, pesoMax: 2047 },
  { semana: 49, pesoMin: 1937, pesoOptimo: 1993, pesoMax: 2048 },
  { semana: 50, pesoMin: 1938, pesoOptimo: 1994, pesoMax: 2049 },
  { semana: 51, pesoMin: 1939, pesoOptimo: 1995, pesoMax: 2050 },
  { semana: 52, pesoMin: 1940, pesoOptimo: 1996, pesoMax: 2051 },
  { semana: 53, pesoMin: 1941, pesoOptimo: 1997, pesoMax: 2052 },
  { semana: 54, pesoMin: 1942, pesoOptimo: 1998, pesoMax: 2053 },
  { semana: 55, pesoMin: 1943, pesoOptimo: 1999, pesoMax: 2054 },
  { semana: 56, pesoMin: 1944, pesoOptimo: 2000, pesoMax: 2055 },
  { semana: 57, pesoMin: 1944, pesoOptimo: 2000, pesoMax: 2056 },
  { semana: 58, pesoMin: 1945, pesoOptimo: 2001, pesoMax: 2056 },
  { semana: 59, pesoMin: 1946, pesoOptimo: 2002, pesoMax: 2057 },
  { semana: 60, pesoMin: 1947, pesoOptimo: 2003, pesoMax: 2058 },
  { semana: 61, pesoMin: 1948, pesoOptimo: 2004, pesoMax: 2059 },
  { semana: 62, pesoMin: 1948, pesoOptimo: 2004, pesoMax: 2060 },
  { semana: 63, pesoMin: 1949, pesoOptimo: 2005, pesoMax: 2061 },
  { semana: 64, pesoMin: 1950, pesoOptimo: 2006, pesoMax: 2061 },
  { semana: 65, pesoMin: 1951, pesoOptimo: 2007, pesoMax: 2062 },
  { semana: 66, pesoMin: 1952, pesoOptimo: 2008, pesoMax: 2063 },
  { semana: 67, pesoMin: 1952, pesoOptimo: 2008, pesoMax: 2064 },
  { semana: 68, pesoMin: 1953, pesoOptimo: 2009, pesoMax: 2065 },
  { semana: 69, pesoMin: 1954, pesoOptimo: 2010, pesoMax: 2065 },
  { semana: 70, pesoMin: 1954, pesoOptimo: 2010, pesoMax: 2066 },
  { semana: 71, pesoMin: 1955, pesoOptimo: 2011, pesoMax: 2066 },
  { semana: 72, pesoMin: 1955, pesoOptimo: 2011, pesoMax: 2067 },
  { semana: 73, pesoMin: 1956, pesoOptimo: 2012, pesoMax: 2068 },
  { semana: 74, pesoMin: 1957, pesoOptimo: 2013, pesoMax: 2068 },
  { semana: 75, pesoMin: 1957, pesoOptimo: 2013, pesoMax: 2069 },
  { semana: 76, pesoMin: 1958, pesoOptimo: 2014, pesoMax: 2070 },
  { semana: 77, pesoMin: 1958, pesoOptimo: 2014, pesoMax: 2070 },
  { semana: 78, pesoMin: 1959, pesoOptimo: 2015, pesoMax: 2071 },
  { semana: 79, pesoMin: 1959, pesoOptimo: 2015, pesoMax: 2071 },
  { semana: 80, pesoMin: 1960, pesoOptimo: 2016, pesoMax: 2072 },
  { semana: 81, pesoMin: 1960, pesoOptimo: 2016, pesoMax: 2072 },
  { semana: 82, pesoMin: 1960, pesoOptimo: 2016, pesoMax: 2072 },
  { semana: 83, pesoMin: 1961, pesoOptimo: 2017, pesoMax: 2073 },
  { semana: 84, pesoMin: 1961, pesoOptimo: 2017, pesoMax: 2073 },
  { semana: 85, pesoMin: 1962, pesoOptimo: 2018, pesoMax: 2074 },
  { semana: 86, pesoMin: 1962, pesoOptimo: 2018, pesoMax: 2074 },
  { semana: 87, pesoMin: 1962, pesoOptimo: 2019, pesoMax: 2075 },
  { semana: 88, pesoMin: 1963, pesoOptimo: 2019, pesoMax: 2075 },
  { semana: 89, pesoMin: 1963, pesoOptimo: 2019, pesoMax: 2075 },
  { semana: 90, pesoMin: 1963, pesoOptimo: 2020, pesoMax: 2076 },
  { semana: 91, pesoMin: 1964, pesoOptimo: 2020, pesoMax: 2076 },
  { semana: 92, pesoMin: 1964, pesoOptimo: 2020, pesoMax: 2076 },
  { semana: 93, pesoMin: 1964, pesoOptimo: 2020, pesoMax: 2076 },
  { semana: 94, pesoMin: 1964, pesoOptimo: 2021, pesoMax: 2077 },
  { semana: 95, pesoMin: 1965, pesoOptimo: 2021, pesoMax: 2077 },
  { semana: 96, pesoMin: 1965, pesoOptimo: 2021, pesoMax: 2077 },
  { semana: 97, pesoMin: 1965, pesoOptimo: 2021, pesoMax: 2077 },
  { semana: 98, pesoMin: 1965, pesoOptimo: 2021, pesoMax: 2077 },
  { semana: 99, pesoMin: 1965, pesoOptimo: 2021, pesoMax: 2077 },
  { semana: 100, pesoMin: 1965, pesoOptimo: 2022, pesoMax: 2078 },
];

// ⚠️ Hy-Line W-36 — Sin PDF oficial disponible en esta versión.
// Datos basados en Hy-Line W-36 Commercial Layers Guide (aproximados).
// NOTA: Estos valores DEBEN verificarse cuando se disponga del PDF oficial.
// No se incluyen puntos semanales completos porque no hay PDF verificado.
const PONEDORA_HYLINE_W36: WeightReference[] = [
  // ── Cría (semanas 1-18) ── Datos aproximados
  { semana: 1,  pesoMin: 55,  pesoOptimo: 63,  pesoMax: 72 },
  { semana: 2,  pesoMin: 95,  pesoOptimo: 110, pesoMax: 125 },
  { semana: 3,  pesoMin: 150, pesoOptimo: 175, pesoMax: 200 },
  { semana: 4,  pesoMin: 215, pesoOptimo: 250, pesoMax: 285 },
  { semana: 5,  pesoMin: 285, pesoOptimo: 330, pesoMax: 375 },
  { semana: 6,  pesoMin: 355, pesoOptimo: 410, pesoMax: 465 },
  { semana: 7,  pesoMin: 425, pesoOptimo: 490, pesoMax: 555 },
  { semana: 8,  pesoMin: 495, pesoOptimo: 570, pesoMax: 645 },
  { semana: 9,  pesoMin: 560, pesoOptimo: 645, pesoMax: 730 },
  { semana: 10, pesoMin: 630, pesoOptimo: 720, pesoMax: 810 },
  { semana: 11, pesoMin: 695, pesoOptimo: 790, pesoMax: 885 },
  { semana: 12, pesoMin: 755, pesoOptimo: 860, pesoMax: 965 },
  { semana: 13, pesoMin: 820, pesoOptimo: 930, pesoMax: 1040 },
  { semana: 14, pesoMin: 875, pesoOptimo: 995, pesoMax: 1115 },
  { semana: 15, pesoMin: 930, pesoOptimo: 1060, pesoMax: 1190 },
  { semana: 16, pesoMin: 985, pesoOptimo: 1120, pesoMax: 1255 },
  { semana: 17, pesoMin: 1040, pesoOptimo: 1180, pesoMax: 1320 },
  { semana: 18, pesoMin: 1085, pesoOptimo: 1230, pesoMax: 1375 },
  // ── Producción (semanas 20-100) ── Datos aproximados
  { semana: 20, pesoMin: 1170, pesoOptimo: 1320, pesoMax: 1470 },
  { semana: 25, pesoMin: 1280, pesoOptimo: 1440, pesoMax: 1600 },
  { semana: 30, pesoMin: 1340, pesoOptimo: 1500, pesoMax: 1660 },
  { semana: 35, pesoMin: 1365, pesoOptimo: 1525, pesoMax: 1685 },
  { semana: 40, pesoMin: 1380, pesoOptimo: 1540, pesoMax: 1700 },
  { semana: 50, pesoMin: 1400, pesoOptimo: 1560, pesoMax: 1720 },
  { semana: 60, pesoMin: 1420, pesoOptimo: 1580, pesoMax: 1740 },
  { semana: 72, pesoMin: 1440, pesoOptimo: 1600, pesoMax: 1760 },
  { semana: 80, pesoMin: 1450, pesoOptimo: 1610, pesoMax: 1770 },
  { semana: 90, pesoMin: 1455, pesoOptimo: 1615, pesoMax: 1775 },
  { semana: 100, pesoMin: 1460, pesoOptimo: 1620, pesoMax: 1780 },
];

// Lohmann Brown-Classic — Fuente: Lohmann Brown-Classic Guide (ESP), Tabla 17
// El documento provee min/prom/max explícitos para CADA semana → se usan directamente.
// Cría: semanas 1-20. Producción: semanas 21-100. Todos los puntos semanales incluidos.
const PONEDORA_LOHMANN_BROWN: WeightReference[] = [
  { semana: 1, pesoMin: 73, pesoOptimo: 75, pesoMax: 77 },
  { semana: 2, pesoMin: 126, pesoOptimo: 130, pesoMax: 134 },
  { semana: 3, pesoMin: 189, pesoOptimo: 195, pesoMax: 201 },
  { semana: 4, pesoMin: 265, pesoOptimo: 273, pesoMax: 281 },
  { semana: 5, pesoMin: 355, pesoOptimo: 366, pesoMax: 377 },
  { semana: 6, pesoMin: 455, pesoOptimo: 469, pesoMax: 483 },
  { semana: 7, pesoMin: 556, pesoOptimo: 573, pesoMax: 590 },
  { semana: 8, pesoMin: 657, pesoOptimo: 677, pesoMax: 697 },
  { semana: 9, pesoMin: 754, pesoOptimo: 777, pesoMax: 800 },
  { semana: 10, pesoMin: 847, pesoOptimo: 873, pesoMax: 899 },
  { semana: 11, pesoMin: 934, pesoOptimo: 963, pesoMax: 992 },
  { semana: 12, pesoMin: 1016, pesoOptimo: 1047, pesoMax: 1078 },
  { semana: 13, pesoMin: 1094, pesoOptimo: 1128, pesoMax: 1162 },
  { semana: 14, pesoMin: 1169, pesoOptimo: 1205, pesoMax: 1241 },
  { semana: 15, pesoMin: 1241, pesoOptimo: 1279, pesoMax: 1317 },
  { semana: 16, pesoMin: 1310, pesoOptimo: 1351, pesoMax: 1392 },
  { semana: 17, pesoMin: 1378, pesoOptimo: 1421, pesoMax: 1464 },
  { semana: 18, pesoMin: 1448, pesoOptimo: 1493, pesoMax: 1538 },
  { semana: 19, pesoMin: 1518, pesoOptimo: 1565, pesoMax: 1612 },
  { semana: 20, pesoMin: 1586, pesoOptimo: 1635, pesoMax: 1684 },
  { semana: 21, pesoMin: 1650, pesoOptimo: 1701, pesoMax: 1752 },
  { semana: 22, pesoMin: 1707, pesoOptimo: 1760, pesoMax: 1813 },
  { semana: 23, pesoMin: 1754, pesoOptimo: 1808, pesoMax: 1862 },
  { semana: 24, pesoMin: 1791, pesoOptimo: 1846, pesoMax: 1901 },
  { semana: 25, pesoMin: 1818, pesoOptimo: 1874, pesoMax: 1930 },
  { semana: 26, pesoMin: 1836, pesoOptimo: 1893, pesoMax: 1950 },
  { semana: 27, pesoMin: 1849, pesoOptimo: 1906, pesoMax: 1963 },
  { semana: 28, pesoMin: 1857, pesoOptimo: 1914, pesoMax: 1971 },
  { semana: 29, pesoMin: 1860, pesoOptimo: 1918, pesoMax: 1976 },
  { semana: 30, pesoMin: 1863, pesoOptimo: 1921, pesoMax: 1979 },
  { semana: 31, pesoMin: 1866, pesoOptimo: 1924, pesoMax: 1982 },
  { semana: 32, pesoMin: 1868, pesoOptimo: 1926, pesoMax: 1984 },
  { semana: 33, pesoMin: 1871, pesoOptimo: 1929, pesoMax: 1987 },
  { semana: 34, pesoMin: 1874, pesoOptimo: 1932, pesoMax: 1990 },
  { semana: 35, pesoMin: 1876, pesoOptimo: 1934, pesoMax: 1992 },
  { semana: 36, pesoMin: 1878, pesoOptimo: 1936, pesoMax: 1994 },
  { semana: 37, pesoMin: 1881, pesoOptimo: 1939, pesoMax: 1997 },
  { semana: 38, pesoMin: 1883, pesoOptimo: 1941, pesoMax: 1999 },
  { semana: 39, pesoMin: 1886, pesoOptimo: 1944, pesoMax: 2002 },
  { semana: 40, pesoMin: 1888, pesoOptimo: 1946, pesoMax: 2004 },
  { semana: 41, pesoMin: 1891, pesoOptimo: 1949, pesoMax: 2007 },
  { semana: 42, pesoMin: 1893, pesoOptimo: 1952, pesoMax: 2011 },
  { semana: 43, pesoMin: 1895, pesoOptimo: 1954, pesoMax: 2013 },
  { semana: 44, pesoMin: 1897, pesoOptimo: 1956, pesoMax: 2015 },
  { semana: 45, pesoMin: 1900, pesoOptimo: 1959, pesoMax: 2018 },
  { semana: 46, pesoMin: 1902, pesoOptimo: 1961, pesoMax: 2020 },
  { semana: 47, pesoMin: 1905, pesoOptimo: 1964, pesoMax: 2023 },
  { semana: 48, pesoMin: 1907, pesoOptimo: 1966, pesoMax: 2025 },
  { semana: 49, pesoMin: 1910, pesoOptimo: 1969, pesoMax: 2028 },
  { semana: 50, pesoMin: 1913, pesoOptimo: 1972, pesoMax: 2031 },
  { semana: 51, pesoMin: 1915, pesoOptimo: 1974, pesoMax: 2033 },
  { semana: 52, pesoMin: 1917, pesoOptimo: 1976, pesoMax: 2035 },
  { semana: 53, pesoMin: 1920, pesoOptimo: 1979, pesoMax: 2038 },
  { semana: 54, pesoMin: 1922, pesoOptimo: 1981, pesoMax: 2040 },
  { semana: 55, pesoMin: 1925, pesoOptimo: 1985, pesoMax: 2045 },
  { semana: 56, pesoMin: 1926, pesoOptimo: 1986, pesoMax: 2046 },
  { semana: 57, pesoMin: 1930, pesoOptimo: 1990, pesoMax: 2050 },
  { semana: 58, pesoMin: 1932, pesoOptimo: 1992, pesoMax: 2052 },
  { semana: 59, pesoMin: 1934, pesoOptimo: 1994, pesoMax: 2054 },
  { semana: 60, pesoMin: 1936, pesoOptimo: 1996, pesoMax: 2056 },
  { semana: 61, pesoMin: 1939, pesoOptimo: 1999, pesoMax: 2059 },
  { semana: 62, pesoMin: 1941, pesoOptimo: 2001, pesoMax: 2061 },
  { semana: 63, pesoMin: 1944, pesoOptimo: 2004, pesoMax: 2064 },
  { semana: 64, pesoMin: 1946, pesoOptimo: 2006, pesoMax: 2066 },
  { semana: 65, pesoMin: 1949, pesoOptimo: 2009, pesoMax: 2069 },
  { semana: 66, pesoMin: 1952, pesoOptimo: 2012, pesoMax: 2072 },
  { semana: 67, pesoMin: 1954, pesoOptimo: 2014, pesoMax: 2074 },
  { semana: 68, pesoMin: 1956, pesoOptimo: 2016, pesoMax: 2076 },
  { semana: 69, pesoMin: 1958, pesoOptimo: 2019, pesoMax: 2080 },
  { semana: 70, pesoMin: 1960, pesoOptimo: 2021, pesoMax: 2082 },
  { semana: 71, pesoMin: 1963, pesoOptimo: 2024, pesoMax: 2085 },
  { semana: 72, pesoMin: 1965, pesoOptimo: 2026, pesoMax: 2087 },
  { semana: 73, pesoMin: 1968, pesoOptimo: 2029, pesoMax: 2090 },
  { semana: 74, pesoMin: 1971, pesoOptimo: 2032, pesoMax: 2093 },
  { semana: 75, pesoMin: 1973, pesoOptimo: 2034, pesoMax: 2095 },
  { semana: 76, pesoMin: 1975, pesoOptimo: 2036, pesoMax: 2097 },
  { semana: 77, pesoMin: 1978, pesoOptimo: 2039, pesoMax: 2100 },
  { semana: 78, pesoMin: 1980, pesoOptimo: 2041, pesoMax: 2102 },
  { semana: 79, pesoMin: 1983, pesoOptimo: 2044, pesoMax: 2105 },
  { semana: 80, pesoMin: 1985, pesoOptimo: 2046, pesoMax: 2107 },
  { semana: 81, pesoMin: 1986, pesoOptimo: 2047, pesoMax: 2108 },
  { semana: 82, pesoMin: 1987, pesoOptimo: 2048, pesoMax: 2109 },
  { semana: 83, pesoMin: 1988, pesoOptimo: 2049, pesoMax: 2110 },
  { semana: 84, pesoMin: 1989, pesoOptimo: 2050, pesoMax: 2112 },
  { semana: 85, pesoMin: 1989, pesoOptimo: 2051, pesoMax: 2113 },
  { semana: 86, pesoMin: 1990, pesoOptimo: 2052, pesoMax: 2114 },
  { semana: 87, pesoMin: 1991, pesoOptimo: 2053, pesoMax: 2115 },
  { semana: 88, pesoMin: 1992, pesoOptimo: 2054, pesoMax: 2116 },
  { semana: 89, pesoMin: 1992, pesoOptimo: 2054, pesoMax: 2116 },
  { semana: 90, pesoMin: 1993, pesoOptimo: 2055, pesoMax: 2117 },
  { semana: 91, pesoMin: 1994, pesoOptimo: 2056, pesoMax: 2118 },
  { semana: 92, pesoMin: 1994, pesoOptimo: 2056, pesoMax: 2118 },
  { semana: 93, pesoMin: 1995, pesoOptimo: 2057, pesoMax: 2119 },
  { semana: 94, pesoMin: 1995, pesoOptimo: 2057, pesoMax: 2119 },
  { semana: 95, pesoMin: 1996, pesoOptimo: 2058, pesoMax: 2120 },
  { semana: 96, pesoMin: 1997, pesoOptimo: 2059, pesoMax: 2121 },
  { semana: 97, pesoMin: 1997, pesoOptimo: 2059, pesoMax: 2121 },
  { semana: 98, pesoMin: 1998, pesoOptimo: 2060, pesoMax: 2122 },
  { semana: 99, pesoMin: 1998, pesoOptimo: 2060, pesoMax: 2122 },
  { semana: 100, pesoMin: 1999, pesoOptimo: 2061, pesoMax: 2123 },
];

// Lohmann LSL-Lite — Fuente: Lohmann LSL-Lite Guide (ESP), Tabla 17
// El documento provee min/prom/max explícitos para CADA semana → se usan directamente.
// Cría: semanas 1-20. Producción: semanas 21-95. Todos los puntos semanales incluidos.
const PONEDORA_LOHMANN_LSL: WeightReference[] = [
  { semana: 1, pesoMin: 68, pesoOptimo: 70, pesoMax: 72 },
  { semana: 2, pesoMin: 116, pesoOptimo: 120, pesoMax: 124 },
  { semana: 3, pesoMin: 179, pesoOptimo: 185, pesoMax: 191 },
  { semana: 4, pesoMin: 247, pesoOptimo: 255, pesoMax: 263 },
  { semana: 5, pesoMin: 324, pesoOptimo: 334, pesoMax: 344 },
  { semana: 6, pesoMin: 412, pesoOptimo: 425, pesoMax: 438 },
  { semana: 7, pesoMin: 508, pesoOptimo: 524, pesoMax: 540 },
  { semana: 8, pesoMin: 616, pesoOptimo: 635, pesoMax: 654 },
  { semana: 9, pesoMin: 713, pesoOptimo: 735, pesoMax: 757 },
  { semana: 10, pesoMin: 800, pesoOptimo: 825, pesoMax: 850 },
  { semana: 11, pesoMin: 867, pesoOptimo: 894, pesoMax: 921 },
  { semana: 12, pesoMin: 930, pesoOptimo: 959, pesoMax: 988 },
  { semana: 13, pesoMin: 992, pesoOptimo: 1023, pesoMax: 1054 },
  { semana: 14, pesoMin: 1051, pesoOptimo: 1084, pesoMax: 1117 },
  { semana: 15, pesoMin: 1109, pesoOptimo: 1143, pesoMax: 1177 },
  { semana: 16, pesoMin: 1164, pesoOptimo: 1200, pesoMax: 1236 },
  { semana: 17, pesoMin: 1217, pesoOptimo: 1255, pesoMax: 1293 },
  { semana: 18, pesoMin: 1267, pesoOptimo: 1306, pesoMax: 1345 },
  { semana: 19, pesoMin: 1315, pesoOptimo: 1356, pesoMax: 1397 },
  { semana: 20, pesoMin: 1363, pesoOptimo: 1405, pesoMax: 1447 },
  { semana: 21, pesoMin: 1408, pesoOptimo: 1452, pesoMax: 1496 },
  { semana: 22, pesoMin: 1452, pesoOptimo: 1497, pesoMax: 1542 },
  { semana: 23, pesoMin: 1492, pesoOptimo: 1538, pesoMax: 1584 },
  { semana: 24, pesoMin: 1528, pesoOptimo: 1575, pesoMax: 1622 },
  { semana: 25, pesoMin: 1560, pesoOptimo: 1608, pesoMax: 1656 },
  { semana: 26, pesoMin: 1579, pesoOptimo: 1628, pesoMax: 1677 },
  { semana: 27, pesoMin: 1590, pesoOptimo: 1639, pesoMax: 1688 },
  { semana: 28, pesoMin: 1596, pesoOptimo: 1645, pesoMax: 1694 },
  { semana: 29, pesoMin: 1600, pesoOptimo: 1649, pesoMax: 1698 },
  { semana: 30, pesoMin: 1601, pesoOptimo: 1651, pesoMax: 1701 },
  { semana: 31, pesoMin: 1603, pesoOptimo: 1653, pesoMax: 1703 },
  { semana: 32, pesoMin: 1605, pesoOptimo: 1655, pesoMax: 1705 },
  { semana: 33, pesoMin: 1607, pesoOptimo: 1657, pesoMax: 1707 },
  { semana: 34, pesoMin: 1608, pesoOptimo: 1658, pesoMax: 1708 },
  { semana: 35, pesoMin: 1610, pesoOptimo: 1660, pesoMax: 1710 },
  { semana: 36, pesoMin: 1612, pesoOptimo: 1662, pesoMax: 1712 },
  { semana: 37, pesoMin: 1614, pesoOptimo: 1664, pesoMax: 1714 },
  { semana: 38, pesoMin: 1616, pesoOptimo: 1666, pesoMax: 1716 },
  { semana: 39, pesoMin: 1617, pesoOptimo: 1667, pesoMax: 1717 },
  { semana: 40, pesoMin: 1619, pesoOptimo: 1669, pesoMax: 1719 },
  { semana: 41, pesoMin: 1621, pesoOptimo: 1671, pesoMax: 1721 },
  { semana: 42, pesoMin: 1623, pesoOptimo: 1673, pesoMax: 1723 },
  { semana: 43, pesoMin: 1624, pesoOptimo: 1674, pesoMax: 1724 },
  { semana: 44, pesoMin: 1626, pesoOptimo: 1676, pesoMax: 1726 },
  { semana: 45, pesoMin: 1627, pesoOptimo: 1677, pesoMax: 1727 },
  { semana: 46, pesoMin: 1629, pesoOptimo: 1679, pesoMax: 1729 },
  { semana: 47, pesoMin: 1631, pesoOptimo: 1681, pesoMax: 1731 },
  { semana: 48, pesoMin: 1632, pesoOptimo: 1682, pesoMax: 1732 },
  { semana: 49, pesoMin: 1633, pesoOptimo: 1684, pesoMax: 1735 },
  { semana: 50, pesoMin: 1634, pesoOptimo: 1685, pesoMax: 1736 },
  { semana: 51, pesoMin: 1635, pesoOptimo: 1686, pesoMax: 1737 },
  { semana: 52, pesoMin: 1637, pesoOptimo: 1688, pesoMax: 1739 },
  { semana: 53, pesoMin: 1638, pesoOptimo: 1689, pesoMax: 1740 },
  { semana: 54, pesoMin: 1640, pesoOptimo: 1691, pesoMax: 1742 },
  { semana: 55, pesoMin: 1641, pesoOptimo: 1692, pesoMax: 1743 },
  { semana: 56, pesoMin: 1642, pesoOptimo: 1693, pesoMax: 1744 },
  { semana: 57, pesoMin: 1643, pesoOptimo: 1694, pesoMax: 1745 },
  { semana: 58, pesoMin: 1645, pesoOptimo: 1696, pesoMax: 1747 },
  { semana: 59, pesoMin: 1646, pesoOptimo: 1697, pesoMax: 1748 },
  { semana: 60, pesoMin: 1647, pesoOptimo: 1698, pesoMax: 1749 },
  { semana: 61, pesoMin: 1648, pesoOptimo: 1699, pesoMax: 1750 },
  { semana: 62, pesoMin: 1649, pesoOptimo: 1700, pesoMax: 1751 },
  { semana: 63, pesoMin: 1651, pesoOptimo: 1702, pesoMax: 1753 },
  { semana: 64, pesoMin: 1652, pesoOptimo: 1703, pesoMax: 1754 },
  { semana: 65, pesoMin: 1653, pesoOptimo: 1704, pesoMax: 1755 },
  { semana: 66, pesoMin: 1654, pesoOptimo: 1705, pesoMax: 1756 },
  { semana: 67, pesoMin: 1655, pesoOptimo: 1706, pesoMax: 1757 },
  { semana: 68, pesoMin: 1656, pesoOptimo: 1707, pesoMax: 1758 },
  { semana: 69, pesoMin: 1657, pesoOptimo: 1708, pesoMax: 1759 },
  { semana: 70, pesoMin: 1658, pesoOptimo: 1709, pesoMax: 1760 },
  { semana: 71, pesoMin: 1658, pesoOptimo: 1709, pesoMax: 1760 },
  { semana: 72, pesoMin: 1659, pesoOptimo: 1710, pesoMax: 1761 },
  { semana: 73, pesoMin: 1660, pesoOptimo: 1711, pesoMax: 1762 },
  { semana: 74, pesoMin: 1661, pesoOptimo: 1712, pesoMax: 1763 },
  { semana: 75, pesoMin: 1662, pesoOptimo: 1713, pesoMax: 1764 },
  { semana: 76, pesoMin: 1663, pesoOptimo: 1714, pesoMax: 1765 },
  { semana: 77, pesoMin: 1663, pesoOptimo: 1714, pesoMax: 1765 },
  { semana: 78, pesoMin: 1664, pesoOptimo: 1715, pesoMax: 1766 },
  { semana: 79, pesoMin: 1665, pesoOptimo: 1716, pesoMax: 1767 },
  { semana: 80, pesoMin: 1665, pesoOptimo: 1716, pesoMax: 1767 },
  { semana: 81, pesoMin: 1665, pesoOptimo: 1717, pesoMax: 1769 },
  { semana: 82, pesoMin: 1666, pesoOptimo: 1718, pesoMax: 1770 },
  { semana: 83, pesoMin: 1666, pesoOptimo: 1718, pesoMax: 1770 },
  { semana: 84, pesoMin: 1667, pesoOptimo: 1719, pesoMax: 1771 },
  { semana: 85, pesoMin: 1667, pesoOptimo: 1719, pesoMax: 1771 },
  { semana: 86, pesoMin: 1668, pesoOptimo: 1720, pesoMax: 1772 },
  { semana: 87, pesoMin: 1668, pesoOptimo: 1720, pesoMax: 1772 },
  { semana: 88, pesoMin: 1669, pesoOptimo: 1721, pesoMax: 1773 },
  { semana: 89, pesoMin: 1669, pesoOptimo: 1721, pesoMax: 1773 },
  { semana: 90, pesoMin: 1669, pesoOptimo: 1721, pesoMax: 1773 },
  { semana: 91, pesoMin: 1670, pesoOptimo: 1722, pesoMax: 1774 },
  { semana: 92, pesoMin: 1670, pesoOptimo: 1722, pesoMax: 1774 },
  { semana: 93, pesoMin: 1670, pesoOptimo: 1722, pesoMax: 1774 },
  { semana: 94, pesoMin: 1671, pesoOptimo: 1723, pesoMax: 1775 },
  { semana: 95, pesoMin: 1671, pesoOptimo: 1723, pesoMax: 1775 },
];

// Dekalb Brown — Fuente: Dekalb Brown Cage Guide (ESP)
// Cría: rangos min-max explícitos (pesoOptimo = punto medio). Producción: peso objetivo único (rangos ±3%).
// Cría: semanas 1-18. Producción: semanas 19-100. Todos los puntos semanales incluidos.
const PONEDORA_DEKALB_BROWN: WeightReference[] = [
  { semana: 1, pesoMin: 59, pesoOptimo: 61, pesoMax: 62 },
  { semana: 2, pesoMin: 112, pesoOptimo: 115, pesoMax: 118 },
  { semana: 3, pesoMin: 166, pesoOptimo: 170, pesoMax: 174 },
  { semana: 4, pesoMin: 234, pesoOptimo: 240, pesoMax: 246 },
  { semana: 5, pesoMin: 322, pesoOptimo: 330, pesoMax: 338 },
  { semana: 6, pesoMin: 419, pesoOptimo: 430, pesoMax: 441 },
  { semana: 7, pesoMin: 517, pesoOptimo: 530, pesoMax: 543 },
  { semana: 8, pesoMin: 605, pesoOptimo: 621, pesoMax: 636 },
  { semana: 9, pesoMin: 692, pesoOptimo: 710, pesoMax: 728 },
  { semana: 10, pesoMin: 780, pesoOptimo: 800, pesoMax: 820 },
  { semana: 11, pesoMin: 868, pesoOptimo: 890, pesoMax: 912 },
  { semana: 12, pesoMin: 960, pesoOptimo: 985, pesoMax: 1010 },
  { semana: 13, pesoMin: 1053, pesoOptimo: 1080, pesoMax: 1107 },
  { semana: 14, pesoMin: 1136, pesoOptimo: 1165, pesoMax: 1194 },
  { semana: 15, pesoMin: 1219, pesoOptimo: 1250, pesoMax: 1281 },
  { semana: 16, pesoMin: 1302, pesoOptimo: 1335, pesoMax: 1368 },
  { semana: 17, pesoMin: 1375, pesoOptimo: 1410, pesoMax: 1445 },
  { semana: 18, pesoMin: 1424, pesoOptimo: 1461, pesoMax: 1497 },
  { semana: 19, pesoMin: 1479, pesoOptimo: 1525, pesoMax: 1571 },
  { semana: 20, pesoMin: 1547, pesoOptimo: 1595, pesoMax: 1643 },
  { semana: 21, pesoMin: 1601, pesoOptimo: 1650, pesoMax: 1700 },
  { semana: 22, pesoMin: 1644, pesoOptimo: 1695, pesoMax: 1746 },
  { semana: 23, pesoMin: 1678, pesoOptimo: 1730, pesoMax: 1782 },
  { semana: 24, pesoMin: 1702, pesoOptimo: 1755, pesoMax: 1808 },
  { semana: 25, pesoMin: 1722, pesoOptimo: 1775, pesoMax: 1828 },
  { semana: 26, pesoMin: 1736, pesoOptimo: 1790, pesoMax: 1844 },
  { semana: 27, pesoMin: 1746, pesoOptimo: 1800, pesoMax: 1854 },
  { semana: 28, pesoMin: 1755, pesoOptimo: 1809, pesoMax: 1863 },
  { semana: 29, pesoMin: 1762, pesoOptimo: 1817, pesoMax: 1872 },
  { semana: 30, pesoMin: 1769, pesoOptimo: 1824, pesoMax: 1879 },
  { semana: 31, pesoMin: 1775, pesoOptimo: 1830, pesoMax: 1885 },
  { semana: 32, pesoMin: 1780, pesoOptimo: 1835, pesoMax: 1890 },
  { semana: 33, pesoMin: 1785, pesoOptimo: 1840, pesoMax: 1895 },
  { semana: 34, pesoMin: 1790, pesoOptimo: 1845, pesoMax: 1900 },
  { semana: 35, pesoMin: 1795, pesoOptimo: 1850, pesoMax: 1906 },
  { semana: 36, pesoMin: 1798, pesoOptimo: 1854, pesoMax: 1910 },
  { semana: 37, pesoMin: 1802, pesoOptimo: 1858, pesoMax: 1914 },
  { semana: 38, pesoMin: 1806, pesoOptimo: 1862, pesoMax: 1918 },
  { semana: 39, pesoMin: 1809, pesoOptimo: 1865, pesoMax: 1921 },
  { semana: 40, pesoMin: 1812, pesoOptimo: 1868, pesoMax: 1924 },
  { semana: 41, pesoMin: 1814, pesoOptimo: 1870, pesoMax: 1926 },
  { semana: 42, pesoMin: 1816, pesoOptimo: 1872, pesoMax: 1928 },
  { semana: 43, pesoMin: 1818, pesoOptimo: 1874, pesoMax: 1930 },
  { semana: 44, pesoMin: 1820, pesoOptimo: 1876, pesoMax: 1932 },
  { semana: 45, pesoMin: 1822, pesoOptimo: 1878, pesoMax: 1934 },
  { semana: 46, pesoMin: 1824, pesoOptimo: 1880, pesoMax: 1936 },
  { semana: 47, pesoMin: 1826, pesoOptimo: 1882, pesoMax: 1938 },
  { semana: 48, pesoMin: 1827, pesoOptimo: 1884, pesoMax: 1941 },
  { semana: 49, pesoMin: 1829, pesoOptimo: 1886, pesoMax: 1943 },
  { semana: 50, pesoMin: 1831, pesoOptimo: 1888, pesoMax: 1945 },
  { semana: 51, pesoMin: 1833, pesoOptimo: 1890, pesoMax: 1947 },
  { semana: 52, pesoMin: 1835, pesoOptimo: 1892, pesoMax: 1949 },
  { semana: 53, pesoMin: 1837, pesoOptimo: 1894, pesoMax: 1951 },
  { semana: 54, pesoMin: 1839, pesoOptimo: 1896, pesoMax: 1953 },
  { semana: 55, pesoMin: 1841, pesoOptimo: 1898, pesoMax: 1955 },
  { semana: 56, pesoMin: 1843, pesoOptimo: 1900, pesoMax: 1957 },
  { semana: 57, pesoMin: 1845, pesoOptimo: 1902, pesoMax: 1959 },
  { semana: 58, pesoMin: 1847, pesoOptimo: 1904, pesoMax: 1961 },
  { semana: 59, pesoMin: 1849, pesoOptimo: 1906, pesoMax: 1963 },
  { semana: 60, pesoMin: 1851, pesoOptimo: 1908, pesoMax: 1965 },
  { semana: 61, pesoMin: 1853, pesoOptimo: 1910, pesoMax: 1967 },
  { semana: 62, pesoMin: 1855, pesoOptimo: 1912, pesoMax: 1969 },
  { semana: 63, pesoMin: 1857, pesoOptimo: 1914, pesoMax: 1971 },
  { semana: 64, pesoMin: 1859, pesoOptimo: 1916, pesoMax: 1973 },
  { semana: 65, pesoMin: 1860, pesoOptimo: 1918, pesoMax: 1976 },
  { semana: 66, pesoMin: 1862, pesoOptimo: 1920, pesoMax: 1978 },
  { semana: 67, pesoMin: 1864, pesoOptimo: 1922, pesoMax: 1980 },
  { semana: 68, pesoMin: 1866, pesoOptimo: 1924, pesoMax: 1982 },
  { semana: 69, pesoMin: 1868, pesoOptimo: 1926, pesoMax: 1984 },
  { semana: 70, pesoMin: 1870, pesoOptimo: 1928, pesoMax: 1986 },
  { semana: 71, pesoMin: 1872, pesoOptimo: 1930, pesoMax: 1988 },
  { semana: 72, pesoMin: 1874, pesoOptimo: 1932, pesoMax: 1990 },
  { semana: 73, pesoMin: 1876, pesoOptimo: 1934, pesoMax: 1992 },
  { semana: 74, pesoMin: 1878, pesoOptimo: 1936, pesoMax: 1994 },
  { semana: 75, pesoMin: 1880, pesoOptimo: 1938, pesoMax: 1996 },
  { semana: 76, pesoMin: 1882, pesoOptimo: 1940, pesoMax: 1998 },
  { semana: 77, pesoMin: 1883, pesoOptimo: 1941, pesoMax: 1999 },
  { semana: 78, pesoMin: 1884, pesoOptimo: 1942, pesoMax: 2000 },
  { semana: 79, pesoMin: 1885, pesoOptimo: 1943, pesoMax: 2001 },
  { semana: 80, pesoMin: 1886, pesoOptimo: 1944, pesoMax: 2002 },
  { semana: 81, pesoMin: 1887, pesoOptimo: 1945, pesoMax: 2003 },
  { semana: 82, pesoMin: 1888, pesoOptimo: 1946, pesoMax: 2004 },
  { semana: 83, pesoMin: 1889, pesoOptimo: 1947, pesoMax: 2005 },
  { semana: 84, pesoMin: 1890, pesoOptimo: 1948, pesoMax: 2006 },
  { semana: 85, pesoMin: 1891, pesoOptimo: 1949, pesoMax: 2007 },
  { semana: 86, pesoMin: 1892, pesoOptimo: 1950, pesoMax: 2009 },
  { semana: 87, pesoMin: 1892, pesoOptimo: 1950, pesoMax: 2009 },
  { semana: 88, pesoMin: 1892, pesoOptimo: 1950, pesoMax: 2009 },
  { semana: 89, pesoMin: 1892, pesoOptimo: 1950, pesoMax: 2009 },
  { semana: 90, pesoMin: 1892, pesoOptimo: 1950, pesoMax: 2009 },
  { semana: 91, pesoMin: 1892, pesoOptimo: 1950, pesoMax: 2009 },
  { semana: 92, pesoMin: 1892, pesoOptimo: 1950, pesoMax: 2009 },
  { semana: 93, pesoMin: 1892, pesoOptimo: 1950, pesoMax: 2009 },
  { semana: 94, pesoMin: 1892, pesoOptimo: 1950, pesoMax: 2009 },
  { semana: 95, pesoMin: 1892, pesoOptimo: 1950, pesoMax: 2009 },
  { semana: 96, pesoMin: 1892, pesoOptimo: 1950, pesoMax: 2009 },
  { semana: 97, pesoMin: 1892, pesoOptimo: 1950, pesoMax: 2009 },
  { semana: 98, pesoMin: 1892, pesoOptimo: 1950, pesoMax: 2009 },
  { semana: 99, pesoMin: 1892, pesoOptimo: 1950, pesoMax: 2009 },
  { semana: 100, pesoMin: 1892, pesoOptimo: 1950, pesoMax: 2009 },
];

// Dekalb White — Fuente: Dekalb White Cage Guide (ESP)
// Cría: rangos min-max explícitos (pesoOptimo = punto medio). Producción: peso objetivo único (rangos ±3%).
// Cría: semanas 1-18. Producción: semanas 19-100. Todos los puntos semanales incluidos.
const PONEDORA_DEKALB_WHITE: WeightReference[] = [
  { semana: 1, pesoMin: 59, pesoOptimo: 61, pesoMax: 62 },
  { semana: 2, pesoMin: 117, pesoOptimo: 120, pesoMax: 123 },
  { semana: 3, pesoMin: 190, pesoOptimo: 195, pesoMax: 200 },
  { semana: 4, pesoMin: 263, pesoOptimo: 270, pesoMax: 277 },
  { semana: 5, pesoMin: 336, pesoOptimo: 345, pesoMax: 354 },
  { semana: 6, pesoMin: 414, pesoOptimo: 425, pesoMax: 436 },
  { semana: 7, pesoMin: 492, pesoOptimo: 505, pesoMax: 518 },
  { semana: 8, pesoMin: 575, pesoOptimo: 590, pesoMax: 605 },
  { semana: 9, pesoMin: 653, pesoOptimo: 670, pesoMax: 687 },
  { semana: 10, pesoMin: 731, pesoOptimo: 750, pesoMax: 769 },
  { semana: 11, pesoMin: 809, pesoOptimo: 830, pesoMax: 851 },
  { semana: 12, pesoMin: 887, pesoOptimo: 910, pesoMax: 933 },
  { semana: 13, pesoMin: 956, pesoOptimo: 981, pesoMax: 1005 },
  { semana: 14, pesoMin: 1024, pesoOptimo: 1050, pesoMax: 1076 },
  { semana: 15, pesoMin: 1087, pesoOptimo: 1115, pesoMax: 1143 },
  { semana: 16, pesoMin: 1146, pesoOptimo: 1175, pesoMax: 1204 },
  { semana: 17, pesoMin: 1199, pesoOptimo: 1230, pesoMax: 1261 },
  { semana: 18, pesoMin: 1243, pesoOptimo: 1275, pesoMax: 1307 },
  { semana: 19, pesoMin: 1295, pesoOptimo: 1335, pesoMax: 1375 },
  { semana: 20, pesoMin: 1353, pesoOptimo: 1395, pesoMax: 1437 },
  { semana: 21, pesoMin: 1426, pesoOptimo: 1470, pesoMax: 1514 },
  { semana: 22, pesoMin: 1474, pesoOptimo: 1520, pesoMax: 1566 },
  { semana: 23, pesoMin: 1508, pesoOptimo: 1555, pesoMax: 1602 },
  { semana: 24, pesoMin: 1528, pesoOptimo: 1575, pesoMax: 1622 },
  { semana: 25, pesoMin: 1542, pesoOptimo: 1590, pesoMax: 1638 },
  { semana: 26, pesoMin: 1557, pesoOptimo: 1605, pesoMax: 1653 },
  { semana: 27, pesoMin: 1567, pesoOptimo: 1615, pesoMax: 1663 },
  { semana: 28, pesoMin: 1576, pesoOptimo: 1625, pesoMax: 1674 },
  { semana: 29, pesoMin: 1584, pesoOptimo: 1633, pesoMax: 1682 },
  { semana: 30, pesoMin: 1591, pesoOptimo: 1640, pesoMax: 1689 },
  { semana: 31, pesoMin: 1595, pesoOptimo: 1644, pesoMax: 1693 },
  { semana: 32, pesoMin: 1599, pesoOptimo: 1648, pesoMax: 1697 },
  { semana: 33, pesoMin: 1602, pesoOptimo: 1652, pesoMax: 1702 },
  { semana: 34, pesoMin: 1606, pesoOptimo: 1656, pesoMax: 1706 },
  { semana: 35, pesoMin: 1610, pesoOptimo: 1660, pesoMax: 1710 },
  { semana: 36, pesoMin: 1613, pesoOptimo: 1663, pesoMax: 1713 },
  { semana: 37, pesoMin: 1616, pesoOptimo: 1666, pesoMax: 1716 },
  { semana: 38, pesoMin: 1619, pesoOptimo: 1669, pesoMax: 1719 },
  { semana: 39, pesoMin: 1622, pesoOptimo: 1672, pesoMax: 1722 },
  { semana: 40, pesoMin: 1625, pesoOptimo: 1675, pesoMax: 1725 },
  { semana: 41, pesoMin: 1627, pesoOptimo: 1677, pesoMax: 1727 },
  { semana: 42, pesoMin: 1629, pesoOptimo: 1679, pesoMax: 1729 },
  { semana: 43, pesoMin: 1631, pesoOptimo: 1681, pesoMax: 1731 },
  { semana: 44, pesoMin: 1633, pesoOptimo: 1683, pesoMax: 1733 },
  { semana: 45, pesoMin: 1634, pesoOptimo: 1685, pesoMax: 1736 },
  { semana: 46, pesoMin: 1635, pesoOptimo: 1686, pesoMax: 1737 },
  { semana: 47, pesoMin: 1636, pesoOptimo: 1687, pesoMax: 1738 },
  { semana: 48, pesoMin: 1637, pesoOptimo: 1688, pesoMax: 1739 },
  { semana: 49, pesoMin: 1638, pesoOptimo: 1689, pesoMax: 1740 },
  { semana: 50, pesoMin: 1639, pesoOptimo: 1690, pesoMax: 1741 },
  { semana: 51, pesoMin: 1640, pesoOptimo: 1691, pesoMax: 1742 },
  { semana: 52, pesoMin: 1641, pesoOptimo: 1692, pesoMax: 1743 },
  { semana: 53, pesoMin: 1642, pesoOptimo: 1693, pesoMax: 1744 },
  { semana: 54, pesoMin: 1643, pesoOptimo: 1694, pesoMax: 1745 },
  { semana: 55, pesoMin: 1644, pesoOptimo: 1695, pesoMax: 1746 },
  { semana: 56, pesoMin: 1645, pesoOptimo: 1696, pesoMax: 1747 },
  { semana: 57, pesoMin: 1646, pesoOptimo: 1697, pesoMax: 1748 },
  { semana: 58, pesoMin: 1647, pesoOptimo: 1698, pesoMax: 1749 },
  { semana: 59, pesoMin: 1648, pesoOptimo: 1699, pesoMax: 1750 },
  { semana: 60, pesoMin: 1649, pesoOptimo: 1700, pesoMax: 1751 },
  { semana: 61, pesoMin: 1650, pesoOptimo: 1701, pesoMax: 1752 },
  { semana: 62, pesoMin: 1651, pesoOptimo: 1702, pesoMax: 1753 },
  { semana: 63, pesoMin: 1652, pesoOptimo: 1703, pesoMax: 1754 },
  { semana: 64, pesoMin: 1653, pesoOptimo: 1704, pesoMax: 1755 },
  { semana: 65, pesoMin: 1654, pesoOptimo: 1705, pesoMax: 1756 },
  { semana: 66, pesoMin: 1655, pesoOptimo: 1706, pesoMax: 1757 },
  { semana: 67, pesoMin: 1656, pesoOptimo: 1707, pesoMax: 1758 },
  { semana: 68, pesoMin: 1657, pesoOptimo: 1708, pesoMax: 1759 },
  { semana: 69, pesoMin: 1658, pesoOptimo: 1709, pesoMax: 1760 },
  { semana: 70, pesoMin: 1659, pesoOptimo: 1710, pesoMax: 1761 },
  { semana: 71, pesoMin: 1660, pesoOptimo: 1711, pesoMax: 1762 },
  { semana: 72, pesoMin: 1661, pesoOptimo: 1712, pesoMax: 1763 },
  { semana: 73, pesoMin: 1662, pesoOptimo: 1713, pesoMax: 1764 },
  { semana: 74, pesoMin: 1663, pesoOptimo: 1714, pesoMax: 1765 },
  { semana: 75, pesoMin: 1664, pesoOptimo: 1715, pesoMax: 1766 },
  { semana: 76, pesoMin: 1665, pesoOptimo: 1716, pesoMax: 1767 },
  { semana: 77, pesoMin: 1665, pesoOptimo: 1717, pesoMax: 1769 },
  { semana: 78, pesoMin: 1666, pesoOptimo: 1718, pesoMax: 1770 },
  { semana: 79, pesoMin: 1667, pesoOptimo: 1719, pesoMax: 1771 },
  { semana: 80, pesoMin: 1668, pesoOptimo: 1720, pesoMax: 1772 },
  { semana: 81, pesoMin: 1669, pesoOptimo: 1721, pesoMax: 1773 },
  { semana: 82, pesoMin: 1670, pesoOptimo: 1722, pesoMax: 1774 },
  { semana: 83, pesoMin: 1671, pesoOptimo: 1723, pesoMax: 1775 },
  { semana: 84, pesoMin: 1672, pesoOptimo: 1724, pesoMax: 1776 },
  { semana: 85, pesoMin: 1673, pesoOptimo: 1725, pesoMax: 1777 },
  { semana: 86, pesoMin: 1673, pesoOptimo: 1725, pesoMax: 1777 },
  { semana: 87, pesoMin: 1673, pesoOptimo: 1725, pesoMax: 1777 },
  { semana: 88, pesoMin: 1673, pesoOptimo: 1725, pesoMax: 1777 },
  { semana: 89, pesoMin: 1673, pesoOptimo: 1725, pesoMax: 1777 },
  { semana: 90, pesoMin: 1673, pesoOptimo: 1725, pesoMax: 1777 },
  { semana: 91, pesoMin: 1673, pesoOptimo: 1725, pesoMax: 1777 },
  { semana: 92, pesoMin: 1673, pesoOptimo: 1725, pesoMax: 1777 },
  { semana: 93, pesoMin: 1673, pesoOptimo: 1725, pesoMax: 1777 },
  { semana: 94, pesoMin: 1673, pesoOptimo: 1725, pesoMax: 1777 },
  { semana: 95, pesoMin: 1673, pesoOptimo: 1725, pesoMax: 1777 },
  { semana: 96, pesoMin: 1673, pesoOptimo: 1725, pesoMax: 1777 },
  { semana: 97, pesoMin: 1673, pesoOptimo: 1725, pesoMax: 1777 },
  { semana: 98, pesoMin: 1673, pesoOptimo: 1725, pesoMax: 1777 },
  { semana: 99, pesoMin: 1673, pesoOptimo: 1725, pesoMax: 1777 },
  { semana: 100, pesoMin: 1673, pesoOptimo: 1725, pesoMax: 1777 },
];

// Nick Brown (H&N Brown Nick) — Fuente: H&N Brown Nick Guide (ESP, 07/2020)
// Tabla 4 (cría, semanas 1-20) y Tabla 34 (producción, semanas 19-100)
// El documento solo provee peso objetivo → rangos calculados ±4% cría, ±3% producción
// TODOS los 80 puntos semanales de producción (sem 21-100) incluidos desde Tabla 34.
const PONEDORA_NICK_BROWN: WeightReference[] = (() => {
  // Datos de peso objetivo extraídos directamente del PDF — Tabla 4
  const rearingTargets: [number, number][] = [
    [1, 70], [2, 125], [3, 190], [4, 270], [5, 363],
    [6, 475], [7, 589], [8, 694], [9, 789], [10, 880],
    [11, 967], [12, 1052], [13, 1134], [14, 1213], [15, 1291],
    [16, 1367], [17, 1440], [18, 1516], [19, 1596], [20, 1675],
  ];
  // Datos de peso objetivo extraídos directamente del PDF — Tabla 34 (todos los puntos semanales 21-100)
  const productionTargets: [number, number][] = [
    [21, 1750],
    [22, 1810],
    [23, 1850],
    [24, 1882],
    [25, 1897],
    [26, 1908],
    [27, 1914],
    [28, 1918],
    [29, 1922],
    [30, 1925],
    [31, 1928],
    [32, 1931],
    [33, 1934],
    [34, 1937],
    [35, 1940],
    [36, 1943],
    [37, 1946],
    [38, 1949],
    [39, 1952],
    [40, 1955],
    [41, 1958],
    [42, 1961],
    [43, 1964],
    [44, 1967],
    [45, 1970],
    [46, 1973],
    [47, 1976],
    [48, 1979],
    [49, 1982],
    [50, 1985],
    [51, 1988],
    [52, 1991],
    [53, 1994],
    [54, 1997],
    [55, 1999],
    [56, 2001],
    [57, 2003],
    [58, 2005],
    [59, 2007],
    [60, 2009],
    [61, 2011],
    [62, 2013],
    [63, 2015],
    [64, 2017],
    [65, 2019],
    [66, 2021],
    [67, 2023],
    [68, 2025],
    [69, 2027],
    [70, 2029],
    [71, 2031],
    [72, 2033],
    [73, 2035],
    [74, 2037],
    [75, 2039],
    [76, 2041],
    [77, 2043],
    [78, 2045],
    [79, 2048],
    [80, 2050],
    [81, 2052],
    [82, 2054],
    [83, 2056],
    [84, 2058],
    [85, 2060],
    [86, 2062],
    [87, 2064],
    [88, 2066],
    [89, 2068],
    [90, 2070],
    [91, 2072],
    [92, 2074],
    [93, 2076],
    [94, 2078],
    [95, 2080],
    [96, 2082],
    [97, 2084],
    [98, 2086],
    [99, 2088],
    [100, 2090]
  ];
  const refs: WeightReference[] = [];
  for (const [semana, pesoOptimo] of rearingTargets) {
    const { pesoMin, pesoMax } = calcRange(pesoOptimo, 4);
    refs.push({ semana, pesoMin, pesoOptimo, pesoMax });
  }
  for (const [semana, pesoOptimo] of productionTargets) {
    const { pesoMin, pesoMax } = calcRange(pesoOptimo, 3);
    refs.push({ semana, pesoMin, pesoOptimo, pesoMax });
  }
  return refs;
})();

// Super Nick (H&N Super Nick) — Fuente: H&N Super Nick Guide (ESP)
// Tabla 4 (cría, semanas 1-20) y Tabla 34 (producción, semanas 19-100)
// El documento solo provee peso objetivo → rangos calculados ±4% cría, ±3% producción
// TODOS los 80 puntos semanales de producción (sem 21-100) incluidos desde Tabla 34.
const PONEDORA_SUPER_NICK: WeightReference[] = (() => {
  // Datos de peso objetivo extraídos directamente del PDF — Tabla 4
  const rearingTargets: [number, number][] = [
    [1, 65], [2, 120], [3, 180], [4, 250], [5, 331],
    [6, 418], [7, 508], [8, 597], [9, 682], [10, 763],
    [11, 841], [12, 915], [13, 986], [14, 1055], [15, 1122],
    [16, 1190], [17, 1260], [18, 1329], [19, 1393], [20, 1448],
  ];
  // Datos de peso objetivo extraídos directamente del PDF — Tabla 34 (todos los puntos semanales 21-100)
  const productionTargets: [number, number][] = [
    [21, 1496],
    [22, 1537],
    [23, 1571],
    [24, 1599],
    [25, 1621],
    [26, 1637],
    [27, 1648],
    [28, 1654],
    [29, 1658],
    [30, 1661],
    [31, 1664],
    [32, 1667],
    [33, 1670],
    [34, 1673],
    [35, 1676],
    [36, 1679],
    [37, 1682],
    [38, 1685],
    [39, 1688],
    [40, 1691],
    [41, 1694],
    [42, 1697],
    [43, 1700],
    [44, 1703],
    [45, 1706],
    [46, 1708],
    [47, 1710],
    [48, 1712],
    [49, 1714],
    [50, 1716],
    [51, 1718],
    [52, 1720],
    [53, 1722],
    [54, 1724],
    [55, 1726],
    [56, 1728],
    [57, 1730],
    [58, 1732],
    [59, 1734],
    [60, 1736],
    [61, 1738],
    [62, 1740],
    [63, 1742],
    [64, 1744],
    [65, 1746],
    [66, 1748],
    [67, 1750],
    [68, 1752],
    [69, 1754],
    [70, 1756],
    [71, 1758],
    [72, 1760],
    [73, 1762],
    [74, 1764],
    [75, 1766],
    [76, 1768],
    [77, 1770],
    [78, 1772],
    [79, 1774],
    [80, 1775],
    [81, 1776],
    [82, 1777],
    [83, 1778],
    [84, 1779],
    [85, 1780],
    [86, 1781],
    [87, 1782],
    [88, 1783],
    [89, 1784],
    [90, 1785],
    [91, 1786],
    [92, 1787],
    [93, 1788],
    [94, 1789],
    [95, 1790],
    [96, 1791],
    [97, 1792],
    [98, 1793],
    [99, 1794],
    [100, 1795]
  ];
  const refs: WeightReference[] = [];
  for (const [semana, pesoOptimo] of rearingTargets) {
    const { pesoMin, pesoMax } = calcRange(pesoOptimo, 4);
    refs.push({ semana, pesoMin, pesoOptimo, pesoMax });
  }
  for (const [semana, pesoOptimo] of productionTargets) {
    const { pesoMin, pesoMax } = calcRange(pesoOptimo, 3);
    refs.push({ semana, pesoMin, pesoOptimo, pesoMax });
  }
  return refs;
})();

// ─── Mapa de referencias por línea genética ───────────────────────

const WEIGHT_REFERENCES: Record<string, WeightReference[]> = {
  'Broiler - Cobb': BROILER_COBB,
  'Broiler - Ross': BROILER_ROSS,
  'Broiler - Hubbard': BROILER_HUBBARD,
  'Ponedora - Hy-Line Brown': PONEDORA_HYLINE_BROWN,
  'Ponedora - Hy-Line W-36': PONEDORA_HYLINE_W36,
  'Ponedora - Lohmann Brown': PONEDORA_LOHMANN_BROWN,
  'Ponedora - Lohmann LSL': PONEDORA_LOHMANN_LSL,
  'Ponedora - Dekalb White': PONEDORA_DEKALB_WHITE,
  'Ponedora - Dekalb Brown': PONEDORA_DEKALB_BROWN,
  'Ponedora - Nick Brown': PONEDORA_NICK_BROWN,
  'Ponedora - Super Nick': PONEDORA_SUPER_NICK,
};

// ─── Funciones auxiliares ─────────────────────────────────────────

function getBirdType(lineaGenetica: string): BirdType {
  if (lineaGenetica.startsWith('Broiler')) return 'broiler';
  return 'ponedora';
}

function getReferences(lineaGenetica: string): WeightReference[] | null {
  return WEIGHT_REFERENCES[lineaGenetica] ?? null;
}

/** Interpola el peso esperado para una semana dada */
function interpolateRef(refs: WeightReference[], semana: number): { pesoMin: number; pesoOptimo: number; pesoMax: number } | null {
  if (semana <= 0) return null;

  // Si está antes de la primera semana, usar la primera
  if (semana < refs[0].semana) {
    return { pesoMin: refs[0].pesoMin, pesoOptimo: refs[0].pesoOptimo, pesoMax: refs[0].pesoMax };
  }

  // Si coincide exactamente con una semana de referencia, usar ese valor directo
  const exactMatch = refs.find(r => r.semana === semana);
  if (exactMatch) {
    return { pesoMin: exactMatch.pesoMin, pesoOptimo: exactMatch.pesoOptimo, pesoMax: exactMatch.pesoMax };
  }

  // Si está más allá de la última referencia, usar la última
  if (semana > refs[refs.length - 1].semana) {
    const last = refs[refs.length - 1];
    const extraWeeks = semana - last.semana;
    const growthFactor = last.pesoOptimo * 0.002; // ~0.2% semanal post-última referencia (crecimiento mínimo)
    return {
      pesoMin: last.pesoMin + extraWeeks * growthFactor * 0.5,
      pesoOptimo: last.pesoOptimo + extraWeeks * growthFactor,
      pesoMax: last.pesoMax + extraWeeks * growthFactor * 1.5,
    };
  }

  // Interpolar entre las dos semanas más cercanas
  for (let i = 0; i < refs.length - 1; i++) {
    if (semana >= refs[i].semana && semana <= refs[i + 1].semana) {
      const t = (semana - refs[i].semana) / (refs[i + 1].semana - refs[i].semana);
      return {
        pesoMin: refs[i].pesoMin + t * (refs[i + 1].pesoMin - refs[i].pesoMin),
        pesoOptimo: refs[i].pesoOptimo + t * (refs[i + 1].pesoOptimo - refs[i].pesoOptimo),
        pesoMax: refs[i].pesoMax + t * (refs[i + 1].pesoMax - refs[i].pesoMax),
      };
    }
  }

  return null;
}

function getUniformityLevel(uniformidad: number): UniformityLevel {
  if (uniformidad >= 85) return 'excellent';
  if (uniformidad >= 70) return 'regular';
  return 'poor';
}

function getProductiveStage(birdType: BirdType, semana: number): { stage: ProductiveStage; label: string } {
  if (birdType === 'broiler') {
    if (semana <= 1) return { stage: 'iniciacion', label: 'Inicio / Adaptación' };
    if (semana <= 3) return { stage: 'crianza', label: 'Crianza (Crecimiento Inicial)' };
    if (semana <= 5) return { stage: 'engorde', label: 'Engorde (Crecimiento Acelerado)' };
    return { stage: 'engorde', label: 'Engorde Final / Sacrificio' };
  }

  // Ponedora
  if (semana <= 1) return { stage: 'iniciacion', label: 'Inicio / Adaptación' };
  if (semana <= 6) return { stage: 'crianza', label: 'Crianza (Primeras Semanas)' };
  if (semana <= 16) return { stage: 'levante', label: 'Levante (Desarrollo Óseo y Muscular)' };
  if (semana <= 20) return { stage: 'prepostura', label: 'Pre-postura (Desarrollo Reproductivo)' };
  return { stage: 'produccion', label: 'Producción (Puesta de Huevos)' };
}

// ─── Generadores de contenido por contexto ────────────────────────

function generateInterpretacion(
  level: UniformityLevel,
  uniformidad: number,
  cv: number,
  promedio: number,
  birdType: BirdType,
  stage: ProductiveStage,
  countDebajo: number,
  countEncima: number,
  countDentro: number,
  totalAves: number,
): string {
  const pctDebajo = ((countDebajo / totalAves) * 100).toFixed(1);
  const pctEncima = ((countEncima / totalAves) * 100).toFixed(1);
  const pctDentro = ((countDentro / totalAves) * 100).toFixed(1);

  if (level === 'excellent') {
    let base = `Uniformidad ${uniformidad.toFixed(1)}%, CV ${cv.toFixed(2)}%: lote muy homogéneo. `;
    base += `${pctDentro}% de las aves (${countDentro}/${totalAves}) dentro del rango ±10% (${promedio.toFixed(1)} g). `;
    if (birdType === 'broiler') {
      base += `El lote alcanzará peso de mercado de forma sincronizada, permitiendo despoble eficiente.`;
    } else if (stage === 'produccion') {
      base += `La mayoría de aves está en pico de postura simultáneamente, facilitando el manejo nutricional.`;
    } else if (stage === 'prepostura') {
      base += `Las aves madurarán sexualmente al mismo tiempo, sincronizando el inicio de producción.`;
    } else {
      base += `El crecimiento está bien controlado y las aves progresan de manera equilibrada.`;
    }
    return base;
  }

  if (level === 'regular') {
    let base = `Uniformidad ${uniformidad.toFixed(1)}%, CV ${cv.toFixed(2)}%: variabilidad moderada. `;
    base += `${pctDentro}% en rango, ${countDebajo} aves por debajo (${pctDebajo}%) y ${countEncima} por encima (${pctEncima}%). `;
    if (countDebajo > countEncima * 2) {
      base += `Sesgo hacia pesos bajos: grupo significativo con consumo insuficiente o acceso limitado al comedero.`;
    } else if (countEncima > countDebajo * 2) {
      base += `Sesgo hacia pesos altos: posible sobrealimentación de un sector o competencia desigual.`;
    } else {
      base += `Distribución simétrica pero dispersa: variabilidad general en consumo y crecimiento.`;
    }
    return base;
  }

  // poor
  let base = `Uniformidad ${uniformidad.toFixed(1)}%, CV ${cv.toFixed(2)}%: preocupante. Solo ${pctDentro}% en rango. `;
  base += `${countDebajo} aves por debajo (${pctDebajo}%) y ${countEncima} por encima (${pctEncima}%). `;
  if (birdType === 'broiler') {
    base += `Las aves ligeras tendrán menor rendimiento y las pesadas pueden tener problemas locomotores y mortalidad.`;
  } else if (stage === 'produccion') {
    base += `Muchas aves no producen huevos mientras otras ponen de forma irregular, desperdiciando alimento.`;
  } else if (stage === 'prepostura') {
    base += `Las aves ligeras retrasarán su madurez sexual, creando producción escalonada e ineficiente.`;
  } else {
    base += `La desuniformidad tiende a agravarse si no se corrige. Las aves pequeñas no alcanzarán a las grandes sin intervención.`;
  }
  return base;
}

function generatePesoComparacion(
  promedio: number,
  refs: { pesoMin: number; pesoOptimo: number; pesoMax: number } | null,
  edadSemanas: number,
  lineaGenetica: string,
): string {
  if (!refs || !edadSemanas) {
    return `Peso promedio medido: ${promedio.toFixed(1)} g. No se dispone de referencia para comparar.`;
  }

  const diff = promedio - refs.pesoOptimo;
  const pctDiff = ((diff / refs.pesoOptimo) * 100).toFixed(1);
  const sign = diff >= 0 ? '+' : '';

  let result = `Peso medido: ${promedio.toFixed(1)} g. Referencia ${lineaGenetica} a ${edadSemanas} sem: ${refs.pesoOptimo.toFixed(0)} g (${refs.pesoMin.toFixed(0)}–${refs.pesoMax.toFixed(0)} g). `;

  if (promedio < refs.pesoMin) {
    result += `Desviación: ${sign}${pctDiff}%. POR DEBAJO del rango mínimo.`;
  } else if (promedio > refs.pesoMax) {
    result += `Desviación: ${sign}${pctDiff}%. POR ENCIMA del rango máximo.`;
  } else if (promedio < refs.pesoOptimo * 0.95) {
    result += `Desviación: ${sign}${pctDiff}%. Dentro del rango pero por debajo del óptimo.`;
  } else if (promedio > refs.pesoOptimo * 1.05) {
    result += `Desviación: ${sign}${pctDiff}%. Dentro del rango pero por encima del óptimo.`;
  } else {
    result += `Desviación: ${sign}${pctDiff}%. Muy cerca del óptimo.`;
  }

  return result;
}

function generateAlertas(
  promedio: number,
  refs: { pesoMin: number; pesoOptimo: number; pesoMax: number } | null,
  edadSemanas: number,
  birdType: BirdType,
  cv: number,
  uniformidad: number,
  countDebajo: number,
  countEncima: number,
  totalAves: number,
): string[] {
  const alertas: string[] = [];

  if (!refs || !edadSemanas) {
    alertas.push('No se especificó edad o línea genética sin referencia. Diagnóstico limitado.');
    return alertas;
  }

  // Peso fuera de rango
  if (promedio < refs.pesoMin) {
    const deficit = refs.pesoOptimo - promedio;
    const pct = ((deficit / refs.pesoOptimo) * 100).toFixed(1);
    alertas.push(
      `Peso muy bajo: ${deficit.toFixed(0)} g (${pct}%) inferior al estándar. Verifique edad (${edadSemanas} sem) y revise alimentación.`
    );
  } else if (promedio > refs.pesoMax) {
    const exceso = promedio - refs.pesoOptimo;
    const pct = ((exceso / refs.pesoOptimo) * 100).toFixed(1);
    if (birdType === 'broiler') {
      alertas.push(
        `Sobrepeso: ${exceso.toFixed(0)} g (${pct}%) sobre el óptimo. Puede causar problemas locomotores, ascitis y mortalidad.`
      );
    } else {
      alertas.push(
        `Sobrepeso: ${exceso.toFixed(0)} g (${pct}%) sobre el óptimo. Reduce eficiencia de conversión y puede causar prolapso.`
      );
    }
  }

  // CV alto
  if (cv > 15) {
    alertas.push(
      `CV ${cv.toFixed(2)}% extremadamente alto (>15%). Sugiere problemas graves de manejo, mezcla de edades o errores en datos.`
    );
  } else if (cv > 10 && birdType === 'ponedora') {
    alertas.push(
      `CV ${cv.toFixed(2)}% alto para ponedora (esperado <8%). Revise uniformidad del alimento y espacio de comedero.`
    );
  }

  // Asimetría
  if (countDebajo > 0 && countEncima === 0 && uniformidad < 85) {
    alertas.push(`Todas las aves fuera de rango están por debajo. Posible alimentación insuficiente o densidad excesiva.`);
  } else if (countEncima > 0 && countDebajo === 0 && uniformidad < 85) {
    alertas.push(`Todas las aves fuera de rango están por encima. Posible sobrealimentación o edad incorrecta.`);
  }

  // Pocas aves
  if (totalAves < 30) {
    alertas.push(`Solo ${totalAves} aves pesadas. Mínimo recomendado: 30 aves (ideal 50-100) distribuidas en el galpón.`);
  }

  // Ponedora en producción con baja uniformidad
  if (birdType === 'ponedora' && uniformidad < 75 && edadSemanas >= 20) {
    alertas.push(`Baja uniformidad en producción: aves improductivas consumiendo alimento sin producir huevos. Pérdida directa.`);
  }

  // Broiler en engorde final
  if (birdType === 'broiler' && uniformidad < 75 && edadSemanas >= 5) {
    alertas.push(`Baja uniformidad en engorde final: aves ligeras necesitarán más días, incrementando costo/kg producido.`);
  }

  return alertas;
}

function generateCausas(
  level: UniformityLevel,
  birdType: BirdType,
  stage: ProductiveStage,
  countDebajo: number,
  countEncima: number,
  cv: number,
  promedio: number,
  refs: { pesoMin: number; pesoOptimo: number; pesoMax: number } | null,
): string[] {
  const causas: string[] = [];

  if (level === 'excellent') {
    causas.push('Manejo general adecuado.');
    causas.push('Distribución de alimento y agua correcta.');
    if (refs && promedio >= refs.pesoMin && promedio <= refs.pesoMax) {
      causas.push('Programa nutricional bien calibrado para la línea y edad.');
    }
    return causas;
  }

  // Causas comunes para regular y poor
  causas.push('Competencia desigual por acceso a comedero y bebedero.');

  if (countDebajo > countEncima) {
    causas.push('Subgrupo con consumo insuficiente (dominadas o enfermas).');
    if (birdType === 'broiler') {
      causas.push('Densidad excesiva impidiendo acceso uniforme al alimento.');
    }
  } else if (countEncima > countDebajo) {
    causas.push('Subgrupo con consumo excesivo por posición ventajosa en el galpón.');
  } else {
    causas.push('Variabilidad general sin sesgo claro.');
  }

  if (cv > 10) {
    causas.push('CV >10% sugiere factores múltiples actuando simultáneamente.');
  }

  if (birdType === 'broiler') {
    if (stage === 'iniciacion' || stage === 'crianza') {
      causas.push('Temperatura inadecuada en primeras semanas (estrés térmico).');
      causas.push('Cama deficiente o humedad excesiva.');
      causas.push('Uniformidad pobre del pollito al recibir (incubadora).');
    } else {
      causas.push('Transición de alimento inicial a crecimiento mal manejada.');
      causas.push('Enfermedad subclínica (enteritis, coccidiosis).');
      causas.push('Ventilación inadecuada con zonas de confort desiguales.');
    }
  } else {
    if (stage === 'crianza') {
      causas.push('Microclimas por temperatura o ventilación inadecuada.');
      causas.push('Alimento inconsistente o distribución irregular.');
      causas.push('Bebederos con flujo irregular limitando consumo.');
    } else if (stage === 'levante') {
      causas.push('Restricción alimentaria excesiva o mal calculada.');
      causas.push('Parásitos internos que afectan absorción de nutrientes.');
      causas.push('Cambios bruscos de iluminación alterando el consumo.');
    } else if (stage === 'prepostura') {
      causas.push('Transición tardía o prematura al alimento de pre-postura.');
      causas.push('Desarrollo reproductivo asincrónico por diferencias de madurez.');
      causas.push('Espacio de comedero insuficiente en transición crítica.');
    } else {
      causas.push('Aves en diferentes fases del ciclo de postura.');
      causas.push('Muda parcial no controlada creando grupos con pesos distintos.');
      causas.push('Picaje que genera estrés y reduce consumo en aves victimizadas.');
    }
  }

  if (refs && promedio < refs.pesoMin) {
    causas.push('Peso promedio bajo estándar, agrava la desuniformidad.');
  }

  return causas;
}

function generateRecomendaciones(
  level: UniformityLevel,
  birdType: BirdType,
  stage: ProductiveStage,
  countDebajo: number,
  countEncima: number,
  _uniformidad: number,
  promedio: number,
  refs: { pesoMin: number; pesoOptimo: number; pesoMax: number } | null,
  edadSemanas: number,
): string[] {
  const recs: string[] = [];

  if (level === 'excellent') {
    recs.push('Mantener programa de manejo actual sin cambios bruscos.');
    if (birdType === 'ponedora' && stage === 'prepostura') {
      recs.push('Preparar nidadas e iluminación para entrada en producción.');
    }
    if (birdType === 'broiler') {
      recs.push('Continuar monitoreo semanal de peso.');
    }
    recs.push('Realizar pesajes semanales para detectar desviaciones.');
    return recs;
  }

  // Acceso a alimento
  if (countDebajo > countEncima) {
    recs.push('Aumentar espacio de comedero: mínimo 5 cm/ave (lineal) o 1 plato/60 aves (automático).');
    recs.push('Verificar acceso simultáneo al alimento en las primeras horas de luz.');
    if (level === 'poor') {
      recs.push('Separar aves ligeras en corral con comedero/bebedero extra y alimento de refuerzo.');
    }
  } else if (countEncima > countDebajo) {
    recs.push('Evaluar si el programa alimenticio está sobreestimado. Ajustar raciones.');
  }

  recs.push('Verificar flujo y presión de bebederos: la restricción de agua reduce consumo de alimento.');

  if (birdType === 'broiler') {
    if (stage === 'iniciacion' || stage === 'crianza') {
      recs.push('Temperatura uniforme: 33-35°C sem 1, reduciendo 2-3°C/semana.');
      recs.push('Revisar calidad de cama: humedad excesiva favorece infecciones.');
      recs.push('Usar papel en cama los primeros 3-5 días para facilitar acceso al alimento.');
    } else {
      recs.push('Densidad: no superar 30-35 kg/m² en broilers pesados.');
      recs.push('Iluminación intermitente (4L:2D) sincroniza comidas y mejora uniformidad.');
      if (level === 'poor') {
        recs.push('Revisar molturación del alimento: partículas muy finas o gruesas afectan consumo uniforme.');
      }
    }
  } else {
    if (stage === 'crianza') {
      recs.push('Revisar temperatura: aves pequeñas se agrupan en zonas cálidas y no comen.');
      recs.push('Mínimo 1 cm/ave de comedero en primeras semanas.');
      recs.push('Eliminar corrientes de aire que crean microclimas.');
    } else if (stage === 'levante') {
      recs.push('Restricción alimentaria controlada sin comprometer aves más ligeras.');
      recs.push('Iluminación estable (8-10 h) sin fluctuaciones.');
      recs.push('Desparasitar si no se ha hecho en las últimas 4 semanas.');
    } else if (stage === 'prepostura') {
      recs.push('Incrementar calcio gradualmente (transición a pre-postura).');
      recs.push('Aumentar espacio de comedero antes del inicio de postura.');
      recs.push('Iluminación estimulante (+15-30 min/semana) uniforme para todo el lote.');
      if (level === 'poor') {
        recs.push('URGENTE: Clasificar por peso y manejo diferenciado. Ligeras: alimento extra. Pesadas: restricción ligera.');
      }
    } else {
      recs.push('Si uniformidad <75%, manejo por zonas con dietas específicas.');
      recs.push('Monitorear producción individual: aves fuera de rango no producen eficientemente.');
      recs.push('Iluminación 14-16 h sin interrupciones.');
      if (level === 'poor') {
        recs.push('Evaluar muda forzada para re-sincronizar o descartar aves improductivas.');
      }
    }
  }

  // Peso fuera de referencia
  if (refs) {
    if (promedio < refs.pesoMin) {
      recs.push(`Peso ${((refs.pesoOptimo - promedio) / refs.pesoOptimo * 100).toFixed(1)}% bajo estándar. Aumentar energía/proteína y descartar enfermedades subclínicas.`);
    } else if (promedio > refs.pesoMax) {
      recs.push(`Peso ${((promedio - refs.pesoOptimo) / refs.pesoOptimo * 100).toFixed(1)}% sobre estándar. Reducir densidad nutricional o aplicar restricción controlada.`);
    }
  }

  // En este punto level ya está acotado a 'regular' | 'poor' (hubo retorno
  // temprano para 'excellent'), así que la recomendación aplica siempre.
  recs.push('Repetir pesaje en 3-5 días para evaluar tendencia.');

  // Avoid unused variable warning
  void _uniformidad;
  void edadSemanas;

  return recs;
}

function generateDidactico(
  birdType: BirdType,
  stage: ProductiveStage,
  uniformidad: number,
  _edadSemanas: number,
): string {
  if (birdType === 'broiler') {
    if (stage === 'iniciacion') {
      return `La uniformidad en la primera semana establece la base del crecimiento. Cada gramo ganado ahora se multiplica por 3-5× al final del ciclo. Calidad del pollito, temperatura y acceso a agua/alimento son los tres pilares de la uniformidad inicial.`;
    }
    if (stage === 'crianza') {
      return `En semanas 2-3 el broiler crece al máximo ritmo. Las aves que no comen suficiente ahora nunca alcanzarán el peso de mercado a tiempo, desperdiciando alimento y días de alojamiento.`;
    }
    if (stage === 'engorde' && _edadSemanas <= 5) {
      return `En engorde, la uniformidad determina la eficiencia económica. Un lote uniforme permite despoble en una sola fecha; uno desuniforme obliga tandas, incrementando costos fijos/kg producido.`;
    }
    return `En engorde final, la uniformidad es el mejor indicador de rentabilidad. Aves por debajo = kg no producidos; aves por encima = riesgo de ascitis y lesiones locomotoras. Meta: ≥85% de uniformidad.`;
  }

  // Ponedora
  if (stage === 'iniciacion' || stage === 'crianza') {
    return `La uniformidad en las primeras semanas predice el rendimiento futuro. Un lote con ≥85% a las 6 semanas tendrá un pico de producción más alto y sostenido. Aves que no alcanzan el peso tendrán desarrollo reproductivo retrasado.`;
  }
  if (stage === 'levante') {
    return `El levante (sem 7-16) es donde la uniformidad más impacta el futuro. Se requiere ≥80% para que las aves maduren sexualmente al mismo tiempo. Aves ligeras = huevos pequeños y menos huevos; aves pesadas = sobrepeso y prolapso.`;
  }
  if (stage === 'prepostura') {
    return `Pre-postura (sem 17-20) es la ventana crítica: el sistema reproductivo se activa y el peso debe estar en rango óptimo. Uniformidad ≥85% a las 20 sem = pico de producción concentrado y alto; desuniforme = pico bajo y prolongado.`;
  }

  // producción
  if (uniformidad >= 85) {
    return `Uniformidad ≥85% en producción indica que la mayoría de aves sigue su curva de postura óptima, permitiendo ajustar dieta e iluminación con precisión para todo el lote.`;
  }
  return `Baja uniformidad en producción es muy costosa: aves ligeras consumen sin producir; aves pesadas producen huevos de calidad variable. Cada punto <80% puede significar 2-3 huevos menos por ave en el ciclo. Corrección temprana es esencial.`;
}

// ─── Función principal del motor de diagnóstico ───────────────────

export interface DiagnosticInput {
  lineaGenetica: string;
  edadSemanas: number;
  promedio: number;
  desvEst: number;
  cv: number;
  uniformidad: number;
  limiteInf: number;
  limiteSup: number;
  countDebajo: number;
  countEncima: number;
  countDentro: number;
  totalAves: number;
}

export function generateDiagnostic(input: DiagnosticInput): DiagnosticResult {
  const {
    lineaGenetica,
    edadSemanas,
    promedio,
    cv,
    uniformidad,
    countDebajo,
    countEncima,
    countDentro,
    totalAves,
  } = input;

  const birdType = getBirdType(lineaGenetica);
  const level = getUniformityLevel(uniformidad);
  const { stage, label: stageLabel } = getProductiveStage(birdType, edadSemanas);
  const refs = edadSemanas > 0 ? getReferences(lineaGenetica) : null;
  const interpolatedRefs = refs ? interpolateRef(refs, edadSemanas) : null;

  // Título dinámico
  let title = '';
  if (level === 'excellent') {
    title = `Excelente Uniformidad — ${uniformidad.toFixed(1)}%`;
  } else if (level === 'regular') {
    title = `Uniformidad Regular — ${uniformidad.toFixed(1)}%`;
  } else {
    title = `Uniformidad Pobre — ${uniformidad.toFixed(1)}%`;
  }
  title += ` | ${stageLabel}`;

  return {
    title,
    level,
    birdType,
    stage,
    stageLabel,
    interpretacion: generateInterpretacion(
      level, uniformidad, cv, promedio, birdType, stage,
      countDebajo, countEncima, countDentro, totalAves,
    ),
    pesoComparacion: generatePesoComparacion(promedio, interpolatedRefs, edadSemanas, lineaGenetica),
    alertas: generateAlertas(
      promedio, interpolatedRefs, edadSemanas, birdType,
      cv, uniformidad, countDebajo, countEncima, totalAves,
    ),
    causas: generateCausas(
      level, birdType, stage,
      countDebajo, countEncima, cv, promedio, interpolatedRefs,
    ),
    recomendaciones: generateRecomendaciones(
      level, birdType, stage,
      countDebajo, countEncima, uniformidad, promedio, interpolatedRefs, edadSemanas,
    ),
    didactico: generateDidactico(birdType, stage, uniformidad, edadSemanas),
  };
}

// ─── API pública para otros módulos (análisis estadístico) ────────

/**
 * Líneas cuyos datos de referencia son APROXIMADOS (sin documento oficial
 * auditado). La UI debe mostrar advertencia al usarlas.
 */
export const APPROXIMATE_LINES: string[] = [
  'Broiler - Hubbard',
  'Ponedora - Hy-Line W-36',
];

export function isApproximateLine(lineaGenetica: string): boolean {
  return APPROXIMATE_LINES.includes(lineaGenetica);
}

/**
 * Peso de referencia (min/óptimo/max en gramos) para una línea y semana,
 * interpolado de las tablas oficiales. Devuelve null si no hay referencia.
 */
export function getTargetWeight(
  lineaGenetica: string,
  semana: number,
): { pesoMin: number; pesoOptimo: number; pesoMax: number } | null {
  if (!semana || semana <= 0) return null;
  const refs = getReferences(lineaGenetica);
  if (!refs) return null;
  return interpolateRef(refs, semana);
}

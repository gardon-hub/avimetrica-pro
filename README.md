# Avimétrica Pro

**Analítica de peso, uniformidad y desempeño avícola.**

**Úsala ahora, gratis y sin instalar nada:**
👉 **https://gardon-hub.github.io/avimetrica-pro/**

Se abre en cualquier navegador (computadora o teléfono) y puede **instalarse
como aplicación** desde el menú del navegador («Instalar» / «Agregar a pantalla
de inicio»). Funciona sin conexión después de la primera visita. **Todos los
datos se guardan en tu propio dispositivo**: nada se envía a ningún servidor.
Interfaz en español, inglés y portugués.

Aplicación web para registrar pesos individuales de aves, evaluar la uniformidad
del lote, compararlo con los objetivos de su línea genética y analizar la
distribución con herramientas estadísticas verificables. Incluye módulos de
clasificación de huevos (norma USDA) y de estadística general para docencia.

Desarrollada para docencia, investigación y prácticas profesionales supervisadas
en la Universidad Nacional de Agricultura, Honduras.

---

## Qué hace

**Captura de datos**
- Ingreso individual rápido, pegado masivo desde Excel e importación CSV/XLSX
- Conversión automática de unidades (g, kg, lb)
- Advertencias por muestra pequeña, pesos imposibles para la edad, redondeo
  excesivo o mezcla de unidades

**Análisis estadístico**
- Descriptiva completa: media, mediana, modas, cuartiles, percentiles, IQR,
  varianza y desviación estándar (muestral y poblacional), CV, error estándar,
  asimetría (G1) y curtosis (G2)
- Uniformidad con criterio configurable (±5 %, ±7.5 %, ±10 %, ±15 % o rango
  personalizado), claramente diferenciada de un intervalo de confianza
- Intervalo de confianza para la media
- Normalidad: Shapiro-Wilk (AS R94) y D'Agostino-Pearson, con histograma
  empírico, curva normal superpuesta, boxplot y gráfico Q-Q
- Valores atípicos por cuatro métodos (1.5×IQR, 3×IQR, |Z|>3 y Z modificada con
  MAD). Se marcan para revisión; **nunca se eliminan automáticamente**
- Distribuciones y probabilidades (normal, normal estándar, t de Student) con
  colas, área central, valores críticos y área sombreada
- Prueba t de una muestra contra el peso objetivo, con hipótesis bilateral y
  unilaterales, valor p, tamaño del efecto e interpretación zootécnica

**Historial y seguimiento**
- Lotes con múltiples pesajes fechados; edición individual de pesos con
  exclusión documentada (el dato se conserva, no se borra)
- Evolución del peso, CV y uniformidad frente a la curva objetivo
- Comparación entre dos pesajes o entre lotes, declarando el diseño
  (independiente, pareado o repetido) antes de ejecutar la prueba
- Control estadístico (cartas I-MR sobre CV, uniformidad y desviación vs.
  objetivo) con reglas de Nelson

**Reportes**
- Tres variantes: resumido para administración, técnico y académico con
  metodología y fórmulas
- Exportación a PDF (impresión) y Excel

**Interpretación**
- Modo académico local y determinista: explica qué se calculó, con qué fórmula,
  cómo se interpreta y qué errores comunes evitar

**Respaldo**
- Exportación de todos los datos (lotes, pesajes, muestreos y conjuntos) a un
  archivo `.json`, y restauración en este u otro dispositivo

---

## Rigor estadístico

Los cálculos se ejecutan localmente con funciones deterministas, sin depender de
servicios externos. Decisiones documentadas en el código:

- **Desviación estándar muestral (n−1) por defecto.** El pesaje es una muestra
  del lote; la versión poblacional (÷n) solo se ofrece cuando se declara haber
  pesado la población completa.
- **La banda de uniformidad ±X % no es un intervalo de confianza.** Describe la
  dispersión de las aves; el IC describe la incertidumbre sobre la media.
- **Nunca se afirma que "las medias son iguales" cuando p ≥ α**, solo que no hay
  evidencia suficiente.
- **No se grafica una carta X̄ sobre el peso crudo.** En aves en crecimiento la
  media tiene tendencia natural y violaría el supuesto de proceso estable; se
  controlan magnitudes estables entre pesajes.
- **Los diagnósticos zootécnicos son prudentes:** presentan factores a
  investigar, no causas únicas, y separan hallazgos estadísticos de
  interpretación, causas posibles, recomendaciones y limitaciones.

81 pruebas automatizadas contrastan los resultados con valores de referencia de
R y SciPy, y verifican que reportes, gráficos y libros de Excel salgan
íntegros en los tres idiomas (`npm test`).

---

## Líneas genéticas

Pesos de referencia por edad para Cobb 500, Ross 308, Hubbard, Hy-Line Brown,
Hy-Line W-36, Lohmann Brown-Classic, Lohmann LSL-Lite, Dekalb Brown, Dekalb
White, Nick Brown y Super Nick.

La sección **Fuentes técnicas** de la aplicación indica, para cada línea, el
documento de origen y si el valor es **oficial** o **aproximado**. Las líneas sin
guía oficial auditada muestran una advertencia visible y no se presentan como
datos oficiales.

> Las guías de manejo de las casas genéticas son documentos con derechos de autor
> y **no se incluyen en este repositorio**. Solo se almacenan las tablas de pesos
> extraídas y su procedencia.

---

## Uso y desarrollo local

Para **usarla** no hace falta instalar nada: entra a
https://gardon-hub.github.io/avimetrica-pro/.

Para **desarrollarla** se requiere Node.js 20 o superior:

```bash
npm install
npm run dev
```

La aplicación queda en `http://localhost:3000`. No hay base de datos que
configurar: la persistencia vive en el navegador (IndexedDB).

### Comandos

```bash
npm run dev      # servidor de desarrollo
npm run build    # compilación de producción (incluye typecheck)
npm run lint     # ESLint
npm test         # batería estadística (Vitest)
```

---

## Tecnología

Next.js 16 (exportación estática) · React 19 · TypeScript · Tailwind CSS ·
shadcn/ui · Zustand · Dexie (IndexedDB) · next-intl · Vitest · SheetJS

Los datos se guardan en el navegador de cada usuario (IndexedDB) y **no se
envían a ningún servidor**. Los cálculos estadísticos también son locales.
La sección **Respaldo de datos** (en las tres rutas) exporta todo —lotes,
pesajes, muestreos y conjuntos— a un archivo `.json` y lo restaura en este
u otro dispositivo; la exportación a Excel de cada módulo sirve como salida
adicional para análisis externos.

---

## Autor

**Gustavo Alonso Ardón, MSc.** — candidato a Doctor
Profesor Investigador · Centro Integral de Aprendizaje Avícola (CIAA)
Facultad de Medicina Veterinaria y Zootecnia (FMVZ)
Universidad Nacional de Agricultura, Catacamas, Olancho, Honduras

ORCID: [0000-0002-1982-4507](https://orcid.org/0000-0002-1982-4507) ·
DOI: [10.5281/zenodo.22005611](https://doi.org/10.5281/zenodo.22005611)

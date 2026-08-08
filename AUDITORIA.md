# Auditoría técnica y estadística — Uniformidad en Aves Ardón

**Fecha:** 2026-08-07 · **Versión auditada:** 0.2.0 → **corregida en:** 0.3.0
**Ubicación del proyecto:** `C:\Users\gusta\Projects\uniformidad-aves-ardon`

---

## 1. Fortalezas encontradas

- Arquitectura clara y compacta: Next.js 16 + React 19 + TypeScript + Zustand
  (persistencia local) + Prisma/SQLite, componentes separados por responsabilidad.
- Datos de referencia genética extensos y trazados a documentos oficiales
  (worklog documenta el origen tabla por tabla; Nick Brown/Super Nick con 82
  semanas de producción, Lohmann con min/prom/max explícitos, etc.).
- Motor de diagnóstico (`diagnostic-engine.ts`) prudente en general, con etapas
  productivas correctas y comparación con rangos min/óptimo/max interpolados.
- Flujo de captura rápida bien resuelto para uso en granja (foco automático,
  Enter para agregar).
- Sesiones guardadas en SQLite funcionando (guardar/cargar/eliminar).

## 2. Problemas encontrados y su corrección

| # | Problema | Gravedad | Estado |
|---|----------|----------|--------|
| 1 | **SD poblacional (÷n) usada para muestras** sin documentar. Para pesajes de muestra corresponde la muestral (÷(n−1)). Con n pequeño subestimaba SD y CV. | Alta (estadística) | ✅ Corregido: muestral por defecto, poblacional disponible con casilla "censo" |
| 2 | `.env` apuntaba a ruta Linux del hosting original (`/home/z/...`): la BD no funcionaba en esta máquina. | Alta (técnica) | ✅ Corregido a ruta relativa; respaldo `db/custom.db.backup-2026-08-07` creado |
| 3 | `ignoreBuildErrors: true` ocultaba 5 errores reales de TypeScript. | Media | ✅ Eliminado; typecheck pasa limpio y forma parte del build |
| 4 | La única gráfica era una **curva normal teórica**, no la distribución empírica; podía ocultar bimodalidad y atípicos. | Alta (estadística) | ✅ Histograma real + boxplot + Q-Q añadidos; la curva teórica se mantiene como opción superpuesta |
| 5 | Etiquetas "±10%" cableadas en gráfica, tarjetas y reporte. | Baja | ✅ Criterio configurable (±5/7.5/10/15/personalizado) reflejado en toda la UI |
| 6 | Sin pruebas automatizadas de ningún cálculo. | Alta | ✅ 37 pruebas unitarias (vitest) con valores de referencia verificados por integración numérica independiente |
| 7 | Scripts de npm dependían de bash/bun (`tee`, `cp`, `bun`) — rotos en Windows. | Media | ✅ Simplificados a `next dev/build/start` |
| 8 | Comparación muerta en `diagnostic-engine.ts` (level ≠ 'excellent' tras retorno temprano). | Baja | ✅ Limpiada |
| 9 | Dependencia `z-ai-web-dev-sdk` declarada pero sin ningún uso en `src/`. | Baja | ⚠️ Documentado (se puede retirar; no se eliminó para no tocar el lockfile más de lo necesario) |
| 10 | Sesiones (`FlockSession`) guardan pesos como JSON string: suficiente hoy, insuficiente para historial multi-pesaje/auditoría. | Media | ⏳ Pendiente (Fase 5): rediseño con migración segura |

## 3. Riesgos estadísticos identificados (y mitigación aplicada)

- **Confusión banda de uniformidad ↔ intervalo de confianza:** ahora la UI dice
  explícitamente que ±X% es una banda descriptiva y muestra el IC 95% aparte.
- **Diagnósticos con afirmaciones fuertes:** el motor existente usa lenguaje
  razonable; las funciones nuevas (prueba t, normalidad) redactan conclusiones
  con "no se encontró evidencia suficiente…" y nunca "las medias son iguales".
- **Muestras pequeñas:** advertencias automáticas con n<10 y n<30, y la prueba
  de normalidad avisa que con n<20 es poco confiable.
- **Atípicos:** se marcan (1.5×IQR, 3×IQR, |Z|>3, Z-modificada/MAD) pero nunca
  se eliminan; la exclusión es temporal, visible y comparativa.
- **Líneas sin datos oficiales:** Hubbard y Hy-Line W-36 quedan expuestas como
  `APPROXIMATE_LINES` y la UI muestra "⚠️ datos aproximados" al usarlas.

## 4. Verificación de cálculos (resumen)

- Batería de 37 pruebas (`tests/statistics.test.ts`), todas en verde.
- Valores contrastados de forma independiente (integración de Simpson con
  200,000 subintervalos para la CDF t; serie de Taylor de erf para la normal):
  - `normalInv(0.95) = 1.6448536269…` ✓ (criterio de aceptación Z≈1.645)
  - `normalInv(0.975) = 1.9599639845…` ✓
  - `tInv(0.975, 10) = 2.2281388520…` ✓
  - Prueba t completa contrastada dígito a dígito (t=−1.8733009961, p=0.0938035232).
  - G1/G2 verificadas con derivación manual exacta del caso clásico {2,4,4,4,5,5,7,9}.
- Verificación funcional en navegador con lote de 30 pesos + 1 atípico:
  histograma FD (16 clases), K²=58.08 (normalidad rechazada, correcto con el
  atípico), atípico marcado por 3 métodos, t crítico bilateral ±2.045 (gl=29) ✓.

## 5. Decisiones estadísticas documentadas

1. **SD/varianza:** muestral (n−1) por defecto; poblacional solo si el usuario
   declara censo. Referencia: corrección de Bessel.
2. **Percentiles:** método R-7 (interpolación lineal; el de Excel/R/NumPy).
   Hyndman & Fan (1996), tipo 7.
3. **Asimetría/curtosis:** estimadores ajustados G1/G2 (Joanes & Gill 1998,
   tipo 2 — los que reportan Minitab/SPSS/Excel).
4. **Posiciones Q-Q:** Blom, (i−3/8)/(n+1/4) — la de Minitab.
5. **Normalidad:** D'Agostino-Pearson K² (D'Agostino 1970; Anscombe & Glynn
   1983). Shapiro-Wilk NO se implementó todavía: exigiría coeficientes tabulados
   para ser exacta y se prefirió no incluir una versión dudosa.
6. **Atípicos:** Tukey 1.5/3×IQR; Z clásica >3; Z modificada con MAD >3.5
   (Iglewicz & Hoaglin 1993).
7. **Distribuciones:** erfc de precisión doble (Chebyshev, NR3), inversa normal
   de Acklam + paso de Halley (error ≈ máquina), t vía beta incompleta
   regularizada (Lentz), cuantiles t por Newton+bisección (tol. 1e-13).
8. **Redondeo:** solo en presentación; los módulos calculan en doble precisión.

## 6. Plan por fases (estado)

- **Fase 1 — Auditoría y correcciones: COMPLETADA** (esta entrega).
- **Fase 2 — Descriptiva: COMPLETADA** (tabla completa, histograma real,
  boxplot, Q-Q, atípicos, IC, proporciones ±X%).
- **Fase 3 — Distribuciones: COMPLETADA** (normal lote/manual/estándar y t;
  colas derecha/izquierda/ambas/central; por probabilidad o por X; valores
  críticos; área sombreada; explicación en lenguaje natural).
- **Fase 4 — Inferencia: COMPLETADA** (t de una muestra vs. objetivo o μ₀
  manual; bilateral/unilaterales; 90/95/99%; t, gl, p, IC, d de Cohen; región
  crítica graficada; advertencias de supuestos).
- **Fase 5 — Datos e historial: COMPLETADA** (2026-08-07, v0.4.0):
  - Nuevo esquema Prisma aditivo: `Lote` (código, granja, galpón, tipo de ave,
    línea, sexo, tamaño estimado) → `WeighSession` (fecha, edad, método de
    muestreo, responsable, criterio, versión de app y de datos de referencia)
    → `BirdWeight` (peso individual en gramos, orden, exclusión documentada).
    `FlockSession` legado intacto; respaldos previos a la migración en `db/`.
    Decisión: granja/galpón como texto en el lote (no tablas propias) por ser
    app local mono-usuario; migrar a catálogos es directo si hiciera falta.
  - API `/api/lotes` y `/api/pesajes` (crear/listar/eliminar, cascada).
    Las fechas solo-día se anclan a mediodía local (corrige el retroceso de un
    día en zonas UTC−n).
  - Prueba t de dos muestras (Welch) y pareada en `statistics/inference.ts`,
    contrastadas por integración numérica independiente (41 pruebas en total).
  - UI "Historial de lotes": crear lote, guardar el pesaje actual con
    advertencias previas (n<30, muestra <2% del lote, fecha anterior al último
    pesaje, línea distinta a la del lote, exceso de valores repetidos),
    recargar un pesaje al editor, eliminar con confirmación.
  - Pestaña "Evolución": media vs. curva objetivo de la línea, uniformidad y
    CV por fecha, tabla de ganancia (g/día) con advertencia de que se calcula
    entre muestras distintas.
  - Pestaña "Comparar": obliga a declarar el diseño (independientes /
    pareadas / repeticiones / no sé) y explica la diferencia; Welch para
    independientes, t pareada para pareadas (exige n igual), y advertencia de
    independencia dudosa para repeticiones del mismo grupo.
  - Importación de archivo CSV/TXT/XLSX con selección de columna (preferencia
    por encabezados tipo "peso"), conversión g/kg/lb y validación previa.
- **Fase 6 — Reportes: COMPLETADA** (2026-08-07, v0.5.0):
  - Tres variantes: resumido (1 página, administración), técnico (análisis
    completo: descriptiva, normalidad, atípicos, prueba t vs. objetivo,
    histograma, tabla de pesos, fuentes) y académico (técnico + sección de
    metodología con fórmulas, referencias y errores comunes a evitar).
  - Arquitectura: `report-data.ts` ensambla TODOS los resultados (las
    plantillas solo formatean, nunca calculan), `report-charts.ts` genera los
    SVG sin depender del DOM, `report-html.ts` produce el documento completo.
    La vista previa (iframe con srcDoc) es exactamente el HTML que se imprime
    — se eliminó la duplicación de plantilla del generador anterior
    (report-generator.tsx borrado).
  - Exportación a Excel (`export-excel.ts`, SheetJS): hojas Resumen,
    Descriptiva y Pesos individuales con estado y marcas de atípico.
  - Limitaciones generadas automáticamente según los datos (n pequeño,
    muestreo no documentado o por conveniencia, línea con referencia
    aproximada, normalidad rechazada, atípicos presentes, sin edad).
  - Encabezado configurable (lote, granja, galpón, responsable, muestreo)
    persistido en el store; el reset del ensayo lo conserva a propósito.
  - Trazabilidad en cada reporte: versión de la app y de los datos de
    referencia, fuente de los estándares y advertencia de líneas aproximadas.
  - Pruebas: 45 en total (ensamblaje de datos, workbook de Excel y las tres
    plantillas).
- **Fase 7 — COMPLETADA** (2026-08-07, v0.6.0):
  - **Comparación entre lotes distintos:** la pestaña Comparar acepta pesajes
    de todos los lotes; entre lotes diferentes solo permite el diseño
    "independientes" (Welch) y advierte cuando las líneas genéticas difieren
    (la diferencia podría ser genética, no de manejo).
  - **Control estadístico (`statistics/spc.ts`):** constante c4 exacta por
    función gamma (verificada contra tabla: c4(2)=0.797885, c4(5)=0.939986,
    c4(10)=0.972659), carta X̄-S, carta de individuales I-MR (±2.66·MR̄) y
    reglas de Nelson 1-3, todo con pruebas unitarias (49 en total).
    Decisión de dominio: NO se grafica carta X̄ sobre peso crudo (en aves en
    crecimiento la media tiene tendencia natural); se controlan CV,
    uniformidad y desviación % vs. objetivo como cartas I-MR. Con menos de 8
    pesajes la herramienta explica por qué no es apropiada en lugar de
    dibujar límites poco confiables.
  - **Fuentes técnicas (`fuentes.ts` + panel):** tabla visible por línea con
    documento, origen del dato, estado oficial/aproximado y versión interna.
    Refleja EXACTAMENTE lo registrado en el worklog de extracción; donde no
    quedó anotado año/página se dice "no registrado" en vez de inventarlo.
  - **IA interpretativa (sección 21):** `academic-mode.ts` genera la
    explicación paso a paso LOCAL y determinista (qué se calculó, fórmula,
    resultado, interpretación, errores comunes) — funciona siempre, sin
    servicios externos. La ruta opcional `/api/interpret` (SDK oficial de
    Anthropic, modelo claude-opus-5) recibe un objeto de resultados YA
    calculados con un prompt que prohíbe inventar valores, exige separar
    hallazgos/interpretación/causas/limitaciones y prohíbe "aceptar H0";
    sin ANTHROPIC_API_KEY responde 503 y la app sigue funcionando.

## 6-bis. Pendientes menores — RESUELTOS (2026-08-07, v0.6.1)

- **Shapiro-Wilk (`statistics/shapiro-wilk.ts`):** algoritmo AS R94 de Royston
  (1995), el mismo de R y SciPy. Coeficientes de Blom con corrección
  polinómica; valor p exacto para n=3 y aproximaciones de Royston para el
  resto (3 ≤ n ≤ 5000). Validado con 4 pruebas nuevas (n=3 contra fórmula
  exacta, transformación p(W) en valores críticos de tabla, datos
  normales/exponenciales, degeneración segura). Se muestra junto a
  D'Agostino-Pearson en la pestaña de diagnóstico, el reporte, el Excel y el
  modo académico, con aviso si ambas pruebas discrepan al 5%. Total: 53 tests.
- **Edición individual de pesos históricos (`pesaje-editor.tsx` + `/api/pesos`):**
  desde el historial, botón de lápiz por pesaje abre un editor con las filas
  individuales: corregir gramos, registrar sector y **excluir/reincluir con
  motivo documentado** (la exclusión NO borra el dato — marca `excluido` y
  guarda `motivoExcl`, preservando la trazabilidad de la sección 11). Resumen
  estadístico en vivo. Verificado contra la BD (excluir con motivo → persiste;
  reincluir → limpia el motivo).
- **Modo oscuro completo:** `next-themes` con toggle claro/oscuro/sistema en
  el encabezado; colores de UI migrados a tokens del tema (foreground,
  muted-foreground, card, border) en las tarjetas, listas y diagnóstico. Los
  gráficos SVG usan fondo blanco fijo (tipo "papel" sobre la tarjeta) para que
  el texto y los ejes sean legibles en ambos temas. Verificado visualmente.

## 7. Cómo verificar

```bash
npm run typecheck   # 0 errores
npm run lint        # 0 errores
npm run test        # 37/37 pruebas
npm run build       # build de producción con typecheck
npm run dev         # http://localhost:3000
```

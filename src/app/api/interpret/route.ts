import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

/**
 * Asistencia de IA interpretativa (Fase 7 / sección 21).
 *
 * Reglas de diseño:
 * - Los CÁLCULOS se hacen siempre localmente; aquí solo se redacta una
 *   interpretación a partir de un objeto de resultados ya calculados.
 * - Si no hay ANTHROPIC_API_KEY configurada, la ruta responde 503 y la
 *   aplicación sigue funcionando con el modo académico local.
 * - El prompt prohíbe inventar valores y exige señalar limitaciones.
 */

const SYSTEM_PROMPT = `Eres el asistente de "Avimétrica Pro", una aplicación académica de analítica de peso, uniformidad y desempeño avícola (broilers y ponedoras) de la Universidad Nacional de Agricultura de Honduras.

Recibirás un objeto JSON con resultados estadísticos YA CALCULADOS por la aplicación (media, SD muestral, CV, uniformidad, IC, prueba t, normalidad, atípicos, limitaciones, etc.).

Reglas estrictas:
1. NUNCA inventes, recalcules ni "corrijas" valores numéricos: usa exactamente los del objeto. Si un dato no está en el objeto, di que no está disponible.
2. Separa con claridad: (a) hallazgos estadísticos, (b) interpretación zootécnica, (c) posibles factores a investigar, (d) limitaciones.
3. Redacción estadística correcta: nunca digas "se acepta H0" ni "las medias son iguales" cuando p ≥ α; di "no se encontró evidencia suficiente". La banda de uniformidad ±X% NO es un intervalo de confianza.
4. Prudencia zootécnica: no atribuyas la desuniformidad a una sola causa; presenta factores posibles (comedero, agua, densidad, temperatura, salud, muestreo) como hipótesis a verificar en campo.
5. Incluye SIEMPRE las limitaciones del análisis (vienen en el objeto) y cierra indicando que la interpretación no sustituye el criterio del profesional a cargo.
6. Responde en español, en tono técnico pero claro, en 250-450 palabras, con subtítulos en Markdown.`;

const ACADEMIC_ADDENDUM = `

MODO ACADÉMICO: además, explica paso a paso, para estudiantes:
- qué se calculó y con qué fórmula (media, SD con n−1, CV, EEM, IC con t, estadístico t, valor p),
- qué significa cada resultado con los números concretos del objeto,
- y qué errores comunes de interpretación deben evitarse.
Extiende hasta 700 palabras si hace falta.`;

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        available: false,
        message:
          'El asistente de IA no está configurado. Define ANTHROPIC_API_KEY en el archivo .env y reinicia la aplicación. Mientras tanto, el modo académico local ofrece la explicación paso a paso.',
      },
      { status: 503 },
    );
  }

  try {
    const body = await request.json();
    const { resumen, modo } = body as { resumen: unknown; modo?: 'interpretacion' | 'academico' };
    if (!resumen || typeof resumen !== 'object') {
      return NextResponse.json({ error: 'Se requiere el objeto "resumen" con los resultados calculados' }, { status: 400 });
    }

    const client = new Anthropic();
    const system = modo === 'academico' ? SYSTEM_PROMPT + ACADEMIC_ADDENDUM : SYSTEM_PROMPT;

    const response = await client.messages.create({
      model: 'claude-opus-5',
      max_tokens: 4096,
      system,
      messages: [
        {
          role: 'user',
          content: `Resultados calculados del pesaje (JSON):\n\`\`\`json\n${JSON.stringify(resumen, null, 2)}\n\`\`\`\nRedacta la interpretación.`,
        },
      ],
    });

    if (response.stop_reason === 'refusal') {
      return NextResponse.json(
        { available: true, error: 'El modelo declinó generar la interpretación. Usa el modo académico local.' },
        { status: 502 },
      );
    }

    const texto = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n');

    return NextResponse.json({ available: true, texto, modelo: response.model });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return NextResponse.json(
        { available: false, message: 'La clave ANTHROPIC_API_KEY configurada no es válida.' },
        { status: 503 },
      );
    }
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { available: true, error: 'Límite de uso alcanzado; intenta de nuevo en unos minutos.' },
        { status: 429 },
      );
    }
    if (error instanceof Anthropic.APIConnectionError) {
      return NextResponse.json(
        { available: true, error: 'Sin conexión con el servicio de IA. El modo académico local sigue disponible.' },
        { status: 502 },
      );
    }
    console.error('Error en /api/interpret:', error);
    return NextResponse.json({ available: true, error: 'Error inesperado del asistente de IA.' }, { status: 500 });
  }
}

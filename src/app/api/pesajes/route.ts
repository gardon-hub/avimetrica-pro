import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { REFERENCE_DATA_VERSION } from '@/lib/diagnostic-engine';
import { APP_VERSION } from '@/lib/report-data';

/**
 * GET ?id=<pesajeId>      → un pesaje con todos sus pesos
 * GET ?loteId=<loteId>    → pesajes de un lote (con pesos incluidos, ordenados)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const loteId = searchParams.get('loteId');

    if (id) {
      const pesaje = await db.weighSession.findUnique({
        where: { id },
        include: { pesos: { orderBy: { orden: 'asc' } }, lote: true },
      });
      if (!pesaje) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
      return NextResponse.json(pesaje);
    }

    if (loteId) {
      const pesajes = await db.weighSession.findMany({
        where: { loteId },
        orderBy: { fecha: 'asc' },
        include: { pesos: { orderBy: { orden: 'asc' } } },
      });
      return NextResponse.json(pesajes);
    }

    if (searchParams.get('all') === '1') {
      // Todos los pesajes con su lote — para comparaciones entre lotes
      const pesajes = await db.weighSession.findMany({
        orderBy: { fecha: 'asc' },
        include: {
          pesos: { orderBy: { orden: 'asc' } },
          lote: { select: { id: true, codigo: true, lineaGenetica: true, galpon: true, granja: true } },
        },
      });
      return NextResponse.json(pesajes);
    }

    return NextResponse.json({ error: 'id, loteId o all=1 requerido' }, { status: 400 });
  } catch (error) {
    console.error('Error fetching pesajes:', error);
    return NextResponse.json({ error: 'Failed to fetch pesajes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      loteId, fecha, edadSemanas, edadDias, unidadOriginal, metodoMuestreo,
      numSectores, responsable, observaciones, criterioPct, pesos,
    } = body;

    if (!loteId) return NextResponse.json({ error: 'loteId requerido' }, { status: 400 });
    if (!Array.isArray(pesos) || pesos.length === 0) {
      return NextResponse.json({ error: 'Se requiere al menos un peso' }, { status: 400 });
    }
    const pesosNum = pesos.map((p: unknown) => Number(p)).filter((p: number) => Number.isFinite(p) && p > 0);
    if (pesosNum.length === 0) {
      return NextResponse.json({ error: 'Ningún peso válido' }, { status: 400 });
    }

    const pesaje = await db.weighSession.create({
      data: {
        loteId,
        // Una fecha solo-día ("YYYY-MM-DD") se ancla al mediodía local para
        // que no retroceda un día al mostrarse en zonas horarias UTC−n
        fecha: fecha
          ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(String(fecha)) ? `${fecha}T12:00:00` : fecha)
          : new Date(),
        edadSemanas: Number.isFinite(parseFloat(edadSemanas)) ? parseFloat(edadSemanas) : null,
        edadDias: Number.isFinite(parseInt(edadDias, 10)) ? parseInt(edadDias, 10) : null,
        unidadOriginal: unidadOriginal || 'g',
        metodoMuestreo: metodoMuestreo || null,
        numSectores: Number.isFinite(parseInt(numSectores, 10)) ? parseInt(numSectores, 10) : null,
        responsable: responsable?.trim() || null,
        observaciones: observaciones?.trim() || null,
        criterioPct: Number.isFinite(parseFloat(criterioPct)) ? parseFloat(criterioPct) : 10,
        appVersion: APP_VERSION,
        refDataVersion: REFERENCE_DATA_VERSION,
        pesos: {
          create: pesosNum.map((gramos: number, i: number) => ({ orden: i + 1, gramos })),
        },
      },
      include: { pesos: true },
    });
    // toca updatedAt del lote para que suba en el listado
    await db.lote.update({ where: { id: loteId }, data: { updatedAt: new Date() } });
    return NextResponse.json(pesaje);
  } catch (error) {
    console.error('Error creating pesaje:', error);
    return NextResponse.json({ error: 'Failed to create pesaje' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });
    await db.weighSession.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting pesaje:', error);
    return NextResponse.json({ error: 'Failed to delete pesaje' }, { status: 500 });
  }
}

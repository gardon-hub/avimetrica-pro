import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/** Lotes con resumen de sus pesajes (conteo y última fecha). */
export async function GET() {
  try {
    const lotes = await db.lote.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        pesajes: {
          orderBy: { fecha: 'desc' },
          select: { id: true, fecha: true, edadSemanas: true, _count: { select: { pesos: true } } },
        },
      },
    });
    return NextResponse.json(lotes);
  } catch (error) {
    console.error('Error fetching lotes:', error);
    return NextResponse.json({ error: 'Failed to fetch lotes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { codigo, granja, galpon, tipoAve, lineaGenetica, sexo, tamanoEstimado, observaciones } = body;
    if (!codigo || typeof codigo !== 'string' || !codigo.trim()) {
      return NextResponse.json({ error: 'El código del lote es obligatorio' }, { status: 400 });
    }
    const lote = await db.lote.create({
      data: {
        codigo: codigo.trim(),
        granja: granja?.trim() || null,
        galpon: galpon?.trim() || null,
        tipoAve: tipoAve || 'broiler',
        lineaGenetica: lineaGenetica || 'Broiler - Cobb',
        sexo: sexo || 'mixto',
        tamanoEstimado: Number.isFinite(parseInt(tamanoEstimado, 10)) ? parseInt(tamanoEstimado, 10) : null,
        observaciones: observaciones?.trim() || null,
      },
    });
    return NextResponse.json(lote);
  } catch (error) {
    console.error('Error creating lote:', error);
    return NextResponse.json({ error: 'Failed to create lote' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id requerido' }, { status: 400 });
    }
    // onDelete: Cascade elimina pesajes y pesos asociados
    await db.lote.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting lote:', error);
    return NextResponse.json({ error: 'Failed to delete lote' }, { status: 500 });
  }
}

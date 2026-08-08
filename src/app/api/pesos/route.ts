import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Edición individual de pesos de un pesaje histórico (BirdWeight).
 *
 * PATCH ?id=<birdWeightId>  → editar gramos, sector, exclusión y motivo.
 *   La exclusión NO borra el registro: marca `excluido` y guarda `motivoExcl`,
 *   preservando la trazabilidad (sección 11 del prompt).
 * DELETE ?id=<birdWeightId> → borrado real (solo para corregir un duplicado
 *   accidental; se prefiere excluir sobre borrar).
 */

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (body.gramos !== undefined) {
      const g = Number(body.gramos);
      if (!Number.isFinite(g) || g <= 0) {
        return NextResponse.json({ error: 'gramos debe ser un número positivo' }, { status: 400 });
      }
      data.gramos = g;
    }
    if (body.sector !== undefined) {
      data.sector = typeof body.sector === 'string' && body.sector.trim() ? body.sector.trim() : null;
    }
    if (body.excluido !== undefined) {
      data.excluido = Boolean(body.excluido);
      // Al reincluir, se limpia el motivo; al excluir se conserva el enviado
      if (!body.excluido) data.motivoExcl = null;
    }
    if (body.motivoExcl !== undefined) {
      data.motivoExcl = typeof body.motivoExcl === 'string' && body.motivoExcl.trim() ? body.motivoExcl.trim() : null;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 });
    }

    const updated = await db.birdWeight.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating peso:', error);
    return NextResponse.json({ error: 'Failed to update peso' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });
    await db.birdWeight.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting peso:', error);
    return NextResponse.json({ error: 'Failed to delete peso' }, { status: 500 });
  }
}

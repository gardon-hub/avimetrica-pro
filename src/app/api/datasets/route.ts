import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Conjuntos de datos del Modo Estadística (Fase 10).
 * Permiten al docente preparar ejercicios, reutilizarlos entre clases y
 * compararlos, en vez de depender del navegador de cada equipo.
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const ds = await db.dataset.findUnique({ where: { id } });
      if (!ds) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
      return NextResponse.json(ds);
    }

    // Listado ligero: sin los valores, que pueden ser largos.
    // Filtrado por dominio para que cada módulo vea solo sus conjuntos.
    const dominio = searchParams.get('dominio');
    const datasets = await db.dataset.findMany({
      where: dominio ? { dominio } : undefined,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true, nombre: true, descripcion: true, dominio: true,
        variableLabel: true, variableUnit: true, decimales: true,
        origen: true, responsable: true, fecha: true,
        createdAt: true, updatedAt: true,
      },
    });
    return NextResponse.json(datasets);
  } catch (error) {
    console.error('Error fetching datasets:', error);
    return NextResponse.json({ error: 'Failed to fetch datasets' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      nombre, descripcion, dominio, variableLabel, variableUnit, decimales,
      valores, presetId, scheme, origen, responsable, fecha,
      observaciones, muHipotetica,
    } = body;

    if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
      return NextResponse.json({ error: 'El nombre del conjunto es obligatorio' }, { status: 400 });
    }
    if (!Array.isArray(valores)) {
      return NextResponse.json({ error: 'valores debe ser un arreglo' }, { status: 400 });
    }
    const nums = valores.map(Number).filter((v: number) => Number.isFinite(v));

    const ds = await db.dataset.create({
      data: {
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || null,
        dominio: dominio === 'huevos' || dominio === 'aves' ? dominio : 'generico',
        variableLabel: variableLabel?.trim() || 'Variable',
        variableUnit: variableUnit?.trim() || '',
        decimales: Number.isFinite(parseInt(decimales, 10)) ? parseInt(decimales, 10) : 2,
        valores: JSON.stringify(nums),
        presetId: presetId || null,
        scheme: scheme ? JSON.stringify(scheme) : null,
        origen: origen?.trim() || null,
        responsable: responsable?.trim() || null,
        fecha: fecha ? new Date(fecha) : null,
        observaciones: observaciones?.trim() || null,
        muHipotetica: Number.isFinite(parseFloat(muHipotetica)) ? parseFloat(muHipotetica) : null,
      },
    });
    return NextResponse.json(ds);
  } catch (error) {
    console.error('Error creating dataset:', error);
    return NextResponse.json({ error: 'Failed to create dataset' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });
    await db.dataset.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting dataset:', error);
    return NextResponse.json({ error: 'Failed to delete dataset' }, { status: 500 });
  }
}

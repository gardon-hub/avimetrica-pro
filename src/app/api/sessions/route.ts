import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const sessions = await db.flockSession.findMany({
      orderBy: { updatedAt: 'desc' },
    });
    return NextResponse.json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lineaGenetica, edadSemanas, pesos } = body;

    const session = await db.flockSession.create({
      data: {
        lineaGenetica: lineaGenetica || 'Broiler - Cobb',
        edadSemanas: edadSemanas ? parseInt(edadSemanas) : null,
        pesos: JSON.stringify(pesos || []),
      },
    });

    return NextResponse.json(session);
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      await db.flockSession.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }

    await db.flockSession.deleteMany();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting sessions:', error);
    return NextResponse.json({ error: 'Failed to delete sessions' }, { status: 500 });
  }
}

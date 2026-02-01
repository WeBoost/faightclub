import { NextRequest, NextResponse } from 'next/server';
import { seedBattles } from '@/lib/seed';

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-seed-secret');
  
  if (!process.env.SEED_SECRET) {
    return NextResponse.json(
      { error: 'SEED_SECRET not configured' },
      { status: 500 }
    );
  }

  if (secret !== process.env.SEED_SECRET) {
    return NextResponse.json(
      { error: 'Invalid seed secret' },
      { status: 401 }
    );
  }

  try {
    const result = await seedBattles();
    
    if (result.skipped) {
      return NextResponse.json({
        message: 'Skipped - battles already exist',
        seeded: 0,
      });
    }

    return NextResponse.json({
      message: 'Seeding complete',
      seeded: result.seeded,
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json(
      { error: 'Seeding failed' },
      { status: 500 }
    );
  }
}

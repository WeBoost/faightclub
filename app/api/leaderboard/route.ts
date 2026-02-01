import { NextResponse } from 'next/server';
import { supabasePublic } from '@/lib/supabase-public';

export async function GET() {
  try {
    const { data, error } = await supabasePublic
      .from('leaderboard')
      .select('*')
      .order('wins', { ascending: false })
      .order('avg_score', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Failed to fetch leaderboard:', error);
      return NextResponse.json({ leaderboard: [] });
    }

    return NextResponse.json({ leaderboard: data || [] });
  } catch (err) {
    console.error('Leaderboard fetch error:', err);
    return NextResponse.json({ leaderboard: [] });
  }
}

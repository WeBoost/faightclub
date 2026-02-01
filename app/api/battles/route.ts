import { NextResponse } from 'next/server';
import { supabasePublic } from '@/lib/supabase-public';

export async function GET() {
  try {
    const { data, error } = await supabasePublic
      .from('battles')
      .select('id, prompt, agent_a_name, agent_b_name, winner, score, created_at')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Failed to fetch battles:', error);
      return NextResponse.json({ battles: [] });
    }

    return NextResponse.json({ battles: data || [] });
  } catch (err) {
    console.error('Battles fetch error:', err);
    return NextResponse.json({ battles: [] });
  }
}

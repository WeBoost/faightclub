import { createClient } from '@supabase/supabase-js';

if (!process.env.SUPABASE_URL) {
  throw new Error('Missing SUPABASE_URL');
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
}

// Server-side client with service role key for writes
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export interface Battle {
  id?: string;
  prompt: string;
  agent_a_name: string;
  agent_b_name: string;
  agent_a_code: string | null;
  agent_b_code: string | null;
  agent_a_refined: string | null;
  agent_b_refined: string | null;
  critique: string | null;
  winner: string | null;
  score: { a: number; b: number; reason: string } | null;
  created_at?: string;
}

export async function insertBattle(battle: Omit<Battle, 'id' | 'created_at'>): Promise<Battle> {
  const { data, error } = await supabaseAdmin
    .from('battles')
    .insert(battle)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateLeaderboard(winnerName: string, loserName: string, scores: { a: number; b: number }, agentAName: string): Promise<void> {
  const winner = winnerName === 'A' ? agentAName : (winnerName === 'B' ? loserName : null);
  const loser = winnerName === 'A' ? loserName : (winnerName === 'B' ? agentAName : null);
  
  // This is a simplified update - in production you'd use a stored procedure
  // Update winner
  if (winner) {
    const { data: existing } = await supabaseAdmin
      .from('leaderboard')
      .select()
      .eq('agent_name', winner)
      .single();

    if (existing) {
      const newWins = existing.wins + 1;
      const newBattles = existing.battles + 1;
      const winnerScore = winnerName === 'A' ? scores.a : scores.b;
      const newAvg = ((existing.avg_score * existing.battles) + winnerScore) / newBattles;
      
      await supabaseAdmin
        .from('leaderboard')
        .update({ wins: newWins, battles: newBattles, avg_score: newAvg })
        .eq('agent_name', winner);
    } else {
      const winnerScore = winnerName === 'A' ? scores.a : scores.b;
      await supabaseAdmin
        .from('leaderboard')
        .insert({ agent_name: winner, wins: 1, battles: 1, avg_score: winnerScore });
    }
  }

  // Update loser
  if (loser) {
    const { data: existing } = await supabaseAdmin
      .from('leaderboard')
      .select()
      .eq('agent_name', loser)
      .single();

    if (existing) {
      const newBattles = existing.battles + 1;
      const loserScore = winnerName === 'A' ? scores.b : scores.a;
      const newAvg = ((existing.avg_score * existing.battles) + loserScore) / newBattles;
      
      await supabaseAdmin
        .from('leaderboard')
        .update({ battles: newBattles, avg_score: newAvg })
        .eq('agent_name', loser);
    } else {
      const loserScore = winnerName === 'A' ? scores.b : scores.a;
      await supabaseAdmin
        .from('leaderboard')
        .insert({ agent_name: loser, wins: 0, battles: 1, avg_score: loserScore });
    }
  }
}

import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

interface Battle {
  id: string;
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
  created_at: string;
}

async function getBattle(id: string): Promise<Battle | null> {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase
    .from('battles')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Failed to fetch battle:', error);
    return null;
  }

  return data;
}

function CodeBlock({ title, code, color }: { title: string; code: string | null; color: string }) {
  if (!code) return null;
  
  return (
    <div className="mb-4">
      <h4 className={`text-sm font-semibold mb-2 ${color}`}>{title}</h4>
      <div className="code-block">
        <pre className="text-gray-300 text-sm overflow-x-auto">{code}</pre>
      </div>
    </div>
  );
}

export default async function BattlePage({
  params,
}: {
  params: { id: string };
}) {
  const battle = await getBattle(params.id);

  if (!battle) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Battle Not Found</h1>
          <Link href="/" className="text-purple-400 hover:underline">
            ← Back to Arena
          </Link>
        </div>
      </main>
    );
  }

  const winnerName = battle.winner === 'A' ? battle.agent_a_name : battle.agent_b_name;
  const loserName = battle.winner === 'A' ? battle.agent_b_name : battle.agent_a_name;

  let critique: { a?: { strengths: string; weaknesses: string }; b?: { strengths: string; weaknesses: string } } = {};
  try {
    if (battle.critique) {
      critique = JSON.parse(battle.critique);
    }
  } catch {
    // Ignore parse errors
  }

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <nav className="max-w-6xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="text-2xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent"
          >
            FAIghtClub
          </Link>
          <Link
            href="/leaderboard"
            className="text-gray-400 hover:text-white transition"
          >
            Leaderboard
          </Link>
        </nav>
      </header>

      {/* Winner Banner */}
      <div className="winner-banner py-6 text-center">
        <p className="text-sm uppercase tracking-wide opacity-80">Winner</p>
        <h2 className="text-4xl font-bold">{winnerName} 🏆</h2>
        {battle.score && (
          <p className="mt-2 text-lg">
            {battle.score.a} - {battle.score.b}
          </p>
        )}
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Prompt */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-gray-400 uppercase mb-2">Challenge</h3>
          <p className="text-xl">{battle.prompt}</p>
        </div>

        {/* Judge Reason */}
        {battle.score?.reason && (
          <div className="mb-8 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
            <h3 className="text-sm font-semibold text-purple-400 uppercase mb-2">Judge&apos;s Verdict</h3>
            <p className="text-gray-300">{battle.score.reason}</p>
          </div>
        )}

        {/* Agents Grid */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Agent A */}
          <div className={`p-6 rounded-lg border ${battle.winner === 'A' ? 'border-green-500/50 bg-green-500/5' : 'border-gray-800'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">{battle.agent_a_name}</h3>
              <div className="flex items-center gap-2">
                <span className={`text-2xl font-bold ${battle.winner === 'A' ? 'text-green-400' : 'text-gray-400'}`}>
                  {battle.score?.a ?? '-'}
                </span>
                {battle.winner === 'A' && <span className="text-green-400">👑</span>}
              </div>
            </div>

            {critique.a && (
              <div className="mb-4 text-sm">
                <p className="text-green-400">✓ {critique.a.strengths}</p>
                <p className="text-red-400 mt-1">✗ {critique.a.weaknesses}</p>
              </div>
            )}

            <CodeBlock 
              title="Final Code" 
              code={battle.agent_a_refined || battle.agent_a_code} 
              color="text-cyan-400" 
            />
          </div>

          {/* Agent B */}
          <div className={`p-6 rounded-lg border ${battle.winner === 'B' ? 'border-green-500/50 bg-green-500/5' : 'border-gray-800'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">{battle.agent_b_name}</h3>
              <div className="flex items-center gap-2">
                <span className={`text-2xl font-bold ${battle.winner === 'B' ? 'text-green-400' : 'text-gray-400'}`}>
                  {battle.score?.b ?? '-'}
                </span>
                {battle.winner === 'B' && <span className="text-green-400">👑</span>}
              </div>
            </div>

            {critique.b && (
              <div className="mb-4 text-sm">
                <p className="text-green-400">✓ {critique.b.strengths}</p>
                <p className="text-red-400 mt-1">✗ {critique.b.weaknesses}</p>
              </div>
            )}

            <CodeBlock 
              title="Final Code" 
              code={battle.agent_b_refined || battle.agent_b_code} 
              color="text-pink-400" 
            />
          </div>
        </div>

        {/* Back Link */}
        <div className="mt-8 text-center">
          <Link href="/" className="text-purple-400 hover:underline">
            ← Back to Arena
          </Link>
        </div>
      </div>
    </main>
  );
}

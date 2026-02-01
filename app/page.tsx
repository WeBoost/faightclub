'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

interface Battle {
  id: string;
  prompt: string;
  agent_a_name: string;
  agent_b_name: string;
  winner: string;
  score: { a: number; b: number; reason: string } | null;
  created_at: string;
}

interface StageEvent {
  stage: string;
  data?: string;
  agentName?: string;
}

const STAGES = [
  'entering',
  'generating_a',
  'generating_b',
  'refining_a',
  'refining_b',
  'critique',
  'judging',
  'winner',
];

const STAGE_LABELS: Record<string, string> = {
  entering: '⚔️ Entering Arena',
  generating_a: '🤖 Agent A Generating',
  generating_b: '🤖 Agent B Generating',
  refining_a: '✨ Refining A',
  refining_b: '✨ Refining B',
  critique: '📝 Critic Analyzing',
  judging: '⚖️ Judge Deciding',
  winner: '🏆 Winner Declared',
};

export default function HomePage() {
  const [prompt, setPrompt] = useState('');
  const [battles, setBattles] = useState<Battle[]>([]);
  const [running, setRunning] = useState(false);
  const [currentStage, setCurrentStage] = useState<string | null>(null);
  const [stageData, setStageData] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    fetchBattles();
  }, []);

  async function fetchBattles() {
    try {
      const res = await fetch('/api/battles');
      if (res.ok) {
        const data = await res.json();
        setBattles(data.battles || []);
      }
    } catch {
      // Ignore fetch errors for battles list
    }
  }

  function runBattle() {
    if (!prompt.trim() || running) return;
    if (prompt.length > 2000) {
      setError('Prompt too long (max 2000 characters)');
      return;
    }

    setRunning(true);
    setError(null);
    setCurrentStage(null);
    setStageData({});

    const es = new EventSource(`/api/run-battle?prompt=${encodeURIComponent(prompt)}`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const parsed: StageEvent = JSON.parse(event.data);
        setCurrentStage(parsed.stage);
        if (parsed.data) {
          setStageData((prev) => ({
            ...prev,
            [parsed.stage]: parsed.data!,
          }));
        }

        if (parsed.stage === 'winner') {
          es.close();
          setRunning(false);
          setPrompt('');
          fetchBattles();
        }
      } catch {
        // Ignore parse errors
      }
    };

    es.onerror = () => {
      es.close();
      setRunning(false);
      setError('Battle failed. Please try again.');
    };
  }

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <nav className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
            FAIghtClub
          </h1>
          <Link
            href="/leaderboard"
            className="text-gray-400 hover:text-white transition"
          >
            Leaderboard
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-16 text-center">
        <h2 className="text-5xl font-bold mb-4">
          AI Battle Arena
        </h2>
        <p className="text-xl text-gray-400 mb-8">
          Watch AI agents compete in real-time coding battles
        </p>

        {/* Input */}
        <div className="max-w-2xl mx-auto">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter a coding challenge... (e.g., 'Build a todo app in React')"
            className="w-full h-32 bg-gray-900 border border-gray-700 rounded-lg p-4 text-white resize-none focus:border-purple-500 focus:outline-none transition"
            disabled={running}
            maxLength={2000}
          />
          <div className="flex justify-between items-center mt-2">
            <span className="text-sm text-gray-500">
              {prompt.length}/2000
            </span>
            <button
              onClick={runBattle}
              disabled={running || !prompt.trim()}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {running ? 'Battle in Progress...' : '⚔️ Run Battle'}
            </button>
          </div>
          {error && (
            <p className="mt-2 text-red-400 text-sm">{error}</p>
          )}
        </div>

        {/* Live Battle Status */}
        {running && currentStage && (
          <div className="mt-8 p-6 bg-gray-900/50 border border-purple-500/50 rounded-lg stage-active">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse" />
              <span className="text-lg font-semibold">
                {STAGE_LABELS[currentStage] || currentStage}
              </span>
            </div>
            
            {/* Stage Progress */}
            <div className="flex justify-center gap-2 mb-4">
              {STAGES.map((stage) => (
                <div
                  key={stage}
                  className={`w-3 h-3 rounded-full transition ${
                    STAGES.indexOf(stage) <= STAGES.indexOf(currentStage)
                      ? 'bg-purple-500'
                      : 'bg-gray-700'
                  }`}
                />
              ))}
            </div>

            {/* Stage Data Preview */}
            {stageData[currentStage] && (
              <div className="code-block text-left max-h-48 overflow-auto">
                <pre className="text-green-400 text-sm">
                  {stageData[currentStage].slice(0, 500)}
                  {stageData[currentStage].length > 500 && '...'}
                </pre>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Recent Battles */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <h3 className="text-2xl font-bold mb-6">Recent Battles</h3>
        {battles.length === 0 ? (
          <p className="text-gray-500">No battles yet. Start one above!</p>
        ) : (
          <div className="grid gap-4">
            {battles.map((battle) => (
              <Link
                key={battle.id}
                href={`/battle/${battle.id}`}
                className="block p-4 bg-gray-900/50 border border-gray-800 rounded-lg hover:border-purple-500/50 transition"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium mb-1">{battle.prompt}</p>
                    <p className="text-sm text-gray-500">
                      {battle.agent_a_name} vs {battle.agent_b_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded text-sm">
                      🏆 {battle.winner === 'A' ? battle.agent_a_name : battle.agent_b_name}
                    </span>
                    {battle.score && (
                      <p className="text-xs text-gray-500 mt-1">
                        {battle.score.a} - {battle.score.b}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

'use client';

import { useState, useEffect, useRef, Suspense, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

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

interface FeedItem {
  stage: string;
  label: string;
  agentName?: string;
  timestamp: number;
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
  entering: 'Entering Arena',
  generating_a: 'Generating Code',
  generating_b: 'Generating Code',
  refining_a: 'Refining',
  refining_b: 'Refining',
  critique: 'Analyzing',
  judging: 'Judging',
  winner: 'Winner',
};

const STAGE_HEADLINES: Record<string, string> = {
  entering: '⚔️ Agents entering the arena...',
  generating_a: '🤖 Agent A is writing code...',
  generating_b: '🤖 Agent B is writing code...',
  refining_a: '✨ Agent A polishing solution...',
  refining_b: '✨ Agent B polishing solution...',
  critique: '📝 Critic reviewing both solutions...',
  judging: '⚖️ Judge making final decision...',
  winner: '🏆 WINNER DECLARED!',
};

// Component that handles URL parameters
function URLHandler({ 
  onKeyFound, 
  onCanceled 
}: { 
  onKeyFound: () => void; 
  onCanceled: () => void;
}) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const key = searchParams.get('k');
    if (key) {
      localStorage.setItem('fc_key', key);
      window.history.replaceState({}, '', '/');
      onKeyFound();
    }

    if (searchParams.get('canceled') === '1') {
      onCanceled();
      window.history.replaceState({}, '', '/');
    }
  }, [searchParams, onKeyFound, onCanceled]);

  return null;
}

function HomeContent() {
  const [prompt, setPrompt] = useState('');
  const [battles, setBattles] = useState<Battle[]>([]);
  const [running, setRunning] = useState(false);
  const [currentStage, setCurrentStage] = useState<string | null>(null);
  const [stageData, setStageData] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [matchup, setMatchup] = useState<string>('');
  const [winnerName, setWinnerName] = useState<string>('');
  const [limitReached, setLimitReached] = useState(false);
  const [tier, setTier] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState(false);
  const [buildInfo, setBuildInfo] = useState<{ commitShort: string; vercelEnv: string } | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchBattles();
    // Check for stored key
    const storedKey = localStorage.getItem('fc_key');
    if (storedKey) {
      setHasKey(true);
      setTier('loading');
    }
    // Fetch build info
    fetch('/api/version')
      .then(res => res.json())
      .then(data => setBuildInfo(data))
      .catch(() => {});
  }, []);

  // Auto-scroll feed
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [feed]);

  async function fetchBattles() {
    try {
      const res = await fetch('/api/battles');
      if (res.ok) {
        const data = await res.json();
        setBattles(data.battles || []);
      }
    } catch {
      // Ignore fetch errors
    }
  }

  const handleKeyFound = useCallback(() => {
    setHasKey(true);
    setTier('loading');
  }, []);

  const handleCanceled = useCallback(() => {
    setError('Checkout was canceled. You can try again anytime.');
  }, []);

  async function handleCheckout(checkoutTier: 'pro' | 'builder' | 'sponsor') {
    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: checkoutTier }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || 'Failed to start checkout');
      }
    } catch {
      setError('Failed to start checkout');
    }
  }

  function runBattle() {
    if (!prompt.trim() || running) return;

    setRunning(true);
    setError(null);
    setCurrentStage(null);
    setStageData({});
    setFeed([]);
    setMatchup('');
    setWinnerName('');
    setLimitReached(false);

    const accessKey = localStorage.getItem('fc_key');
    const url = `/api/run-battle?prompt=${encodeURIComponent(prompt)}`;

    fetch(url, {
      headers: accessKey ? { 'x-fc-key': accessKey } : {},
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: res.statusText }));
          if (data.limitReached) {
            setLimitReached(true);
            setTier(data.tier || null);
          }
          setError(data.error || 'Battle failed');
          setRunning(false);
          return;
        }

        const tierHeader = res.headers.get('X-Battle-Tier');
        if (tierHeader) setTier(tierHeader);

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        if (!reader) {
          setError('Failed to start battle stream');
          setRunning(false);
          return;
        }

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const parsed: StageEvent = JSON.parse(line.slice(6));
                setCurrentStage(parsed.stage);

                if (parsed.stage === 'entering' && parsed.data) {
                  setMatchup(parsed.data);
                }

                if (parsed.stage === 'winner' && parsed.data) {
                  setWinnerName(parsed.data);
                }

                const feedItem: FeedItem = {
                  stage: parsed.stage,
                  label: STAGE_LABELS[parsed.stage] || parsed.stage,
                  agentName: parsed.agentName,
                  timestamp: Date.now(),
                };
                setFeed((prev) => {
                  const lastItem = prev[prev.length - 1];
                  if (lastItem?.stage === parsed.stage && !parsed.data) {
                    return prev;
                  }
                  return [...prev, feedItem];
                });

                if (parsed.data) {
                  setStageData((prev) => ({
                    ...prev,
                    [parsed.stage]: parsed.data!,
                  }));
                }

                if (parsed.stage === 'winner') {
                  setRunning(false);
                  setPrompt('');
                  setTimeout(fetchBattles, 500);
                }
              } catch {
                // Ignore parse errors
              }
            }
          }
        }

        setRunning(false);
      })
      .catch(() => {
        setError('Battle failed. Please try again.');
        setRunning(false);
      });
  }

  const currentStageIndex = currentStage ? STAGES.indexOf(currentStage) : -1;

  return (
    <>
      <Suspense fallback={null}>
        <URLHandler onKeyFound={handleKeyFound} onCanceled={handleCanceled} />
      </Suspense>

      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <nav className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold gradient-text">
            FAIghtClub
          </h1>
          <div className="flex items-center gap-4">
            {tier && tier !== 'free' && tier !== 'loading' && (
              <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs font-medium">
                {tier.toUpperCase()}
              </span>
            )}
            <Link
              href="/leaderboard"
              className="text-gray-300 hover:text-white transition-colors"
            >
              Leaderboard
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-16 text-center">
        <h2 className="text-5xl font-bold mb-4 text-white">AI Battle Arena</h2>
        <p className="text-xl text-gray-300 mb-8">
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
            maxLength={5000}
          />
          <div className="flex justify-between items-center mt-2">
            <span className="text-sm text-gray-500">{prompt.length}/2000</span>
            <button
              onClick={runBattle}
              disabled={running || !prompt.trim()}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {running ? '⚔️ Battle in Progress...' : '⚔️ Run Battle'}
            </button>
          </div>
          {error && <p className="mt-2 text-red-400 text-sm">{error}</p>}
        </div>

        {/* Limit Reached Upgrade CTA */}
        {limitReached && (
          <div className="mt-6 p-4 bg-purple-900/30 border border-purple-500/50 rounded-lg max-w-2xl mx-auto">
            <p className="text-purple-300 mb-3">
              🔒 Daily limit reached. Upgrade for more battles!
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <button
                onClick={() => handleCheckout('pro')}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium transition"
              >
                Go Pro £19/mo → 50/day
              </button>
              <button
                onClick={() => handleCheckout('builder')}
                className="px-4 py-2 bg-pink-600 hover:bg-pink-500 rounded-lg text-sm font-medium transition"
              >
                Builder £299/mo → 300/day
              </button>
            </div>
          </div>
        )}

        {/* ARENA FEED - Live Battle Panel */}
        {running && (
          <div className="mt-8 max-w-2xl mx-auto">
            <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 border border-purple-500/50 rounded-t-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-sm font-semibold text-red-400 uppercase tracking-wide">
                    LIVE
                  </span>
                </div>
                {matchup && <span className="text-lg font-bold">{matchup}</span>}
              </div>
            </div>

            <div className="bg-gray-900/80 border-x border-purple-500/50 px-4 py-3">
              <div className="flex justify-between gap-1">
                {STAGES.map((stage, idx) => (
                  <div
                    key={stage}
                    className={`flex-1 h-2 rounded-full transition-all duration-300 ${
                      idx <= currentStageIndex
                        ? idx === currentStageIndex
                          ? 'bg-purple-500 animate-pulse'
                          : 'bg-purple-600'
                        : 'bg-gray-700'
                    }`}
                    title={STAGE_LABELS[stage]}
                  />
                ))}
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span>Start</span>
                <span>Gen</span>
                <span>Refine</span>
                <span>Judge</span>
                <span>End</span>
              </div>
            </div>

            {currentStage && (
              <div className="bg-gray-900/80 border-x border-purple-500/50 px-4 py-4 text-center">
                <p className="text-2xl font-bold text-white">
                  {STAGE_HEADLINES[currentStage]}
                </p>
                {currentStage === 'winner' && winnerName && (
                  <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mt-2">
                    {winnerName} WINS!
                  </p>
                )}
              </div>
            )}

            <div
              ref={feedRef}
              className="bg-black/50 border-x border-b border-purple-500/50 rounded-b-lg max-h-48 overflow-y-auto"
            >
              <div className="p-4 space-y-2">
                {feed.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 text-sm animate-slide-up"
                  >
                    <span className="text-gray-500 text-xs w-16 flex-shrink-0">
                      {new Date(item.timestamp).toLocaleTimeString([], {
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        item.stage === 'winner'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : item.stage.includes('generating')
                            ? 'bg-blue-500/20 text-blue-400'
                            : item.stage.includes('refining')
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-purple-500/20 text-purple-400'
                      }`}
                    >
                      {item.label}
                    </span>
                    {item.agentName && (
                      <span className="text-gray-400">{item.agentName}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {stageData[currentStage || ''] &&
              currentStage !== 'entering' &&
              currentStage !== 'winner' && (
                <div className="mt-4 code-block text-left max-h-32 overflow-auto rounded-lg">
                  <pre className="text-green-400 text-xs p-3">
                    {stageData[currentStage || ''].slice(0, 300)}
                    {(stageData[currentStage || '']?.length || 0) > 300 && '...'}
                  </pre>
                </div>
              )}
          </div>
        )}

        {/* Upgrade CTAs */}
        {!hasKey && !running && (
          <div className="mt-12 max-w-2xl mx-auto">
            <p className="text-gray-500 text-sm mb-4">
              🚀 Unlock more battles and longer prompts
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <button
                onClick={() => handleCheckout('pro')}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-medium transition"
              >
                Go Pro £19/mo
              </button>
              <button
                onClick={() => handleCheckout('builder')}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-medium transition"
              >
                Builder £299/mo
              </button>
              <button
                onClick={() => handleCheckout('sponsor')}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition"
              >
                Sponsor £10
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Recent Battles */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <h3 className="text-2xl font-bold mb-6 text-white">Recent Battles</h3>
        {battles.length === 0 ? (
          <p className="text-gray-400">No battles yet. Start one above!</p>
        ) : (
          <div className="grid gap-4">
            {battles.map((battle) => (
              <Link
                key={battle.id}
                href={`/battle/${battle.id}`}
                className="block p-4 bg-gray-900/50 border border-gray-800 rounded-lg hover:border-purple-500/50 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium mb-1 text-white">{battle.prompt}</p>
                    <p className="text-sm text-gray-400">
                      {battle.agent_a_name} vs {battle.agent_b_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded text-sm">
                      🏆{' '}
                      {battle.winner === 'A'
                        ? battle.agent_a_name
                        : battle.agent_b_name}
                    </span>
                    {battle.score && (
                      <p className="text-xs text-gray-400 mt-1">
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

      {/* Build Info Footer */}
      <footer className="border-t border-gray-800 px-6 py-4 mt-8">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-xs text-gray-600">
            {buildInfo ? `Build: ${buildInfo.commitShort} • ${buildInfo.vercelEnv}` : 'Loading...'}
          </p>
        </div>
      </footer>
    </>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <HomeContent />
    </main>
  );
}

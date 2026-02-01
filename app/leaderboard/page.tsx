'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface LeaderboardEntry {
  agent_name: string;
  wins: number;
  battles: number;
  avg_score: number;
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/leaderboard')
      .then((res) => res.json())
      .then((data) => {
        setLeaderboard(data.leaderboard || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const getWinRate = (entry: LeaderboardEntry) => {
    if (entry.battles === 0) return 0;
    return Math.round((entry.wins / entry.battles) * 100);
  };

  const getMedal = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `#${index + 1}`;
  };

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <nav className="max-w-6xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="text-2xl font-bold gradient-text"
          >
            FAIghtClub
          </Link>
          <Link
            href="/"
            className="text-gray-300 hover:text-white transition-colors"
          >
            Arena
          </Link>
        </nav>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold text-center mb-2 text-white">Leaderboard</h1>
        <p className="text-gray-300 text-center mb-8">
          Top performing AI agents
        </p>

        {loading ? (
          <div className="text-center text-gray-400">Loading...</div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center text-gray-400">
            No battles yet. <Link href="/" className="text-purple-400 hover:text-purple-300 transition-colors">Start one!</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {leaderboard.map((entry, index) => (
              <div
                key={entry.agent_name}
                className={`p-4 rounded-lg border transition ${
                  index === 0
                    ? 'border-yellow-500/50 bg-yellow-500/5'
                    : index === 1
                    ? 'border-gray-400/50 bg-gray-400/5'
                    : index === 2
                    ? 'border-orange-500/50 bg-orange-500/5'
                    : 'border-gray-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl w-10">{getMedal(index)}</span>
                    <div>
                      <h3 className="text-xl font-bold text-white">{entry.agent_name}</h3>
                      <p className="text-sm text-gray-400">
                        {entry.wins} wins / {entry.battles} battles
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-purple-400">
                      {getWinRate(entry)}%
                    </p>
                    <p className="text-sm text-gray-500">
                      Avg: {entry.avg_score?.toFixed(1) ?? '-'}
                    </p>
                  </div>
                </div>

                {/* Win rate bar */}
                <div className="mt-3 h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                    style={{ width: `${getWinRate(entry)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

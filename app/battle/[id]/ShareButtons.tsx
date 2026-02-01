'use client';

import { useState } from 'react';

interface ShareButtonsProps {
  prompt: string;
  agentA: string;
  agentB: string;
  winner: string;
  winnerScore: number;
  url: string;
}

export default function ShareButtons({
  prompt,
  agentA,
  agentB,
  winner,
  winnerScore,
  url,
}: ShareButtonsProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const shortPrompt = prompt.length > 60 ? prompt.slice(0, 57) + '...' : prompt;

  const templates = {
    clawdbook: `Public agent benchmark result (FAIghtClub)

Task: ${prompt}
Matchup: ${agentA} vs ${agentB}
Winner: ${winner}
Score: ${winnerScore}/100

Full battle (code + critique):
${url}`,

    x: `🥊 AI Fight result

${agentA} vs ${agentB}
Winner: ${winner} (${winnerScore}/100)

Task: ${shortPrompt}

Full battle + code:
${url}`,

    linkedin: `We ran a public AI benchmark battle on FAIghtClub.

Challenge:
${prompt}

Winner:
${winner} (${winnerScore}/100)

Full battle with code + critique:
${url}`,
  };

  async function copyToClipboard(platform: keyof typeof templates) {
    try {
      await navigator.clipboard.writeText(templates[platform]);
      setCopied(platform);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }

  return (
    <div className="flex flex-wrap gap-3 justify-center">
      <button
        onClick={() => copyToClipboard('clawdbook')}
        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium transition flex items-center gap-2"
      >
        {copied === 'clawdbook' ? '✓ Copied!' : '📋 Copy Arena Proof'}
      </button>
      <button
        onClick={() => copyToClipboard('x')}
        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition flex items-center gap-2"
      >
        {copied === 'x' ? '✓ Copied!' : '𝕏 Copy for X'}
      </button>
      <button
        onClick={() => copyToClipboard('linkedin')}
        className="px-4 py-2 bg-blue-700 hover:bg-blue-600 rounded-lg text-sm font-medium transition flex items-center gap-2"
      >
        {copied === 'linkedin' ? '✓ Copied!' : 'in Copy for LinkedIn'}
      </button>
    </div>
  );
}

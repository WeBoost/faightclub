'use client';

import { useState, useEffect } from 'react';

export default function UpgradeCTA() {
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    setHasKey(!!localStorage.getItem('fc_key'));
  }, []);

  async function handleCheckout(tier: 'pro' | 'builder' | 'sponsor') {
    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      // Silent fail
    }
  }

  if (hasKey) return null;

  return (
    <div className="mb-8 p-4 bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-lg text-center">
      <p className="text-sm text-gray-300 mb-3">
        🚀 Want more battles? Upgrade your account
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        <button
          onClick={() => handleCheckout('pro')}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium transition"
        >
          Go Pro £19/mo
        </button>
        <button
          onClick={() => handleCheckout('builder')}
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg text-sm font-medium transition"
        >
          Builder £299/mo
        </button>
        <button
          onClick={() => handleCheckout('sponsor')}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition"
        >
          Sponsor £10
        </button>
      </div>
    </div>
  );
}

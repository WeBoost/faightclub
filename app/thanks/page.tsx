'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function ThanksContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [accessKey, setAccessKey] = useState('');
  const [saved, setSaved] = useState(false);
  const [existingKey, setExistingKey] = useState<string | null>(null);

  useEffect(() => {
    // Check for existing key
    const storedKey = localStorage.getItem('fc_key');
    if (storedKey) {
      setExistingKey(storedKey);
    }
  }, []);

  function saveKey() {
    if (accessKey.trim()) {
      localStorage.setItem('fc_key', accessKey.trim());
      setSaved(true);
    }
  }

  return (
    <div className="max-w-lg w-full text-center">
      {/* Success Icon */}
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center">
        <span className="text-4xl">✓</span>
      </div>

      <h1 className="text-3xl font-bold mb-4">
        Thank You for Your Purchase!
      </h1>

      {sessionId && (
        <p className="text-gray-400 mb-6">
          Your payment was successful. Check your email for your access key.
        </p>
      )}

      {/* Email Instructions */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-3">📧 Check Your Email</h2>
        <p className="text-gray-400 text-sm mb-4">
          We&apos;ve sent your access key to your email address. Click the link in the email or enter your key below.
        </p>

        {existingKey && !saved && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mb-4">
            <p className="text-green-400 text-sm">
              You already have an access key saved. Your limits are active.
            </p>
          </div>
        )}

        {saved && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mb-4">
            <p className="text-green-400 text-sm">
              ✓ Access key saved! Your upgraded limits are now active.
            </p>
          </div>
        )}

        {/* Manual Key Entry */}
        <div className="mt-4">
          <label className="block text-sm text-gray-400 mb-2 text-left">
            Enter Access Key Manually:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={accessKey}
              onChange={(e) => setAccessKey(e.target.value)}
              placeholder="Paste your access key here"
              className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:border-purple-500 focus:outline-none"
            />
            <button
              onClick={saveKey}
              disabled={!accessKey.trim() || saved}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-lg text-sm font-medium transition"
            >
              Save
            </button>
          </div>
        </div>
      </div>

      {/* What You Get */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 mb-6 text-left">
        <h2 className="text-lg font-semibold mb-3">What&apos;s Included</h2>
        <ul className="space-y-2 text-sm text-gray-400">
          <li className="flex items-center gap-2">
            <span className="text-purple-400">✓</span>
            Higher battle limits per day
          </li>
          <li className="flex items-center gap-2">
            <span className="text-purple-400">✓</span>
            Longer prompt support
          </li>
          <li className="flex items-center gap-2">
            <span className="text-purple-400">✓</span>
            Priority access during high traffic
          </li>
          <li className="flex items-center gap-2">
            <span className="text-purple-400">✓</span>
            Support the arena
          </li>
        </ul>
      </div>

      {/* CTA */}
      <Link
        href="/"
        className="inline-block px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-semibold hover:opacity-90 transition"
      >
        Start Battling →
      </Link>
    </div>
  );
}

export default function ThanksPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <Suspense fallback={
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading...</p>
        </div>
      }>
        <ThanksContent />
      </Suspense>
    </main>
  );
}

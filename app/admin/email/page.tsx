'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface DnsRecord {
  type: string;
  name: string;
  status: string;
  record?: string;
}

interface StatusResponse {
  configured: boolean;
  sendingDomain: string;
  fromEmail: string;
  emailEnabled: boolean;
  autoDnsEnabled: boolean;
  domain?: {
    id: string;
    name: string;
    status: string;
    region: string;
    createdAt: string;
  };
  dnsStatus?: {
    total: number;
    verified: number;
    pending: number;
    records: DnsRecord[];
  };
  health?: {
    domainVerified: boolean;
    usingCustomDomain: boolean;
    emailsEnabled: boolean;
    ready: boolean;
  };
  nextSteps?: string[];
  error?: string;
}

interface SetupResponse {
  success: boolean;
  message?: string;
  error?: string;
  steps?: string[];
  warnings?: string[];
  dnsResult?: {
    created: string[];
    existing: string[];
    failed: string[];
  };
  nextSteps?: string[];
}

function SecretFromURL({ onSecret }: { onSecret: (secret: string) => void }) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const secretParam = searchParams.get('secret');
    if (secretParam) {
      onSecret(secretParam);
    }
  }, [searchParams, onSecret]);

  return null;
}

function AdminEmailContent() {
  const [adminSecret, setAdminSecret] = useState('');
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [setupResult, setSetupResult] = useState<SetupResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchStatus() {
    if (!adminSecret) {
      setError('Admin secret required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/resend/status', {
        headers: { 'x-admin-secret': adminSecret },
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to fetch status');
        return;
      }

      setStatus(data);
    } catch {
      setError('Failed to fetch status');
    } finally {
      setLoading(false);
    }
  }

  async function runSetup() {
    if (!adminSecret) {
      setError('Admin secret required');
      return;
    }

    setLoading(true);
    setError(null);
    setSetupResult(null);

    try {
      const res = await fetch('/api/admin/resend/setup-domain', {
        method: 'POST',
        headers: { 'x-admin-secret': adminSecret },
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Setup failed');
        return;
      }

      setSetupResult(data);
      setTimeout(fetchStatus, 1000);
    } catch {
      setError('Setup failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Suspense fallback={null}>
        <SecretFromURL onSecret={setAdminSecret} />
      </Suspense>

      <div className="mb-8">
        <Link href="/" className="text-purple-400 hover:underline text-sm">
          ← Back to Arena
        </Link>
        <h1 className="text-3xl font-bold mt-4">Email Configuration</h1>
        <p className="text-gray-400 mt-2">
          Manage Resend domain verification and DNS setup
        </p>
      </div>

      {/* Auth */}
      <div className="bg-gray-900 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Authentication</h2>
        <div className="flex gap-4">
          <input
            type="password"
            value={adminSecret}
            onChange={(e) => setAdminSecret(e.target.value)}
            placeholder="Enter admin secret"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
          />
          <button
            onClick={fetchStatus}
            disabled={loading || !adminSecret}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-lg font-medium transition"
          >
            {loading ? 'Loading...' : 'Check Status'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Status */}
      {status && (
        <div className="bg-gray-900 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Current Status</h2>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-sm text-gray-400">Sending Domain</p>
              <p className="font-mono">{status.sendingDomain}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">From Email</p>
              <p className="font-mono">{status.fromEmail}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Email Enabled</p>
              <p className={status.emailEnabled ? 'text-green-400' : 'text-red-400'}>
                {status.emailEnabled ? '✓ Yes' : '✗ No'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Auto DNS Enabled</p>
              <p className={status.autoDnsEnabled ? 'text-green-400' : 'text-yellow-400'}>
                {status.autoDnsEnabled ? '✓ Yes' : '○ No'}
              </p>
            </div>
          </div>

          {status.domain && (
            <div className="border-t border-gray-800 pt-4 mb-4">
              <h3 className="text-md font-semibold mb-3">Domain Status</h3>
              <div className="flex items-center gap-4">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    status.domain.status === 'verified'
                      ? 'bg-green-500/20 text-green-400'
                      : status.domain.status === 'pending'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-gray-500/20 text-gray-400'
                  }`}
                >
                  {status.domain.status.toUpperCase()}
                </span>
                <span className="text-gray-400 text-sm">
                  Region: {status.domain.region}
                </span>
              </div>
            </div>
          )}

          {status.dnsStatus && (
            <div className="border-t border-gray-800 pt-4 mb-4">
              <h3 className="text-md font-semibold mb-3">DNS Records</h3>
              <p className="text-sm text-gray-400 mb-3">
                {status.dnsStatus.verified}/{status.dnsStatus.total} verified
              </p>
              <div className="space-y-2">
                {status.dnsStatus.records.map((record, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-gray-800 rounded px-3 py-2 text-sm"
                  >
                    <span className="font-mono">
                      {record.type} {record.name}
                    </span>
                    <span
                      className={
                        record.status === 'verified'
                          ? 'text-green-400'
                          : 'text-yellow-400'
                      }
                    >
                      {record.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {status.health && (
            <div className="border-t border-gray-800 pt-4 mb-4">
              <h3 className="text-md font-semibold mb-3">Health Check</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className={status.health.domainVerified ? 'text-green-400' : 'text-yellow-400'}>
                  {status.health.domainVerified ? '✓' : '○'} Domain Verified
                </div>
                <div className={status.health.usingCustomDomain ? 'text-green-400' : 'text-yellow-400'}>
                  {status.health.usingCustomDomain ? '✓' : '○'} Using Custom Domain
                </div>
                <div className={status.health.emailsEnabled ? 'text-green-400' : 'text-red-400'}>
                  {status.health.emailsEnabled ? '✓' : '✗'} Emails Enabled
                </div>
                <div className={status.health.ready ? 'text-green-400' : 'text-yellow-400'}>
                  {status.health.ready ? '✓' : '○'} Fully Ready
                </div>
              </div>
            </div>
          )}

          {status.nextSteps && status.nextSteps.length > 0 && (
            <div className="border-t border-gray-800 pt-4">
              <h3 className="text-md font-semibold mb-3">Next Steps</h3>
              <ul className="space-y-1 text-sm text-gray-400">
                {status.nextSteps.map((step, idx) => (
                  <li key={idx}>• {step}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Setup */}
      <div className="bg-gray-900 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Domain Setup</h2>
        <p className="text-gray-400 text-sm mb-4">
          Automatically create Resend domain and configure DNS records in Vercel.
        </p>
        <button
          onClick={runSetup}
          disabled={loading || !adminSecret}
          className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 disabled:opacity-50 rounded-lg font-medium transition"
        >
          {loading ? 'Running Setup...' : 'Run Domain Setup'}
        </button>
      </div>

      {/* Setup Result */}
      {setupResult && (
        <div
          className={`rounded-lg p-6 mb-6 ${
            setupResult.success
              ? 'bg-green-500/10 border border-green-500/30'
              : 'bg-red-500/10 border border-red-500/30'
          }`}
        >
          <h2 className="text-lg font-semibold mb-4">
            {setupResult.success ? '✓ Setup Complete' : '✗ Setup Failed'}
          </h2>

          {setupResult.message && <p className="mb-4">{setupResult.message}</p>}

          {setupResult.error && (
            <p className="text-red-400 mb-4">{setupResult.error}</p>
          )}

          {setupResult.steps && setupResult.steps.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-400 mb-2">
                Steps Completed:
              </h3>
              <ul className="space-y-1 text-sm">
                {setupResult.steps.map((step, idx) => (
                  <li key={idx} className="text-green-400">
                    ✓ {step}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {setupResult.warnings && setupResult.warnings.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-yellow-400 mb-2">
                Warnings:
              </h3>
              <ul className="space-y-1 text-sm text-yellow-400">
                {setupResult.warnings.map((warning, idx) => (
                  <li key={idx}>⚠ {warning}</li>
                ))}
              </ul>
            </div>
          )}

          {setupResult.dnsResult && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-400 mb-2">
                DNS Records:
              </h3>
              <div className="text-sm">
                <p className="text-green-400">
                  Created: {setupResult.dnsResult.created.join(', ') || 'None'}
                </p>
                <p className="text-gray-400">
                  Already Existing:{' '}
                  {setupResult.dnsResult.existing.join(', ') || 'None'}
                </p>
                {setupResult.dnsResult.failed.length > 0 && (
                  <p className="text-red-400">
                    Failed: {setupResult.dnsResult.failed.join(', ')}
                  </p>
                )}
              </div>
            </div>
          )}

          {setupResult.nextSteps && setupResult.nextSteps.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-2">
                Next Steps:
              </h3>
              <ul className="space-y-1 text-sm text-gray-400">
                {setupResult.nextSteps.map((step, idx) => (
                  <li key={idx}>• {step}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default function AdminEmailPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <AdminEmailContent />
      </div>
    </main>
  );
}

import { NextResponse } from 'next/server';

/**
 * GET /api/version
 * 
 * Returns build information to diagnose deployment issues
 */
export async function GET() {
  return NextResponse.json({
    commit: process.env.VERCEL_GIT_COMMIT_SHA || 'local',
    commitShort: (process.env.VERCEL_GIT_COMMIT_SHA || 'local').slice(0, 7),
    commitMessage: process.env.VERCEL_GIT_COMMIT_MESSAGE || 'unknown',
    deployedAt: process.env.VERCEL_GIT_COMMIT_DATE || new Date().toISOString(),
    vercelEnv: process.env.VERCEL_ENV || 'development',
    vercelUrl: process.env.VERCEL_URL || 'localhost',
    region: process.env.VERCEL_REGION || 'local',
  });
}

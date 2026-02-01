import { NextRequest } from 'next/server';
import { runBattle } from '@/lib/arena';
import { encodeSSE } from '@/lib/streaming';
import { validateAccessKey, getTierLimits, Tier } from '@/lib/entitlements';

// Increase function timeout for battle (6 OpenAI calls)
export const maxDuration = 60;

// Rate limiting per IP (anonymous) and per access key (authenticated)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_WINDOW = 24 * 60 * 60 * 1000; // 24 hours for daily limits

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  tier: Tier | null;
}

async function checkRateLimitWithTier(
  ip: string,
  accessKey?: string | null
): Promise<RateLimitResult> {
  const now = Date.now();
  let tier: Tier | null = null;
  let limits = getTierLimits(null);

  // Validate access key if provided
  if (accessKey) {
    const entitlement = await validateAccessKey(accessKey);
    if (entitlement) {
      tier = entitlement.tier;
      limits = getTierLimits(tier);
    }
  }

  // Use access key or IP as rate limit key
  const rateLimitKey = accessKey || `ip:${ip}`;
  const entry = rateLimitMap.get(rateLimitKey);

  // Reset at midnight or if window expired
  if (!entry || now > entry.resetAt) {
    const resetAt = getNextMidnight();
    rateLimitMap.set(rateLimitKey, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: limits.battlesPerDay - 1,
      limit: limits.battlesPerDay,
      tier,
    };
  }

  if (entry.count >= limits.battlesPerDay) {
    return {
      allowed: false,
      remaining: 0,
      limit: limits.battlesPerDay,
      tier,
    };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: limits.battlesPerDay - entry.count,
    limit: limits.battlesPerDay,
    tier,
  };
}

function getNextMidnight(): number {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCHours(24, 0, 0, 0);
  return tomorrow.getTime();
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  Array.from(rateLimitMap.entries()).forEach(([key, entry]) => {
    if (now > entry.resetAt) {
      rateLimitMap.delete(key);
    }
  });
}, 60 * 60 * 1000); // Every hour

export async function GET(request: NextRequest) {
  const ip =
    request.headers.get('x-forwarded-for') ||
    request.headers.get('x-real-ip') ||
    'unknown';

  const accessKey = request.headers.get('x-fc-key');
  const prompt = request.nextUrl.searchParams.get('prompt');

  if (!prompt) {
    return new Response('Missing prompt parameter', { status: 400 });
  }

  // Check rate limit with tier
  const rateLimit = await checkRateLimitWithTier(ip, accessKey);

  if (!rateLimit.allowed) {
    const upgradeMsg = !rateLimit.tier
      ? ' Upgrade to Pro for 50 battles/day.'
      : rateLimit.tier === 'pro'
        ? ' Upgrade to Builder for 300 battles/day.'
        : '';
    return new Response(
      JSON.stringify({
        error: `Daily limit reached (${rateLimit.limit} battles).${upgradeMsg}`,
        limitReached: true,
        tier: rateLimit.tier,
      }),
      {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Get prompt length limit based on tier
  const limits = getTierLimits(rateLimit.tier);
  if (prompt.length > limits.maxPromptLength) {
    return new Response(
      `Prompt too long (max ${limits.maxPromptLength} characters for ${rateLimit.tier || 'free'} tier)`,
      { status: 400 }
    );
  }

  // Create SSE stream
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const writer = {
        write: async (data: Uint8Array) => {
          controller.enqueue(data);
        },
        close: async () => {
          controller.close();
        },
      };

      try {
        await runBattle(prompt, {
          writer: writer as unknown as WritableStreamDefaultWriter,
          encoder,
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error('Battle error:', errorMsg, error);
        const errorEvent = encodeSSE({
          stage: 'error' as never,
          data: `Battle failed: ${errorMsg}`,
        });
        controller.enqueue(encoder.encode(errorEvent));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Battle-Remaining': String(rateLimit.remaining),
      'X-Battle-Limit': String(rateLimit.limit),
      'X-Battle-Tier': rateLimit.tier || 'free',
    },
  });
}

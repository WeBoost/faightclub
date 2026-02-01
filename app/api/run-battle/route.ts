import { NextRequest } from 'next/server';
import { runBattle } from '@/lib/arena';
import { encodeSSE } from '@/lib/streaming';

// Simple in-memory rate limiting (best-effort)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10; // requests per minute
const RATE_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  
  if (entry.count >= RATE_LIMIT) {
    return false;
  }
  
  entry.count++;
  return true;
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  Array.from(rateLimitMap.entries()).forEach(([ip, entry]) => {
    if (now > entry.resetAt) {
      rateLimitMap.delete(ip);
    }
  });
}, 60 * 1000);

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             'unknown';

  // Rate limit check
  if (!checkRateLimit(ip)) {
    return new Response('Rate limit exceeded. Please wait a minute.', { status: 429 });
  }

  const prompt = request.nextUrl.searchParams.get('prompt');
  
  if (!prompt) {
    return new Response('Missing prompt parameter', { status: 400 });
  }

  if (prompt.length > 2000) {
    return new Response('Prompt too long (max 2000 characters)', { status: 400 });
  }

  // Create SSE stream
  const encoder = new TextEncoder();
  let streamController: ReadableStreamDefaultController;

  const stream = new ReadableStream({
    start(controller) {
      streamController = controller;
    },
  });

  // Create a simple writer interface
  const writer = {
    write: async (data: Uint8Array) => {
      streamController.enqueue(data);
    },
    close: async () => {
      streamController.close();
    },
  };

  // Run battle in background
  (async () => {
    try {
      await runBattle(prompt, {
        writer: writer as unknown as WritableStreamDefaultWriter,
        encoder,
      });
    } catch (error) {
      console.error('Battle error:', error);
      const errorEvent = encodeSSE({ stage: 'error' as any, data: 'Battle failed' });
      streamController.enqueue(encoder.encode(errorEvent));
    } finally {
      streamController.close();
    }
  })();

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

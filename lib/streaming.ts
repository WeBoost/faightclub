export type BattleStage =
  | 'entering'
  | 'generating_a'
  | 'generating_b'
  | 'refining_a'
  | 'refining_b'
  | 'critique'
  | 'judging'
  | 'winner';

export interface StageEvent {
  stage: BattleStage;
  data?: string;
  agentName?: string;
  partial?: boolean;
}

export function encodeSSE(event: StageEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export function createSSEStream(): {
  readable: ReadableStream;
  writer: WritableStreamDefaultWriter;
  encoder: TextEncoder;
} {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController;

  const readable = new ReadableStream({
    start(c) {
      controller = c;
    },
  });

  const writable = new WritableStream({
    write(chunk) {
      controller.enqueue(chunk);
    },
    close() {
      controller.close();
    },
  });

  return {
    readable,
    writer: writable.getWriter(),
    encoder,
  };
}

export async function sendStage(
  writer: WritableStreamDefaultWriter,
  encoder: TextEncoder,
  event: StageEvent
): Promise<void> {
  await writer.write(encoder.encode(encodeSSE(event)));
}

export const MODELS = {
  // Hardcoded for now - env vars have trailing newlines from heredoc input
  premium: (process.env.OPENAI_MODEL_PREMIUM || 'gpt-4o').trim(),
  economy: (process.env.OPENAI_MODEL_ECONOMY || 'gpt-4o-mini').trim(),
};

export const MAX_TOKENS = {
  premium: 900,
  economy: 500,
};

export interface CompletionOptions {
  model: 'premium' | 'economy';
  prompt: string;
  systemPrompt: string;
  temperature?: number;
}

export async function complete({
  model,
  prompt,
  systemPrompt,
  temperature = 0.7,
}: CompletionOptions): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not set');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODELS[model],
      max_tokens: MAX_TOKENS[model],
      temperature,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

// Streaming not implemented with fetch - can add later if needed

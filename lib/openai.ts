import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const MODELS = {
  premium: process.env.OPENAI_MODEL_PREMIUM || 'gpt-4o',
  economy: process.env.OPENAI_MODEL_ECONOMY || 'gpt-4o-mini',
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
  const response = await openai.chat.completions.create({
    model: MODELS[model],
    max_tokens: MAX_TOKENS[model],
    temperature,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ],
  });

  return response.choices[0]?.message?.content || '';
}

export async function* streamComplete({
  model,
  prompt,
  systemPrompt,
  temperature = 0.7,
}: CompletionOptions): AsyncGenerator<string> {
  const stream = await openai.chat.completions.create({
    model: MODELS[model],
    max_tokens: MAX_TOKENS[model],
    temperature,
    stream: true,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ],
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) yield content;
  }
}

export default openai;

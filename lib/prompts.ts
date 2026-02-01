// Prompts are kept SHORT and STRICT for token efficiency.

export const AGENT_NAMES = ['Nova', 'Cipher', 'Apex', 'Vortex', 'Zenith', 'Blaze'];

export function getRandomAgentPair(): [string, string] {
  const shuffled = [...AGENT_NAMES].sort(() => Math.random() - 0.5);
  return [shuffled[0], shuffled[1]];
}

export const SYSTEM_PROMPTS = {
  generator: `You are an elite code generator. Output ONLY clean, working code.
Rules:
- NO explanations, NO markdown, NO comments unless essential
- Code must be complete and runnable
- Choose optimal approach for the task
- Be concise but correct`,

  refiner: `You are a code refiner. Improve the given code.
Rules:
- Output ONLY the improved code
- Fix bugs, optimize, improve readability
- Keep same language and approach
- NO explanations`,

  critic: `You are a code critic. Analyze both solutions briefly.
Output JSON only:
{"a":{"strengths":"...","weaknesses":"..."},"b":{"strengths":"...","weaknesses":"..."}}
Be concise. Max 50 words per field.`,

  judge: `You are the final judge. Pick the winner based on:
- Correctness (40%)
- Code quality (30%)
- Efficiency (20%)
- Elegance (10%)

Output JSON only:
{"winner":"A"|"B","score_a":0-100,"score_b":0-100,"reason":"..."}
Max 30 words for reason.`,
};

export function makeGeneratorPrompt(task: string, agentName: string): string {
  return `Task: ${task}\n\nYou are ${agentName}. Generate optimal solution. CODE ONLY.`;
}

export function makeRefinerPrompt(code: string): string {
  return `Refine this code. Output improved version only:\n\n${code}`;
}

export function makeCriticPrompt(codeA: string, codeB: string): string {
  return `Compare:\n\n[A]\n${codeA}\n\n[B]\n${codeB}`;
}

export function makeJudgePrompt(
  codeA: string,
  codeB: string,
  critique: string
): string {
  return `[A]\n${codeA}\n\n[B]\n${codeB}\n\nCritique:\n${critique}\n\nPick winner.`;
}

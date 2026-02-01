import { complete } from './openai';
import {
  SYSTEM_PROMPTS,
  makeGeneratorPrompt,
  makeRefinerPrompt,
  makeCriticPrompt,
  makeJudgePrompt,
  getRandomAgentPair,
} from './prompts';
import { sendStage, BattleStage } from './streaming';
import { insertBattle, updateLeaderboard, Battle } from './supabase-admin';

export interface BattleResult {
  prompt: string;
  agentA: { name: string; code: string; refined: string };
  agentB: { name: string; code: string; refined: string };
  critique: { a: { strengths: string; weaknesses: string }; b: { strengths: string; weaknesses: string } };
  judgment: { winner: 'A' | 'B'; score_a: number; score_b: number; reason: string };
}

interface StreamContext {
  writer: WritableStreamDefaultWriter;
  encoder: TextEncoder;
}

export async function runBattle(
  prompt: string,
  stream?: StreamContext
): Promise<BattleResult> {
  const [agentAName, agentBName] = getRandomAgentPair();

  const send = async (stage: BattleStage, data?: string, agentName?: string) => {
    if (stream) {
      await sendStage(stream.writer, stream.encoder, { stage, data, agentName });
    }
  };

  // Stage: Entering
  await send('entering', `${agentAName} vs ${agentBName}`);

  // Stage: Generate A
  await send('generating_a', undefined, agentAName);
  const codeA = await complete({
    model: 'premium',
    systemPrompt: SYSTEM_PROMPTS.generator,
    prompt: makeGeneratorPrompt(prompt, agentAName),
  });
  await send('generating_a', codeA, agentAName);

  // Stage: Generate B
  await send('generating_b', undefined, agentBName);
  const codeB = await complete({
    model: 'premium',
    systemPrompt: SYSTEM_PROMPTS.generator,
    prompt: makeGeneratorPrompt(prompt, agentBName),
  });
  await send('generating_b', codeB, agentBName);

  // Stage: Refine A
  await send('refining_a', undefined, agentAName);
  const refinedA = await complete({
    model: 'premium',
    systemPrompt: SYSTEM_PROMPTS.refiner,
    prompt: makeRefinerPrompt(codeA),
  });
  await send('refining_a', refinedA, agentAName);

  // Stage: Refine B
  await send('refining_b', undefined, agentBName);
  const refinedB = await complete({
    model: 'premium',
    systemPrompt: SYSTEM_PROMPTS.refiner,
    prompt: makeRefinerPrompt(codeB),
  });
  await send('refining_b', refinedB, agentBName);

  // Stage: Critique
  await send('critique');
  const critiqueRaw = await complete({
    model: 'economy',
    systemPrompt: SYSTEM_PROMPTS.critic,
    prompt: makeCriticPrompt(refinedA, refinedB),
  });
  
  let critique: BattleResult['critique'];
  try {
    critique = JSON.parse(critiqueRaw);
  } catch {
    critique = {
      a: { strengths: 'Parse error', weaknesses: 'Parse error' },
      b: { strengths: 'Parse error', weaknesses: 'Parse error' },
    };
  }
  await send('critique', critiqueRaw);

  // Stage: Judging
  await send('judging');
  const judgmentRaw = await complete({
    model: 'economy',
    systemPrompt: SYSTEM_PROMPTS.judge,
    prompt: makeJudgePrompt(refinedA, refinedB, critiqueRaw),
    temperature: 0.3,
  });

  let judgment: BattleResult['judgment'];
  try {
    judgment = JSON.parse(judgmentRaw);
  } catch {
    judgment = { winner: 'A', score_a: 50, score_b: 50, reason: 'Parse error - defaulted' };
  }
  await send('judging', judgmentRaw);

  // Stage: Winner
  const winnerName = judgment.winner === 'A' ? agentAName : agentBName;
  await send('winner', winnerName);

  // Store in database
  const battleData: Omit<Battle, 'id' | 'created_at'> = {
    prompt,
    agent_a_name: agentAName,
    agent_b_name: agentBName,
    agent_a_code: codeA,
    agent_b_code: codeB,
    agent_a_refined: refinedA,
    agent_b_refined: refinedB,
    critique: critiqueRaw,
    winner: judgment.winner,
    score: { a: judgment.score_a, b: judgment.score_b, reason: judgment.reason },
  };

  try {
    await insertBattle(battleData);
    await updateLeaderboard(judgment.winner, agentBName, { a: judgment.score_a, b: judgment.score_b }, agentAName);
  } catch (err) {
    console.error('Failed to store battle:', err);
  }

  return {
    prompt,
    agentA: { name: agentAName, code: codeA, refined: refinedA },
    agentB: { name: agentBName, code: codeB, refined: refinedB },
    critique,
    judgment,
  };
}

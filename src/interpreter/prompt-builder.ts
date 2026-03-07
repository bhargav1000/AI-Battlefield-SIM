import { MatchState } from '../types';
import { SYSTEM_PROMPT, SCHEMA_PROMPT } from './prompts';
import { serializeState } from './state-serializer';

export interface BuiltPrompt {
  systemPrompt: string;
  userMessage: string;
}

export function buildPrompt(playerText: string, state: MatchState): BuiltPrompt {
  const serialized = serializeState(state);
  const stateJson = JSON.stringify(serialized, null, 2);

  const userMessage = `Current game state:
\`\`\`json
${stateJson}
\`\`\`

Player command: "${playerText}"

${SCHEMA_PROMPT}`;

  return {
    systemPrompt: SYSTEM_PROMPT,
    userMessage,
  };
}

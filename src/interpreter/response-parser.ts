import { RawLLMResponse, RawLLMCommand } from '../types';

const VALID_ACTIONS = new Set(['move', 'hold', 'attack', 'defend_area', 'retreat', 'reform', 'flank', 'support']);
const VALID_FORMATIONS = new Set(['line', 'column', 'square', 'loose']);
const VALID_CONDITIONS = new Set(['if_engaged', 'if_morale_below', 'if_enemy_near', 'if_casualties_above']);

export function parseResponse(raw: string): { response: RawLLMResponse | null; error: string | null } {
  // Try to extract JSON from the response
  let jsonStr = raw.trim();

  // Handle case where LLM wraps in markdown code block
  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  }

  let parsed: any;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    return { response: null, error: `Failed to parse JSON: ${raw.substring(0, 200)}` };
  }

  if (!parsed.commands || !Array.isArray(parsed.commands)) {
    return { response: null, error: 'Response missing "commands" array' };
  }

  // Schema-validate each command
  const validCommands: RawLLMCommand[] = [];
  const notes: string[] = parsed.notes && Array.isArray(parsed.notes) ? parsed.notes : [];

  for (const cmd of parsed.commands) {
    if (!cmd.squad_id || typeof cmd.squad_id !== 'string') {
      notes.push('Command missing squad_id, skipped');
      continue;
    }
    if (!cmd.action || !VALID_ACTIONS.has(cmd.action)) {
      notes.push(`Invalid action "${cmd.action}" for squad "${cmd.squad_id}", skipped`);
      continue;
    }

    const validCmd: RawLLMCommand = {
      squad_id: cmd.squad_id,
      action: cmd.action,
    };

    if (cmd.target_position && typeof cmd.target_position.x === 'number' && typeof cmd.target_position.y === 'number') {
      validCmd.target_position = { x: cmd.target_position.x, y: cmd.target_position.y };
    }
    if (cmd.target_squad_id && typeof cmd.target_squad_id === 'string') {
      validCmd.target_squad_id = cmd.target_squad_id;
    }
    if (cmd.target_zone_id && typeof cmd.target_zone_id === 'string') {
      validCmd.target_zone_id = cmd.target_zone_id;
    }
    if (cmd.formation && VALID_FORMATIONS.has(cmd.formation)) {
      validCmd.formation = cmd.formation;
    }
    if (cmd.condition && cmd.condition.type && VALID_CONDITIONS.has(cmd.condition.type)) {
      validCmd.condition = {
        type: cmd.condition.type,
        threshold: typeof cmd.condition.threshold === 'number' ? cmd.condition.threshold : undefined,
      };
    }
    if (cmd.fallback && cmd.fallback.action && VALID_ACTIONS.has(cmd.fallback.action)) {
      validCmd.fallback = {
        action: cmd.fallback.action,
        target_position: cmd.fallback.target_position,
        formation: cmd.fallback.formation && VALID_FORMATIONS.has(cmd.fallback.formation) ? cmd.fallback.formation : undefined,
      };
    }

    validCommands.push(validCmd);
  }

  return {
    response: { commands: validCommands, notes },
    error: null,
  };
}

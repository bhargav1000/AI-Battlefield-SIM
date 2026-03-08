import { MatchState, Order, ActionType, FormationType } from '../types';
import { RawLLMCommand, CommandInterpretationResult } from '../types';
import { clamp } from '../utils/math';

const VALID_ACTIONS = new Set<ActionType>(['move', 'hold', 'attack', 'defend_area', 'retreat', 'reform', 'flank', 'support']);

export function validateCommands(
  commands: RawLLMCommand[],
  state: MatchState,
  rawResponse: string,
  playerText: string,
  notes: string[]
): CommandInterpretationResult {
  const validOrders: Order[] = [];
  const warnings: string[] = [...notes];
  const errors: string[] = [];

  const playerSquadIds = new Set(state.squads.filter((s) => s.faction === 'player').map((s) => s.id));
  const enemySquadIds = new Set(state.squads.filter((s) => s.faction === 'enemy').map((s) => s.id));
  const zoneIds = new Set(state.map.zones.map((z) => z.id));
  const seenSquads = new Set<string>();

  for (const cmd of commands) {
    // 1. Reject unknown squad IDs
    if (!playerSquadIds.has(cmd.squad_id)) {
      warnings.push(`Unknown or non-player squad ID "${cmd.squad_id}", skipped`);
      continue;
    }

    // 2. Reject duplicate orders
    if (seenSquads.has(cmd.squad_id)) {
      warnings.push(`Duplicate order for squad "${cmd.squad_id}", keeping first`);
      continue;
    }

    // 3. Reject unsupported actions
    if (!VALID_ACTIONS.has(cmd.action as ActionType)) {
      warnings.push(`Unknown action "${cmd.action}" for squad "${cmd.squad_id}", skipped`);
      continue;
    }

    // 4. Validate target squad ID
    if (cmd.target_squad_id && !enemySquadIds.has(cmd.target_squad_id)) {
      warnings.push(`Unknown target squad "${cmd.target_squad_id}", removed target`);
      cmd.target_squad_id = undefined;
    }

    // 5. Validate zone ID
    if (cmd.target_zone_id && !zoneIds.has(cmd.target_zone_id)) {
      warnings.push(`Unknown zone "${cmd.target_zone_id}", removed zone target`);
      cmd.target_zone_id = undefined;
    }

    // 6. Clamp positions to map bounds
    if (cmd.target_position) {
      cmd.target_position.x = clamp(Math.round(cmd.target_position.x), 0, state.map.width - 1);
      cmd.target_position.y = clamp(Math.round(cmd.target_position.y), 0, state.map.height - 1);
    }

    // 7. Reject orders for routing squads
    const squad = state.squads.find((s) => s.id === cmd.squad_id);
    if (squad?.isRouting) {
      warnings.push(`Squad "${cmd.squad_id}" is routing and cannot receive orders`);
      continue;
    }

    // 8. Action-specific validation
    if (cmd.action === 'attack' && !cmd.target_squad_id) {
      warnings.push(`Attack order for "${cmd.squad_id}" has no target, converting to ${cmd.target_position ? 'move' : 'hold'}`);
      cmd.action = cmd.target_position ? 'move' : 'hold';
    }

    // 9. If zone target but no position, use zone center
    if (cmd.target_zone_id && !cmd.target_position) {
      const zone = state.map.zones.find((z) => z.id === cmd.target_zone_id);
      if (zone) {
        cmd.target_position = { x: zone.center.x, y: zone.center.y };
      }
    }

    seenSquads.add(cmd.squad_id);

    // Convert to Order
    const order: Order = {
      squadId: cmd.squad_id,
      action: cmd.action as ActionType,
    };
    if (cmd.target_position) order.targetPosition = cmd.target_position;
    if (cmd.target_squad_id) order.targetSquadId = cmd.target_squad_id;
    if (cmd.target_zone_id) order.targetZoneId = cmd.target_zone_id;
    if (cmd.formation) order.formation = cmd.formation as FormationType;
    if (cmd.condition) {
      order.condition = {
        type: cmd.condition.type as Order['condition'] extends { type: infer T } ? T : never,
        threshold: cmd.condition.threshold,
      } as any;
    }
    if (cmd.fallback) {
      order.fallback = {
        action: cmd.fallback.action as ActionType,
        targetPosition: cmd.fallback.target_position,
        formation: cmd.fallback.formation as FormationType | undefined,
      };
    }

    validOrders.push(order);
  }

  return {
    success: validOrders.length > 0,
    orders: validOrders,
    warnings,
    errors,
    rawLLMResponse: rawResponse,
    playerText,
  };
}

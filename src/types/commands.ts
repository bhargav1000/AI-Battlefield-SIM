import { Order } from './game-state';

export interface RawLLMCommand {
  squad_id: string;
  action: string;
  target_position?: { x: number; y: number };
  target_squad_id?: string;
  target_zone_id?: string;
  formation?: string;
  condition?: {
    type: string;
    threshold?: number;
  };
  fallback?: {
    action: string;
    target_position?: { x: number; y: number };
    formation?: string;
  };
}

export interface RawLLMResponse {
  commands: RawLLMCommand[];
  notes?: string[];
}

export interface CommandInterpretationResult {
  success: boolean;
  orders: Order[];
  warnings: string[];
  errors: string[];
  rawLLMResponse: string;
  playerText: string;
}

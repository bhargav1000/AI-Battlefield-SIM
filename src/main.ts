import { MatchState, Order, ActionType, FormationType, CommandInterpretationResult } from './types';
import { CanvasRenderer } from './renderer/canvas-renderer';
import { simulationTick } from './engine/simulation-engine';
import { createDefaultBattle } from './scenarios/default-battle';
import { CommandInterpreter } from './interpreter/command-interpreter';
import { generateEnemyOrders } from './behavior/enemy-ai';
import { TICKS_PER_TURN, TICK_INTERVAL_MS } from './utils/constants';
import { worldToScreen } from './renderer/isometric';

class Game {
  private state: MatchState;
  private renderer: CanvasRenderer;
  private interpreter: CommandInterpreter;
  private executionTimer: number | null = null;
  private lastInterpretation: CommandInterpretationResult | null = null;
  private debugMode = false;

  // DOM elements
  private commandInput: HTMLInputElement;
  private btnInterpret: HTMLButtonElement;
  private btnExecute: HTMLButtonElement;
  private phaseDisplay: HTMLElement;
  private turnDisplay: HTMLElement;
  private tickDisplay: HTMLElement;
  private squadInfo: HTMLElement;
  private battleLog: HTMLElement;
  private orderPreview: HTMLElement;
  private settingsPanel: HTMLElement;
  private apiKeyInput: HTMLInputElement;

  constructor() {
    this.state = createDefaultBattle();
    this.renderer = new CanvasRenderer('game-canvas');
    this.interpreter = new CommandInterpreter();

    // Get DOM elements
    this.commandInput = document.getElementById('command-input') as HTMLInputElement;
    this.btnInterpret = document.getElementById('btn-interpret') as HTMLButtonElement;
    this.btnExecute = document.getElementById('btn-execute') as HTMLButtonElement;
    this.phaseDisplay = document.getElementById('phase-display')!;
    this.turnDisplay = document.getElementById('turn-display')!;
    this.tickDisplay = document.getElementById('tick-display')!;
    this.squadInfo = document.getElementById('squad-info')!;
    this.battleLog = document.getElementById('battle-log')!;
    this.orderPreview = document.getElementById('order-preview')!;
    this.settingsPanel = document.getElementById('settings-panel')!;
    this.apiKeyInput = document.getElementById('api-key-input') as HTMLInputElement;

    this.setupEventListeners();
    this.loadApiKey();
    this.centerCamera();
    this.render();
    this.updateUI();
  }

  private setupEventListeners(): void {
    this.btnInterpret.addEventListener('click', () => this.handleInterpret());
    this.btnExecute.addEventListener('click', () => this.handleExecute());

    this.commandInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (this.lastInterpretation?.success) {
          this.handleExecute();
        } else {
          this.handleInterpret();
        }
      }
      // Prevent camera movement while typing
      e.stopPropagation();
    });

    document.getElementById('btn-settings')!.addEventListener('click', () => {
      this.settingsPanel.style.display = this.settingsPanel.style.display === 'none' ? 'block' : 'none';
    });

    document.getElementById('btn-save-settings')!.addEventListener('click', () => {
      const key = this.apiKeyInput.value.trim();
      if (key) {
        localStorage.setItem('openai_api_key', key);
        this.interpreter.setApiKey(key);
        this.settingsPanel.style.display = 'none';
      }
    });

    document.getElementById('btn-debug')!.addEventListener('click', () => {
      this.debugMode = !this.debugMode;
    });
  }

  private loadApiKey(): void {
    const key = localStorage.getItem('openai_api_key');
    if (key) {
      this.interpreter.setApiKey(key);
      this.apiKeyInput.value = key;
    }
  }

  private centerCamera(): void {
    const center = worldToScreen(this.state.map.width / 2, this.state.map.height / 2);
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.renderer.camera.x = canvas.width / 2 - center.x * this.renderer.camera.zoom;
    this.renderer.camera.y = canvas.height / 3 - center.y * this.renderer.camera.zoom;
  }

  private async handleInterpret(): Promise<void> {
    const text = this.commandInput.value.trim();
    if (!text) return;
    if (this.state.phase !== 'command') return;

    // If no API key, try to parse as a simple structured command
    if (!this.interpreter.hasApiKey()) {
      const orders = parseSimpleCommand(text, this.state);
      if (orders.length > 0) {
        this.lastInterpretation = {
          success: true,
          orders,
          warnings: ['Using local parser (no API key). Set API key in Settings for natural language.'],
          errors: [],
          rawLLMResponse: '',
          playerText: text,
        };
        this.showOrderPreview(this.lastInterpretation);
        return;
      }

      this.showOrderPreview({
        success: false,
        orders: [],
        warnings: [],
        errors: ['No API key set. Configure in Settings, or use format: "squad_name action target"'],
        rawLLMResponse: '',
        playerText: text,
      });
      return;
    }

    this.btnInterpret.textContent = 'Interpreting...';
    this.btnInterpret.disabled = true;

    try {
      this.lastInterpretation = await this.interpreter.interpret(text, this.state);
      this.showOrderPreview(this.lastInterpretation);
    } catch (err: any) {
      this.showOrderPreview({
        success: false,
        orders: [],
        warnings: [],
        errors: [err.message],
        rawLLMResponse: '',
        playerText: text,
      });
    }

    this.btnInterpret.textContent = 'Interpret';
    this.btnInterpret.disabled = false;
  }

  private showOrderPreview(result: CommandInterpretationResult): void {
    this.orderPreview.style.display = 'block';

    let html = '';
    if (result.errors.length > 0) {
      html += result.errors.map((e) => `<div style="color:#ef5350">Error: ${e}</div>`).join('');
    }
    if (result.warnings.length > 0) {
      html += result.warnings.map((w) => `<div class="warning">Note: ${w}</div>`).join('');
    }
    if (result.orders.length > 0) {
      html += '<div style="margin-top:6px;color:#4fc3f7">Interpreted Orders:</div>';
      for (const order of result.orders) {
        const squad = this.state.squads.find((s) => s.id === order.squadId);
        let desc = `<b>${squad?.name ?? order.squadId}</b>: ${order.action}`;
        if (order.targetPosition) desc += ` to (${order.targetPosition.x}, ${order.targetPosition.y})`;
        if (order.targetSquadId) {
          const target = this.state.squads.find((s) => s.id === order.targetSquadId);
          desc += ` targeting ${target?.name ?? order.targetSquadId}`;
        }
        if (order.formation) desc += ` in ${order.formation} formation`;
        if (order.condition) desc += ` [${order.condition.type}${order.condition.threshold ? ` < ${order.condition.threshold}` : ''}]`;
        if (order.fallback) desc += ` → fallback: ${order.fallback.action}`;
        html += `<div style="padding:2px 0">${desc}</div>`;
      }
      html += '<div style="margin-top:6px;color:#aaa;font-size:11px">Press Execute or Enter to confirm</div>';
    }

    this.orderPreview.innerHTML = html;
  }

  private handleExecute(): void {
    if (this.state.phase !== 'command') return;

    // Use interpreted orders if available, otherwise check for direct text
    let playerOrders: Order[] = [];
    if (this.lastInterpretation?.success) {
      playerOrders = this.lastInterpretation.orders;
    }

    // Generate enemy orders
    const enemyOrders = generateEnemyOrders(this.state);

    // Queue all orders
    this.state.pendingOrders = [...playerOrders, ...enemyOrders];
    this.state.phase = 'execution';
    this.state.executionTicksRemaining = TICKS_PER_TURN;

    // Clear UI
    this.orderPreview.style.display = 'none';
    this.lastInterpretation = null;
    this.commandInput.value = '';
    this.commandInput.disabled = true;
    this.btnInterpret.disabled = true;
    this.btnExecute.disabled = true;

    // Log
    this.state.battleLog.push({
      tick: this.state.tick,
      turn: this.state.turnNumber,
      message: `Turn ${this.state.turnNumber}: Orders issued, executing...`,
      type: 'system',
    });

    // Start execution loop
    this.startExecution();
  }

  private startExecution(): void {
    this.executionTimer = window.setInterval(() => {
      if (this.state.executionTicksRemaining <= 0 || this.state.phase === 'victory' || this.state.phase === 'defeat') {
        this.stopExecution();
        return;
      }

      simulationTick(this.state);
      this.render();
      this.updateUI();
    }, TICK_INTERVAL_MS);
  }

  private stopExecution(): void {
    if (this.executionTimer !== null) {
      clearInterval(this.executionTimer);
      this.executionTimer = null;
    }

    if (this.state.phase === 'execution') {
      // Move to next command phase
      this.state.phase = 'command';
      this.state.turnNumber++;
      this.state.battleLog.push({
        tick: this.state.tick,
        turn: this.state.turnNumber,
        message: `Turn ${this.state.turnNumber}: Awaiting orders.`,
        type: 'system',
      });
    }

    this.commandInput.disabled = false;
    this.btnInterpret.disabled = false;
    this.btnExecute.disabled = false;
    this.updateUI();
  }

  private render(): void {
    this.renderer.render(this.state);
    requestAnimationFrame(() => {}); // ensure repaint
  }

  private updateUI(): void {
    // Phase display
    const phaseLabels: Record<string, string> = {
      command: 'COMMAND PHASE',
      execution: 'EXECUTING...',
      victory: 'VICTORY!',
      defeat: 'DEFEAT',
    };
    this.phaseDisplay.textContent = phaseLabels[this.state.phase] ?? this.state.phase;
    this.turnDisplay.textContent = `Turn ${this.state.turnNumber}`;
    this.tickDisplay.textContent = this.state.phase === 'execution' ? `Tick ${this.state.tick} (${this.state.executionTicksRemaining} remaining)` : '';

    // Squad info panel
    this.updateSquadInfo();

    // Battle log
    this.updateBattleLog();
  }

  private updateSquadInfo(): void {
    const playerSquads = this.state.squads.filter((s) => s.faction === 'player');
    const enemySquads = this.state.squads.filter((s) => s.faction === 'enemy');

    let html = '<div style="font-weight:bold;margin-bottom:6px;color:#4fc3f7">Your Forces</div>';
    for (const squad of playerSquads) {
      html += this.renderSquadCard(squad, 'player');
    }

    html += '<div style="font-weight:bold;margin-top:10px;margin-bottom:6px;color:#ef5350">Enemy Forces</div>';
    for (const squad of enemySquads) {
      html += this.renderSquadCard(squad, 'enemy');
    }

    this.squadInfo.innerHTML = html;
  }

  private renderSquadCard(squad: any, cssClass: string): string {
    const moraleRatio = squad.morale.current / squad.morale.max;
    let moraleColor = '#4caf50';
    if (squad.morale.current < 30) moraleColor = '#f44336';
    else if (squad.morale.current < 60) moraleColor = '#ff9800';

    const status = squad.isRouting ? ' [ROUTING]' : squad.soldierCount <= 0 ? ' [DESTROYED]' : squad.isEngaged ? ' [ENGAGED]' : '';
    const opacity = squad.soldierCount <= 0 ? 'opacity:0.4' : '';

    return `<div class="squad-card" style="${opacity}">
      <div class="name ${cssClass}">${squad.name}${status}</div>
      <div>${squad.soldierCount}/${squad.maxSoldiers} soldiers | ${squad.formation} | Fatigue: ${Math.round(squad.fatigue * 100)}%</div>
      <div class="morale-bar"><div class="morale-bar-fill" style="width:${moraleRatio * 100}%;background:${moraleColor}"></div></div>
      <div style="font-size:10px;color:#888">Morale: ${Math.round(squad.morale.current)}/${squad.morale.max}${squad.currentOrder ? ` | Order: ${squad.currentOrder.action}` : ''}</div>
    </div>`;
  }

  private updateBattleLog(): void {
    const entries = this.state.battleLog.slice(-30);
    let html = '';
    for (const entry of entries.reverse()) {
      html += `<div class="log-entry log-${entry.type}">[T${entry.turn}] ${entry.message}</div>`;
    }
    this.battleLog.innerHTML = html;
  }
}

/**
 * Simple local command parser for when no API key is available.
 * Supports basic patterns like: "1st Infantry move 20 15 line"
 */
function parseSimpleCommand(text: string, state: MatchState): Order[] {
  const orders: Order[] = [];
  const playerSquads = state.squads.filter((s) => s.faction === 'player' && s.soldierCount > 0 && !s.isRouting);
  const enemySquads = state.squads.filter((s) => s.faction === 'enemy' && s.soldierCount > 0);

  const validActions: ActionType[] = ['move', 'hold', 'attack', 'defend_area', 'retreat', 'reform', 'flank', 'support'];
  const validFormations: FormationType[] = ['line', 'column', 'square', 'loose'];

  // Try to parse "all <action>" commands
  const lowerText = text.toLowerCase().trim();
  if (lowerText.startsWith('all ')) {
    const parts = lowerText.split(/\s+/);
    const action = parts[1] as ActionType;
    if (validActions.includes(action)) {
      for (const squad of playerSquads) {
        const order: Order = { squadId: squad.id, action };
        if (parts.length >= 4 && !isNaN(Number(parts[2])) && !isNaN(Number(parts[3]))) {
          order.targetPosition = { x: Number(parts[2]), y: Number(parts[3]) };
        }
        const formWord = parts.find((p) => validFormations.includes(p as FormationType));
        if (formWord) order.formation = formWord as FormationType;
        orders.push(order);
      }
      return orders;
    }
  }

  // Try line-by-line parsing
  const lines = text.split(/[;,\n]+/).map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    const lower = line.toLowerCase();

    // Find which squad this line refers to
    let matchedSquad = playerSquads.find((s) => lower.includes(s.name.toLowerCase()));
    if (!matchedSquad) {
      matchedSquad = playerSquads.find((s) => lower.includes(s.id.toLowerCase()));
    }
    if (!matchedSquad) continue;

    // Find action
    let action: ActionType = 'hold';
    for (const a of validActions) {
      if (lower.includes(a.replace('_', ' ')) || lower.includes(a)) {
        action = a;
        break;
      }
    }

    const order: Order = { squadId: matchedSquad.id, action };

    // Find position (two numbers)
    const numMatch = line.match(/(\d+)\s+(\d+)/);
    if (numMatch) {
      order.targetPosition = { x: Number(numMatch[1]), y: Number(numMatch[2]) };
    }

    // Find target enemy
    const targetEnemy = enemySquads.find((s) => lower.includes(s.name.toLowerCase()));
    if (targetEnemy) {
      order.targetSquadId = targetEnemy.id;
    }

    // Find zone
    const zone = state.map.zones.find((z) => lower.includes(z.id.replace(/_/g, ' ')));
    if (zone) {
      order.targetZoneId = zone.id;
      if (!order.targetPosition) {
        order.targetPosition = { x: zone.center.x, y: zone.center.y };
      }
    }

    // Find formation
    const formWord = validFormations.find((f) => lower.includes(f));
    if (formWord) order.formation = formWord;

    orders.push(order);
  }

  return orders;
}

// Start the game
new Game();

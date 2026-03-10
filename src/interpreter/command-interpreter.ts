import { MatchState, CommandInterpretationResult } from '../types';
import { buildPrompt } from './prompt-builder';
import { parseResponse } from './response-parser';
import { validateCommands } from './command-validator';

export class CommandInterpreter {
  private apiKey: string = '';

  setApiKey(key: string): void {
    this.apiKey = key;
  }

  hasApiKey(): boolean {
    return this.apiKey.length > 0;
  }

  async interpret(playerText: string, state: MatchState): Promise<CommandInterpretationResult> {
    if (!this.apiKey) {
      return {
        success: false,
        orders: [],
        warnings: [],
        errors: ['No API key configured. Please set your OpenAI API key in Settings.'],
        rawLLMResponse: '',
        playerText,
      };
    }

    const { systemPrompt, userMessage } = buildPrompt(playerText, state);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: 1024,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        return {
          success: false,
          orders: [],
          warnings: [],
          errors: [`API error (${response.status}): ${errText.substring(0, 200)}`],
          rawLLMResponse: errText,
          playerText,
        };
      }

      const data = await response.json();
      const rawText = data.choices?.[0]?.message?.content ?? '';

      const { response: parsed, error } = parseResponse(rawText);
      if (error || !parsed) {
        return {
          success: false,
          orders: [],
          warnings: [],
          errors: [error ?? 'Unknown parse error'],
          rawLLMResponse: rawText,
          playerText,
        };
      }

      return validateCommands(parsed.commands, state, rawText, playerText, parsed.notes ?? []);
    } catch (err: any) {
      return {
        success: false,
        orders: [],
        warnings: [],
        errors: [`Network error: ${err.message}`],
        rawLLMResponse: '',
        playerText,
      };
    }
  }
}

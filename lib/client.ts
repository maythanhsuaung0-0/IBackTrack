import { browser } from 'wxt/browser';
import type { Command } from './storage';
import type { ConversationState } from './types';

export async function request(command: Command): Promise<ConversationState> {
  const response = await browser.runtime.sendMessage({
    channel: 'backtrack',
    command,
  });
  if (!response?.ok)
    throw new Error(
      response?.error ??
        'Backtrack could not save. Reload this tab and try again.',
    );
  return response.state;
}

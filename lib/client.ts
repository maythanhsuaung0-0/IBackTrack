import { extensionApi } from './extension-api';
import { parseState, type Command } from './storage';
import type { ConversationState } from './types';

export const RESPONSE_TIMEOUT_MS = 8000;
const RELOAD = 'Reload Backtrack at chrome://extensions, then refresh ChatGPT.';
export class ResponseTimeoutError extends Error {
  constructor(action: Command['action']) {
    super(
      action === 'read'
        ? `Backtrack did not respond. ${RELOAD}`
        : `The ${action === 'add' ? 'save' : 'change'} was not confirmed. Check Saved items before trying again. ${RELOAD}`,
    );
    this.name = 'ResponseTimeoutError';
  }
}

export function request(command: Command): Promise<ConversationState> {
  const api = extensionApi();
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(
      () => finish(new ResponseTimeoutError(command.action)),
      RESPONSE_TIMEOUT_MS,
    );
    function finish(error?: unknown, state?: ConversationState) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve(state!);
    }
    function receive(response: unknown) {
      // lastError must be consumed in the callback even if it arrived late.
      const channelError = api.runtime.lastError;
      if (settled) return;
      if (channelError) {
        finish(new Error(`Backtrack lost its connection. ${RELOAD}`));
        return;
      }
      if (!response || typeof response !== 'object') {
        finish(new Error(`Backtrack returned no response. ${RELOAD}`));
        return;
      }
      const result = response as {
        ok?: boolean;
        state?: unknown;
        error?: unknown;
      };
      if (result.ok !== true || result.state === undefined) {
        finish(
          new Error(
            typeof result.error === 'string'
              ? result.error
              : `Backtrack returned an invalid response. ${RELOAD}`,
          ),
        );
        return;
      }
      try {
        finish(undefined, parseState(result.state, command.key));
      } catch (error) {
        finish(error);
      }
    }
    try {
      const pending: unknown = api.runtime.sendMessage(
        { channel: 'backtrack', command },
        receive,
      );
      // Some API shims return a Promise even with a callback. Handle rejections
      // and responses there too, while settling the request exactly once.
      if (
        pending &&
        typeof (pending as PromiseLike<unknown>).then === 'function'
      ) {
        void Promise.resolve(pending).then(receive, () =>
          finish(new Error(`Backtrack lost its connection. ${RELOAD}`)),
        );
      }
    } catch {
      finish(new Error(`Backtrack lost its connection. ${RELOAD}`));
    }
  });
}

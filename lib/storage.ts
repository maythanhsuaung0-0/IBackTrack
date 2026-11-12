import type { ConversationState, LocationRef, SavedItem } from './types';

export const STORE_PREFIX = 'backtrack:v1:';
export const EMPTY: ConversationState = { schemaVersion: 1, items: [] };
export type Command =
  | { action: 'read'; key: string }
  | {
      action: 'add';
      key: string;
      type: SavedItem['type'];
      location: LocationRef;
    }
  | { action: 'delete' | 'keep'; key: string; id: string }
  | { action: 'rename'; key: string; id: string; label: string }
  | { action: 'resume'; key: string };

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function short(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.length <= max;
}
function validLocation(value: unknown, key: string): value is LocationRef {
  if (
    !record(value) ||
    value.conversationKey !== key ||
    !short(value.fingerprint, 80)
  )
    return false;
  if (value.messageKey !== undefined && !short(value.messageKey, 200))
    return false;
  const a = value.anchor;
  return (
    record(a) &&
    short(a.exact, 600) &&
    Boolean(a.exact.trim()) &&
    short(a.prefix, 64) &&
    short(a.suffix, 64) &&
    Number.isInteger(a.start) &&
    Number(a.start) >= 0
  );
}

/** Reject corrupt or newer schemas; never replace them with an empty record. */
export function parseState(value: unknown, key: string): ConversationState {
  if (value === undefined) return structuredClone(EMPTY);
  if (
    !record(value) ||
    value.schemaVersion !== 1 ||
    !Array.isArray(value.items) ||
    value.items.length > 200
  )
    throw new Error(
      'Saved data could not be read. It has been left untouched.',
    );
  const ids = new Set<string>();
  for (const item of value.items) {
    if (
      !record(item) ||
      !short(item.id, 100) ||
      ids.has(item.id) ||
      !['checkpoint', 'highlight'].includes(String(item.type)) ||
      !validLocation(item.location, key) ||
      !short(item.label, 80) ||
      typeof item.kept !== 'boolean' ||
      !Number.isFinite(item.createdAt)
    )
      throw new Error(
        'Saved data could not be read. It has been left untouched.',
      );
    ids.add(item.id);
  }
  if (
    value.activeId !== undefined &&
    (!short(value.activeId, 100) ||
      !value.items.some(
        (item) => item.id === value.activeId && item.type === 'checkpoint',
      ))
  )
    throw new Error(
      'Saved data could not be read. It has been left untouched.',
    );
  return value as unknown as ConversationState;
}

export interface Driver {
  get(key: string): Promise<unknown>;
  set(key: string, value: ConversationState): Promise<void>;
  bytes(): Promise<number>;
}

/** One service-worker queue serializes writes from all tabs. */
export class Repository {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private driver: Driver) {}

  execute(command: Command): Promise<ConversationState> {
    const work = this.queue.then(() => this.run(command));
    this.queue = work.catch(() => undefined);
    return work;
  }

  private async run(c: Command): Promise<ConversationState> {
    if (!c || !/^chatgpt:[a-zA-Z0-9-]+$/.test(c.key))
      throw new Error('Open a saved ChatGPT conversation first.');
    const storeKey = STORE_PREFIX + c.key;
    const state = structuredClone(
      parseState(await this.driver.get(storeKey), c.key),
    );
    if (c.action === 'read') return state;
    if (c.action === 'add') {
      if (
        !['checkpoint', 'highlight'].includes(c.type) ||
        !validLocation(c.location, c.key)
      )
        throw new Error('That passage could not be saved. Select it again.');
      if (state.items.length >= 200 || (await this.driver.bytes()) > 8_000_000)
        throw new Error(
          'Backtrack storage is full. Remove some saved items, then try again.',
        );
      if (c.type === 'checkpoint')
        state.items = state.items.filter(
          (item) => item.id !== state.activeId || item.kept,
        );
      const item: SavedItem = {
        id: crypto.randomUUID(),
        type: c.type,
        location: c.location,
        label: '',
        kept: false,
        createdAt: Date.now(),
      };
      state.items.unshift(item);
      if (c.type === 'checkpoint') state.activeId = item.id;
    } else if (c.action === 'resume') {
      state.items = state.items.filter(
        (item) => item.id !== state.activeId || item.kept,
      );
      delete state.activeId;
    } else if (
      c.action === 'delete' ||
      c.action === 'keep' ||
      c.action === 'rename'
    ) {
      const item = state.items.find((i) => i.id === c.id);
      if (!item)
        throw new Error('This item was already removed in another tab.');
      if (c.action === 'delete') {
        state.items = state.items.filter((i) => i.id !== c.id);
        if (state.activeId === c.id) delete state.activeId;
      } else if (c.action === 'keep' && item.type === 'checkpoint')
        item.kept = true;
      else if (
        c.action === 'rename' &&
        item.type === 'checkpoint' &&
        short(c.label, 80) &&
        c.label.trim()
      )
        item.label = c.label.trim();
      else throw new Error('Use a name between 1 and 80 characters.');
    } else throw new Error('Unknown Backtrack action.');
    await this.driver.set(
      storeKey,
      JSON.parse(JSON.stringify(state)) as ConversationState,
    );
    return state;
  }
}

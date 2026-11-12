import { act, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import type { ContentScriptContext } from 'wxt/utils/content-script-context';

const mounted = vi.hoisted(() => ({
  remove: vi.fn(),
  contextCleanup: undefined as undefined | (() => void),
  unmount: undefined as undefined | (() => void),
}));
vi.mock('wxt/utils/define-content-script', () => ({
  defineContentScript: (config: unknown) => config,
}));
vi.mock('wxt/utils/content-script-ui/shadow-root', () => ({
  createShadowRootUi: async (
    _ctx: unknown,
    options: {
      onMount: (element: HTMLElement) => { unmount: () => void };
      onRemove: (root: { unmount: () => void }) => void;
    },
  ) => {
    const host = document.createElement('backtrack-reader');
    const shadow = host.attachShadow({ mode: 'open' });
    const container = document.createElement('div');
    shadow.append(container);
    document.body.append(host);
    let root: { unmount: () => void };
    return {
      mount() {
        root = options.onMount(container);
      },
      remove() {
        mounted.remove();
        options.onRemove(root);
        host.remove();
      },
    };
  },
}));
vi.mock('wxt/browser', () => ({
  browser: {
    runtime: {
      sendMessage: vi.fn((_message, reply) =>
        reply({
          ok: true,
          state: { schemaVersion: 1, items: [] },
        }),
      ),
    },
    storage: { onChanged: { addListener: vi.fn(), removeListener: vi.fn() } },
  },
}));

it('mounts a single isolated UI and removes it on context invalidation', async () => {
  const { default: entry } = await import('../entrypoints/chatgpt.content');
  const ctx = {
    onInvalidated: (cleanup: () => void) => {
      mounted.contextCleanup = cleanup;
    },
  } as unknown as ContentScriptContext;
  await act(async () => {
    await entry.main(ctx);
  });
  const host = document.querySelector('backtrack-reader')!;
  await waitFor(() =>
    expect(
      host.shadowRoot!.querySelector(
        '[aria-label="Backtrack reading controls"]',
      ),
    ).not.toBeNull(),
  );
  expect(
    document.querySelector('style[data-backtrack="highlights"]'),
  ).not.toBeNull();
  act(() => mounted.contextCleanup!());
  expect(mounted.remove).toHaveBeenCalledOnce();
  expect(document.querySelector('backtrack-reader')).toBeNull();
  expect(
    document.querySelector('style[data-backtrack="highlights"]'),
  ).toBeNull();
});

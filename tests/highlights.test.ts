import { afterEach, describe, expect, it, vi } from 'vitest';
import { captureSelection } from '../features/anchors';
import {
  emphasize,
  installHighlightStyles,
  renderHighlights,
} from '../features/highlights';
import { fixture, key, memory, selectText } from './fixtures';

afterEach(() => vi.unstubAllGlobals());
describe('non-destructive highlight rendering', () => {
  it('restores overlapping ranges and removes just the deleted record', async () => {
    const registry = new Map();
    vi.stubGlobal('CSS', { highlights: registry });
    vi.stubGlobal(
      'Highlight',
      class {
        constructor(...ranges: Range[]) {
          Object.assign(this, { ranges });
        }
      },
    );
    const el = fixture();
    const initial = el.innerHTML;
    const { repository } = memory();
    selectText(el, 'entropy and ');
    const a = captureSelection(key)!.location;
    selectText(el.querySelector('code')!, 'information gain');
    const b = captureSelection(key)!.location;
    await repository.execute({
      action: 'add',
      key,
      type: 'highlight',
      location: a,
    });
    const state = await repository.execute({
      action: 'add',
      key,
      type: 'highlight',
      location: b,
    });
    const remove = installHighlightStyles();
    expect(renderHighlights(state, key)).toEqual({
      supported: true,
      unavailable: 0,
    });
    expect(registry.get('backtrack-important').ranges).toHaveLength(2);
    expect(el.innerHTML).toBe(initial);
    const next = await repository.execute({
      action: 'delete',
      key,
      id: state.items[0]!.id,
    });
    renderHighlights(next, key);
    expect(registry.get('backtrack-important').ranges).toHaveLength(1);
    remove();
    expect(registry.size).toBe(0);
    expect(document.querySelector('style[data-backtrack]')).toBeNull();
  });
  it('reconstructs saved highlights after a DOM remount', async () => {
    const registry = new Map();
    vi.stubGlobal('CSS', { highlights: registry });
    vi.stubGlobal(
      'Highlight',
      class {
        constructor(...ranges: Range[]) {
          Object.assign(this, { ranges });
        }
      },
    );
    const el = fixture();
    selectText(el, 'entropy and ');
    const { repository } = memory();
    const state = await repository.execute({
      action: 'add',
      key,
      type: 'highlight',
      location: captureSelection(key)!.location,
    });
    fixture();
    expect(renderHighlights(state, key).unavailable).toBe(0);
    expect(
      registry.get('backtrack-important').ranges[0].startContainer.isConnected,
    ).toBe(true);
  });
  it('reports unavailable source and unsupported rendering gracefully', async () => {
    vi.stubGlobal('CSS', {});
    const el = fixture();
    selectText(el, 'entropy and ');
    const { repository } = memory();
    const state = await repository.execute({
      action: 'add',
      key,
      type: 'highlight',
      location: captureSelection(key)!.location,
    });
    el.remove();
    expect(renderHighlights(state, key)).toEqual({
      supported: false,
      unavailable: 1,
    });
  });
  it('emphasizes a return temporarily and cleans up timers', () => {
    vi.useFakeTimers();
    const registry = new Map();
    vi.stubGlobal('CSS', { highlights: registry });
    vi.stubGlobal('Highlight', class {});
    const el = fixture();
    const range = selectText(el, 'entropy and ');
    const clean = emphasize(range);
    expect(registry.has('backtrack-return')).toBe(true);
    vi.advanceTimersByTime(2600);
    expect(registry.has('backtrack-return')).toBe(false);
    clean();
  });
});

it('keeps highlight text readable in both light and dark palettes', () => {
  const cleanupStyles = installHighlightStyles();
  const css = document.querySelector<HTMLStyleElement>(
    'style[data-backtrack="highlights"]',
  )!.textContent!;
  const pairs = [
    ...css.matchAll(/background:(#[0-9a-f]+);color:(#[0-9a-f]+)/g),
  ];
  const luminance = (hex: string) => {
    const channels = [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return (
      0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!
    );
  };
  expect(pairs).toHaveLength(4);
  for (const pair of pairs) {
    const a = luminance(pair[1]!);
    const b = luminance(pair[2]!);
    expect(
      (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
    ).toBeGreaterThanOrEqual(4.5);
  }
  cleanupStyles();
});

import { resolve } from '../anchors';
import type { ConversationState } from '../../lib/types';

const PERSISTENT = 'backtrack-important';
const RETURN = 'backtrack-return';
interface HighlightRegistry {
  set(name: string, value: unknown): void;
  delete(name: string): boolean;
}
type HighlightConstructor = new (...ranges: Range[]) => unknown;
function api(): {
  registry: HighlightRegistry;
  Highlight: HighlightConstructor;
} | null {
  const registry = (
    globalThis.CSS as unknown as { highlights?: HighlightRegistry } | undefined
  )?.highlights;
  const Highlight = (
    globalThis as unknown as { Highlight?: HighlightConstructor }
  ).Highlight;
  return registry && Highlight ? { registry, Highlight } : null;
}

export function installHighlightStyles(): () => void {
  const style = document.createElement('style');
  style.dataset.backtrack = 'highlights';
  style.textContent = `::highlight(${PERSISTENT}){background:#f8dd85;color:#292410}::highlight(${RETURN}){background:#b7e7d6;color:#15382d}@media(prefers-color-scheme:dark){::highlight(${PERSISTENT}){background:#65501d;color:#fff3c5}::highlight(${RETURN}){background:#285b4b;color:#e0fff2}}`;
  document.head.append(style);
  return () => {
    style.remove();
    api()?.registry.delete(PERSISTENT);
    api()?.registry.delete(RETURN);
  };
}

export function renderHighlights(
  state: ConversationState,
  key: string,
): { unavailable: number; supported: boolean } {
  const engine = api();
  const items = state.items.filter((item) => item.type === 'highlight');
  const ranges: Range[] = [];
  for (const item of items) {
    const result = resolve(item.location, key);
    if (result.status === 'found') ranges.push(result.range);
  }
  if (engine) engine.registry.set(PERSISTENT, new engine.Highlight(...ranges));
  return {
    supported: Boolean(engine),
    unavailable: items.length - ranges.length,
  };
}

export function clearHighlights(): void {
  api()?.registry.delete(PERSISTENT);
  api()?.registry.delete(RETURN);
}

export function emphasize(range: Range): () => void {
  const engine = api();
  if (engine) {
    engine.registry.set(RETURN, new engine.Highlight(range));
    const timer = setTimeout(() => engine.registry.delete(RETURN), 2600);
    return () => {
      clearTimeout(timer);
      engine.registry.delete(RETURN);
    };
  }
  const rect = range.getBoundingClientRect();
  const overlay = document.createElement('div');
  overlay.dataset.backtrack = 'emphasis';
  Object.assign(overlay.style, {
    position: 'absolute',
    pointerEvents: 'none',
    left: `${rect.left + window.scrollX - 5}px`,
    top: `${rect.top + window.scrollY - 5}px`,
    width: `${rect.width + 10}px`,
    height: `${rect.height + 10}px`,
    border: '2px solid #4c937c',
    borderRadius: '6px',
    zIndex: '1000',
  });
  document.body.append(overlay);
  const timer = setTimeout(() => overlay.remove(), 2600);
  return () => {
    clearTimeout(timer);
    overlay.remove();
  };
}

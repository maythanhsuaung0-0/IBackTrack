import {
  assistantMessages,
  isExcluded,
  readingBlock,
} from '../../lib/chatgpt-adapter';
import type {
  LocationRef,
  Message,
  SelectionAnchor,
  TextAnchor,
} from '../../lib/types';

interface Point {
  node: Text;
  start: number;
  end: number;
}
export interface TextMap {
  text: string;
  points: Point[];
}
const MAX_EXACT = 600;
const CONTEXT = 64;

/** Preserve a character-to-DOM map while folding whitespace across inline tags. */
export function textMap(root: HTMLElement): TextMap {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const points: Point[] = [];
  let text = '';
  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (isExcluded(node)) continue;
    const leaf = node as Text;
    for (let i = 0; i < leaf.length; i++) {
      const value = /\s/.test(leaf.data.charAt(i)) ? ' ' : leaf.data.charAt(i);
      if (value === ' ' && (!text || text.endsWith(' '))) continue;
      text += value;
      points.push({ node: leaf, start: i, end: i + 1 });
    }
  }
  if (text.endsWith(' ')) {
    text = text.slice(0, -1);
    points.pop();
  }
  return { text, points };
}

export function fingerprint(text: string): string {
  // A compact deterministic hash, not an excerpt of the entire message.
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++)
    hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return `${text.length}:${(hash >>> 0).toString(16)}`;
}

export function quote(text: string, start: number, end: number): TextAnchor {
  while (start < end && text[start] === ' ') start++;
  while (end > start && text[end - 1] === ' ') end--;
  end = Math.min(end, start + MAX_EXACT);
  return {
    exact: text.slice(start, end),
    prefix: text.slice(Math.max(0, start - CONTEXT), start),
    suffix: text.slice(end, end + CONTEXT),
    start,
  };
}

function locateRange(map: TextMap, range: Range): [number, number] | null {
  let start = -1;
  let end = -1;
  for (let i = 0; i < map.points.length; i++) {
    const p = map.points[i]!;
    if (
      range.comparePoint(p.node, p.start) === 0 &&
      range.comparePoint(p.node, p.end) === 0
    ) {
      if (start < 0) start = i;
      end = i + 1;
    }
  }
  return start < 0 ? null : [start, end];
}

export function makeLocation(
  message: Message,
  range: Range,
  key: string,
): LocationRef | null {
  const map = textMap(message.element);
  const offsets = locateRange(map, range);
  if (!offsets) return null;
  const anchor = quote(map.text, ...offsets);
  if (!anchor.exact.trim()) return null;
  return {
    conversationKey: key,
    messageKey: message.key,
    fingerprint: fingerprint(map.text),
    anchor,
  };
}

export function captureSelection(
  key: string,
  selection: Selection | null = window.getSelection(),
): SelectionAnchor | null {
  if (!selection || selection.isCollapsed || !selection.rangeCount) return null;
  const range = selection.getRangeAt(0).cloneRange();
  if (isExcluded(range.startContainer) || isExcluded(range.endContainer))
    return null;
  const message = assistantMessages().find(
    ({ element }) =>
      element.contains(range.startContainer) &&
      element.contains(range.endContainer),
  );
  if (!message) return null;
  const location = makeLocation(message, range, key);
  if (!location) return null;
  return { location, range, rect: range.getBoundingClientRect() };
}

export function captureReadingPosition(key: string): LocationRef | null {
  const candidate = readingBlock(assistantMessages());
  if (!candidate) return null;
  const range = document.createRange();
  range.selectNodeContents(candidate.block);
  return makeLocation(candidate.message, range, key);
}

/** Context, never the old offset alone, distinguishes repeated phrases. */
export function matchingOffsets(text: string, anchor: TextAnchor): number[] {
  const matches: number[] = [];
  let index = -1;
  while ((index = text.indexOf(anchor.exact, index + 1)) !== -1) {
    const prefix = text.slice(Math.max(0, index - anchor.prefix.length), index);
    const suffix = text.slice(
      index + anchor.exact.length,
      index + anchor.exact.length + anchor.suffix.length,
    );
    if (prefix === anchor.prefix && suffix === anchor.suffix)
      matches.push(index);
    if (matches.length > 1) break;
  }
  return matches;
}

export function rangeFromOffsets(
  map: TextMap,
  start: number,
  length: number,
): Range {
  const a = map.points[start];
  const b = map.points[start + length - 1];
  if (!a || !b) throw new Error('Passage offsets are unavailable.');
  const range = document.createRange();
  range.setStart(a.node, a.start);
  range.setEnd(b.node, b.end);
  return range;
}

export type Resolution =
  { status: 'found'; range: Range } | { status: 'missing' | 'ambiguous' };
export function resolve(
  location: LocationRef,
  key: string,
  messages = assistantMessages(),
): Resolution {
  if (location.conversationKey !== key) return { status: 'missing' };
  const candidates = messages.filter((m) =>
    location.messageKey
      ? m.key === location.messageKey
      : fingerprint(textMap(m.element).text) === location.fingerprint,
  );
  const ranges: Range[] = [];
  for (const message of candidates) {
    const map = textMap(message.element);
    for (const start of matchingOffsets(map.text, location.anchor)) {
      ranges.push(rangeFromOffsets(map, start, location.anchor.exact.length));
      if (ranges.length > 1) return { status: 'ambiguous' };
    }
  }
  return ranges.length === 1
    ? { status: 'found', range: ranges[0]! }
    : { status: 'missing' };
}

export async function resolveWithRetry(
  location: LocationRef,
  key: string,
  signal: AbortSignal,
  timeout = 3000,
): Promise<Resolution> {
  const initial = resolve(location, key);
  if (initial.status !== 'missing' || signal.aborted) return initial;
  return new Promise((done) => {
    let finished = false;
    const finish = (result: Resolution) => {
      if (finished) return;
      finished = true;
      observer.disconnect();
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
      done(result);
    };
    const observer = new MutationObserver(() => {
      const result = resolve(location, key);
      if (result.status !== 'missing') finish(result);
    });
    const abort = () => finish({ status: 'missing' });
    const timer = setTimeout(abort, timeout);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    signal.addEventListener('abort', abort, { once: true });
  });
}

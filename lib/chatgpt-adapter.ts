import type { Message } from './types';

export const ASSISTANT = [
  '[data-message-author-role="assistant"]',
  '[data-turn="assistant"]',
  '[data-conversation-role="assistant"]',
  '[data-message-role="assistant"]',
].join(',');
const USER = [
  '[data-message-author-role="user"]',
  '[data-turn="user"]',
  '[data-conversation-role="user"]',
  '[data-message-role="user"]',
  '[data-thread-user-message-navigation-content]',
].join(',');
const EXCLUDED =
  'button,input,textarea,select,[contenteditable]:not([contenteditable="false"]),[data-backtrack],backtrack-reader,form[data-chatgpt-composer],[data-composer-markdown],script,style,[aria-hidden="true"]';

export function isExcluded(node: Node): boolean {
  const element = node instanceof Element ? node : node.parentElement;
  return Boolean(element?.closest(EXCLUDED));
}

function readableMessage(host: HTMLElement): Message {
  // A reply can have several markdown sections. Taking only the first one
  // makes selections in later sections invisible to the anchor engine.
  const bodies = Array.from(
    host.querySelectorAll<HTMLElement>(
      '.markdown,.prose,[data-message-content],[data-testid="message-content"]',
    ),
  ).filter(
    (element, _, all) =>
      !all.some((other) => other !== element && other.contains(element)),
  );
  const idHost = host.closest<HTMLElement>('[data-turn-id]');
  return {
    element: bodies.length === 1 ? bodies[0]! : host,
    key:
      host.dataset.messageId ||
      host.dataset.turnId ||
      idHost?.dataset.turnId ||
      undefined,
  };
}

/** All host-specific selectors live here; ChatGPT has multiple page layouts. */
export function assistantMessages(root: ParentNode = document): Message[] {
  const explicit = Array.from(
    root.querySelectorAll<HTMLElement>(ASSISTANT),
  ).filter(
    (host) =>
      !host.querySelector(ASSISTANT) &&
      !host.closest(USER) &&
      !isExcluded(host),
  );
  const shellTargets = Array.from(
    root.querySelectorAll<HTMLElement>(
      'main [data-thread-find-target],main [data-chatgpt-conversation-selection-target]',
    ),
  ).filter((host) => {
    // Never treat the entire conversation, a user turn, or the composer
    // as an answer. Prefer the innermost reading target in newer shells.
    return (
      !host.closest(USER) &&
      !host.querySelector(USER) &&
      !isExcluded(host) &&
      !host.closest(ASSISTANT) &&
      !host.querySelector(ASSISTANT) &&
      !host.querySelector(
        '[data-thread-find-target],[data-chatgpt-conversation-selection-target]',
      ) &&
      !host.querySelector(
        'form[data-chatgpt-composer],[contenteditable="true"],textarea,input',
      )
    );
  });
  const messages = [...explicit, ...shellTargets].map(readableMessage);
  return messages.filter(
    (message, index) =>
      !messages
        .slice(0, index)
        .some((other) => other.element === message.element),
  );
}

export function scrollContainer(element: Element): HTMLElement | null {
  for (
    let parent = element.parentElement;
    parent;
    parent = parent.parentElement
  ) {
    if (
      /(auto|scroll)/.test(getComputedStyle(parent).overflowY) &&
      parent.scrollHeight > parent.clientHeight
    )
      return parent;
  }
  return null;
}

/** Pick a visible text block near 35% down the actual reader, not the page. */
export function readingBlock(
  messages: Message[],
): { message: Message; block: HTMLElement } | null {
  const candidates: { message: Message; block: HTMLElement; score: number }[] =
    [];
  for (const message of messages) {
    const container = scrollContainer(message.element);
    const bounds = container?.getBoundingClientRect();
    const top = Math.max(80, bounds?.top ?? 0);
    const bottom = Math.min(
      window.innerHeight - 130,
      bounds?.bottom ?? window.innerHeight,
    );
    const line = top + (bottom - top) * 0.35;
    const blocks = message.element.querySelectorAll<HTMLElement>(
      'p,li,pre,h1,h2,h3,h4,blockquote,td',
    );
    for (const block of blocks.length ? blocks : [message.element]) {
      if (isExcluded(block) || !block.textContent?.trim()) continue;
      const rect = block.getBoundingClientRect();
      if (
        rect.width <= 0 ||
        rect.bottom < top ||
        rect.top > bottom ||
        getComputedStyle(block).visibility === 'hidden'
      )
        continue;
      candidates.push({
        message,
        block,
        score: Math.abs(Math.max(rect.top, Math.min(line, rect.bottom)) - line),
      });
    }
  }
  return candidates.sort((a, b) => a.score - b.score)[0] ?? null;
}

export function scrollToRange(range: Range): void {
  const node = range.startContainer;
  const element = node instanceof Element ? node : node.parentElement;
  if (!element) return;
  const container = scrollContainer(element);
  const rect = range.getBoundingClientRect();
  const reduced = window.matchMedia?.(
    '(prefers-reduced-motion: reduce)',
  ).matches;
  if (container) {
    const box = container.getBoundingClientRect();
    container.scrollBy({
      top: rect.top - box.top - Math.min(container.clientHeight * 0.35, 250),
      behavior: reduced ? 'instant' : 'smooth',
    });
  } else {
    window.scrollBy({
      top: rect.top - window.innerHeight * 0.35,
      behavior: reduced ? 'instant' : 'smooth',
    });
  }
}

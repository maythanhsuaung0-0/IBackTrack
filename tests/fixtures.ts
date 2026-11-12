import type { Driver } from '../lib/storage';
import { Repository } from '../lib/storage';
import type { ConversationState, LocationRef } from '../lib/types';

export const key = 'chatgpt:test-one';
export function fixture() {
  document.body.innerHTML = `<main><div data-message-author-role="user"><p>User text should be ignored</p></div><div data-message-author-role="assistant" data-message-id="answer-a"><div class="markdown"><h2>Decision trees</h2><p>Before you split, consider <strong>entropy and <code>information gain</code></strong> for each branch. This measures uncertainty.</p><p>A repeated sentence. A different thought. A repeated sentence.</p><ul><li>A leaf predicts a <a href="#">class label</a>.</li></ul><pre><code>if x &gt; 5:\n  return 1</code></pre></div></div><div data-message-author-role="assistant" data-message-id="answer-b"><div class="markdown"><p>Before you split, consider entropy and information gain for each branch. This measures uncertainty.</p></div></div><div contenteditable="true" id="composer">Composer should be ignored</div></main>`;
  return document.querySelector<HTMLElement>('.markdown')!;
}
export function selectText(element: HTMLElement, text: string) {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const index = node.textContent!.indexOf(text);
    if (index >= 0) {
      const range = document.createRange();
      range.setStart(node, index);
      range.setEnd(node, index + text.length);
      window.getSelection()!.removeAllRanges();
      window.getSelection()!.addRange(range);
      return range;
    }
  }
  throw new Error('Fixture text not found');
}
export const location: LocationRef = {
  conversationKey: key,
  messageKey: 'answer-a',
  fingerprint: '123:abc',
  anchor: { exact: 'entropy', prefix: 'consider ', suffix: ' for', start: 20 },
};
export function memory() {
  const data = new Map<string, unknown>();
  const driver: Driver = {
    async get(k) {
      return data.get(k);
    },
    async set(k, v) {
      data.set(k, structuredClone(v));
    },
    async bytes() {
      return JSON.stringify([...data]).length;
    },
  };
  const repository = new Repository(driver);
  return {
    data,
    driver,
    repository,
    transport: (
      c: Parameters<Repository['execute']>[0],
    ): Promise<ConversationState> => repository.execute(c),
  };
}

import { describe, expect, it, vi } from 'vitest';
import {
  captureReadingPosition,
  captureSelection,
  makeLocation,
  matchingOffsets,
  quote,
  resolve,
  resolveWithRetry,
  textMap,
} from '../features/anchors';
import {
  assistantMessages,
  readingBlock,
  scrollContainer,
  scrollToRange,
} from '../lib/chatgpt-adapter';
import { conversationKey } from '../lib/url';
import { fixture, key, selectText } from './fixtures';

describe('conversation identity', () => {
  it.each([
    'https://chatgpt.com/c/abc-123',
    'https://chatgpt.com/c/abc-123/?q=1#passage',
    'https://chatgpt.com/g/g-foo/c/abc-123',
  ])('accepts stable conversations: %s', (url) =>
    expect(conversationKey(url)).toBe('chatgpt:abc-123'),
  );
  it.each([
    'https://chatgpt.com/',
    'https://chatgpt.com/?temporary-chat=true',
    'https://chatgpt.com/g/g-foo',
    'https://chatgpt.com/c/',
    'https://chatgpt.com.evil.com/c/abc',
    'http://chatgpt.com/c/abc',
    'https://example.com/c/abc',
    'https://chatgpt.com/c/abc/more',
    'invalid',
  ])('ignores unsupported/no-id pages: %s', (url) =>
    expect(conversationKey(url)).toBeNull(),
  );
});

describe('text anchors', () => {
  it('finds assistant blocks and ignores user messages', () => {
    fixture();
    expect(assistantMessages()).toHaveLength(2);
    expect(textMap(assistantMessages()[0]!.element).text).toContain(
      'class label',
    );
  });
  it('maps a selection spanning nested strong/code text and restores after append', () => {
    const element = fixture();
    const strong = element.querySelector('strong')!;
    const range = document.createRange();
    range.selectNodeContents(strong);
    window.getSelection()!.addRange(range);
    const capture = captureSelection(key)!;
    expect(capture.location.anchor.exact).toBe('entropy and information gain');
    expect(JSON.stringify(capture.location).length).toBeLessThan(1000);
    document
      .querySelector('main')!
      .insertAdjacentHTML(
        'beforeend',
        '<div data-message-author-role="assistant" data-message-id="new"><p>Another reply</p></div>',
      );
    const result = resolve(JSON.parse(JSON.stringify(capture.location)), key);
    expect(result.status).toBe('found');
    if (result.status === 'found')
      expect(result.range.toString()).toBe('entropy and information gain');
  });
  it('normalizes whitespace with accurate DOM endpoints', () => {
    fixture();
    const element = assistantMessages()[0]!.element;
    element.innerHTML = '<p>First   <strong>second\n third</strong>   last</p>';
    const range = document.createRange();
    range.selectNodeContents(element.querySelector('strong')!);
    const anchor = makeLocation(assistantMessages()[0]!, range, key)!;
    expect(anchor.anchor.exact).toBe('second third');
    const result = resolve(anchor, key);
    expect(result.status).toBe('found');
    if (result.status === 'found')
      expect(result.range.toString()).toBe('second\n third');
  });
  it('does not jump to the same text in a different message if source is deleted', () => {
    fixture();
    selectText(assistantMessages()[0]!.element, 'Before you split, consider ');
    const saved = captureSelection(key)!.location;
    document.querySelector('[data-message-id="answer-a"]')!.remove();
    expect(resolve(saved, key).status).toBe('missing');
  });
  it('fails safely when source text changes or conversation changes', () => {
    const el = fixture();
    selectText(el, 'entropy and ');
    const saved = captureSelection(key)!.location;
    expect(resolve(saved, 'chatgpt:another').status).toBe('missing');
    el.querySelector('strong')!.textContent = 'edited answer';
    expect(resolve(saved, key).status).toBe('missing');
  });
  it('requires context instead of choosing the old character offset for repeated text', () => {
    expect(
      matchingOffsets('x repeat y -- x repeat y', {
        exact: 'repeat',
        prefix: 'x ',
        suffix: ' y',
        start: 2,
      }),
    ).toHaveLength(2);
    expect(
      matchingOffsets('old repeat then new repeat here', {
        exact: 'repeat',
        prefix: 'new ',
        suffix: ' here',
        start: 4,
      }),
    ).toEqual([20]);
  });
  it('rejects indistinguishable candidates even with identical host ids', () => {
    const el = fixture();
    selectText(el, 'entropy and ');
    const saved = captureSelection(key)!.location;
    document
      .querySelector('main')!
      .append(
        document.querySelector('[data-message-id="answer-a"]')!.cloneNode(true),
      );
    expect(resolve(saved, key).status).toBe('ambiguous');
  });
  it('falls back to a message fingerprint when ids are absent, without guessing', () => {
    const el = fixture();
    document
      .querySelector('[data-message-id="answer-a"]')!
      .removeAttribute('data-message-id');
    selectText(el, 'entropy and ');
    const saved = captureSelection(key)!.location;
    expect(saved.messageKey).toBeUndefined();
    expect(resolve(saved, key).status).toBe('found');
    el.insertAdjacentHTML('beforeend', '<p>Changed</p>');
    expect(resolve(saved, key).status).toBe('missing');
  });
  it('ignores composer, user, whitespace, empty and cross-message selections', () => {
    const el = fixture();
    selectText(document.querySelector<HTMLElement>('#composer')!, 'Composer');
    expect(captureSelection(key)).toBeNull();
    selectText(
      document.querySelector<HTMLElement>('[data-message-author-role="user"]')!,
      'User',
    );
    expect(captureSelection(key)).toBeNull();
    window.getSelection()!.removeAllRanges();
    expect(captureSelection(key)).toBeNull();
    const range = document.createRange();
    range.setStart(el.querySelector('p')!.firstChild!, 0);
    range.setEnd(
      document.querySelector('[data-message-id="answer-b"] p')!.firstChild!,
      4,
    );
    window.getSelection()!.addRange(range);
    expect(captureSelection(key)).toBeNull();
  });
  it('caps excerpt and surrounding context', () => {
    const a = quote('a'.repeat(2000), 100, 1800);
    expect(a.exact).toHaveLength(600);
    expect(a.prefix).toHaveLength(64);
    expect(a.suffix).toHaveLength(64);
  });
  it('waits for delayed content and disconnects after it arrives', async () => {
    const el = fixture();
    selectText(el, 'entropy and ');
    const saved = captureSelection(key)!.location;
    const host = document.querySelector('[data-message-id="answer-a"]')!;
    const parent = host.parentElement!;
    host.remove();
    const pending = resolveWithRetry(
      saved,
      key,
      new AbortController().signal,
      200,
    );
    parent.append(host);
    expect((await pending).status).toBe('found');
  });
  it('bounds retries and aborts on navigation', async () => {
    vi.useFakeTimers();
    const el = fixture();
    selectText(el, 'entropy and ');
    const saved = captureSelection(key)!.location;
    el.remove();
    const controller = new AbortController();
    const pending = resolveWithRetry(saved, key, controller.signal, 100);
    await vi.advanceTimersByTimeAsync(100);
    expect((await pending).status).toBe('missing');
    const pending2 = resolveWithRetry(saved, key, controller.signal, 5000);
    controller.abort();
    expect((await pending2).status).toBe('missing');
  });
});

describe('reading viewport', () => {
  it('selects and scrolls the actual nested reader', () => {
    fixture();
    const main = document.querySelector('main')!;
    main.style.overflowY = 'auto';
    Object.defineProperty(main, 'scrollHeight', { value: 3000 });
    Object.defineProperty(main, 'clientHeight', { value: 600 });
    main.getBoundingClientRect = () => ({
      top: 80,
      bottom: 680,
      height: 600,
      width: 700,
      left: 0,
      right: 700,
      x: 0,
      y: 80,
      toJSON() {},
    });
    main.scrollBy = vi.fn();
    const blocks = document.querySelectorAll<HTMLElement>('.markdown p');
    blocks.forEach(
      (p, i) =>
        (p.getBoundingClientRect = () => ({
          top: 200 + i * 120,
          bottom: 280 + i * 120,
          width: 500,
          height: 80,
          left: 100,
          right: 600,
          x: 100,
          y: 200 + i * 120,
          toJSON() {},
        })),
    );
    expect(scrollContainer(blocks[0]!)).toBe(main);
    expect(readingBlock(assistantMessages())?.block).toBe(blocks[0]);
    const location = captureReadingPosition(key)!;
    expect(location.anchor.exact).toContain('Before you split');
    const result = resolve(location, key);
    expect(result.status).toBe('found');
    if (result.status === 'found') scrollToRange(result.range);
    expect(main.scrollBy).toHaveBeenCalledWith(
      expect.objectContaining({ top: -110, behavior: 'smooth' }),
    );
    expect(window.scrollBy).not.toHaveBeenCalled();
  });
});

import {
  act,
  fireEvent,
  render,
  waitFor,
  within,
} from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '../components/App';
import { captureSelection, resolve } from '../features/anchors';
import { assistantMessages } from '../lib/chatgpt-adapter';
import { fixture, key, memory, selectText } from './fixtures';

const readUrl = () => 'https://chatgpt.com/c/test-one';

describe('reported Save spot failures', () => {
  it('recognizes an assistant turn without the legacy author attribute', () => {
    document.body.innerHTML =
      '<main><article data-turn="user" data-turn-id="u"><p>User message</p></article><article data-turn="assistant" data-turn-id="turn-a"><div class="prose"><p>Answer with <strong>useful text</strong> to save.</p></div></article></main>';
    selectText(document.querySelector<HTMLElement>('strong')!, 'useful text');
    const saved = captureSelection(key);
    expect(saved?.location.anchor.exact).toBe('useful text');
    expect(resolve(saved!.location, key).status).toBe('found');
  });

  it('recognizes shell reading targets while excluding user messages and the composer', () => {
    document.body.innerHTML =
      '<main><section data-chatgpt-conversation-selection-target><div data-thread-find-target data-thread-user-message-navigation-content><p>My own message</p></div><div data-thread-find-target><p>The assistant explains a useful concept.</p></div><form data-chatgpt-composer><div data-thread-find-target contenteditable="true">Draft text</div></form></section></main>';
    selectText(
      document.querySelectorAll<HTMLElement>('[data-thread-find-target]')[1]!,
      'useful concept',
    );
    const saved = captureSelection(key);
    expect(saved?.location.anchor.exact).toBe('useful concept');
    expect(assistantMessages()).toHaveLength(1);
    selectText(
      document.querySelector<HTMLElement>(
        '[data-thread-user-message-navigation-content]',
      )!,
      'My own message',
    );
    expect(captureSelection(key)).toBeNull();
  });

  it('captures text in the second markdown block of the same answer', () => {
    document.body.innerHTML =
      '<main><div data-message-author-role="assistant" data-message-id="multi"><div class="markdown"><p>First block.</p></div><div class="markdown"><p>Second block with the selected passage.</p></div></div></main>';
    selectText(
      document.querySelectorAll<HTMLElement>('.markdown')[1]!,
      'selected passage',
    );
    expect(captureSelection(key)?.location.anchor.exact).toBe(
      'selected passage',
    );
  });

  it('keeps the selected passage when clicking Save spot in an actual shadow root clears native selection', async () => {
    const el = fixture();
    const store = memory();
    const host = document.createElement('backtrack-reader');
    document.body.append(host);
    const shadow = host.attachShadow({ mode: 'open' });
    const container = document.createElement('div');
    container.dataset.backtrack = 'ui';
    shadow.append(container);
    render(<App transport={store.transport} readUrl={readUrl} />, {
      container,
      baseElement: container,
    });
    const ui = within(container);
    const button = ui
      .getByRole('toolbar', { name: 'Backtrack reading controls' })
      .querySelector<HTMLButtonElement>('.bt-save')!;
    await waitFor(() => expect(button).toBeEnabled());
    act(() => {
      selectText(el, 'entropy and ');
      document.dispatchEvent(new Event('selectionchange'));
    });
    expect(
      ui.getByRole('toolbar', { name: 'Selected passage' }),
    ).toBeInTheDocument();
    act(() => {
      button.dispatchEvent(
        new Event('pointerdown', { bubbles: true, composed: true }),
      );
      window.getSelection()!.removeAllRanges();
      document.dispatchEvent(new Event('selectionchange'));
      button.dispatchEvent(
        new Event('pointerup', { bubbles: true, composed: true }),
      );
    });
    fireEvent.click(button);
    await ui.findByText('Reading spot saved. Follow your curiosity.');
    const state = await store.repository.execute({ action: 'read', key });
    expect(state.items[0]?.location.anchor.exact).toBe('entropy and');
  });
});

it('does not turn an entire conversation or unrelated main text into an answer', () => {
  document.body.innerHTML =
    '<main><section data-chatgpt-conversation-selection-target><div data-thread-user-message-navigation-content>My message</div><p>Unidentified content must not be guessed.</p></section><p>Account settings text</p></main>';
  expect(assistantMessages()).toHaveLength(0);
  selectText(document.querySelector<HTMLElement>('p')!, 'Unidentified content');
  expect(captureSelection(key)).toBeNull();
});

it('discards a cached answer selection when the user switches to the composer', async () => {
  const el = fixture();
  const store = memory();
  const host = document.createElement('backtrack-reader');
  document.body.append(host);
  const shadow = host.attachShadow({ mode: 'open' });
  const container = document.createElement('div');
  container.dataset.backtrack = 'ui';
  shadow.append(container);
  render(<App transport={store.transport} readUrl={readUrl} />, {
    container,
    baseElement: container,
  });
  const ui = within(container);
  const button = container.querySelector<HTMLButtonElement>('.bt-save')!;
  await waitFor(() => expect(button).toBeEnabled());
  act(() => {
    selectText(el, 'entropy and ');
    document.dispatchEvent(new Event('selectionchange'));
  });
  const composer = document.querySelector<HTMLElement>('#composer')!;
  act(() => {
    composer.dispatchEvent(
      new Event('pointerdown', { bubbles: true, composed: true }),
    );
    selectText(composer, 'Composer');
    document.dispatchEvent(new Event('selectionchange'));
    button.dispatchEvent(
      new Event('pointerdown', { bubbles: true, composed: true }),
    );
  });
  fireEvent.click(button);
  expect(await ui.findByRole('alert')).toHaveTextContent('Scroll to an answer');
  expect(
    (await store.repository.execute({ action: 'read', key })).items,
  ).toHaveLength(0);
});

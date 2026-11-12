import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../components/App';
import { captureSelection } from '../features/anchors';
import { fixture, key, memory, selectText } from './fixtures';

const readUrl = () => 'https://chatgpt.com/c/test-one';
async function setup() {
  const el = fixture();
  const store = memory();
  const ui = render(<App transport={store.transport} readUrl={readUrl} />);
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Save spot' })).toBeEnabled(),
  );
  return { el, ...store, ...ui };
}

describe('reader controls', () => {
  it('saves a selection, returns to it after new replies, and resumes', async () => {
    const { el, repository } = await setup();
    selectText(el, 'entropy and ');
    fireEvent(document, new Event('selectionchange'));
    fireEvent.click(
      within(
        screen.getByRole('toolbar', { name: 'Backtrack reading controls' }),
      ).getByRole('button', { name: 'Save spot' }),
    );
    await screen.findByText('Reading spot saved. Follow your curiosity.');
    expect(
      (await repository.execute({ action: 'read', key })).items,
    ).toHaveLength(1);
    document
      .querySelector('main')!
      .insertAdjacentHTML('beforeend', '<p>A new follow-up answer</p>');
    fireEvent.click(screen.getByRole('button', { name: 'Return' }));
    await screen.findByText('Back where you left off.');
    expect(window.scrollBy).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Saved items/ }));
    await screen.findByRole('complementary');
    fireEvent.click(screen.getByRole('button', { name: 'Resume & clear' }));
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Return' })).toBeNull(),
    );
    expect(
      (await repository.execute({ action: 'read', key })).items,
    ).toHaveLength(0);
  });
  it('shows errors without false save confirmations', async () => {
    const el = fixture();
    const transport = vi
      .fn()
      .mockResolvedValueOnce({ schemaVersion: 1, items: [] })
      .mockRejectedValue(new Error('Disk is full.'));
    render(<App transport={transport} readUrl={readUrl} />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Save spot' })).toBeEnabled(),
    );
    selectText(el, 'entropy and ');
    fireEvent.click(screen.getByRole('button', { name: 'Save spot' }));
    await screen.findByRole('alert');
    expect(screen.getByText('Disk is full.')).toBeInTheDocument();
    expect(
      screen.queryByText('Reading spot saved. Follow your curiosity.'),
    ).toBeNull();
  });
  it('offers highlight and save on valid selection; Escape dismisses controls', async () => {
    const { el } = await setup();
    selectText(el, 'entropy and ');
    fireEvent(document, new Event('selectionchange'));
    expect(
      screen.getByRole('toolbar', { name: 'Selected passage' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Highlight' }));
    await screen.findByText('Highlight saved.');
    fireEvent.click(screen.getByRole('button', { name: /Saved items/ }));
    expect(screen.getByRole('complementary')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('complementary')).toBeNull();
    expect(screen.getByRole('button', { name: /Saved items/ })).toHaveFocus();
  });
  it('deletes a saved highlight without touching assistant markup', async () => {
    const { el, repository } = await setup();
    const html = el.innerHTML;
    selectText(el, 'entropy and ');
    fireEvent(document, new Event('selectionchange'));
    fireEvent.click(screen.getByRole('button', { name: 'Highlight' }));
    await screen.findByText('Highlight saved.');
    fireEvent.click(screen.getByRole('button', { name: /Saved items/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove item' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    await screen.findByText('Item removed.');
    expect(
      (await repository.execute({ action: 'read', key })).items,
    ).toHaveLength(0);
    expect(el.innerHTML).toBe(html);
  });
  it('supports Keep and Rename with escaped text previews', async () => {
    const { el } = await setup();
    selectText(el, 'entropy and ');
    fireEvent.click(screen.getByRole('button', { name: 'Save spot' }));
    await screen.findByText('Reading spot saved. Follow your curiosity.');
    fireEvent.click(screen.getByRole('button', { name: /Saved items/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Keep checkpoint' }));
    await screen.findByText('Checkpoint updated.');
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Keep checkpoint' }),
      ).toBeNull(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Rename checkpoint' }));
    fireEvent.change(screen.getByLabelText('Checkpoint name'), {
      target: { value: '<img src=x onerror=alert(1)>' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save name' }));
    await screen.findByText('<img src=x onerror=alert(1)>');
    expect(screen.queryByRole('img')).toBeNull();
  });
  it('displays a non-destructive read error and retry', async () => {
    fixture();
    const transport = vi
      .fn()
      .mockRejectedValueOnce(new Error('Saved data left untouched.'))
      .mockResolvedValue({ schemaVersion: 1, items: [] });
    render(<App transport={transport} readUrl={readUrl} />);
    fireEvent.click(screen.getByRole('button', { name: /Saved items/ }));
    await screen.findByText('Saved data left untouched.');
    expect(screen.getByRole('button', { name: 'Save spot' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await screen.findByText('Leave yourself a way back.');
    expect(screen.getByRole('button', { name: 'Save spot' })).toBeEnabled();
  });
  it('switches conversations and cancels the old restore', async () => {
    vi.useFakeTimers();
    fixture();
    const store = memory();
    selectText(
      document.querySelector<HTMLElement>('.markdown')!,
      'entropy and ',
    );
    await store.repository.execute({
      action: 'add',
      key,
      type: 'checkpoint',
      location: captureSelection(key)!.location,
    });
    let url = 'https://chatgpt.com/c/test-one';
    render(<App transport={store.transport} readUrl={() => url} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(screen.getByRole('button', { name: 'Return' })).toBeInTheDocument();
    url = 'https://chatgpt.com/c/test-two';
    await act(async () => {
      await vi.advanceTimersByTimeAsync(700);
    });
    expect(screen.queryByRole('button', { name: 'Return' })).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Saved items (0)' }),
    ).toBeInTheDocument();
  });
  it('does not mount controls on unsupported pages', () => {
    fixture();
    const store = memory();
    render(
      <App
        transport={store.transport}
        readUrl={() => 'https://chatgpt.com/'}
      />,
    );
    expect(screen.queryByRole('toolbar')).toBeNull();
  });
  it('filters highlights separately from checkpoints', async () => {
    const { el } = await setup();
    selectText(el, 'entropy and ');
    fireEvent.click(screen.getByRole('button', { name: 'Save spot' }));
    await screen.findByText('Reading spot saved. Follow your curiosity.');
    fireEvent.click(screen.getByRole('button', { name: /Saved items/ }));
    fireEvent.click(
      within(
        screen.getByRole('group', { name: 'Filter saved items' }),
      ).getByRole('button', { name: 'Highlights' }),
    );
    expect(screen.getByText('Keep the useful parts.')).toBeInTheDocument();
    expect(screen.queryByText('YOUR READING SPOT')).toBeNull();
  });
});

it('retains a missing checkpoint and reports failure without a wrong jump', async () => {
  const { el, repository } = await setup();
  selectText(el, 'entropy and ');
  fireEvent.click(screen.getByRole('button', { name: 'Save spot' }));
  await screen.findByText('Reading spot saved. Follow your curiosity.');
  const saved = (await repository.execute({ action: 'read', key })).activeId;
  vi.useFakeTimers();
  el.remove();
  vi.mocked(window.scrollBy).mockClear();
  fireEvent.click(screen.getByRole('button', { name: 'Return' }));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(3000);
  });
  expect(screen.getByRole('alert')).toHaveTextContent(
    "Couldn't find the saved passage",
  );
  expect(window.scrollBy).not.toHaveBeenCalled();
  expect((await repository.execute({ action: 'read', key })).activeId).toBe(
    saved,
  );
});

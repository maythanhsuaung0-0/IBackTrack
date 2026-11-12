import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../components/App';
import {
  request,
  RESPONSE_TIMEOUT_MS,
  ResponseTimeoutError,
} from '../lib/client';
import { chromeStorage } from '../lib/chrome-storage';
import background from '../entrypoints/background';
import { fixture, key, location, selectText } from './fixtures';

const fallback = vi.hoisted(() => ({
  runtime: { id: 'promise-api', sendMessage: vi.fn() },
}));
vi.mock('wxt/browser', () => ({ browser: fallback }));
vi.mock('wxt/utils/define-background', () => ({
  defineBackground: (main: () => void) => ({ main }),
}));

type Reply = (response: unknown) => void;
type Listener = (
  message: unknown,
  sender: { id: string },
  reply: Reply,
) => boolean | undefined;
function wire() {
  let listener: Listener;
  const data: Record<string, unknown> = {};
  const api = {
    runtime: {
      id: 'native-chrome',
      lastError: undefined as { message: string } | undefined,
      onMessage: {
        addListener: vi.fn((fn: Listener) => {
          listener = fn;
        }),
      },
      sendMessage: vi.fn((message: unknown, reply: Reply): void => {
        const keep = listener(message, { id: 'native-chrome' }, reply);
        expect(keep).toBe(true);
        return undefined;
      }),
    },
    storage: {
      local: {
        get: vi.fn(
          (name: string, done: (value: Record<string, unknown>) => void) => {
            queueMicrotask(() => done({ [name]: data[name] }));
          },
        ),
        set: vi.fn((value: Record<string, unknown>, done: () => void) => {
          queueMicrotask(() => {
            Object.assign(data, structuredClone(value));
            done();
          });
        }),
        getBytesInUse: vi.fn((_names: null, done: (bytes: number) => void) => {
          queueMicrotask(() => done(JSON.stringify(data).length));
        }),
      },
    },
  };
  vi.stubGlobal('chrome', api);
  background.main();
  return {
    api,
    data,
    deliver: (message: unknown, reply: Reply) =>
      listener(message, { id: 'native-chrome' }, reply),
  };
}
const readUrl = () => 'https://chatgpt.com/c/test-one';
beforeEach(() => {
  fallback.runtime.sendMessage
    .mockReset()
    .mockReturnValue(new Promise(() => {}));
});
afterEach(() => vi.unstubAllGlobals());

describe('real client → background listener → callback storage protocol', () => {
  it('prefers native Chrome and completes Save/read with callback-only APIs', async () => {
    const { api } = wire();
    const saved = await request({
      action: 'add',
      key,
      type: 'checkpoint',
      location,
    });
    expect(saved.activeId).toBe(saved.items[0]!.id);
    expect((await request({ action: 'read', key })).items).toHaveLength(1);
    expect(api.storage.local.set).toHaveBeenCalledOnce();
    expect(fallback.runtime.sendMessage).not.toHaveBeenCalled();
  });
  it('does not confirm Save until the storage completion callback fires', async () => {
    const { api, data } = wire();
    let complete: (() => void) | undefined;
    api.storage.local.set.mockImplementation((value, done) => {
      complete = () => {
        Object.assign(data, value);
        done();
      };
    });
    let settled = false;
    const saved = request({
      action: 'add',
      key,
      type: 'highlight',
      location,
    }).then((state) => {
      settled = true;
      return state;
    });
    await waitFor(() => expect(complete).toBeTypeOf('function'));
    expect(settled).toBe(false);
    complete!();
    expect((await saved).items).toHaveLength(1);
  });
  it('returns Chrome storage errors without claiming a successful write', async () => {
    const { api, data } = wire();
    api.storage.local.set.mockImplementation((_value, done) => {
      api.runtime.lastError = { message: 'Storage quota exceeded.' };
      done();
      api.runtime.lastError = undefined;
    });
    await expect(
      request({ action: 'add', key, type: 'highlight', location }),
    ).rejects.toThrow('Storage quota exceeded.');
    expect(Object.keys(data)).toHaveLength(0);
  });
  it('handles get errors even when Chrome supplies no result object', async () => {
    const { api } = wire();
    api.storage.local.get.mockImplementation((_key, done) => {
      api.runtime.lastError = { message: 'Storage unavailable.' };
      done(undefined as unknown as Record<string, unknown>);
      api.runtime.lastError = undefined;
    });
    await expect(request({ action: 'read', key })).rejects.toThrow(
      'Storage unavailable.',
    );
  });
  it('times out a lost reply and ignores its late success', async () => {
    vi.useFakeTimers();
    const { api } = wire();
    let late: Reply | undefined;
    api.runtime.sendMessage.mockImplementation((_message, reply) => {
      late = reply;
    });
    let result = 'pending';
    const pending = request({
      action: 'add',
      key,
      type: 'checkpoint',
      location,
    }).then(
      () => {
        result = 'saved';
      },
      (error) => {
        expect(error).toBeInstanceOf(ResponseTimeoutError);
        result = 'timed out';
      },
    );
    await vi.advanceTimersByTimeAsync(RESPONSE_TIMEOUT_MS);
    expect(result).toBe('timed out');
    late!({ ok: true, state: { schemaVersion: 1, items: [] } });
    await pending;
    expect(result).toBe('timed out');
  });
  it('reports a closed message channel and clears the deadline timer', async () => {
    vi.useFakeTimers();
    const { api } = wire();
    api.runtime.sendMessage.mockImplementation((_message, reply) => {
      api.runtime.lastError = { message: 'Message port closed.' };
      reply(undefined);
      api.runtime.lastError = undefined;
    });
    await expect(request({ action: 'read', key })).rejects.toThrow(
      'lost its connection',
    );
    expect(vi.getTimerCount()).toBe(0);
  });
  it('rejects missing or malformed acknowledgements', async () => {
    const { api } = wire();
    api.runtime.sendMessage.mockImplementation((_message, reply) =>
      reply({ ok: true }),
    );
    await expect(request({ action: 'read', key })).rejects.toThrow(
      'invalid response',
    );
    api.runtime.sendMessage.mockImplementation((_message, reply) =>
      reply({ ok: true, state: { schemaVersion: 99, items: [] } }),
    );
    await expect(request({ action: 'read', key })).rejects.toThrow(
      'left untouched',
    );
  });
  it('recovers a later request after a lost reply without retrying the write', async () => {
    vi.useFakeTimers();
    const { api, deliver } = wire();
    api.runtime.sendMessage.mockImplementationOnce((message) => {
      deliver(message, () => {});
    });
    const pending = request({
      action: 'add',
      key,
      type: 'checkpoint',
      location,
    }).catch((error) => error);
    await vi.advanceTimersByTimeAsync(RESPONSE_TIMEOUT_MS);
    expect(await pending).toBeInstanceOf(ResponseTimeoutError);
    const read = request({ action: 'read', key });
    await vi.advanceTimersByTimeAsync(1);
    expect((await read).items).toHaveLength(1);
    expect(api.storage.local.set).toHaveBeenCalledOnce();
  });
  it('rejects synchronous invalid-context errors promptly', async () => {
    const { api } = wire();
    api.runtime.sendMessage.mockImplementation(() => {
      throw new Error('Extension context invalidated');
    });
    await expect(request({ action: 'read', key })).rejects.toThrow(
      'refresh ChatGPT',
    );
  });
  it('supports Promise-returning API shims and consumes their rejection', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('chrome', undefined);
    fallback.runtime.sendMessage.mockResolvedValueOnce({
      ok: true,
      state: { schemaVersion: 1, items: [] },
    });
    expect((await request({ action: 'read', key })).items).toEqual([]);
    fallback.runtime.sendMessage.mockRejectedValueOnce(
      new Error('Disconnected'),
    );
    await expect(request({ action: 'read', key })).rejects.toThrow(
      'lost its connection',
    );
    expect(vi.getTimerCount()).toBe(0);
  });
  it('keeps a timed-out native write serialized until its completion callback', async () => {
    vi.useFakeTimers();
    const { api, data } = wire();
    let complete: (() => void) | undefined;
    api.storage.local.set.mockImplementationOnce((value, done) => {
      complete = () => {
        Object.assign(data, value);
        done();
      };
    });
    const first = request({
      action: 'add',
      key,
      type: 'highlight',
      location,
    }).catch((error) => error);
    await vi.advanceTimersByTimeAsync(RESPONSE_TIMEOUT_MS);
    expect(await first).toBeInstanceOf(ResponseTimeoutError);
    const second = request({ action: 'add', key, type: 'highlight', location });
    await vi.advanceTimersByTimeAsync(1);
    expect(api.storage.local.set).toHaveBeenCalledOnce();
    complete!();
    await vi.advanceTimersByTimeAsync(1);
    expect((await second).items).toHaveLength(2);
    expect(api.storage.local.set).toHaveBeenCalledTimes(2);
  });
});

describe('saving and loading UI after an unanswered worker request', () => {
  it('unlocks Save after timeout, warns, and reconciles the stored item without a duplicate', async () => {
    const { api, deliver } = wire();
    const el = fixture();
    render(<App readUrl={readUrl} />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Save spot' })).toBeEnabled(),
    );
    vi.useFakeTimers();
    api.runtime.sendMessage.mockImplementationOnce((message) => {
      deliver(message, () => {});
    });
    selectText(el, 'entropy and ');
    fireEvent.click(screen.getByRole('button', { name: 'Save spot' }));
    expect(screen.getByRole('button', { name: 'Save spot' })).toBeDisabled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(RESPONSE_TIMEOUT_MS + 1);
    });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'save was not confirmed',
    );
    expect(
      within(
        screen.getByRole('toolbar', {
          name: 'Backtrack reading controls',
        }),
      ).getByRole('button', { name: 'Save spot' }),
    ).toBeEnabled();
    expect(
      screen.queryByText('Reading spot saved. Follow your curiosity.'),
    ).toBeNull();
    expect(screen.getByRole('button', { name: 'Return' })).toBeInTheDocument();
    expect(api.storage.local.set).toHaveBeenCalledOnce();
  });
  it('replaces endless initial loading with an error and working retry', async () => {
    vi.useFakeTimers();
    const { api } = wire();
    fixture();
    api.runtime.sendMessage.mockImplementationOnce(() => {});
    render(<App readUrl={readUrl} />);
    fireEvent.click(screen.getByRole('button', { name: /Saved items/ }));
    expect(screen.getByText('Loading your saved items…')).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(RESPONSE_TIMEOUT_MS);
    });
    expect(screen.queryByText('Loading your saved items…')).toBeNull();
    expect(
      screen.getAllByText(/Backtrack did not respond/).length,
    ).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(screen.getByRole('button', { name: 'Save spot' })).toBeEnabled();
  });
});

it('the storage driver waits for get/bytes callbacks instead of assuming API Promises', async () => {
  const { api } = wire();
  const driver = chromeStorage();
  expect(await driver.get('new')).toBeUndefined();
  expect(await driver.bytes()).toBe(2);
  expect(api.storage.local.getBytesInUse).toHaveBeenCalledOnce();
});

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  captureReadingPosition,
  captureSelection,
  resolve,
  resolveWithRetry,
} from '../features/anchors';
import {
  clearHighlights,
  emphasize,
  renderHighlights,
} from '../features/highlights';
import { assistantMessages, scrollToRange } from '../lib/chatgpt-adapter';
import { request } from '../lib/client';
import { EMPTY, type Command } from '../lib/storage';
import type {
  ConversationState,
  SavedItem,
  SelectionAnchor,
} from '../lib/types';
import { conversationKey } from '../lib/url';
import { Icon } from './Icons';

export type Transport = (command: Command) => Promise<ConversationState>;

const defaultReadUrl = () => location.href;

function useConversation(readUrl: () => string) {
  const [key, setKey] = useState(() => conversationKey(readUrl()));
  useEffect(() => {
    const update = () => setKey(conversationKey(readUrl()));
    const timer = setInterval(update, 650);
    window.addEventListener('popstate', update);
    return () => {
      clearInterval(timer);
      window.removeEventListener('popstate', update);
    };
  }, [readUrl]);
  return key;
}

function ItemCard({
  item,
  active,
  busy,
  onJump,
  onChange,
}: {
  item: SavedItem;
  active: boolean;
  busy: boolean;
  onJump: () => void;
  onChange: (
    command:
      | Omit<Extract<Command, { action: 'rename' }>, 'key'>
      | { action: 'keep' | 'delete'; id: string },
  ) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(item.label);
  const [deleting, setDeleting] = useState(false);
  return (
    <article className={`bt-card ${active ? 'bt-active' : ''}`}>
      <div className="bt-card-meta">
        <span>
          <Icon
            name={item.type === 'highlight' ? 'highlight' : 'pin'}
            size={13}
          />
          {active
            ? 'YOUR READING SPOT'
            : item.type === 'highlight'
              ? 'HIGHLIGHT'
              : 'CHECKPOINT'}
        </span>
        <time dateTime={new Date(item.createdAt).toISOString()}>
          {new Date(item.createdAt).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          })}
        </time>
      </div>
      {editing ? (
        <form
          className="bt-rename"
          onSubmit={(event) => {
            event.preventDefault();
            if (label.trim()) {
              onChange({ action: 'rename', id: item.id, label });
              setEditing(false);
            }
          }}
        >
          <label htmlFor={`label-${item.id}`}>Checkpoint name</label>
          <input
            id={`label-${item.id}`}
            autoFocus
            maxLength={80}
            value={label}
            onChange={(event) => setLabel(event.target.value)}
          />
          <div>
            <button disabled={busy || !label.trim()} type="submit">
              Save name
            </button>
            <button type="button" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          {item.label && <h3>{item.label}</h3>}
          <p className="bt-quote">{item.location.anchor.exact}</p>
          <div className="bt-card-actions">
            <button
              className={active ? 'bt-return-action' : 'bt-jump'}
              disabled={busy}
              onClick={onJump}
            >
              {active ? 'Return to this spot' : 'Jump to passage'}
              <Icon name={active ? 'back' : 'arrow'} size={15} />
            </button>
            <div className="bt-mini-actions">
              {item.type === 'checkpoint' && !item.kept && (
                <button
                  disabled={busy}
                  title="Keep checkpoint"
                  aria-label="Keep checkpoint"
                  onClick={() => onChange({ action: 'keep', id: item.id })}
                >
                  <Icon name="pin" size={15} />
                </button>
              )}
              {item.type === 'checkpoint' && (
                <button
                  disabled={busy}
                  title="Rename checkpoint"
                  aria-label="Rename checkpoint"
                  onClick={() => setEditing(true)}
                >
                  <Icon name="edit" size={15} />
                </button>
              )}
              <button
                disabled={busy}
                title="Remove item"
                aria-label="Remove item"
                onClick={() => setDeleting(true)}
              >
                <Icon name="trash" size={15} />
              </button>
            </div>
          </div>
        </>
      )}
      {deleting && (
        <div className="bt-confirm">
          <span>Remove this {item.type}?</span>
          <button
            disabled={busy}
            onClick={() => onChange({ action: 'delete', id: item.id })}
          >
            Remove
          </button>
          <button onClick={() => setDeleting(false)}>Cancel</button>
        </div>
      )}
    </article>
  );
}

export function App({
  transport = request,
  subscribe,
  readUrl = defaultReadUrl,
}: {
  readUrl?: () => string;
  transport?: Transport;
  subscribe?: (listener: () => void) => () => void;
}) {
  const key = useConversation(readUrl);
  const currentKey = useRef(key);
  currentKey.current = key;
  const [state, setState] = useState<ConversationState>(EMPTY);
  const stateRef = useRef(state);
  stateRef.current = state;
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'checkpoint' | 'highlight'>(
    'all',
  );
  const [selection, setSelection] = useState<SelectionAnchor | null>(null);
  const selectionSnapshot = useRef<SelectionAnchor | null>(null);
  const interactingWithToolbar = useRef(false);
  const [toast, setToast] = useState<{ text: string; error: boolean } | null>(
    null,
  );
  const [unavailable, setUnavailable] = useState(0);
  const [highlightSupported, setHighlightSupported] = useState(true);
  const libraryButton = useRef<HTMLButtonElement>(null);
  const drawer = useRef<HTMLElement>(null);
  const restoreAbort = useRef<AbortController | null>(null);
  const clearEmphasis = useRef<(() => void) | null>(null);
  const inFlight = useRef(false);
  const reloadVersion = useRef(0);
  const sessionEpoch = useRef(0);
  const previousOpen = useRef(false);

  const notify = useCallback(
    (text: string, error = false) => setToast({ text, error }),
    [],
  );
  const refresh = useCallback(async () => {
    if (!key) return;
    const version = ++reloadVersion.current;
    try {
      const next = await transport({ action: 'read', key });
      if (currentKey.current === key && reloadVersion.current === version) {
        setState(next);
        setLoadError('');
        setLoading(false);
      }
    } catch (error) {
      if (currentKey.current === key && reloadVersion.current === version) {
        setLoadError(
          error instanceof Error
            ? error.message
            : 'Saved items could not be loaded.',
        );
        setLoading(false);
      }
    }
  }, [key, transport]);

  useEffect(() => {
    ++sessionEpoch.current;
    selectionSnapshot.current = null;
    interactingWithToolbar.current = false;
    setState(EMPTY);
    setSelection(null);
    setLoading(true);
    setLoadError('');
    setBusy(false);
    inFlight.current = false;
    setToast(null);
    clearHighlights();
    clearEmphasis.current?.();
    restoreAbort.current?.abort();
    void refresh();
    return () => {
      restoreAbort.current?.abort();
      clearEmphasis.current?.();
      clearHighlights();
    };
  }, [key, refresh]);

  useEffect(
    () =>
      subscribe?.(() => {
        void refresh();
      }),
    [subscribe, refresh],
  );

  useEffect(() => {
    if (!key) return;
    const update = () => {
      const result = renderHighlights(stateRef.current, key);
      setUnavailable(result.unavailable);
      setHighlightSupported(result.supported);
    };
    update();
    let debounce: ReturnType<typeof setTimeout>;
    const observer = new MutationObserver((mutations) => {
      if (
        mutations.every((mutation) =>
          (mutation.target instanceof Element
            ? mutation.target
            : mutation.target.parentElement
          )?.closest('[data-backtrack],backtrack-reader'),
        )
      )
        return;
      clearTimeout(debounce);
      debounce = setTimeout(update, 250);
    });
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
    });
    return () => {
      observer.disconnect();
      clearTimeout(debounce);
    };
  }, [key, state]);

  useEffect(() => {
    if (!key) return;
    const inToolbar = (event: Event) =>
      event
        .composedPath()
        .some(
          (node) =>
            node instanceof Element &&
            (node.tagName === 'BACKTRACK-READER' ||
              node.matches('[data-backtrack],.bt-root')),
        );
    const clearSelection = () => {
      selectionSnapshot.current = null;
      setSelection(null);
    };
    const update = () => {
      const next = captureSelection(key);
      if (next) {
        selectionSnapshot.current = next;
        setSelection(next);
      } else if (!interactingWithToolbar.current) clearSelection();
    };
    const pointerDown = (event: Event) => {
      interactingWithToolbar.current = inToolbar(event);
      if (interactingWithToolbar.current) {
        // Capture before the browser or host page moves focus into the shadow
        // root and clears its native selection. A ref survives that event order.
        const next = captureSelection(key);
        if (next) selectionSnapshot.current = next;
      } else clearSelection();
    };
    const pointerUp = (event: Event) => {
      if (!inToolbar(event)) update();
    };
    const hide = (event: Event) => {
      if (!inToolbar(event)) {
        interactingWithToolbar.current = false;
        clearSelection();
      }
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        interactingWithToolbar.current = false;
        clearSelection();
        setOpen(false);
      }
    };
    document.addEventListener('selectionchange', update);
    document.addEventListener('pointerup', pointerUp, true);
    document.addEventListener('pointerdown', pointerDown, true);
    document.addEventListener('keydown', escape);
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    return () => {
      selectionSnapshot.current = null;
      document.removeEventListener('selectionchange', update);
      document.removeEventListener('pointerup', pointerUp, true);
      document.removeEventListener('pointerdown', pointerDown, true);
      document.removeEventListener('keydown', escape);
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
    };
  }, [key]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), toast.error ? 8500 : 3500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (open)
      drawer.current?.querySelector<HTMLButtonElement>('button')?.focus();
    else if (previousOpen.current) libraryButton.current?.focus();
    previousOpen.current = open;
  }, [open]);

  async function mutate(command: Command, success: string) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    const epoch = sessionEpoch.current;
    try {
      const next = await transport(command);
      if (
        currentKey.current === command.key &&
        sessionEpoch.current === epoch
      ) {
        ++reloadVersion.current;
        setState(next);
        selectionSnapshot.current = null;
        setSelection(null);
        notify(success);
      }
    } catch (error) {
      if (currentKey.current === command.key && sessionEpoch.current === epoch)
        notify(
          error instanceof Error
            ? error.message
            : 'Backtrack could not save. Try again.',
          true,
        );
    } finally {
      if (
        currentKey.current === command.key &&
        sessionEpoch.current === epoch
      ) {
        inFlight.current = false;
        setBusy(false);
      }
    }
  }

  async function save(type: SavedItem['type']) {
    if (!key || loading || loadError) return;
    const snapshot = selectionSnapshot.current;
    const liveSelection = captureSelection(key);
    const savedRange =
      snapshot && interactingWithToolbar.current
        ? resolve(snapshot.location, key)
        : null;
    const selected =
      liveSelection ?? (savedRange?.status === 'found' ? snapshot : null);
    const location =
      selected?.location ??
      (type === 'checkpoint' ? captureReadingPosition(key) : null);
    if (!location || location.conversationKey !== key) {
      notify(
        type === 'highlight'
          ? 'Select a passage in an answer first.'
          : assistantMessages().length === 0
            ? 'Backtrack could not recognize an answer on this page. Refresh ChatGPT, then select text inside an answer and try again.'
            : 'Scroll to an answer, or select the passage you want to save.',
        true,
      );
      return;
    }
    await mutate(
      { action: 'add', key, type, location },
      type === 'highlight'
        ? 'Highlight saved.'
        : 'Reading spot saved. Follow your curiosity.',
    );
  }

  async function jump(item: SavedItem) {
    if (!key || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setSelection(null);
    restoreAbort.current?.abort();
    const abort = new AbortController();
    restoreAbort.current = abort;
    try {
      const result = await resolveWithRetry(item.location, key, abort.signal);
      if (abort.signal.aborted || currentKey.current !== key) return;
      if (result.status !== 'found') {
        notify(
          "Couldn't find the saved passage. It may have changed or not loaded yet. Your item is still saved; retry or remove it in Saved items.",
          true,
        );
        return;
      }
      scrollToRange(result.range);
      clearEmphasis.current?.();
      clearEmphasis.current = emphasize(result.range);
      notify('Back where you left off.');
    } catch {
      if (!abort.signal.aborted)
        notify(
          'That passage is unavailable. Your saved item is still here.',
          true,
        );
    } finally {
      if (currentKey.current === key) {
        inFlight.current = false;
        setBusy(false);
      }
    }
  }

  if (!key) return null;
  const active = state.items.find((item) => item.id === state.activeId);
  const items = state.items.filter(
    (item) =>
      item.id !== state.activeId && (filter === 'all' || item.type === filter),
  );
  const disabled = busy || loading || Boolean(loadError);
  return (
    <div className="bt-root">
      {toast && (
        <div
          className={`bt-toast ${toast.error ? 'bt-error' : ''}`}
          role={toast.error ? 'alert' : 'status'}
        >
          <Icon name={toast.error ? 'pin' : 'check'} size={16} />
          <span>{toast.text}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast(null)}
          >
            <Icon name="close" size={14} />
          </button>
        </div>
      )}
      {selection && !open && (
        <div
          className="bt-selection"
          role="toolbar"
          aria-label="Selected passage"
          style={{
            left: Math.max(
              8,
              Math.min(selection.rect.left, window.innerWidth - 256),
            ),
            top:
              selection.rect.top >= 64
                ? selection.rect.top - 50
                : Math.min(window.innerHeight - 54, selection.rect.bottom + 8),
          }}
          onMouseDown={(event) => event.preventDefault()}
        >
          <button disabled={disabled} onClick={() => void save('highlight')}>
            <Icon name="highlight" size={16} />
            Highlight
          </button>
          <span />
          <button disabled={disabled} onClick={() => void save('checkpoint')}>
            <Icon name="pin" size={16} />
            Save spot
          </button>
        </div>
      )}
      {open && (
        <aside
          ref={drawer}
          className="bt-drawer"
          aria-label="Backtrack saved items"
        >
          <header className="bt-drawer-header">
            <div className="bt-wordmark">
              <span className="bt-logo">
                <Icon name="back" size={21} />
              </span>
              <span>
                backtrack<span className="bt-dot">.</span>
              </span>
            </div>
            <button
              className="bt-icon-button"
              aria-label="Close saved items"
              onClick={() => setOpen(false)}
            >
              <Icon name="close" />
            </button>
          </header>
          <div className="bt-drawer-intro">
            <span className="bt-eyebrow">A LITTLE PLACE TO RETURN TO</span>
            <h1>Follow your curiosity.</h1>
            <p>Your reading spot will be here.</p>
          </div>
          <div className="bt-tabs" role="group" aria-label="Filter saved items">
            {(['all', 'checkpoint', 'highlight'] as const).map((value) => (
              <button
                key={value}
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
              >
                {value === 'all'
                  ? 'Everything'
                  : value === 'checkpoint'
                    ? 'Checkpoints'
                    : 'Highlights'}
              </button>
            ))}
          </div>
          <div className="bt-drawer-content">
            {loading ? (
              <p className="bt-state" role="status">
                Loading your saved items…
              </p>
            ) : loadError ? (
              <div className="bt-state bt-load-error" role="alert">
                <p>{loadError}</p>
                <button
                  onClick={() => {
                    setLoading(true);
                    void refresh();
                  }}
                >
                  Try again
                </button>
              </div>
            ) : (
              <>
                {active && filter !== 'highlight' && (
                  <section aria-label="Current checkpoint">
                    <div className="bt-section-heading">
                      <span>
                        <i />
                        CURRENT CHECKPOINT
                      </span>
                      <button
                        disabled={busy}
                        onClick={() =>
                          void mutate(
                            { action: 'resume', key },
                            active.kept
                              ? 'Resumed. Your kept checkpoint is in saved items.'
                              : 'Resumed. Checkpoint cleared.',
                          )
                        }
                      >
                        Resume & clear
                      </button>
                    </div>
                    <ItemCard
                      item={active}
                      active
                      busy={busy}
                      onJump={() => void jump(active)}
                      onChange={(command) =>
                        void mutate(
                          { ...command, key },
                          command.action === 'delete'
                            ? 'Item removed.'
                            : 'Checkpoint updated.',
                        )
                      }
                    />
                  </section>
                )}
                {items.length > 0 && (
                  <section aria-label="Saved passages">
                    <div className="bt-section-heading">
                      <span>SAVED FOR LATER</span>
                      <span>{items.length}</span>
                    </div>
                    {items.map((item) => (
                      <ItemCard
                        key={item.id}
                        item={item}
                        active={false}
                        busy={busy}
                        onJump={() => void jump(item)}
                        onChange={(command) =>
                          void mutate(
                            { ...command, key },
                            command.action === 'delete'
                              ? 'Item removed.'
                              : 'Checkpoint updated.',
                          )
                        }
                      />
                    ))}
                  </section>
                )}
                {!items.length && (!active || filter === 'highlight') && (
                  <div className="bt-empty">
                    <div className="bt-empty-icon">
                      <Icon
                        name={filter === 'highlight' ? 'highlight' : 'pin'}
                        size={27}
                      />
                    </div>
                    <h2>
                      {filter === 'highlight'
                        ? 'Keep the useful parts.'
                        : 'Leave yourself a way back.'}
                    </h2>
                    <p>
                      {filter === 'highlight'
                        ? 'Select text in an answer, then choose Highlight. Your passages will appear here.'
                        : 'Save a spot in a long answer. Go explore a question, then return right here.'}
                    </p>
                    <div className="bt-empty-steps">
                      <span>Read</span>
                      <span>→</span>
                      <span>Save</span>
                      <span>→</span>
                      <span>Explore</span>
                      <span>→</span>
                      <span>Return</span>
                    </div>
                  </div>
                )}
                {unavailable > 0 && (
                  <p className="bt-notice">
                    {unavailable} saved{' '}
                    {unavailable === 1 ? 'highlight is' : 'highlights are'}{' '}
                    waiting for its source. Try again once the answer loads.
                  </p>
                )}
                {!highlightSupported && (
                  <p className="bt-notice">
                    This browser cannot paint persistent highlights. Saved
                    passages and Jump still work.
                  </p>
                )}
              </>
            )}
          </div>
          <footer className="bt-footer">
            <Icon name="lock" size={13} />
            <span>Just for you. Saved on this device.</span>
            <span>0.1.1</span>
          </footer>
        </aside>
      )}
      <div
        className="bt-floating"
        role="toolbar"
        aria-label="Backtrack reading controls"
        onMouseDown={(event) => {
          if (!open) event.preventDefault();
        }}
      >
        <span className="bt-floating-brand" title="Backtrack">
          <Icon name="back" size={19} />
        </span>
        <button
          className="bt-save"
          disabled={disabled}
          title="Save the selected passage or your visible reading spot"
          onClick={() => void save('checkpoint')}
        >
          <Icon name="pin" size={16} />
          <span>Save spot</span>
        </button>
        {active && (
          <button
            className="bt-return"
            disabled={disabled}
            onClick={() => void jump(active)}
          >
            <Icon name="back" size={16} />
            Return
          </button>
        )}
        <span className="bt-divider" />
        <button
          ref={libraryButton}
          className={`bt-library ${open ? 'bt-library-open' : ''}`}
          aria-label={`Saved items (${state.items.length})`}
          aria-expanded={open}
          onClick={() => {
            setSelection(null);
            setOpen(!open);
          }}
        >
          <Icon name="list" size={18} />
          {state.items.length > 0 && (
            <span className="bt-count">{state.items.length}</span>
          )}
        </button>
      </div>
    </div>
  );
}

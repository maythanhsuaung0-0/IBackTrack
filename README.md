# Backtrack

**Follow your curiosity. Never lose your place.**

Backtrack 0.1.1 is a Manifest V3 Chrome extension for reading long ChatGPT answers. Save your place, ask a follow-up in ChatGPT, then return to the passage you were reading. Select text to save persistent highlights.

## Install from GitHub — no build required

This repository includes **`manifest.json` at its root** and the complete compiled Chrome extension. Clone or pull the reviewed code, then load the **IBackTrack folder itself** in Chrome.

```bash
git clone https://github.com/maythanhsuaung0-0/IBackTrack.git
```

1. Open `chrome://extensions` and enable **Developer mode**.
2. Click **Load unpacked** and select the **IBackTrack** folder containing this README and **manifest.json**.
3. Refresh ChatGPT. Use an existing conversation at `https://chatgpt.com/c/...`.

When reviewing an unmerged pull request, check out that PR's branch first. Keep the folder in a permanent location.

**If Chrome says the manifest is missing:** confirm the selected folder directly contains `manifest.json`. The source folders `entrypoints`, `components`, and `lib` are not extension install folders. On an older checkout without a root manifest, pull the merged installation fix first.

## Update an installed build

Run `git pull` in the same installed checkout, click Backtrack's **Reload** button on `chrome://extensions`, and refresh ChatGPT. You do not need npm to install or update the checked-in build. The extension version remains **0.1.1**; this change fixes packaging rather than changing saved data or permissions.

If your existing installation uses the earlier `Backtrack-Chrome` folder, you can copy the generated runtime files listed in `scripts/extension-files.json` into that same folder before reloading. Keep the same installed folder to preserve the extension identity and local data.

Version 0.1.1 fixes selection loss when clicking Save spot, supports alternative assistant-turn / shell reading targets, and handles answers split across multiple markdown sections. Live ChatGPT layout confirmation is still tracked in `QA.md`.

## Use it

- **Save spot** saves selected text, or the visible paragraph nearest the reading line if nothing is selected. It replaces the previous temporary checkpoint.
- Ask your follow-up using ChatGPT’s normal input. Backtrack never submits questions.
- **Return** scrolls to the saved passage and briefly emphasizes it. A successful Return leaves the checkpoint available until you clear or replace it.
- Select text inside an assistant answer for **Highlight** or **Save spot**. Each excerpt is capped at 600 characters; a longer selection saves its first 600 characters.
- Open the list button for **Saved items**. Filter checkpoints and highlights, jump to passages, rename checkpoints, or remove individual items after confirming.
- **Keep checkpoint** retains a checkpoint when you replace or clear the active reading spot.
- **Resume & clear** clears the active checkpoint. A kept checkpoint remains in the saved list.
- **Escape** closes the drawer/selection toolbar. Closing the drawer returns keyboard focus to its button. The drawer is non-modal: it does not trap focus.

The list shows the current conversation only. New and temporary chats without a stable conversation address do not get controls or share a common storage key.

## Develop from source

Requires Node.js 22 or newer and npm. From the repository checkout:

```bash
npm ci
npm run check
npm run build
```

`npm run build` compiles into `.output/chrome-mv3` and stages the same runtime files at the repository root. Load the repository root with **Load unpacked**. Run `npm run check:extension` to validate the root manifest, every packaged file hash, and all manifest/popup asset references.

The generated files are intentionally committed so Chrome can load a fresh checkout immediately. After changing source, run `npm run build` and commit the updated runtime and `scripts/extension-files.json`. CI rebuilds and rejects source/runtime drift. Do not edit generated JavaScript directly; source remains in `entrypoints`, `components`, `lib`, and `features`.

| Command                | What it does                                             |
| ---------------------- | -------------------------------------------------------- |
| `npm run dev`          | WXT development mode and extension reload support        |
| `npm run build`        | Build and stage the ready-to-load Chrome extension       |
| `npm run zip`          | WXT’s extension-only ZIP                                 |
| `npm run typecheck`    | Strict TypeScript checks                                 |
| `npm run lint`         | ESLint source checks                                     |
| `npm test`             | Vitest unit and DOM integration tests                    |
| `npm run check`        | TypeScript, lint, and tests                              |
| `npm run format`       | Format project source                                    |
| `npm run format:check` | Verify formatting                                        |
| `npm run demo`         | Local browser interaction fixture at the printed address |

The optional fixture uses sample answer text and localStorage. It exercises the same React controls, anchor resolver, repository, and highlighter. It is not ChatGPT and does not exercise extension permissions or the service-worker transport. Its `wxt/browser` shim is used only by its separate Vite configuration and is never included in the extension.

## Pull request checks

GitHub Actions runs TypeScript, ESLint, all tests, formatting verification and the production extension build on pull requests and pushes to `main`. It also verifies the checked-in Chrome runtime matches a fresh build. A successful run includes a `backtrack-chrome` build artifact. Local development uses the same npm scripts.

## How it works

1. The ChatGPT adapter identifies assistant answers and the actual scrolling container.
2. The anchor engine maps normalized text back to DOM text nodes. It records a short exact quote, up to 64 characters on each side, a host message ID when available, and a compact message fingerprint.
3. Return requires a unique match in the same conversation and source message. Repeated or edited text can fail safely; an old character offset never wins by itself. Without a message ID, the fingerprint must still match.
4. The background service worker serializes local storage operations across tabs. UI confirmations appear after writes succeed. Records are stored per conversation with a schema version and validation.
5. The CSS Custom Highlight API paints ranges without wrapping or replacing ChatGPT’s text. Mutation observation restores highlights after answer re-renders. Observers, intervals, pending restores, and highlights are cleaned up when the extension context ends.

Key code: `components/App.tsx` (UI and actions), `features/anchors/index.ts` (text matching), `features/highlights/index.ts` (painting), `lib/chatgpt-adapter.ts` (host assumptions), `lib/storage.ts` (validated repository), `entrypoints/background.ts` (Chrome storage transport), and `entrypoints/chatgpt.content/index.tsx` (WXT shadow-root mounting).

## Privacy and permissions

- The only general permission is **storage**. Host access is restricted to **https://chatgpt.com/**.
- Only explicitly saved passage anchors and checkpoint metadata are stored. Whole chats are not stored. Full response text is read in memory only to locate a passage and compute its fingerprint.
- No backend, account, analytics, tracking, cloud sync, external fonts, or external runtime network requests.
- Chrome extension-local storage is **not encryption** and is normally removed when the extension is uninstalled. Avoid saving sensitive excerpts.
- Saved text is rendered as text through React, never as raw HTML.
- Limit: 200 saved items per conversation; new saves stop above approximately 8 MB of extension storage. Removing items remains possible. Malformed or newer-schema records are left untouched and shown as a read error.

## Verification and limitations

Automated checks and a browser fixture have been exercised; see `QA.md` for the exact evidence and pending checks. **Live ChatGPT acceptance testing is still pending.** Do not treat the fixture as evidence of current ChatGPT DOM compatibility.

- ChatGPT’s markup can change. Its selectors are isolated in `lib/chatgpt-adapter.ts` for that reason.
- Deleted, edited, regenerated, unloaded, or ambiguous passages can be unavailable. Backtrack retains the item and reports the problem instead of guessing. Retry after the answer loads, or remove the saved item.
- Restore waits up to three seconds for delayed content. It does not force ChatGPT to load older virtualized messages.
- When a message has no host ID, changing any of its text changes its fingerprint. This deliberately favors a safe failure over a wrong jump.
- Highlights are one yellow style in this MVP. If Custom Highlight is unsupported, the saved passage and Jump remain available; persistent coloring is unavailable, and Return uses a temporary outline.
- There are no nested reading stacks, linked questions, understanding statuses, accounts, sync, or other AI-platform adapters in this release.

For a quick learning exercise, change the reading-line percentage in `lib/chatgpt-adapter.ts`, rebuild, then compare where Save spot chooses a passage in the fixture.

## References

[WXT content scripts](https://wxt.dev/guide/essentials/content-scripts), [Chrome local storage](https://developer.chrome.com/docs/extensions/reference/api/storage), and [CSS Custom Highlight API](https://developer.mozilla.org/en-US/docs/Web/API/CSS_Custom_Highlight_API).

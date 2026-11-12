# Backtrack — Codex Task Tracker and Learning Log

> **Purpose:** A persistent, checkable, evidence-based roadmap for Codex and the developer.
>
> **Rule:** Codex marks `[x]` only after implementation, acceptance criteria, and applicable tests are **actually** verified. The explanation goes in the Learning Log after each task.
>
> **Related:** `project.md` (why/what), `AGENTS.md` (how Codex works).

## Current Status

- **Overall:** MVP 0.1.1 repairs reported Save spot failures; owner confirmation on the live page is pending.
- **Current authorized scope:** MVP (`M0`–`M6`) only.
- **Active phase:** M6 — Owner-run live acceptance.
- **Last verified task:** M6.8 — Handoff with explicit pending live checks.
- **Next eligible task:** `M6.2` — Live ChatGPT save/follow-up/return.
- **Blockers:** M6.2–M6.4 need a live ChatGPT session with the unpacked extension installed.
- **Progress:** 46 / 49 MVP tasks verified. V1/V2 remain unstarted.
- **Learning goal:** For every task, understand the code, its tradeoffs, and how to test it.

## How to use this file

- Tasks are in intended execution order. Complete dependencies first; task IDs are stable.
- **Default:** one task per Codex turn. After Codex explains it, say `continue` to move on.
- To do more in one run, say `continue through phase M2`; Codex must still log and verify **each** task.
- Owner can approve future stages by saying `start V1` or `start V2`.
- If manual browser verification is unavailable, leave that particular task unchecked and provide owner test instructions.
- For each task: implement → test → update checkbox → append Learning Log entry → explain in the conversation.
- Do not mark a phase header as done just because files were generated; all listed phase acceptance tasks must pass.

## MVP — Phase M0: Repository foundation

**Outcome:** A working extension starter with repeatable checks and correct instructions.

- [x] **M0.1 — Inspect the working directory and plan initialization.** Confirm whether a repo exists; find existing code/config and don't overwrite work. **Verify:** describe actual files and the initialization approach in Learning Log.
- [x] **M0.2 — Scaffold WXT + React + TypeScript.** Use the official WXT starter in this project directory without overwriting `AGENTS.md`, `project.md`, or `progress.md`. **Verify:** starter installs successfully and a documented dev command exists.
- [x] **M0.3 — Configure manifest basics and host scope.** Name the extension Backtrack; request `storage` and only required ChatGPT hosts. **Verify:** inspect generated manifest and justify each permission.
- [x] **M0.4 — Add code quality scripts.** TypeScript strict mode, lint/format, and test runner (Vitest or appropriate starter test tooling). **Verify:** record commands and successful outputs.
- [x] **M0.5 — Add initial directory structure and typed interfaces.** Separate adapter, anchors, storage, UI, checkpoints, and highlights without overengineering. **Verify:** TypeScript/build check passes.
- [x] **M0.6 — Write first README with dev commands.** Explain loading the unpacked extension, permissions, and privacy model. **Verify:** commands match real project scripts.

## MVP — Phase M1: Extension injection and UI

**Outcome:** A safe, visible toolbar on ChatGPT that works across client-side navigation.

- [x] **M1.1 — Identify supported ChatGPT page states.** Implement a narrow ChatGPT adapter for supported conversation pages and no-op outside them. **Verify:** adapter tests with representative URL cases.
- [x] **M1.2 — Mount a React UI from a content script.** Use WXT-supported mounting/isolation pattern. **Verify:** content script mounts in a DOM fixture and extension builds; defer actual live ChatGPT appearance check to M6.
- [x] **M1.3 — Build floating Save/Return toolbar layout.** Right-edge positioning, hover/focus states, tooltips, accessibility labels. **Verify:** component test and screenshot/manual UI inspection where available.
- [x] **M1.4 — Handle SPA navigation.** Detect switching conversations without full reload and update UI accordingly. **Verify:** synthetic navigation/unit test; live test separately in M6.
- [x] **M1.5 — Create toast feedback and error states.** Save success, restore unavailable, storage error. **Verify:** UI tests cover all states and non-blocking behavior.
- [x] **M1.6 — Prevent interference with host UI.** Ignore composer/editable elements, constrain z-index and focus, support Escape. **Verify:** tests and inspect interaction behavior.

## MVP — Phase M2: Checkpoint anchoring

**Outcome:** Save a stable, meaningful reading location, not just a raw scroll number.

- [x] **M2.1 — Build conversation identity helper.** Read a stable key from supported URLs; handle absent/temporary IDs carefully. **Verify:** tests for conversations, query strings, trailing slashes, unsupported URLs.
- [x] **M2.2 — Identify assistant messages and text blocks.** Encapsulate DOM queries in ChatGPT adapter. **Verify:** fixture tests with normal replies, headings, lists, inline code, and ignored user messages.
- [x] **M2.3 — Detect actual scroll container and reading line.** Locate active scroll area and block near ~35% reading viewport position. **Verify:** fixture test with nested scrolling and no-selection case.
- [x] **M2.4 — Capture explicit text selections.** Extract `Range` only inside assistant content; ignore whitespace and editors. **Verify:** unit/DOM tests for valid and invalid selections.
- [x] **M2.5 — Serialize robust text anchors.** Store normalized exact text plus prefix/suffix and safe positional hints. **Verify:** round-trip and nested-markup fixture tests.
- [x] **M2.6 — Build versioned storage repository.** CRUD checkpoints by conversation; handle storage errors, schema version, invalid data. **Verify:** tests with mocked `chrome.storage.local`.
- [x] **M2.7 — Implement Save checkpoint action.** Connect toolbar to anchor capture and persistence; confirm only after write succeeds. **Verify:** component/integration test that checks stored record.
- [x] **M2.8 — Add automated tests for repeated text/ambiguous anchors.** Distinguish identical phrases using context or report ambiguity. **Verify:** tests show no confident false matches.

## MVP — Phase M3: Return to checkpoint

**Outcome:** Reliable one-click return after asking additional questions.

- [x] **M3.1 — Implement anchor resolver.** Search correct conversation/message, rank exact/prefix/suffix/position matches, require confident target. **Verify:** tests for unique, repeated, missing, edited text.
- [x] **M3.2 — Reconstruct DOM `Range` and target block.** Handle text split across inline markup. **Verify:** DOM fixture tests for `strong`, `code`, links, and list items.
- [x] **M3.3 — Restore scroll position in correct container.** Use target alignment instead of relying on saved `window.scrollY`. **Verify:** deterministic test/simulation plus a documented browser check.
- [x] **M3.4 — Implement transient Return emphasis.** Briefly emphasize target (without modifying host text DOM), respect reduced motion. **Verify:** UI/DOM tests and cleanup.
- [x] **M3.5 — Add bounded wait/retry for delayed content.** Observe only relevant mutations; disconnect/cleanup after success/failure. **Verify:** test delayed render and timeout cases.
- [x] **M3.6 — Wire Return button and active checkpoint state.** Show only relevant conversation's checkpoint; support Resume/Keep lifecycle. **Verify:** flow tests and persistence tests.
- [x] **M3.7 — Fail safely.** Missing/changed/ambiguous source → actionable error and preserved record; no incorrect jump. **Verify:** automated regression cases.

## MVP — Phase M4: Text highlighting

**Outcome:** Highlight selected assistant text and restore highlights after refresh.

- [x] **M4.1 — Build text-selection toolbar.** Show Highlight / Save checkpoint on valid selection, position safely, dismiss with Escape/outside click. **Verify:** component/DOM tests.
- [x] **M4.2 — Implement highlighter renderer using CSS Custom Highlight API.** Feature detect; use stable scoped registry names; don't wrap host text. **Verify:** renderer tests/browser simulation.
- [x] **M4.3 — Create SavedHighlight storage CRUD.** Save text anchor and status (MVP defaults to `important`), delete by ID. **Verify:** storage tests.
- [x] **M4.4 — Save a selected highlight end-to-end.** Selection → anchor → storage → visible rendering. **Verify:** integration test with fixture.
- [x] **M4.5 — Restore saved highlights after refresh/navigation.** Resolve anchors when matching conversation loads. **Verify:** simulated remount + persisted fixture.
- [x] **M4.6 — Handle difficult selections gracefully.** Repeated phrases, nested nodes, overlapping ranges, source not found. **Verify:** automated edge-case tests and documented limitations.
- [x] **M4.7 — Add remove-highlight action.** Removes persistence and rendered range only for target highlight; no host DOM corruption. **Verify:** integration test.
- [x] **M4.8 — Validate dark/light and accessibility.** Readability, high contrast, labels not based solely on colors. **Verify:** theme/contrast component checks; live Chrome visual inspection is explicitly tracked in M6.

## MVP — Phase M5: Saved-items panel

**Outcome:** Users can view and manage checkpoints and highlights.

- [x] **M5.1 — Build accessible right-side drawer.** Sections for active checkpoint, saved checkpoints, highlights; close/focus behavior. **Verify:** component tests.
- [x] **M5.2 — List items by conversation.** Show preview/timestamp and empty state, never render saved text as raw HTML. **Verify:** tests with multiple conversations and unsafe-looking strings.
- [x] **M5.3 — Add Jump to checkpoint / highlight.** Reuse resolver/restore flow; communicate missing sources. **Verify:** integration tests.
- [x] **M5.4 — Add Keep, Rename, and Delete checkpoint.** Validate data and persist changes. **Verify:** CRUD tests.
- [x] **M5.5 — Add Delete highlight in drawer.** Refresh the registry immediately and persist deletion. **Verify:** integration test.
- [x] **M5.6 — Handle storage limits, malformed data, and errors.** Non-destructive recovery and user-facing feedback. **Verify:** error-state tests.

## MVP — Phase M6: QA, privacy, and release readiness

**Outcome:** A real, verifiable local MVP that another user can install.

- [x] **M6.1 — Test complete automated suite and build.** Run real scripts and fix regressions; log exact commands and outcomes. **Verify:** passing unit tests/typecheck/lint/build.
- [ ] **M6.2 — Test long-conversation manual flow in live ChatGPT.** Save at 20% of long answer → ask follow-up → Return to correct passage. **Verify:** actual Chrome test or owner-recorded result; don't mark from simulation alone.
- [ ] **M6.3 — Test refresh, conversation switching, and missing source in live browser.** Includes no wrong-page jump, bounded retry, and clear failure. **Verify:** actual browser/owner test evidence.
- [ ] **M6.4 — Test highlight persistence and composer safety in live browser.** Text selection, normal typing, dark/light modes, Escape, and no focus trap. **Verify:** actual browser/owner test evidence.
- [x] **M6.5 — Review host permissions, data minimization, and privacy.** Confirm no network transfer, no full-chat storage, safe text rendering. **Verify:** manifest/code audit recorded.
- [x] **M6.6 — Finalize README and demo/test guide.** Install unpacked extension, demo narrative, known limitations, troubleshooting, version. **Verify:** follows actual current code behavior.
- [x] **M6.7 — Pilot feedback plan.** Write 5–10-person test script plus metrics: return-time, wrong jumps, repeat usage, perceived utility. **Verify:** reproducible test guide in repository.
- [x] **M6.8 — Complete MVP handoff.** Confirm completed tasks truly checked, remaining blockers honest, give learnings and recommend next release. **Verify:** evidence-backed summary; no unverified launch claims.

---

## V1 — Phase V1.1: Ask & Return (requires owner's approval)

- [ ] **V1.1.1 — Extend storage schema for linked question metadata.** Add migration for previous records. **Verify:** migration tests.
- [ ] **V1.1.2 — Add Ask & Return toolbar action.** Explicitly associate selected passage + checkpoint. **Verify:** linked record tests.
- [ ] **V1.1.3 — Add optional question drafting UI.** User can enter and save their follow-up locally; copy prompt with explicit click. **Verify:** no auto-sending; tests.
- [ ] **V1.1.4 — Show original passage and Return control during a detour.** Reuse existing anchors. **Verify:** flow tests.
- [ ] **V1.1.5 — Display question links in drawer.** Navigate back to source. **Verify:** tests for stale source and deletion.

## V1 — Phase V1.2: Nested reading stack (requires owner's approval)

- [ ] **V1.2.1 — Design stack state and transitions.** Define push, pop, reset, and cross-conversation isolation. **Verify:** state-machine tests.
- [ ] **V1.2.2 — Push checkpoints for nested explorations.** A → B → C and active top. **Verify:** tests for order and persistence.
- [ ] **V1.2.3 — Implement Return-to-parent behavior.** C → B → A, including failure handling. **Verify:** integration tests.
- [ ] **V1.2.4 — Show breadcrumb/stack trail.** Accessible navigation to earlier checkpoints. **Verify:** UI tests.

## V1 — Phase V1.3: Understanding-oriented highlights (requires owner's approval)

- [ ] **V1.3.1 — Add status labels.** `important`, `confused`, `understood`, with accessible words/icons; colors not sole indicator. **Verify:** component tests.
- [ ] **V1.3.2 — Persist and render status updates.** Orange confused, green understood, yellow important (adjust for accessible contrast). **Verify:** storage/renderer tests.
- [ ] **V1.3.3 — Add editable private notes to a highlight.** Plain text, length-limited, stored locally. **Verify:** editing and safety tests.
- [ ] **V1.3.4 — Filter unresolved questions/highlights.** Show confusing items separately. **Verify:** state/filter tests.
- [ ] **V1.3.5 — Verify full V1 workflow in browser.** Highlight → Ask → nested explore → Return → Understood. **Verify:** actual manual evidence before checking.

## V2 — Optional later ideas (requires owner's approval)

- [ ] **V2.1 — Add configurable keyboard shortcuts.** Keep collisions with ChatGPT/browser shortcuts in mind.
- [ ] **V2.2 — Add first-run onboarding and UX settings.** Explain privacy and local-only data.
- [ ] **V2.3 — Evaluate second AI platform adapter.** Investigate technical/legal constraints before choosing target.
- [ ] **V2.4 — Investigate Backtrack-data export/import.** Only user-authored metadata, explicit user action.
- [ ] **V2.5 — Run small user pilot and record findings.** Prioritize measurable pain points; avoid speculative claims.
- [ ] **V2.6 — Decide whether to prepare a Chrome Web Store listing.** Never publish without owner authorization.

---

## Blockers

M6.2–M6.4 remain unverified: this run exercised a browser fixture and mocked WXT mounting, not a signed-in live ChatGPT extension session. Install the packaged extension and follow `QA.md`. Do not infer a live pass from a simulation.

Blocker entry format:

```md
- **Task ID:** M3.3
  **Blocked because:** Live Chrome browser is unavailable in this Codex environment.
  **Evidence:** Unit/simulation tests passed; live scroll test not performed.
  **Owner action:** Load unpacked extension in Chrome, open a long ChatGPT conversation, save and return, report actual result.
  **Next action for Codex:** Investigate/repair based on reported result; leave task unchecked until verified.
```

## Decision Log

- **Initial decision:** Target ChatGPT desktop Chrome first; WXT + React + TypeScript; extension-local storage; no backend/API in MVP.
  **Reason:** Proves the core reading-continuity workflow without unrelated infrastructure.
- **Initial decision:** Keep checkpoints separate from highlights.
  **Reason:** A user can highlight many ideas while having just one active reading location.
- **Initial decision:** Anchor to exact text + surrounding context rather than scrollY alone.
  **Reason:** AI pages expand and re-render; raw offsets become unreliable.
- **Initial decision:** One task per Codex turn by default.
  **Reason:** The owner wants to learn and inspect each increment.

Append material changes as dated decisions, with rationale and impact on tasks.

- **2026-11-11 — Build request:** Interpreted “can you build backtrack?” as authorization to implement the complete existing MVP, beyond the initial one-task teaching default. V1/V2 were not started. All completed tasks retain their own evidence below.
- **2026-11-11 — Storage:** Store schema-v1 conversation records under individual local keys; serialize operations in one service worker. This avoids full-state rewrites and concurrent-tab lost updates. Unknown/corrupt records fail without overwriting them.
- **2026-11-11 — Conservative anchors:** When a host message ID is present, do not fall back to another message if the source disappears. Without an ID, require an unchanged message fingerprint. Repeated context never resolves from a position hint alone.
- **2026-11-11 — Packaging:** Deliver one ZIP containing prebuilt `extension/`, full `source/`, and install instructions. No Chrome Web Store publication or installation was performed.

## Work Notes

Record partial implementation or uncertain findings here, without ticking tasks prematurely.

```md
### <date> — <Task ID> — partial
- What exists:
- What's missing:
- Tests actually run:
- Follow-up:
```

## Learning Log

**Codex must append one entry per completed task** (and explain in its chat response). Use this template; keep it concise but educational.

```md
### YYYY-MM-DD — M0.1 — <Task title>
- **What I built / found:** ...
- **Files changed:** `path` — purpose; ...
- **How it works:** ... (key functions / React, TypeScript, browser concept)
- **Why this design:** ... (tradeoff)
- **Evidence:** `npm run ...` passed; tests X/Y; browser manual check done/not done.
- **Try it yourself:** ... (one simple exercise/question)
- **Next:** M0.2
```

> The implementation evidence below supersedes the initial planning state. Live acceptance is explicitly excluded from completed tasks.


## Verified build evidence — 2026-11-11

- `npm run check`: strict TypeScript and ESLint passed; **54 tests passed in 5 test files**.
- `npm run build`: WXT 0.21.5 production Chrome Manifest V3 build passed.
- `npm run format:check`: passed.
- Browser fixture: Save → append follow-up → Return; correct original content visible after scroll; selection toolbar; persistent yellow highlight after refresh; drawer; empty second conversation; restored first conversation; normal composer typing; Jump to highlight.
- Manifest/code audit: only `storage` and `https://chatgpt.com/*`; no runtime fetch, telemetry, raw-HTML rendering of saved excerpts, or full-chat persistence.
- Live ChatGPT and actual service-worker transport checks remain pending in `QA.md`.

### 2026-11-11 — M0.1 — Repository inspection
- **What I built / found:** Inspect the working directory and plan initialization.
- **Files changed:** `project.md, progress.md`.
- **How it works / why:** No prior source repository existed; preserved the two planning files.
- **Evidence:** Inspected the supplied working directory and resolved the existing planning files before writing source.
- **Try it yourself:** Read the named implementation alongside its corresponding test, then follow the related README or QA step.
- **Next:** M0.2.

### 2026-11-11 — M0.2 — Official WXT React scaffold
- **What I built / found:** Scaffold WXT + React + TypeScript.
- **Files changed:** `package.json, package-lock.json, wxt.config.ts`.
- **How it works / why:** Initialized the official React template in a staging directory and merged it without replacing planning files.
- **Evidence:** The official WXT init command and npm installation completed successfully.
- **Try it yourself:** Read the named implementation alongside its corresponding test, then follow the related README or QA step.
- **Next:** M0.3.

### 2026-11-11 — M0.3 — Minimal Chrome manifest
- **What I built / found:** Configure manifest basics and host scope.
- **Files changed:** `wxt.config.ts`.
- **How it works / why:** WXT generates a Manifest V3 extension named Backtrack. Storage is the only general permission; content and host scope is ChatGPT only.
- **Evidence:** Inspected .output/chrome-mv3/manifest.json after the production build.
- **Try it yourself:** Read the named implementation alongside its corresponding test, then follow the related README or QA step.
- **Next:** M0.4.

### 2026-11-11 — M0.4 — Repeatable quality checks
- **What I built / found:** Add code quality scripts.
- **Files changed:** `tsconfig.json, eslint.config.mjs, vitest.config.ts, package.json`.
- **How it works / why:** Strict TypeScript, ESLint, Prettier and Vitest have real npm scripts.
- **Evidence:** npm run check and npm run format:check passed.
- **Try it yourself:** Read the named implementation alongside its corresponding test, then follow the related README or QA step.
- **Next:** M0.5.

### 2026-11-11 — M0.5 — Typed architectural boundaries
- **What I built / found:** Add initial directory structure and typed interfaces.
- **Files changed:** `lib/types.ts, lib/storage.ts, features/anchors/index.ts`.
- **How it works / why:** Serializable locations and saved items are separate from DOM ranges and UI state.
- **Evidence:** Strict TypeScript and production build passed.
- **Try it yourself:** Read the named implementation alongside its corresponding test, then follow the related README or QA step.
- **Next:** M0.6.

### 2026-11-11 — M0.6 — Development README
- **What I built / found:** Write first README with dev commands.
- **Files changed:** `README.md`.
- **How it works / why:** Documented actual install paths, commands, scope, permissions and local-data behavior.
- **Evidence:** Compared commands with package.json and generated output.
- **Try it yourself:** Read the named implementation alongside its corresponding test, then follow the related README or QA step.
- **Next:** M1.1.

### 2026-11-11 — M1.1 — Supported page adapter
- **What I built / found:** Identify supported ChatGPT page states.
- **Files changed:** `lib/url.ts, lib/chatgpt-adapter.ts`.
- **How it works / why:** Only stable ChatGPT conversation addresses yield a conversation key.
- **Evidence:** URL and assistant-message tests passed.
- **Try it yourself:** Read the named implementation alongside its corresponding test, then follow the related README or QA step.
- **Next:** M1.2.

### 2026-11-11 — M1.2 — Isolated React mount
- **What I built / found:** Mount a React UI from a content script.
- **Files changed:** `entrypoints/chatgpt.content/index.tsx, tests/mount.test.tsx`.
- **How it works / why:** The WXT content script creates one shadow-root UI and removes it on invalidation.
- **Evidence:** Mocked WXT shadow-root mount/cleanup test and extension build passed. Live mounting remains M6.
- **Try it yourself:** Read the named implementation alongside its corresponding test, then follow the related README or QA step.
- **Next:** M1.3.

### 2026-11-11 — M1.3 — Floating reader controls
- **What I built / found:** Build floating Save/Return toolbar layout.
- **Files changed:** `components/App.tsx, entrypoints/chatgpt.content/style.css`.
- **How it works / why:** Save, Return and Saved items have labels, disabled states and focus outlines.
- **Evidence:** UI integration tests and browser-fixture screenshots verified layout.
- **Try it yourself:** Read the named implementation alongside its corresponding test, then follow the related README or QA step.
- **Next:** M1.4.

### 2026-11-11 — M1.4 — SPA conversation changes
- **What I built / found:** Handle SPA navigation.
- **Files changed:** `components/App.tsx`.
- **How it works / why:** A lightweight URL check and popstate listener reload only the current conversation; pending restores cancel.
- **Evidence:** Synthetic navigation test and browser-fixture conversation switching passed.
- **Try it yourself:** Read the named implementation alongside its corresponding test, then follow the related README or QA step.
- **Next:** M1.5.

### 2026-11-11 — M1.5 — Honest feedback
- **What I built / found:** Create toast feedback and error states.
- **Files changed:** `components/App.tsx`.
- **How it works / why:** Save success follows a successful write; read/storage/unavailable errors stay actionable.
- **Evidence:** Storage rejection, load error/retry and missing-return UI tests passed.
- **Try it yourself:** Read the named implementation alongside its corresponding test, then follow the related README or QA step.
- **Next:** M1.6.

### 2026-11-11 — M1.6 — Host interaction safety
- **What I built / found:** Prevent interference with host UI.
- **Files changed:** `lib/chatgpt-adapter.ts, components/App.tsx`.
- **How it works / why:** Editable content is excluded; selection controls dismiss with Escape; the drawer is non-modal.
- **Evidence:** Selection/composer exclusion and Escape/focus tests passed; fixture composer typing worked.
- **Try it yourself:** Read the named implementation alongside its corresponding test, then follow the related README or QA step.
- **Next:** M2.1.

### 2026-11-11 — M2.1 — Conversation identity
- **What I built / found:** Build conversation identity helper.
- **Files changed:** `lib/url.ts`.
- **How it works / why:** Canonical /c/ IDs isolate records and reject temporary/new/unsupported routes.
- **Evidence:** Normal/custom-GPT routes, queries, trailing slash, wrong hosts and invalid URLs tested.
- **Try it yourself:** Read the named implementation alongside its corresponding test, then follow the related README or QA step.
- **Next:** M2.2.

### 2026-11-11 — M2.2 — Assistant text discovery
- **What I built / found:** Identify assistant messages and text blocks.
- **Files changed:** `lib/chatgpt-adapter.ts`.
- **How it works / why:** ChatGPT-specific selectors distinguish assistant answers from user text and the composer.
- **Evidence:** Fixture covered paragraphs, headings, lists, strong/code/link markup.
- **Try it yourself:** Read the named implementation alongside its corresponding test, then follow the related README or QA step.
- **Next:** M2.3.

### 2026-11-11 — M2.3 — Visible reading line
- **What I built / found:** Detect actual scroll container and reading line.
- **Files changed:** `lib/chatgpt-adapter.ts`.
- **How it works / why:** No-selection saves choose a visible block near 35% of the actual scrolling reader.
- **Evidence:** Nested scrolling fixture and browser no-selection Save passed.
- **Try it yourself:** Read the named implementation alongside its corresponding test, then follow the related README or QA step.
- **Next:** M2.4.

### 2026-11-11 — M2.4 — Explicit selections
- **What I built / found:** Capture explicit text selections.
- **Files changed:** `features/anchors/index.ts`.
- **How it works / why:** Only a non-empty selection entirely within one assistant answer becomes an anchor.
- **Evidence:** Nested-node, composer, user, empty and cross-message selection tests passed.
- **Try it yourself:** Read the named implementation alongside its corresponding test, then follow the related README or QA step.
- **Next:** M2.5.

### 2026-11-11 — M2.5 — Serializable text anchors
- **What I built / found:** Serialize robust text anchors.
- **Files changed:** `features/anchors/index.ts`.
- **How it works / why:** Normalized quotes retain a DOM character map and bounded surrounding context; storage holds no Range objects.
- **Evidence:** JSON round-trip, whitespace, nested markup and excerpt-cap tests passed.
- **Try it yourself:** Read the named implementation alongside its corresponding test, then follow the related README or QA step.
- **Next:** M2.6.

### 2026-11-11 — M2.6 — Versioned local repository
- **What I built / found:** Build versioned storage repository.
- **Files changed:** `lib/storage.ts, entrypoints/background.ts`.
- **How it works / why:** One record per conversation is schema-validated before CRUD; corrupt data is preserved.
- **Evidence:** Storage CRUD, schema, write-error, concurrent-writes and capacity tests passed.
- **Try it yourself:** Read the named implementation alongside its corresponding test, then follow the related README or QA step.
- **Next:** M2.7.

### 2026-11-11 — M2.7 — Save action integration
- **What I built / found:** Implement Save checkpoint action.
- **Files changed:** `components/App.tsx`.
- **How it works / why:** Save connects a selection/reading anchor to background persistence and updates active state after success.
- **Evidence:** UI save test checked the resulting persisted record.
- **Try it yourself:** Read the named implementation alongside its corresponding test, then follow the related README or QA step.
- **Next:** M2.8.

### 2026-11-11 — M2.8 — Ambiguity regressions
- **What I built / found:** Add automated tests for repeated text/ambiguous anchors.
- **Files changed:** `features/anchors/index.ts, tests/anchors.test.ts`.
- **How it works / why:** Context and source identity must distinguish repeated text; character position never breaks a tie.
- **Evidence:** Repeated text, duplicate source candidates and deleted-source regressions passed.
- **Try it yourself:** Read the named implementation alongside its corresponding test, then follow the related README or QA step.
- **Next:** M3.1.

### 2026-11-11 — M3.1 — Safe anchor resolver
- **What I built / found:** Implement anchor resolver.
- **Files changed:** `features/anchors/index.ts`.
- **How it works / why:** Resolve only within the matching conversation and source; require exactly one quote/context match.
- **Evidence:** Unique, repeated, edited, missing, cross-conversation and fingerprint cases passed.
- **Try it yourself:** Read the named implementation alongside its corresponding test, then follow the related README or QA step.
- **Next:** M3.2.

### 2026-11-11 — M3.2 — DOM range reconstruction
- **What I built / found:** Reconstruct DOM `Range` and target block.
- **Files changed:** `features/anchors/index.ts`.
- **How it works / why:** Normalized offsets map back to real Text nodes, including selections spanning inline markup.
- **Evidence:** Strong/code/link/list and whitespace fixture tests passed.
- **Try it yourself:** Read the named implementation alongside its corresponding test, then follow the related README or QA step.
- **Next:** M3.3.

### 2026-11-11 — M3.3 — Container-aware return
- **What I built / found:** Restore scroll position in correct container.
- **Files changed:** `lib/chatgpt-adapter.ts`.
- **How it works / why:** ScrollBy aligns the resolved Range near the reading line within its actual scroll parent.
- **Evidence:** Deterministic nested-scroll test and actual browser-fixture save/detour/return passed.
- **Try it yourself:** Read the named implementation alongside its corresponding test, then follow the related README or QA step.
- **Next:** M3.4.

### 2026-11-11 — M3.4 — Temporary emphasis
- **What I built / found:** Implement transient Return emphasis.
- **Files changed:** `features/highlights/index.ts`.
- **How it works / why:** A named Custom Highlight emphasizes Return, then expires; a separate border overlay is the unsupported-browser fallback.
- **Evidence:** Registry/timer cleanup tests passed; browser fixture showed the return target.
- **Try it yourself:** Read the named implementation alongside its corresponding test, then follow the related README or QA step.
- **Next:** M3.5.

### 2026-11-11 — M3.5 — Bounded delayed restore
- **What I built / found:** Add bounded wait/retry for delayed content.
- **Files changed:** `features/anchors/index.ts`.
- **How it works / why:** A mutation observer waits up to three seconds; timeout and cancellation disconnect it.
- **Evidence:** Delayed content, timeout and navigation-abort tests passed.
- **Try it yourself:** Read the named implementation alongside its corresponding test, then follow the related README or QA step.
- **Next:** M3.6.

### 2026-11-11 — M3.6 — Active checkpoint lifecycle
- **What I built / found:** Wire Return button and active checkpoint state.
- **Files changed:** `components/App.tsx, lib/storage.ts`.
- **How it works / why:** Temporary checkpoints replace one another; Keep preserves them, and Resume clears the active point.
- **Evidence:** Save/Return/Resume UI test and Keep/Rename/replace storage tests passed.
- **Try it yourself:** Read the named implementation alongside its corresponding test, then follow the related README or QA step.
- **Next:** M3.7.

### 2026-11-11 — M3.7 — Unavailable source safety
- **What I built / found:** Fail safely.
- **Files changed:** `components/App.tsx, features/anchors/index.ts`.
- **How it works / why:** Missing or ambiguous sources retain saved items and show an error without scrolling elsewhere.
- **Evidence:** Resolver regressions plus missing-checkpoint UI test verified no scroll and retained active ID.
- **Try it yourself:** Read the named implementation alongside its corresponding test, then follow the related README or QA step.
- **Next:** M4.1.

### 2026-11-11 — M4.1 — Selection toolbar
- **What I built / found:** Build text-selection toolbar.
- **Files changed:** `components/App.tsx`.
- **How it works / why:** Valid selections show Highlight and Save spot with viewport clamping; Escape/scroll/outside interactions dismiss it.
- **Evidence:** Selection UI tests and real drag-selection in browser fixture passed.
- **Try it yourself:** Read the named implementation alongside its corresponding test, then follow the related README or QA step.
- **Next:** M4.2.

### 2026-11-11 — M4.2 — Non-destructive highlight painting
- **What I built / found:** Implement highlighter renderer using CSS Custom Highlight API.
- **Files changed:** `features/highlights/index.ts`.
- **How it works / why:** CSS.highlights paints ranges without replacing host text DOM; unsupported browsers retain saved items and Jump.
- **Evidence:** Renderer tests verified registry updates, capability fallback and unchanged host innerHTML.
- **Try it yourself:** Read the named implementation alongside its corresponding test, then follow the related README or QA step.
- **Next:** M4.3.

### 2026-11-11 — M4.3 — Highlight persistence CRUD
- **What I built / found:** Create SavedHighlight storage CRUD.
- **Files changed:** `lib/storage.ts`.
- **How it works / why:** Highlights use bounded validated locations and independent IDs in conversation-local records.
- **Evidence:** Add/read/delete, concurrent highlight saves, quotas and errors tested.
- **Try it yourself:** Read the named implementation alongside its corresponding test, then follow the related README or QA step.
- **Next:** M4.4.

### 2026-11-11 — M4.4 — Highlight save flow
- **What I built / found:** Save a selected highlight end-to-end.
- **Files changed:** `components/App.tsx, features/highlights/index.ts`.
- **How it works / why:** Selection → persisted anchor → registered range is wired through the same repository.
- **Evidence:** UI integration and real browser-fixture selection/save passed.
- **Try it yourself:** Read the named implementation alongside its corresponding test, then follow the related README or QA step.
- **Next:** M4.5.

### 2026-11-11 — M4.5 — Highlight restoration
- **What I built / found:** Restore saved highlights after refresh/navigation.
- **Files changed:** `features/highlights/index.ts, components/App.tsx`.
- **How it works / why:** Reconstruct saved ranges after remount/navigation and after assistant DOM mutations.
- **Evidence:** DOM remount test and actual fixture refresh preserved a visible yellow highlight.
- **Try it yourself:** Read the named implementation alongside its corresponding test, then follow the related README or QA step.
- **Next:** M4.6.

### 2026-11-11 — M4.6 — Difficult highlight cases
- **What I built / found:** Handle difficult selections gracefully.
- **Files changed:** `features/anchors/index.ts, features/highlights/index.ts`.
- **How it works / why:** Each item resolves independently, overlaps use separate Ranges, and missing items are reported.
- **Evidence:** Overlaps, nested nodes, repeated contexts and unavailable-source tests passed.
- **Try it yourself:** Read the named implementation alongside its corresponding test, then follow the related README or QA step.
- **Next:** M4.7.

### 2026-11-11 — M4.7 — Remove individual highlights
- **What I built / found:** Add remove-highlight action.
- **Files changed:** `components/App.tsx, features/highlights/index.ts`.
- **How it works / why:** Deleting one stored record repaints the remaining registry without touching assistant markup.
- **Evidence:** UI deletion and overlapping-highlight renderer regression passed.
- **Try it yourself:** Read the named implementation alongside its corresponding test, then follow the related README or QA step.
- **Next:** M4.8.

### 2026-11-11 — M4.8 — Highlight palette and accessibility
- **What I built / found:** Validate dark/light and accessibility.
- **Files changed:** `features/highlights/index.ts, components/App.tsx`.
- **How it works / why:** Both light/dark highlight palettes keep explicit foreground/background colors; controls have text labels and keyboard behavior.
- **Evidence:** All four highlight color pairs passed 4.5:1 contrast; UI label/Escape/focus tests passed. Live Chrome theme inspection remains M6.4.
- **Try it yourself:** Read the named implementation alongside its corresponding test, then follow the related README or QA step.
- **Next:** M5.1.

### 2026-11-11 — M5.1 — Saved-items drawer
- **What I built / found:** Build accessible right-side drawer.
- **Files changed:** `components/App.tsx`.
- **How it works / why:** A right-side non-modal drawer has labeled sections, a close button and focus restoration.
- **Evidence:** Drawer/Escape/focus integration tests and browser-fixture visual inspection passed.
- **Try it yourself:** Read the named implementation alongside its corresponding test, then follow the related README or QA step.
- **Next:** M5.2.

### 2026-11-11 — M5.2 — Conversation-local saved list
- **What I built / found:** List items by conversation.
- **Files changed:** `components/App.tsx`.
- **How it works / why:** Preview text and dates are rendered through React; empty/loading/error states are explicit.
- **Evidence:** Conversation switching, filtering, unsafe-looking label and empty-state tests passed.
- **Try it yourself:** Read the named implementation alongside its corresponding test, then follow the related README or QA step.
- **Next:** M5.3.

### 2026-11-11 — M5.3 — Jump actions
- **What I built / found:** Add Jump to checkpoint / highlight.
- **Files changed:** `components/App.tsx`.
- **How it works / why:** Checkpoint and highlight Jump reuse the same safe resolver and scroll path.
- **Evidence:** UI Return and real browser highlight-Jump checks passed; missing source tested separately.
- **Try it yourself:** Read the named implementation alongside its corresponding test, then follow the related README or QA step.
- **Next:** M5.4.

### 2026-11-11 — M5.4 — Checkpoint management
- **What I built / found:** Add Keep, Rename, and Delete checkpoint.
- **Files changed:** `components/App.tsx, lib/storage.ts`.
- **How it works / why:** Keep, Rename and Delete go through validated repository commands; names are length-limited.
- **Evidence:** Storage lifecycle and UI rename/keep/escaped-label tests passed.
- **Try it yourself:** Read the named implementation alongside its corresponding test, then follow the related README or QA step.
- **Next:** M5.5.

### 2026-11-11 — M5.5 — Drawer highlight removal
- **What I built / found:** Add Delete highlight in drawer.
- **Files changed:** `components/App.tsx`.
- **How it works / why:** Confirm an individual removal, update persistence, and repaint remaining ranges immediately.
- **Evidence:** UI deletion and renderer preservation tests passed.
- **Try it yourself:** Read the named implementation alongside its corresponding test, then follow the related README or QA step.
- **Next:** M5.6.

### 2026-11-11 — M5.6 — Capacity and malformed-data feedback
- **What I built / found:** Handle storage limits, malformed data, and errors.
- **Files changed:** `lib/storage.ts, components/App.tsx`.
- **How it works / why:** Full/corrupt storage reports an error without silent loss; deletes still work at capacity.
- **Evidence:** Quota, malformed/newer schema, write failure and load-error/retry tests passed.
- **Try it yourself:** Read the named implementation alongside its corresponding test, then follow the related README or QA step.
- **Next:** M6.1.

### 2026-11-11 — M6.1 — Automated checks and build
- **What I built / found:** Test complete automated suite and build.
- **Files changed:** `tests/, package.json`.
- **How it works / why:** The complete implementation was checked with strict types, lint, 54 tests, production build and formatting verification.
- **Evidence:** npm run check, npm run build and npm run format:check passed.
- **Try it yourself:** Read the named implementation alongside its corresponding test, then follow the related README or QA step.
- **Next:** M6.5.

### 2026-11-11 — M6.5 — Permissions and privacy review
- **What I built / found:** Review host permissions, data minimization, and privacy.
- **Files changed:** `wxt.config.ts, README.md`.
- **How it works / why:** Generated manifest is ChatGPT-only with storage; application code has no runtime network/telemetry/full-chat persistence.
- **Evidence:** Inspected generated manifest and searched production source for network calls, raw HTML rendering and logging.
- **Try it yourself:** Read the named implementation alongside its corresponding test, then follow the related README or QA step.
- **Next:** M6.6.

### 2026-11-11 — M6.6 — Install and test guide
- **What I built / found:** Finalize README and demo/test guide.
- **Files changed:** `README.md, QA.md`.
- **How it works / why:** Documentation covers packaged/source install paths, limitations, actual flows and troubleshooting.
- **Evidence:** Commands and output paths matched the successful build; pending live checks are explicitly separated.
- **Try it yourself:** Read the named implementation alongside its corresponding test, then follow the related README or QA step.
- **Next:** M6.7.

### 2026-11-11 — M6.7 — Pilot guide
- **What I built / found:** Pilot feedback plan.
- **Files changed:** `QA.md`.
- **How it works / why:** A reproducible 5–10 reader script compares return time, safe failures, wrong jumps and repeat usage without analytics code.
- **Evidence:** Reviewed the script against the product pilot metrics and privacy constraints.
- **Try it yourself:** Read the named implementation alongside its corresponding test, then follow the related README or QA step.
- **Next:** M6.8.

### 2026-11-11 — M6.8 — Reviewable local handoff
- **What I built / found:** Complete MVP handoff.
- **Files changed:** `README.md, QA.md, progress.md`.
- **How it works / why:** Package the prebuilt extension and full source together; keep live acceptance tasks unchecked.
- **Evidence:** Build/tests/manifest/browser-fixture evidence is recorded; no live ChatGPT or Web Store launch claim is made.
- **Try it yourself:** Read the named implementation alongside its corresponding test, then follow the related README or QA step.
- **Next:** M6.2 — run the live Chrome checklist in QA.md.


### 2026-11-11 — 0.1.1 — Save spot compatibility and selection regression
- **User report:** Selecting text and clicking Save spot showed only the no-passage error. This is a live failure report, not a successful live acceptance run.
- **What I changed:** Assistant detection now supports semantic turn containers and scoped shell reading targets, handles multiple markdown sections in one answer, and excludes user messages/editable controls. A capture-phase pointer listener retains the selected anchor in a ref before focus changes into the shadow-root toolbar. Cache use requires an explicit toolbar interaction and a resolvable same-conversation anchor; outside/composer interaction clears it.
- **Files changed:** `lib/chatgpt-adapter.ts`, `components/App.tsx`, `tests/selection-regression.test.tsx`, the demo fixture, release metadata, README and QA guide.
- **Why:** The old selector and native-selection lifetime assumptions were too narrow. The original browser demo did not mount its controls in a shadow root; the revised demo does.
- **Evidence before fix:** All four initial regressions failed against 0.1.0.
- **Evidence after fix:** Full automated suite and strict TypeScript/lint/build/format checks recorded below. Browser fixture confirmed selecting a passage, clicking the floating Save spot button, seeing the exact excerpt in the drawer, appending a sample follow-up, and returning to the excerpt through a real shadow-root UI.
- **Safety checks:** No fallback to arbitrary main-page text. Whole conversations, known user content, composer text, ambiguous anchors and different conversations remain excluded. No permissions, network access, or schema changes.
- **Try it yourself:** Replace the existing installed folder's files with the 0.1.1 build, Reload the extension, refresh ChatGPT, select text in an assistant answer and press Save spot. Verify the drawer preview matches exactly.
- **Still pending:** Confirm the owner's actual ChatGPT layout and extension transport; M6.2–M6.4 stay unchecked.

- **Final 0.1.1 checks:** `npm run check` passed (strict TypeScript, ESLint, **60 tests in 6 files**); `npm run build` passed; `npm run format:check` passed. Both the extension-only and full-source packages passed ZIP integrity and manifest/asset checks.


### 2026-11-11 — GitHub review workflow
- **Owner request:** Deliver changes through a GitHub pull request for owner review and merge.
- **Repository:** `maythanhsuaung0-0/IBackTrack` was empty. Initialized `main` with only a short README so an implementation PR has a base branch.
- **Branch:** `codex/backtrack-mvp` contains the complete source, including the 0.1.1 Save spot fix and regression tests. Generated build outputs and dependency directories are excluded.
- **Docs:** README now explains cloning, building, loading `.output/chrome-mv3`, and reloading an installed build.
- **Checks:** Added a read-only GitHub Actions workflow that runs the same local scripts and uploads the built Chrome extension as an artifact. Actual remote status must be checked in GitHub; no pass is assumed from configuration alone.
- **Live acceptance:** M6.2–M6.4 remain pending. The user reviews and merges the PR.

# Backtrack — Product and Engineering Specification

> **Tagline:** Follow your curiosity. Never lose your place.
>
> **Type:** Privacy-first Chrome extension (Manifest V3)
> **Initial platform:** ChatGPT web app in desktop Chrome
> **Primary audience:** Students, developers, and curious people reading long AI explanations
> **Status:** MVP 0.1.1 includes the Save spot selection/layout compatibility fix. Automated checks and browser-fixture QA pass; live ChatGPT acceptance remains pending.
> **Companion documents:** `progress.md` (task tracker) and `AGENTS.md` (Codex operating rules)

## 1. Problem and vision

People often read a long AI answer, reach a paragraph they do not understand, and ask a follow-up question. The conversation scrolls to the new reply. Returning to the **exact sentence** where they stopped reading is frustrating, especially if the follow-up triggers more questions.

Backtrack is not another chatbot or a generic bookmark collector. It helps people maintain their **reading context** through the loop:

**Read → highlight confusing text → save/pause → explore a question → return to the exact passage → continue or mark it understood.**

### What makes Backtrack different

- **Reading continuity over collecting bookmarks.** One active resume point is always easy to find.
- **Ask & Return.** Link a highlighted passage to a follow-up question, then jump directly back to its source.
- **Nested reading stack.** Follow a question within another question and unwind back through the earlier locations.
- **Understanding-oriented highlights.** Mark passages as `important`, `confused`, or `understood` rather than merely coloring them.
- **Respect the existing AI workflow.** The initial extension adds controls to ChatGPT; it does not replace ChatGPT or call an LLM API.

**Positioning:** "Explore what you don't understand, then pick up exactly where you left off."

### Existing products / differentiation assumptions

Bookmarking and text highlighting already exist in third-party ChatGPT extensions (e.g., Threadmark). The differentiator we are *testing*, not claiming as uniquely invented, is the end-to-end **pause → explore → return → resolve** workflow. Don't copy competitors' branding or interfaces; validate usefulness with users.

## 2. Goals, success measures, non-goals

### Product goals

1. Save a temporary reading checkpoint in two clicks or fewer (ideally one).
2. Restore the relevant passage reliably even after new AI replies and page navigation.
3. Keep highlights visible across refreshes when the original passage can still be found.
4. Make "Where was I?" obvious and fast to solve.
5. Allow exploration of nested follow-ups without losing the original reading location.

### MVP success criteria

- A test user can save a checkpoint in a long response, ask a question manually in ChatGPT, then press **Return** and see the correct paragraph highlighted.
- Checkpoint and highlights survive page refresh in the same conversation.
- The extension does not break ChatGPT input, text selection, scrolling, or keyboard navigation.
- New messages do not cause bookmarks to jump to unrelated repeated text.
- Failed restoration displays a clear message and never silently jumps to a wrong passage.
- All data remains on-device in V1, with no external data transfer.

### Pilot metrics (not guarantees)

- Median time to return to reading position versus doing it manually.
- Success rate of returning to the intended passage in varied long conversations.
- % of pilot users who use Return more than once.
- Reported confusion/friction and whether a user chooses the tool again.

### Explicit non-goals for MVP

- No custom LLM chatbot or inference API.
- No server, user account, analytics SDK, or cloud synchronization.
- No automatic submission of questions to ChatGPT.
- No scraping, storing, or exporting entire conversations.
- No mobile-app support, Firefox/Safari, or support for Claude/Gemini yet.
- No folders, public sharing, team collaboration, summarization, or flashcards.
- No promises that a bookmark survives deletion, editing, or complete re-generation of its source message.

## 3. Users and primary journeys

**Primary persona — learner:** Reads a 1,500-word ChatGPT response explaining entropy, encounters a confusing sentence, and wants to ask about it without losing the original explanation.

**Secondary persona — programmer:** Reads a code walkthrough, investigates a TypeScript concept, then returns to the original line of explanation.

### Journey A: Pause and resume reading (MVP)

1. Open a ChatGPT conversation and scroll partway through an assistant answer.
2. Click **Save checkpoint** in a floating control to the right.
3. Backtrack saves the nearest meaningful **visible reading anchor**; show a small confirmation.
4. Ask the follow-up in ChatGPT using the normal chat input.
5. Click **Return to checkpoint**; Backtrack scrolls the target passage into a comfortable reading position and briefly outlines/highlights it.
6. **Resume** dismisses the temporary checkpoint, or **Keep** makes it available in history.

### Journey B: Highlight content (MVP)

1. Select a passage inside an assistant response.
2. A compact toolbar appears (Highlight, Save checkpoint). It must not cover the selection or intercept normal text selection.
3. Choose Highlight; it immediately becomes visible.
4. Refresh the conversation; Backtrack restores the highlight when it can confidently match the text anchor.
5. Remove the highlight from the sidebar or context UI.

### Journey C: Ask & Return (V1)

1. Select an unfamiliar sentence and choose **Ask & Return**.
2. Backtrack creates a checkpoint linked to the selected passage; optionally assists by **copying** the selected passage and a context prompt, or by **prefilling** the input only if this can be done safely and with explicit user intent. The user sends their question manually.
3. Backtrack stores the question text **only when the user explicitly enters/saves it in the extension**; never assume it can reliably intercept or identify messages sent to ChatGPT.
4. After the user finishes exploring, the **Return** control targets the linked passage.
5. Optionally mark the confusing passage **Understood** or **Still confused**.

### Journey D: Nested explorations (V1)

1. User saves point A in decision-tree explanation.
2. Explores entropy; saves point B in the entropy explanation.
3. Explores logarithms; presses **Return** to B; then **Return** to A.
4. The last-in-first-out stack is scoped to the current conversation. A user may also open the history list to jump to an older item directly.

## 4. Scope and milestone releases

| Release | Goal | Included | Out of scope |
|---|---|---|---|
| **MVP — 0.1** | Return to where you were reading | extension foundation; floating controls; checkpoint anchoring; reliable restore; text selection; persistent highlights; small bookmark list; tests/privacy | nested stack; linked questions; understanding status |
| **V1 — 0.2** | Learn without losing context | Ask & Return linked passages; explicitly captured question; nested checkpoint stack; statuses `important/confused/understood`; notes | AI-generated answers; syncing |
| **V2 — 0.3 (optional)** | Refine into a product | keyboard shortcuts; onboarding; robust accessibility and import/export of *Backtrack-only data*; cross-platform investigation; pilot telemetry only if explicitly opt-in | platform-specific promises before validation |

**Scope rule:** Finish and test the MVP before adding V1. Treat V2 as a separate decision after user testing. `progress.md` is the authoritative sequence of tasks.

## 5. UX / UI specification

### 5.1 Floating reader controls

- A small, unobtrusive fixed-position toolbar on the **right edge** of the ChatGPT content area.
- States: **Save** (no checkpoint), **Saved** (confirmation), **Return** (active checkpoint), **Unavailable** (source content not found).
- Buttons have labels/tooltips and accessible names; don't rely on colors only.
- Respect site layout, narrow viewports, keyboard focus, and screen readers.
- Do not block the ChatGPT send button, text selection, or native interactions.
- When the URL changes to a different conversation, load only that conversation's checkpoints.

### 5.2 Selection toolbar

- Appear only for a non-empty selection *inside a supported assistant message*.
- Options: **Highlight**, **Save checkpoint**; add **Ask & Return** in V1.
- Do not trigger in chat composer, input/textarea, contenteditable, extension UI, or unrelated page regions.
- Dismiss on Escape, outside click, or loss of selection.
- Avoid overriding the browser's default selection unless absolutely necessary.

### 5.3 Bookmark and highlight drawer

- A compact in-page React panel (or browser side panel if it makes more sense after testing), separate from host-page DOM styling.
- Sections: **Current checkpoint**, **Saved checkpoints**, **Highlights**.
- Each item shows a short, safe text preview; creation date; an accessible **Jump** button; and **Delete**.
- In V1 add **Question**, **status**, and **notes** metadata.
- Empty, loading, deletion-confirmation, and unavailable-source states are required.

### 5.4 Feedback and restoration

- On return, scroll the nearest scrollable container (which might not be `window`), center the target passage as practical, and briefly emphasize it.
- If the exact text has changed or cannot be matched confidently, show **"Couldn't find the saved passage"** and offer to keep/remove the bookmark. No incorrect jump.
- Show a toast/confirmation for save, delete, and restoration; never announce success before storage completes.

## 6. Technical decisions

### Stack

- **WXT** to scaffold/build a Chrome Manifest V3 extension.
- **React + TypeScript** for extension UI.
- **Tailwind CSS** only if styling in an isolated root is configured correctly; plain CSS is acceptable and may simplify the first prototype.
- **Chrome Storage API (`chrome.storage.local`)** for on-device persistence.
- **CSS Custom Highlight API** (`CSS.highlights` + `Highlight`) for text ranges where available, with a graceful fallback/feature-detection strategy.
- **Vitest** for pure business logic and anchor resolution, **Playwright** or manual browser integration tests for actual extension behavior.
- **ESLint / TypeScript checking** and format tooling; keep package tooling consistent with the WXT starter.

**Bootstrap:** Use the current WXT React/TypeScript template (`npx wxt@latest init`, choose React) if starting in a blank directory. Inspect current WXT docs before following version-specific implementation details.

### Architectural boundaries

1. **Content script:** Detect supported pages, locate assistant messages/readable paragraphs, observe relevant DOM changes, identify scrollable containers, and install extension UI.
2. **ChatGPT adapter:** Keep ChatGPT-specific selectors and DOM assumptions behind a documented adapter; selectors may change without notice. Never depend on private APIs or hidden backend endpoints.
3. **Text anchor engine (pure logic where possible):** Construct, serialize, resolve, rank, and validate text anchors.
4. **Highlight renderer:** Map restored DOM ranges to the Custom Highlight API; avoid destructive DOM wrappers.
5. **Storage repository:** Versioned persistence; CRUD and migration helpers; controlled data size.
6. **React extension UI:** Floating controls, selection toolbar, drawer, and accessible feedback.
7. **Reading session service (V1):** Active checkpoint, nested stack, and question links.

Suggested organization (adapt to WXT conventions; do not force directories if the starter differs):

```text
backtrack/
├── AGENTS.md
├── project.md
├── progress.md
├── README.md                 # created during implementation
├── entrypoints/
│   └── chatgpt.content/      # content script and mounted UI
├── components/               # toolbar, drawer, toast
├── features/
│   ├── anchors/              # create/resolve/fingerprint anchors
│   ├── checkpoints/          # create/return/delete
│   ├── highlights/           # save/re-render/delete
│   └── sessions/             # nested stack, V1
├── lib/
│   ├── chatgpt-adapter.ts
│   ├── storage.ts
│   ├── types.ts
│   └── url.ts
└── tests/
    ├── fixtures/             # simulated long answers, nested markup
    └── ...
```

### Runtime concerns

- ChatGPT is a **single-page app**. Detect in-app navigation without needing a full reload. Cleanup observers, timers, ranges, event listeners, and injected UI when appropriate.
- Assistant messages can render lazily or re-render. Use a debounced `MutationObserver` only where needed, with bounded retry for restoration.
- Don't assume assistant DOM IDs are stable; use multiple anchor signals.
- The reading anchor should be the sentence/paragraph closest to a sensible reading line in the viewport, **not** blindly `window.scrollY`.
- Treat overlapping highlights, identical repeated text, nested HTML tags, markdown formatting, code spans, and changed content as explicit test cases.
- The initial target is desktop Chrome and the current ChatGPT web UI; changes in third-party markup may require adapter updates.

## 7. Data models (initial proposal)

Use serializable data, not DOM nodes or `Range` objects, in persistent storage.

```ts
type HighlightStatus = "important" | "confused" | "understood";

type TextQuoteAnchor = {
  exact: string;            // normalized selection or paragraph excerpt
  prefix: string;           // immediate preceding context
  suffix: string;           // immediate following context
  textStart?: number;       // optional char offset within message text
  textEnd?: number;         // optional char offset within message text
  paragraphIndex?: number;  // fallback hint, not primary identity
};

type LocationRef = {
  conversationKey: string;  // stable conversation ID from URL, when present
  messageKey?: string;      // stable host message ID if reliably available
  anchor: TextQuoteAnchor;
  scrollOffset?: number;    // relative in chosen scroll container, fallback
};

type Checkpoint = {
  id: string;
  location: LocationRef;
  kind: "temporary" | "saved";
  label?: string;
  linkedHighlightId?: string;
  createdAt: number;
  updatedAt: number;
};

type SavedHighlight = {
  id: string;
  location: LocationRef;
  status: HighlightStatus;
  note?: string;
  createdAt: number;
  updatedAt: number;
};

type QuestionLink = {          // V1, created explicitly by the user
  id: string;
  checkpointId: string;
  highlightId?: string;
  questionText?: string;
  createdAt: number;
};

type ConversationState = {
  conversationKey: string;
  checkpoints: Checkpoint[];
  highlights: SavedHighlight[];
  activeCheckpointId?: string;
  readingStack: string[];  // checkpoint IDs; top is most recent (V1)
  questions: QuestionLink[]; // V1
};

type PersistedState = {
  schemaVersion: 1;
  conversations: Record<string, ConversationState>;
};
```

**Implementation note:** This is a *starting contract*, not a rigid schema. Codex can adjust it when tests reveal a better shape, but must document the change in the decision log and migrations. Normalize and cap text excerpts; don't persist raw full assistant responses. Handle conversation URL changes and temporary/no-ID chats safely.

## 8. Anchoring and scroll strategy

### Saving an anchor

1. Identify a supported assistant message visible in the reader's viewport.
2. Identify the user's selected text; otherwise pick the text block closest to a fixed reading line (e.g. 35% down the visible content area).
3. Capture exact normalized text plus prefix and suffix (W3C TextQuoteSelector concept).
4. Save a message ID if stable, a paragraph index as a fallback hint, and scroll-container-relative offset.
5. Persist to extension storage **before** displaying "Saved".

### Restoring an anchor

1. Ensure the user is in the matching conversation; if not, navigate only after explicit user interaction and handle async page load.
2. Wait for the relevant assistant message to exist; bound timeout/retries.
3. Resolve candidates using stable message ID (if valid), exact text, prefix/suffix, and optional text position.
4. Require a confident unique match. Treat multiple indistinguishable candidates as ambiguous.
5. Reconstruct a DOM `Range`, scroll its block into view within the actual scrollable container, and apply transient emphasis.
6. On failure, retain bookmark and show an actionable error; never silently return to an unrelated match.

### Highlight persistence

- Store text anchors in `chrome.storage.local`; restore ranges by scanning supported messages after page navigation/refresh.
- Feature detect `CSS.highlights`; names are scoped and deterministic (`backtrack-important`, etc.).
- Don't wrap page text with arbitrary `<span>` elements just to highlight; that risks breaking host framework reconciliation. If a fallback is required, prefer a low-impact overlay or a documented, carefully tested approach.
- Resolve each highlight independently and report/unrender unresolved ones gracefully.
- Ensure the chosen highlight colors remain readable in light and dark modes; use labels/icon affordances too.

## 9. Storage, privacy, and security

- Store only user-requested checkpoint metadata, short text anchors, highlight previews, explicit notes/questions, and preferences.
- **Never** collect entire chats by default, intercept credentials, or read unrelated pages.
- Request only necessary extension permissions and narrowly scoped host permissions for the supported ChatGPT domain(s). Add hostnames only after verifying actual supported URLs.
- No network telemetry, tracking, third-party analytics, or cloud sync in MVP/V1.
- Explain in README that local extension storage is **not encryption** and is removed when the extension is uninstalled; users should avoid saving sensitive excerpts.
- Do not render stored page snippets as HTML. Escape/sanitize all user/site-derived text in UI.
- Add schema version, bounded data size, corrupt-data recovery, and migration tests.
- Do not log raw conversation excerpts in production consoles, error logs, or test artifacts.
- Confirm before destructive bulk-delete actions (if added later).

## 10. Testing and acceptance scenarios

Build a local HTML/test fixture representing ChatGPT-like long answers so many features can be tested without relying exclusively on the live website. Tests must cover:

1. Save/restore a checkpoint in a long scrollable assistant response.
2. New messages appended above/below, changing scroll height.
3. Refresh, navigating away and back, switching conversations.
4. Repeated identical phrases in one answer and across answers.
5. Text nested inside `strong`, links, inline `code`, lists, markdown-like structures.
6. Selection across text nodes; selection outside assistant answer must be ignored.
7. Empty or stale selections, whitespace-only passages, deleted or edited source message.
8. Dynamic/lazy rendered message: bounded retry, cleanup, and failure state.
9. Text highlight restoration, deletion, and overlapping-highlight edge cases.
10. Dark and light themes, keyboard controls, Escape, screen readers / accessible labels.
11. No interference with native ChatGPT composer and selection.
12. Malformed storage record / unknown version handling; no data loss without warning.
13. V1: nested stack A → B → A; manual linked question; status changes.

**Checks before completing a task:** run the applicable formatter/linter, TypeScript check, unit tests, and any feasible integration tests. A live ChatGPT browser check cannot be claimed completed unless actually performed; otherwise mark the manual verification step as unchecked and tell the user exactly what to test.

## 11. User validation and launch

Before expanding beyond MVP, test with **5–10** students/developers who use ChatGPT for reading and learning. Ask them to complete a long-answer reading task with a follow-up detour. Observe where Return fails or becomes confusing. Refine the UI and anchoring algorithm from feedback. Compare with doing the same task manually; don't claim comparative superiority without measured evidence.

MVP deliverables:

- Working unpacked Chrome extension.
- Source code with README: install, permissions, privacy, workflow, known limitations.
- Automated test suite plus manual test checklist/results.
- Short screen recording or demo instructions.
- Updated `progress.md` with honest completion checkboxes and **per-task learning logs**.

Publishing to Chrome Web Store is optional, separate from locally completing the MVP, and requires user-controlled approvals/account setup.

## 12. Future possibilities (only after user validation)

- Browser keyboard shortcuts: save, return, toggle highlight.
- Full conversation navigation timeline / visual exploration tree.
- Split-screen follow-up panel with an LLM provider (requires explicit opt-in, API key/data-sharing disclosure, costs/security design).
- Additional hosts via separate adapters (Claude, Gemini), only after verification.
- Export/import Backtrack metadata, not full chats.
- Optional end-to-end encrypted sync (major separate design effort).
- Better discovery of unresolved/high-confusion passages and spaced review.

## 13. Teaching-first implementation contract

Read `AGENTS.md` and `progress.md` before implementing anything. Work on the **earliest eligible unchecked task**, complete it with evidence, then tick it only after it passes its criteria. Keep implementation increments small and reviewable.

**For every completed task, tell the developer:**

1. **What I built** — plainly, one or two sentences.
2. **Files changed** — paths and the purpose of each.
3. **How it works** — explain key code paths and browser/React/TypeScript concepts in beginner-friendly language.
4. **Why this design** — tradeoffs and alternatives.
5. **How I tested it** — commands, results, manual tests and their status.
6. **Your turn** — a tiny hands-on experiment, question, or exercise to check understanding.
7. **What comes next** — next unchecked ID.

Keep a persistent version of these explanations in the **Learning Log** in `progress.md`, so the owner can resume after any interrupted Codex session.

## 14. References

- Codex project instructions: https://learn.chatgpt.com/docs/agent-configuration/agents-md
- WXT installation: https://wxt.dev/guide/installation
- Chrome extension storage: https://developer.chrome.com/docs/extensions/reference/api/storage
- CSS Custom Highlight API: https://developer.mozilla.org/en-US/docs/Web/API/CSS_Custom_Highlight_API
- W3C Web Annotation / TextQuoteSelector: https://www.w3.org/TR/annotation-model/#text-quote-selector

---

**Source of truth:** Product requirements live here. Actual progress and evidence live in `progress.md`. Codex execution rules live in `AGENTS.md`. Never treat this planning document as proof a feature was implemented.

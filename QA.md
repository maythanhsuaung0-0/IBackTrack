# Backtrack 0.1.1 — verification and pilot guide

## Evidence from this build

- Created from the official WXT React starter. WXT 0.21.5, React 19, TypeScript, and npm; exact versions are in `package-lock.json`.
- Tests cover conversation URL restrictions, nested text nodes, whitespace normalization, cross-message selections, repeated phrases, missing/edited source, delayed rendering, bounded retries, nested scrolling, local storage CRUD, concurrent writes, schema validation, quota/write failures, overlapping highlights, re-mount restoration, and UI actions.
- Browser fixture checks: saved a visible reading checkpoint; appended a sample follow-up; pressed Return and observed the original passage near the reading line; opened the drawer; selected answer text and saved a yellow highlight; refreshed and confirmed the checkpoint and painted highlight persisted.
- The fixture uses the same application code with a separate local storage driver. It does not prove live ChatGPT selectors, extension lifecycle, or Chrome service-worker behavior.
- A mocked WXT mount test verifies React rendering inside a shadow root and cleanup. The production extension build verifies imports, bundling, and manifest generation.

Final command outcomes and test totals are recorded in `progress.md` after the final run.

## 0.1.1 regression evidence

The owner reported that selecting an answer and clicking Save spot only showed “Scroll to an answer, or select the passage you want to save.” Four reproductions failed against the previous implementation: alternative assistant-turn markup, shell reading targets, a second markdown block in one answer, and native selection loss while clicking a real shadow-root toolbar. All now pass. Additional negative cases reject whole-conversation/unrelated content and discard cached selections when the user switches to the composer.

The browser fixture now mounts the controls in an actual shadow root and uses shell reading-target markup without legacy author-role or markdown attributes. Browser actions verified drag-select → floating Save spot → drawer contains that exact excerpt → append sample follow-up → Return. This remains fixture evidence; the owner's exact live DOM and loaded extension transport have not been inspected.

## Still required in live desktop Chrome / ChatGPT

These checks are intentionally pending. Build the repository and load `.output/chrome-mv3`, then use a non-sensitive existing ChatGPT conversation.

- [ ] **M6.2** Read about 20% into a long answer; press Save spot; ask a follow-up manually; Return must show the original paragraph.
- [ ] **M6.3** Refresh; Return again. Switch conversations; the other conversation must not show the first checkpoint. Return to the original chat; its checkpoint should reappear. Try an edited/deleted source; expect a clear error and preserved saved item, with no incorrect jump.
- [ ] **M6.4** Select across bold/code/link text, save two overlapping highlights, refresh, remove only one, and verify the other remains. Type normally in the composer. Select composer text and confirm no Backtrack selection toolbar appears. Test Escape and tab navigation. Inspect light and dark ChatGPT themes, narrow desktop widths, and reduced-motion settings.
- [ ] Scroll far into a very long conversation and test source virtualization. If the passage is not loaded, the extension may report it unavailable after three seconds.
- [ ] Open the same conversation in two Chrome tabs. Save different highlights rapidly and confirm both survive. Service-worker transport must be verified here in addition to the repository’s automated concurrency test.

## Troubleshooting

**No controls:** Refresh the tab after installing/reloading the extension. Use `chatgpt.com` with an existing `/c/` conversation address. New/temporary chats without an ID are excluded. Check that Backtrack is enabled and has site access to ChatGPT.

**Passage unavailable:** Scroll to load the older answer and retry. Edited/regenerated text or duplicate context can invalidate the anchor. Keep the item for later, or remove it from Saved items.

**Saved data error:** Backtrack leaves the record untouched and blocks new writes for that conversation. Do not uninstall if you need to preserve the data. For development, inspect the extension’s local storage; repair or migrate the record deliberately before re-enabling writes.

**Storage full:** Remove unused individual items. Backtrack does not automatically discard your saved passages.

## Small pilot: 5–10 readers

Use a non-sensitive long answer about a topic the participant is learning. No analytics code is needed.

1. Ask the participant to read until they encounter a concept they want explained.
2. Without Backtrack, time how long it takes to return after a follow-up. Record time and whether they found the correct passage.
3. With Backtrack, repeat on a different passage. Observe discovery of Save, selection Highlight, Return, Keep, and Resume & clear.
4. Ask them to save two highlights, refresh, find them, and remove one.
5. Record correct returns / attempts, **wrong jumps separately from safe failures**, return time, repeated Return use, and any interference with normal typing/selection.
6. Ask: “Would you use this again?”, “What did Save mean to you?”, and “What was confusing?”

Record browser version, date, tested URL shape, source message layout, expected result, actual result, and reproduction steps. Do not collect chat contents or identifying information. Do not claim comparative superiority without measured results.

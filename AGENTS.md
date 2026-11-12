# Backtrack development

Read `project.md`, `progress.md`, `README.md`, and `QA.md` before making changes.

- Keep this a ChatGPT desktop Chrome Manifest V3 extension. MVP only unless the user expands scope.
- Keep saved data on-device. No full-chat persistence, analytics, backend, cloud sync, or automatic question submission.
- Isolate ChatGPT selectors in the adapter. Do not mutate assistant text nodes to draw highlights.
- A return must resolve a unique anchor in the correct conversation/message. Prefer a clear unavailable state over a wrong jump.
- Run `npm run check`, `npm run build`, and `npm run format:check` for substantive changes. Update evidence and relevant task checkboxes honestly.
- Leave live ChatGPT acceptance tasks unchecked until actually tested in Chrome. Browser-fixture tests and mocked mount tests are separate evidence.
- Record useful explanations and decisions in `progress.md`. A broad build request may span the authorized MVP; ordinary follow-up learning tasks should remain small and reviewable.
- Never publish to the Chrome Web Store or expand permissions without the user requesting it.

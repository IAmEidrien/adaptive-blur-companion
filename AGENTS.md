# Adaptive Blur My Shell Companion

GNOME Shell 46 / Wayland. UUID `adaptive-blur-companion@eidrien.local`.
Preserve the GPL-3.0-only adapted stylesheet and Blur my Shell attribution; original implementation code is MIT. See LICENSING.md. Keep runtime at repo root.

- Two independent effects and preferences pages: Pop-up backgrounds and Scheme pipelines.
- Popup internal API adapter is in policy.js. Pipeline schema access is in
  bms-settings.js; runtime obtains BMS's root `_settings.settings`. Validate shape.
- Never patch BMS methods, mutate surfaces, edit pipeline definitions, change
  wallpaper or automatically change its popup Override background/Blur toggles.
- Scheme switching MAY write only user-selected component `pipeline` settings.
  Automatic switching is opt-in, event-based, using GNOME color-scheme; default
  means light. No permanent polling. Manual application is available independently.
- Keep one persistent revert snapshot, written only after actual successful changes;
  no-op must preserve it. Validate targets before writes, roll back failed writes.
  Revert consumes snapshot, never immediately auto-reapplies. No restore on disable.
- Popup effect needs BMS enabled, modern Popups blur on and Override background off.
  Background styling only in Overview, scoped to registered targets. Follow GNOME
  appearance; Quick Settings/QST sheets stay opaque in both states. Preserve accents.
- Only remove owned classes. Never overwrite inline styles or geometry. GNOME 46
  CSS cannot use modern accent variables or web display:none.
- Do not bundle personal desktop themes. Use minimal, purpose-built test fixtures.
- Native MessageTray Source uses extension name, GNOME 46 APIs and destroy reasons.
  Disconnect signals and cancel callbacks on disable. No input grabs/forced logout.
- make check and make pack must pass. Native GTK/GSettings smoke tests run in CI;
  mocks and smoke tests are not native GNOME rendering QA. Keep TESTING.md honest.
- Preserve normal Gitpulsar Pull history; never force push. Historical release
  legacy-v1.1.0 preserves Dynamic Overview Popup Backgrounds under its old UUID.

License policy: follow LICENSING.md. Prefer MIT for independent original work,
then GPL-2.0-or-later where compatible; preserve stricter upstream grants,
attribution and asset licenses. Never infer permission for unlicensed code.

## Public documentation and agent-neutral publication policy

These instructions apply to **every agent or automated workflow** that reads this repository, regardless of provider, model, tool, or execution environment. They apply to future agents as well as the current maintainer's tools. Treat all repository-visible artifacts as potentially public, including commits, PRs, issues, changelogs, release notes, comments, CI reports, examples, and documentation, even when a repository is presently private.

- **Audience:** Write for an independent reader with no access to chats, prompts, personal history, local paths, or project-specific shorthand. Describe behavior, rationale, test conditions, and limitations self-sufficiently. Do not address the maintainer as the assumed reader of public artifacts or leak internal instructions into them.
- **Evidence:** Ground claims in checked-in source, explicit approved specifications, or actual test results. Clearly distinguish a declared compatibility range from versions exercised, mock/static checks from native Shell tests, and intentions from implemented behavior. Never invent verification, security assurances, priority, or novelty claims.
- **Scope and provenance:** A conversation, prior task, local configuration, private theme, unreleased asset, or other project's files are *not* permission to add or publish them. Never import personal settings, unpublished assets, unrelated dependencies, or private conversation excerpts without explicit authorization for this repository. Preserve licensing and upstream attribution; inspect additions for secrets and identifying information.
- **Documentation ownership:** The human maintainer owns the README's introduction, user-facing feature lists, motivation, UX descriptions, and other product narrative. Agents must not draft, rewrite, reorder, or silently "improve" those sections absent explicit task-specific permission. Agents maintain implementation/architecture notes, testing instructions and results, technical compatibility details, and tightly scoped factual installation/build changes. The permission to correct a command or version does not authorize rewriting surrounding narrative.
- **Change handoff:** For every functional change, report user-visible differences, new settings, limitations, affected README claims, and any needed maintainer-authored updates. Keep that report in the task/PR handoff rather than inserting agent-written feature prose into the README. Flag incorrect protected prose and request a maintainer decision; do not quietly edit it. An inaccurate README claim must not be treated as resolved merely because an agent says documentation is complete.
- **Release discipline:** Documentation and public-facing PR/release text must be checked for audience, accuracy, provenance, and human-owned sections before publication. If user-facing documentation is pending or materially false, explicitly mark it as unresolved and use the repository's existing release-pause mechanism when available; never claim an automated gate exists unless the workflow actually enforces it. The human maintainer decides whether a narrative update is complete or unnecessary. Technical checks alone are not such approval.
- **Minimal changes:** Preserve current documentation voice and repository-specific instructions. Do not rewrite old narrative wholesale during unrelated engineering work. If unsure whether text or an asset is authorized for publication, omit it and flag the question in the handoff.

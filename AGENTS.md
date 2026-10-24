# Adaptive Blur My Shell Companion

GNOME Shell 46 / Wayland. UUID `adaptive-blur-companion@eidrien.local`.
Preserve GPL-3.0-only and Blur my Shell attribution. Keep runtime at repo root.

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

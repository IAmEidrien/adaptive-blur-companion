# Dynamic Overview Popup Backgrounds

Target GNOME Shell 46 / Wayland. UUID dynamic-overview-popup-backgrounds@eidrien.local.
Preserve GPL-3.0-only and Blur my Shell attribution. Keep root installation layout.

- Read BMS internal APIs only through policy.js; validate their shape and stay
  inactive on unsupported versions. Do not patch BMS methods, mutate its surfaces
  map, modify its saved settings, or add per-frame/permanent polling.
- Activate only with BMS enabled, popup blur enabled, and Override background OFF.
- BMS dark tint and descendant styling only in Overview, scoped to registered
  blur targets. Preserve theme toggle/arrow accents and GNOME 46 color fallbacks. Quick
  Settings submenus, including QST overlays, remain opaque in both states.
- Only remove style classes we own. Never overwrite inline styles or geometry.
- Native MessageTray Source title must match the extension name; use GNOME 46
  constructor APIs. Source.destroy needs a NotificationDestroyedReason value.
  Notifications respect ordinary DND and offer preferences where available.
- Disconnect signals and cancel all callbacks on disable. No input capture,
  window hacks, forced logout, downloaded runtime dependencies or schema needed.
- make check and make pack must pass. Test load order, live settings, Overview,
  new surfaces, exclusions, notifications and cleanup. Mocks are not native QA.
- Preserve normal Gitpulsar Pull history if hosted on GitHub; never force push.

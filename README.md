# Dynamic Overview Popup Backgrounds

A small GNOME Shell 46 companion to **Blur my Shell's modern popup blur**.

- In Overview, registered popup blur surfaces have transparent backgrounds.
- Outside Overview, their normal Shell-theme backgrounds return.
- Quick Settings submenus always use an opaque Adwaita dark background
  (`#2e2e32`), including Quick Settings Tweaks' overlay layout.
- Blur my Shell remains responsible for blur. This extension does not disable
  blur computation outside Overview or change its saved preferences.
- Native notifications are attributed to **Dynamic Overview Popup Backgrounds**, with
  a symbolic appearance icon and a shortcut to Blur my Shell's preferences.
  Repeated dependency warnings are suppressed until the state changes.

## Setup

1. Keep Blur my Shell enabled and enable **Popups → Blur**.
2. Disable **Popups → Override background** in Blur my Shell.
3. Clone the repository directly into the GNOME extension directory:

   ```sh
   mkdir -p ~/.local/share/gnome-shell/extensions
   git clone git@github.com:IAmEidrien/dynamic-overview-popup-backgrounds.git \
     ~/.local/share/gnome-shell/extensions/dynamic-overview-popup-backgrounds@eidrien.local
   ```

4. Log out and back in, then enable **Dynamic Overview Popup Backgrounds** in
   your extension manager, or run:

   ```sh
   gnome-extensions enable dynamic-overview-popup-backgrounds@eidrien.local
   ```

Open the installed folder in Gitpulsar and use **Pull** for later updates. Close
any preferences windows and log out/in after pulling runtime changes on Wayland.
The runtime files live at the repository root; no copying or build step is needed.
Do not install a release ZIP over a Git-managed checkout.

Alternatively, build a ZIP with `make pack` and install it with
`gnome-extensions install /path/to/dynamic-overview-popup-backgrounds@eidrien.local.zip`.

No schemas or extra packages are required. Enabling this helper is its on/off
switch; it has no separate preferences window. Disable it to restore all its
background changes. If Override background is enabled again, the helper becomes
inactive and tells you what to change. It never changes that setting for you.

Remove any experimental `.quick-toggle-menu` overrides added to your Shell theme
when trying the earlier CSS workaround, so those rules do not interfere with
restoration. Other custom theme changes can remain.

## Compatibility and limitations

Designed against Blur my Shell commit
`30a8e73f370e8e32577b6916803ef139bdd91282`, whose metadata supports GNOME 46.
Older Blur my Shell releases without the modern Popups component are unsupported.
The helper reads `_popup.surfaces`, `_popup.enabled`, and
`_settings.popup.settings` from Blur my Shell's extension instance. These are
**internal APIs**, checked at runtime. An incompatible version leaves the helper
inactive instead of patching or replacing Blur my Shell functions.

Styling attaches only to registered target actors; embedded control colors,
text, inline geometry and other extensions' style classes are preserved.
The Quick Settings exception intentionally covers all `.quick-toggle-menu`
submenus rather than depending on Quick Settings Tweaks' private state.
The opaque submenu fallback does not sample the changing wallpaper palette.

The helper observes Overview, settings, dependency lifecycle and popup surface
insertions. Work is coalesced; there is no permanent polling timer, stage-wide
input capture, modal grab, or forced reload/logout.

Automated mocks validate behavior and packaging, **not native GNOME rendering**.
Check your installed Blur my Shell version and follow TESTING.md for live tests.

## Development

The repository layout is directly installable at:
`~/.local/share/gnome-shell/extensions/dynamic-overview-popup-backgrounds@eidrien.local/`.
The archive contains source, tests and maintenance instructions as well as runtime
files, so it can also seed a new Git repository. Keep generated ZIPs out of Git.

Run `make check` (Node and Python 3), then `make pack`. The output goes to `dist/`.
There are no downloaded runtime dependencies.

Original extension design and direction: Eidrien. Implementation was AI-assisted.
See NOTICE.md for the upstream background-style reference and attribution.
Licensed under GPL-3.0-only; see LICENSE.

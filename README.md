# Adaptive Blur My Shell Companion

Two optional improvements for **Blur my Shell on GNOME Shell 46**, in separate
**Pop-up backgrounds** and **Scheme pipelines** preferences tabs.

- **Pop-up backgrounds:** in Overview, BMS-registered popup surfaces receive a
  translucent tint and coordinated calendar, notification and control styling.
  The tint follows GNOME light/dark appearance. Outside Overview, your shell
  theme backgrounds return. Quick Settings submenus, including Quick Settings
  Tweaks overlays, stay opaque in both states. Checked toggle accents stay themed.
- **Scheme pipelines:** choose existing BMS pipelines per component for light
  and dark appearance. Enable automatic switching, or apply either set manually.
  Empty selections leave the component unchanged. Only selected `pipeline` keys
  are written; pipeline definitions, blur toggles and wallpaper are untouched.

Automatic switching is **off by default**. It applies on enable, GNOME appearance
changes and BMS becoming enabled. It reads
`org.gnome.desktop.interface color-scheme`: `prefer-dark` is dark; `prefer-light`
and `default` are light. It does not depend on a theme-changing extension.
Changing a dropdown prepares your selection; use Apply or an appearance change
to activate it. Manual Apply works with automatic switching off.

**Revert** starts disabled. An application that actually changes selections saves
those previous values, replacing the single snapshot. A no-op leaves the snapshot
alone. Revert restores it once and clears it; no history or immediate automatic
reapplication. The snapshot survives logout. Disabling the companion leaves BMS's
current pipeline selections in place. Invalid/missing pipeline IDs are reported
before any writes; failed writes attempt to roll back changed components.

## Install and update

Keep BMS enabled. For the pop-up effect, enable **Popups → Blur** and disable
**Popups → Override background** in BMS. This requirement does not block the
independent pipeline feature. Dependency warnings use the companion's name.

```sh
mkdir -p ~/.local/share/gnome-shell/extensions
git clone git@github.com:IAmEidrien/dynamic-overview-popup-backgrounds.git \
  ~/.local/share/gnome-shell/extensions/adaptive-blur-companion@eidrien.local
cd ~/.local/share/gnome-shell/extensions/adaptive-blur-companion@eidrien.local
glib-compile-schemas --strict schemas
```

Log out/in, then enable **Adaptive Blur My Shell Companion** in your extension
manager. Open preferences to configure pipelines. The root runtime layout supports
Gitpulsar Pull updates; after pulling, close preferences, rerun
`glib-compile-schemas --strict schemas`, and log out/in for runtime changes on
Wayland. The folder name must match the UUID above. Do not install a ZIP over a
Git checkout. Alternatively `make pack` builds a directly installable ZIP with a
compiled schema; `gnome-extensions install /path/to/adaptive-blur-companion@eidrien.local.zip`.

The previous **Dynamic Overview Popup Backgrounds** is preserved in the historical
[legacy-v1.1.0 release](https://github.com/IAmEidrien/dynamic-overview-popup-backgrounds/releases/tag/legacy-v1.1.0).

## Matching light shell theme

`themes/Eidrien-Adwaita-Light/gnome-shell/gnome-shell.css` is a light version of
Eidrien's supplied GNOME 46 shell theme: modern Adwaita surfaces, blue accents,
40px panel, bold labels and quieter 80%-opaque app-grid text. Geometry and existing
selectors are retained. Weather city text stays hidden using supported Shell CSS
(`color: transparent`), rather than web-only `display: none`; the label's space
remains. This hides visual text, not weather data or accessibility text.

Copy `themes/Eidrien-Adwaita-Light` to `~/.local/share/themes/`, then select it
with User Themes / your shell-theme switcher. The companion switches pipelines
and its own popup styling; it does not select the shell theme for you. The exact
supplied dark source is included under `themes/reference/` for comparison.

## Compatibility and development

Designed against BMS revision `30a8e73f370e8e32577b6916803ef139bdd91282`, with
modern Popups support. Popup integration reads `_popup.surfaces`, `_popup.enabled`
and `_settings.popup.settings`; pipeline integration reads `_settings.settings`
and its schema-defined children. These internal entry points are shape-checked;
unsupported versions report an error or keep the affected effect inactive.
No method replacement, per-frame polling, input grabs, forced logout or downloaded
runtime dependencies. BMS continues to handle blur rendering outside Overview.

`make check` runs policy/lifecycle/CSS tests, schema compilation, JS syntax and
light-theme checks. `make pack` verifies the ZIP. CI also runs native GJS/GTK/
GSettings smoke checks with fixture BMS schemas. **These checks do not replace
live GNOME 46 visual testing**; see TESTING.md.

Design and direction: Eidrien. Implementation was AI-assisted. GPL-3.0-only;
see LICENSE and NOTICE.md for BMS attribution.

# Compatibility testing

## Native automated matrix — 2026-10-24

| GNOME Shell | Environment | Shell/BMS integration | GTK/GSettings smoke |
| --- | --- | --- | --- |
| 48.7 | Extracted Debian packages, nested Wayland under Xvfb | 31 checks passed | Passed |
| 50.1 | Ubuntu 26.04 container, headless Wayland virtual monitor | 31 checks passed | Passed |
| 51.0 | Ubuntu 26.10 container, headless Wayland virtual monitor | 31 checks passed | Passed |

All sessions use software rendering (llvmpipe), private session/system buses and
disposable XDG directories. They run the companion's actual runtime, actual
Shell/Mutter actors and stylesheet, and **real Blur my Shell** revision
`f019cd1fd8b8831fbb0f0ffccbffee526940faac` (version 76). No BMS runtime mocks or
method replacements are used. Initial exploratory runs added the running version
only to the disposable metadata copy; final validation uses the source metadata
unchanged. No personal desktop themes are needed or bundled.

Coverage: missing-BMS notification and source identity; enabling BMS after the
companion; surface registration; outside/inside Overview; dark/light appearance;
native Quick Settings submenu exclusion and computed background alpha 255 in both
schemes; Override background and Blur guards and recovery; manual and automatic
pipeline selection including `default` → light; no-op snapshot retention; one-level
revert; independent effects; missing-pipeline rejection without writes/snapshot
loss; preservation of BMS pipeline definitions; dependency disable/re-enable;
companion disable/re-enable; removal of owned classes and cancellation of pending
callbacks/signals. The submenu is a minimal native QuickMenuToggle fixture because
these sessions do not have Wi-Fi/Bluetooth services. GTK smoke checks separately
construct the real preferences body with native widgets and exercise GVariant and
GSettings operations; only their Shell preferences base class is substituted.

Screenshots cover the date menu outside Overview, dark/light date menus in Overview,
and a light Quick Settings submenu. Sample review found readable calendar/menu
text, retained calendar accents and an opaque submenu. These are limited snapshots,
not exhaustive visual QA.

**Findings:** no companion compatibility failures in the exercised paths. GNOME
50/51 logged a GJS introspection warning for BMS's
`Clutter.BrightnessContrastEffect::brightness` setter (slow-path fallback); the
checks still passed. Minimal sessions also warn about unavailable logind, Polkit,
GDM, GeoClue, camera/audio and calendar services. GTK reports unavailable DRI3 or
accessibility services in the containers. These are test-environment/upstream
warnings, not evidence that those desktop integrations work.

**Compatibility is not full support.** Eidrien can personally test/maintain GNOME
46. Metadata permits 46–51; **47 and 49 are reasonable compatibility inferences**
between that baseline and the passing tested versions, not direct test results.
Results apply to the exact versions/revision above and do not establish all patch
releases or all BMS revisions. Physical GPU rendering/performance, lock/unlock,
logout persistence, multiple monitors, QST overlay mode, live weather/calendar
data and exhaustive notifications, app folders and other popup surfaces still
need a real desktop. BMS itself continues to own wallpaper blur/rendering.

### Reproducing the Shell checks

Build the desired BMS revision using its upstream build instructions and unpack
the extension ZIP into a directory (with extension.js and schemas at its root).
In a disposable environment with GNOME Shell, GJS, Xvfb, dbus-x11 and software GL:

```sh
python3 tests/run-shell.py --bms /absolute/path/to/unpacked-bms \
  --output /absolute/path/to/new-test-directory
sh tests/run-native.sh
make check pack
```

The Shell runner refuses an existing output directory, copies both extensions,
compiles schemas, installs a separate test probe and terminates its own session.
It writes result.json, shell.log and screenshots there. Never run it inside a
desktop session you rely on. Extracted GNOME installations need their PATH,
library, typelib and schema environment activated first. Containers should mount
the source read-only and a separate output parent read/write; no privileged mode
or host networking is required. `--allow-unlisted` is for exploratory runs only:
it adds the current Shell major to the disposable copy, never the source metadata.

## Manual GNOME 46 desktop checks

Automated checks do not establish native rendering or compatibility with your
particular theme, Quick Settings Tweaks or Blur my Shell revision.

1. Enable BMS modern popup blur and disable its popup Override background. Enable
   this helper. Open the clock, Quick Settings and one other blurred popup outside
   Overview: original theme backgrounds should remain.
2. Open Overview, then these menus: blurred wallpaper should show through their
   backgrounds with the appropriate BMS light/dark tint while controls, text and borders remain usable.
   Compare notification drawer cards and banners, calendar/events/weather, top
   Quick Settings actions and slider buttons against BMS dark Override background.
   Check hover/focus/pressed states and confirm checked toggles remain accented.
3. In Quick Settings open Wi-Fi, Bluetooth, Background Apps and another submenu.
   Test both inside and outside Overview, with QST overlay mode on and off.
   Every submenu must be opaque; controls beneath it must not show through.
4. Open a menu for the first time after enabling the helper. Repeat after disabling
   and re-enabling BMS, including loading the helper before BMS.
5. Enable BMS Override background while the helper is active. Helper classes should
   disappear immediately; one native warning should identify Adaptive Blur My Shell Companion as the source. Its action should open BMS preferences. Turn the
   setting back off: it should recover without a logout. Test popup Blur off/on too.
6. Disable the helper in both Overview states and while a popup is open. Original
   styles should return; BMS pipeline selections remain; blur actors and inline geometry must remain untouched.
7. Lock/unlock and log out/in. Check enable order, theme changes and monitor changes.
   Check journalctl --user -b for extension errors if anything fails.

The effect on rounded corners, blur positioning, menu animation and the first
paint of lazily created menus needs real desktop confirmation. Wallpaper blur
rendering/performance is still managed by BMS, even under opaque backgrounds.

## Appearance pipelines and preferences (2.0)

- Test both tabs, independently disabled/enabled, with BMS enabled/disabled and
  missing. Verify native warning source now says Adaptive Blur My Shell Companion.
- Create distinct light/dark BMS pipelines. Assign Overview and Popups, leave
  another component unchanged. Enable automatic switching. Change GNOME appearance
  between prefer-dark, prefer-light and default: only assigned components change.
- Turn automatic switching off. Light/Dark buttons still apply; appearance changes
  no longer modify pipelines. Editing choices alone does not apply them.
- Revert begins disabled. Apply an actual change, then apply the same set again:
  Revert must remain enabled. Apply the other set and revert: only the immediately
  preceding values return, with Revert disabled afterwards. No automatic reapply.
- Change BMS's selection manually before applying: revert must restore that exact
  selection. Remove an assigned pipeline: error, no partial changes or lost snapshot.
- Disable the popup feature while retaining pipeline switching, and vice versa.
  Turn BMS popup Override background on: pipeline switching must continue working.
- Check light popup text, cards, hover/focus, checked toggle labels, calendar today
  and opaque Quick Settings sheets inside/outside Overview.
- Disable/re-enable BMS, then the companion; log out/in. Verify the single snapshot
  persists, automatic enable application is understood, and no callbacks survive
  disable. Pipeline selections deliberately remain after disabling the companion.

CI's real GJS smoke check loads actual GTK/Adwaita preferences, exercises nested
GVariant dictionaries and Gio.Settings apply/revert using temporary fixture
schemas. It substitutes only the Shell preferences base class. It cannot validate
Mutter, BMS rendering or interactions with your installed shell theme.

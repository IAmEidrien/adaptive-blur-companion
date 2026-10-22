# Native GNOME 46 checks

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
  and opaque Quick Settings sheets. Check the companion light shell theme both
  inside/outside Overview, including hidden weather city text. It does not hide
  accessibility text or remove the label's layout space.
- Disable/re-enable BMS, then the companion; log out/in. Verify the single snapshot
  persists, automatic enable application is understood, and no callbacks survive
  disable. Pipeline selections deliberately remain after disabling the companion.

CI's real GJS smoke check loads actual GTK/Adwaita preferences, exercises nested
GVariant dictionaries and Gio.Settings apply/revert using temporary fixture
schemas. It substitutes only the Shell preferences base class. It cannot validate
Mutter, BMS rendering or interactions with your installed shell theme.

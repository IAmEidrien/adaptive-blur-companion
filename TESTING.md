# Native GNOME 46 checks

Automated checks do not establish native rendering or compatibility with your
particular theme, Quick Settings Tweaks or Blur my Shell revision.

1. Enable BMS modern popup blur and disable its popup Override background. Enable
   this helper. Open the clock, Quick Settings and one other blurred popup outside
   Overview: original theme backgrounds should remain.
2. Open Overview, then these menus: blurred wallpaper should show through their
   backgrounds while controls, text and borders remain usable.
3. In Quick Settings open Wi-Fi, Bluetooth, Background Apps and another submenu.
   Test both inside and outside Overview, with QST overlay mode on and off.
   Every submenu must be opaque; controls beneath it must not show through.
4. Open a menu for the first time after enabling the helper. Repeat after disabling
   and re-enabling BMS, including loading the helper before BMS.
5. Enable BMS Override background while the helper is active. Helper classes should
   disappear immediately; one native warning should identify Overview Popup
   Backgrounds as the source. Its action should open BMS preferences. Turn the
   setting back off: it should recover without a logout. Test popup Blur off/on too.
6. Disable the helper in both Overview states and while a popup is open. Original
   styles should return; BMS settings, blur actors and inline geometry must remain.
7. Lock/unlock and log out/in. Check enable order, theme changes and monitor changes.
   Check journalctl --user -b for extension errors if anything fails.

The effect on rounded corners, blur positioning, menu animation and the first
paint of lazily created menus needs real desktop confirmation. Wallpaper blur
rendering/performance is still managed by BMS, even under opaque backgrounds.

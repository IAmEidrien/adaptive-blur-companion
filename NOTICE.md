# Upstream reference and attribution

The transparent background treatment in stylesheet.css is adapted from
**Blur my Shell**, by aunetx and contributors, distributed under GNU GPL v3:
https://github.com/aunetx/blur-my-shell

Reference revision: 30a8e73f370e8e32577b6916803ef139bdd91282.
Relevant files:

- src/styles/popup/base.css: translucent popup backgrounds, notification cards
  and border treatment.
- src/styles/popup/dark.css: calendar, notifications and smaller controls.
- src/styles/popup/menu-items.css: menu-item and slider interaction states.
- src/components/popup/index.js: surface registry and independent background override.
- src/components/popup/targets.js: popup/Quick Settings surface classification.

The lifecycle, guards, notifications, Overview policy, and scoped class ownership
in this companion are separate implementation code. Blur my Shell itself is
neither bundled nor modified. Its GPL license text is included as LICENSE.

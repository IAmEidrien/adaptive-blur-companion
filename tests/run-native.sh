#!/bin/sh
set -eu
schema_dir=$(mktemp -d)
trap 'rm -rf "$schema_dir"' EXIT
cp schemas/*.xml "$schema_dir/"
cat > "$schema_dir/fixtures.gschema.xml" <<'XML'
<schemalist>
 <schema id="org.gnome.shell" path="/org/gnome/shell/">
  <key name="enabled-extensions" type="as"><default>[]</default></key>
  <key name="disable-user-extensions" type="b"><default>false</default></key>
 </schema>
 <schema id="org.gnome.shell.extensions.blur-my-shell" path="/org/gnome/shell/extensions/blur-my-shell/">
  <key name="pipelines" type="a{sa{sv}}"><default>{}</default></key>
  <child name="overview" schema="org.gnome.shell.extensions.blur-my-shell.overview"/>
 </schema>
 <schema id="org.gnome.shell.extensions.blur-my-shell.overview" path="/org/gnome/shell/extensions/blur-my-shell/overview/">
  <key name="pipeline" type="s"><default>'old'</default></key>
 </schema>
</schemalist>
XML
glib-compile-schemas --strict "$schema_dir"
GSETTINGS_SCHEMA_DIR="$schema_dir" GSETTINGS_BACKEND=memory dbus-run-session -- xvfb-run -a gjs -m tests/native-smoke.js

#!/usr/bin/env python3
"""Run real Shell/BMS checks in a disposable XDG tree, never a desktop session.

Usage: python3 tests/run-shell.py --bms /path/to/built/bms --output /absolute/work/path
Requires gnome-shell, GJS, Xvfb, dbus-x11, and software GL. For an extracted
GNOME installation, activate its PATH/library/schema environment first.
"""
import argparse
import json
import os
from pathlib import Path
import shutil
import signal
import subprocess
import time

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--bms', required=True, type=Path)
parser.add_argument('--output', required=True, type=Path)
parser.add_argument('--allow-unlisted', action='store_true', help='Exploratory copy only: add running Shell major to metadata')
args = parser.parse_args()
source = Path(__file__).resolve().parent.parent
root = args.output.resolve()
root.mkdir(parents=True, exist_ok=False)
major = subprocess.check_output(['gnome-shell', '--version'], text=True).strip().split()[-1].split('.')[0]
for name in ['config', 'data', 'cache', 'runtime']:
    (root / name).mkdir(mode=0o700)
extensions = root / 'data/gnome-shell/extensions'
extensions.mkdir(parents=True)
companion = extensions / 'adaptive-blur-companion@eidrien.local'
shutil.copytree(source, companion, ignore=shutil.ignore_patterns('.git', 'dist', '__pycache__', 'work'))
if args.allow_unlisted:
    metadata = json.loads((companion / 'metadata.json').read_text())
    metadata['shell-version'] = sorted(set(metadata['shell-version'] + [major]))
    (companion / 'metadata.json').write_text(json.dumps(metadata))
shutil.copytree(args.bms, extensions / 'blur-my-shell@aunetx')
probe = extensions / 'abc-compat-probe@eidrien.local'
probe.mkdir()
(probe / 'metadata.json').write_text(json.dumps({'uuid': probe.name, 'name': 'Compatibility probe',
    'description': 'Isolated native compatibility checks', 'shell-version': [major]}))
shutil.copy(source / 'tests/shell-probe.js', probe / 'extension.js')
for extension in [companion, extensions / 'blur-my-shell@aunetx']:
    subprocess.run(['glib-compile-schemas', '--strict', str(extension / 'schemas')], check=True)
env = dict(os.environ, ABC_TEST_ROOT=str(root), LIBGL_ALWAYS_SOFTWARE='1', GALLIUM_DRIVER='llvmpipe',
    XDG_CONFIG_HOME=str(root / 'config'), XDG_DATA_HOME=str(root / 'data'), XDG_CACHE_HOME=str(root / 'cache'),
    XDG_RUNTIME_DIR=str(root / 'runtime'), XDG_SESSION_TYPE='wayland', XDG_CURRENT_DESKTOP='GNOME',
    GSETTINGS_BACKEND='dconf', DBUS_SYSTEM_BUS_ADDRESS=f'unix:path={root}/runtime/system-bus')
flags = '--nested --wayland --no-x11 --sm-disable' if int(major) < 50 else '--headless --virtual-monitor=1280x800 --no-x11'
session = root / 'session.sh'
session.write_text("""set -eu
gsettings set org.gnome.shell enabled-extensions '["abc-compat-probe@eidrien.local"]'
gsettings set org.gnome.shell disabled-extensions '[]'
gsettings set org.gnome.shell welcome-dialog-last-shown-version "$1"
shift
exec gnome-shell "$@"
""")
script = """
set -eu
dbus-daemon --session --address="$DBUS_SYSTEM_BUS_ADDRESS" --nofork > "$ABC_TEST_ROOT/system-bus.log" 2>&1 &
trap 'kill $! 2>/dev/null || true' EXIT
dbus-run-session -- xvfb-run -a -s '-screen 0 1280x800x24 +extension GLX' bash "$ABC_TEST_ROOT/session.sh" """ + major + ' ' + flags
with (root / 'shell.log').open('w') as log:
    process = subprocess.Popen(['bash', '-c', script], env=env, stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
    try:
        for _ in range(150):
            if (root / 'result.json').exists():
                result = json.loads((root / 'result.json').read_text())
                print(json.dumps(result, indent=2), flush=True)
                if not result.get('pass'):
                    raise SystemExit(1)
                break
            if process.poll() is not None:
                raise RuntimeError(f'Shell exited {process.returncode}; see {root}/shell.log')
            time.sleep(1)
        else:
            raise TimeoutError(f'No result; see {root}/shell.log')
    finally:
        try:
            os.killpg(process.pid, signal.SIGTERM)
            process.wait(timeout=5)
        except ProcessLookupError:
            pass
        except subprocess.TimeoutExpired:
            os.killpg(process.pid, signal.SIGKILL)
            process.wait()

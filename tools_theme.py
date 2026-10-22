"""Structural checks for the supplied dark source and its light companion."""
from pathlib import Path
import re
r = Path(__file__).resolve().parent
light = (r/'themes/Eidrien-Adwaita-Light/gnome-shell/gnome-shell.css').read_text()
source = (r/'themes/reference/gnome-shell-dark.source.css').read_text()
assert light.count('{') == light.count('}')
assert 'display:' not in light
assert 'color: transparent !important' in light
assert '.weather-button .weather-header.location' in light
assert 'height: 40px;' in light and 'font-size: 14px;' in light
assert 'color: rgba(0, 0, 0, 0.80);' in light
assert '#fafafb' in light and '#ebebed' in light
assert '#222226' not in light
# Keep every original selector, including the recent Quick Settings/privacy fixes.
def selectors(css):
    css = re.sub(r'/\*[\s\S]*?\*/', '', css)
    return {s.strip() for group in re.findall(r'([^{}]+)\{', css) for s in group.split(',')}
assert selectors(source) <= selectors(light)
print('Light theme: source coverage, geometry and privacy checks passed')

from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import json
root = Path(__file__).resolve().parent
metadata = json.loads((root / 'metadata.json').read_text())
files = [p for p in root.iterdir() if p.is_file() and p.suffix in {'.js', '.css', '.json', '.md', '.py'}]
files += [root / n for n in ['LICENSE', 'Makefile', '.gitignore']]
for folder in ['schemas', 'tests', 'themes']:
    files += [p for p in (root / folder).rglob('*') if p.is_file() and '__pycache__' not in p.parts]
output = root / 'dist' / f"{metadata['uuid']}.zip"
output.parent.mkdir(exist_ok=True)
with ZipFile(output, 'w', ZIP_DEFLATED) as archive:
    for file in sorted(set(files)):
        archive.write(file, file.relative_to(root))
with ZipFile(output) as archive:
    assert archive.testzip() is None
    assert {'extension.js', 'prefs.js', 'bms-settings.js', 'pipelines.js',
            'schemas/gschemas.compiled', 'themes/Eidrien-Adwaita-Light/gnome-shell/gnome-shell.css'} <= set(archive.namelist())
    assert all(not Path(name).is_absolute() and '..' not in Path(name).parts for name in archive.namelist())
print(f'Package verified: {output.name}')

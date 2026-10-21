from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import json

root = Path(__file__).resolve().parent
metadata = json.loads((root / 'metadata.json').read_text())
files = [root / name for name in [
    'extension.js', 'policy.js', 'stylesheet.css', 'metadata.json', 'package.json',
    'LICENSE', 'README.md', 'NOTICE.md', 'TESTING.md', 'AGENTS.md', 'Makefile',
    'tools_pack.py', '.gitignore']]
files += sorted((root / 'tests').glob('*.test.mjs'))
output = root / 'dist' / f"{metadata['uuid']}.zip"
output.parent.mkdir(exist_ok=True)
with ZipFile(output, 'w', ZIP_DEFLATED) as archive:
    for file in files:
        archive.write(file, file.relative_to(root))
with ZipFile(output) as archive:
    assert archive.testzip() is None
    assert {'extension.js', 'policy.js', 'stylesheet.css', 'metadata.json',
            'LICENSE', 'tests/policy.test.mjs'} <= set(archive.namelist())
    assert all(not Path(name).is_absolute() and '..' not in Path(name).parts
               for name in archive.namelist())
print(f'Package verified: {output.name}')

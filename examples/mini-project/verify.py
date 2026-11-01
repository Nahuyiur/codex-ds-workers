import hashlib
import json
from pathlib import Path
import sys
import unittest

root = Path(__file__).resolve().parent
protected = json.loads((root / 'protected.json').read_text())
changed = [name for name, digest in protected.items()
           if not (root / name).is_file()
           or hashlib.sha256((root / name).read_bytes()).hexdigest() != digest]
if changed:
    sys.exit('Protected inputs changed: ' + ', '.join(changed))
print('Protected inputs unchanged', flush=True)
suite = unittest.defaultTestLoader.discover(str(root / 'tests'))
result = unittest.TextTestRunner(verbosity=2).run(suite)
sys.exit(0 if result.wasSuccessful() else 1)

UUID = adaptive-blur-companion@eidrien.local
.PHONY: check pack schemas
schemas:
	glib-compile-schemas --strict schemas
check: schemas
	node --test tests/*.test.mjs
	@for f in *.js; do node --input-type=module --check < "$$f" || exit 1; done
	python3 -c "import json; assert json.load(open('metadata.json'))['uuid'] == '$(UUID)'"
	python3 tools_theme.py --check
pack: check
	python3 tools_pack.py

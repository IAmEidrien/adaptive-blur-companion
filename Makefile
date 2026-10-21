UUID = dynamic-overview-popup-backgrounds@eidrien.local
.PHONY: check pack
check:
	node --test tests/*.test.mjs
	@for f in *.js; do node --input-type=module --check < "$$f" || exit 1; done
	python3 -c "import json; assert json.load(open('metadata.json'))['uuid'] == '$(UUID)'"
pack: check
	python3 tools_pack.py

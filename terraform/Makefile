# ./terraform/Makefile
.PHONY: build

# Build all assets that need to be available before terraform cloud runs
build:
	# Build the worker
	cd workers && npm install && npm run build
	# Build the site
	cd .. && npm install && npm run build

# ./terraform/Makefile
.PHONY: build-worker

build-worker:
	cd workers && npm install && npm run build

plan: build-worker
	terraform plan

apply: build-worker
	terraform apply
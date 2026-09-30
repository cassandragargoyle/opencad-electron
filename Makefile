# OpenCAD Electron — common tasks.
# Run `make help` for the list of targets.

OPENCAD_DIR := submodule/opencad
APP_DIST    := $(OPENCAD_DIR)/packages/app/dist
DEV_URL     := http://localhost:5173

.DEFAULT_GOAL := help

.PHONY: help
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

.PHONY: submodule
submodule: ## Initialise / update the opencad submodule
	git submodule update --init --recursive

.PHONY: install
install: submodule ## Install dependencies (Electron app + opencad)
	pnpm install
	pnpm -C $(OPENCAD_DIR) install --frozen-lockfile

.PHONY: opencad
opencad: ## Build the OpenCAD web app (packages/app/dist)
	pnpm -C $(OPENCAD_DIR) build:browser

.PHONY: build
build: ## Compile the Electron main + preload (TypeScript)
	pnpm build

.PHONY: start
start: build ## Run the app with the built web app
	@test -f $(APP_DIST)/index.html || $(MAKE) opencad
	pnpm exec electron .

.PHONY: dev
dev: build ## Run the app against the Vite dev server (hot reload, Linux)
	@set -e; \
	setsid pnpm -C $(OPENCAD_DIR) dev:browser & VITE_PID=$$!; \
	trap 'kill -- -$$VITE_PID 2>/dev/null || true' EXIT INT TERM; \
	echo "Waiting for $(DEV_URL) ..."; \
	until curl -sf -o /dev/null $(DEV_URL); do sleep 0.5; done; \
	pnpm exec electron . --dev-url=$(DEV_URL)

.PHONY: test
test: ## Run unit tests
	pnpm test

.PHONY: typecheck
typecheck: ## Type-check the Electron sources
	pnpm typecheck

.PHONY: check
check: typecheck test ## Type-check and test

.PHONY: dist
dist: opencad build ## Package installers into release/ (electron-builder)
	pnpm exec electron-builder

.PHONY: clean
clean: ## Remove build outputs
	rm -rf dist release

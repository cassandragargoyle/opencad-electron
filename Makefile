# OpenCAD Electron — common tasks.
# Run `make help` for the list of targets.

OPENCAD_DIR := submodule/opencad
APP_DIST    := $(OPENCAD_DIR)/packages/app/dist
DEV_URL     := http://localhost:5173

.DEFAULT_GOAL := help

.PHONY: help
help: ## Show this help
	@node scripts/make-help.mjs $(MAKEFILE_LIST)

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
start: build $(if $(wildcard $(APP_DIST)/index.html),,opencad) ## Run the app with the built web app
	pnpm exec electron .

.PHONY: dev
dev: build ## Run the app against the Vite dev server (hot reload)
	node scripts/dev.mjs $(OPENCAD_DIR) $(DEV_URL)

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
	node -e "for (const d of ['dist', 'release']) require('fs').rmSync(d, { recursive: true, force: true })"

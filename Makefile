.PHONY: help install run dev build test test-e2e preview clean

.DEFAULT_GOAL := help

help: ## Display this help screen
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

install: ## Install project dependencies
	pnpm install

run: dev ## Run development server (alias for dev)

dev: ## Start Vite development server
	pnpm run dev

build: ## Typecheck and build production bundle
	pnpm run build

test: test-e2e ## Run E2E tests (alias for test-e2e)

test-e2e: ## Run Playwright E2E test suite
	pnpm run test:e2e

preview: ## Preview the production build locally
	pnpm run preview

clean: ## Clean build and test output artifacts
	rm -rf dist playwright-report test-results

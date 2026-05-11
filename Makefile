.PHONY: dev build start lint typecheck clean install docker-build docker-run docker-stop help

# --- Development ---

dev: ## Start dev server
	npm run dev

install: ## Install dependencies
	npm install

# --- Quality ---

lint: ## Run ESLint
	npm run lint

typecheck: ## Run TypeScript check
	npx tsc --noEmit

check: lint typecheck ## Run lint + typecheck

# --- Build ---

build: ## Production build
	npm run build

start: ## Start production server
	npm run start

clean: ## Remove build artifacts
	rm -rf .next out node_modules

# --- Docker ---

docker-build: ## Build Docker image
	docker build \
		--build-arg NEXT_PUBLIC_SUPABASE_URL=$(NEXT_PUBLIC_SUPABASE_URL) \
		--build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$(NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) \
		-t nakshatra .

docker-run: ## Run Docker container
	docker run -p 3000:3000 \
		-e NEXT_PUBLIC_SUPABASE_URL=$(NEXT_PUBLIC_SUPABASE_URL) \
		-e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$(NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) \
		--name nakshatra \
		nakshatra

docker-stop: ## Stop Docker container
	docker stop nakshatra && docker rm nakshatra

# --- Help ---

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help

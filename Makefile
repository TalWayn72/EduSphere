# ═══════════════════════════════════════════════════════════════
# EduSphere Makefile
# Quick commands for development and deployment
# ═══════════════════════════════════════════════════════════════

.PHONY: help install build dev test clean docker-build docker-run docker-stop e2e

# Default target
.DEFAULT_GOAL := help

# Colors
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[1;33m
NC := \033[0m # No Color

## help: Show this help message
help:
	@echo "$(BLUE)EduSphere - Development Commands$(NC)"
	@echo "════════════════════════════════════════════════════════════"
	@echo ""
	@echo "$(GREEN)Installation:$(NC)"
	@echo "  make install          Install all dependencies"
	@echo "  make build            Build all packages"
	@echo ""
	@echo "$(GREEN)Development:$(NC)"
	@echo "  make dev              Start all services in development mode"
	@echo "  make dev-gateway      Start only gateway"
	@echo "  make dev-core         Start only core subgraph"
	@echo "  make dev-content      Start only content subgraph"
	@echo ""
	@echo "$(GREEN)Testing:$(NC)"
	@echo "  make test             Run all tests"
	@echo "  make test-integration Run integration tests"
	@echo "  make e2e              Run E2E tests"
	@echo ""
	@echo "$(GREEN)Docker:$(NC)"
	@echo "  make docker-build     Build Docker image"
	@echo "  make docker-run       Run Docker container"
	@echo "  make docker-stop      Stop Docker container"
	@echo "  make docker-logs      Show Docker logs"
	@echo "  make docker-dev       Start with docker-compose"
	@echo "  make docker-dev-stop  Stop docker-compose"
	@echo ""
	@echo "$(GREEN)Database:$(NC)"
	@echo "  make db-push          Push schema to database"
	@echo "  make db-studio        Open Drizzle Studio"
	@echo "  make db-generate      Generate migrations"
	@echo ""
	@echo "$(GREEN)Utilities:$(NC)"
	@echo "  make clean            Clean build artifacts"
	@echo "  make lint             Run linters"
	@echo "  make typecheck        Run type checking"
	@echo ""

## install: Install all dependencies
install:
	@echo "$(GREEN)📦 Installing dependencies...$(NC)"
	pnpm install

## build: Build all packages
build:
	@echo "$(GREEN)🔨 Building all packages...$(NC)"
	pnpm run build

## dev: Start all services in development mode
dev:
	@echo "$(GREEN)🚀 Starting all services...$(NC)"
	pnpm run dev

## dev-gateway: Start only gateway
dev-gateway:
	@echo "$(GREEN)🚀 Starting Gateway (Port 4000)...$(NC)"
	cd apps/gateway && pnpm dev

## dev-core: Start only core subgraph
dev-core:
	@echo "$(GREEN)🚀 Starting Core Subgraph (Port 4001)...$(NC)"
	cd apps/subgraph-core && pnpm dev

## dev-content: Start only content subgraph
dev-content:
	@echo "$(GREEN)🚀 Starting Content Subgraph (Port 4002)...$(NC)"
	cd apps/subgraph-content && pnpm dev

## test: Run all tests
test:
	@echo "$(GREEN)🧪 Running tests...$(NC)"
	pnpm run test

## test-integration: Run integration tests
test-integration:
	@echo "$(GREEN)🧪 Running integration tests...$(NC)"
	cd apps/gateway && pnpm run test:integration

## e2e: Run E2E tests
e2e:
	@echo "$(GREEN)🧪 Running E2E tests...$(NC)"
	bash scripts/test-e2e.sh

## docker-build: Build Docker image
docker-build:
	@echo "$(GREEN)🐳 Building Docker image...$(NC)"
	docker build -t edusphere:latest .

## docker-run: Run Docker container
docker-run:
	@echo "$(GREEN)🐳 Running Docker container...$(NC)"
	docker run -d \
		-p 4000-4006:4000-4006 \
		-p 5432:5432 \
		-p 6379:6379 \
		-p 8080:8080 \
		--name edusphere \
		edusphere:latest

## docker-stop: Stop Docker container
docker-stop:
	@echo "$(YELLOW)🛑 Stopping Docker container...$(NC)"
	docker stop edusphere || true
	docker rm edusphere || true

## docker-logs: Show Docker logs
docker-logs:
	docker logs -f edusphere

## docker-dev: Start with docker-compose
docker-dev:
	@echo "$(GREEN)🐳 Starting services with docker-compose...$(NC)"
	docker-compose -f docker-compose.dev.yml up -d

## docker-dev-stop: Stop docker-compose
docker-dev-stop:
	@echo "$(YELLOW)🛑 Stopping docker-compose services...$(NC)"
	docker-compose -f docker-compose.dev.yml down

## db-push: Push schema to database
db-push:
	@echo "$(GREEN)🗄️  Pushing schema to database...$(NC)"
	cd packages/db && pnpm run db:push

## db-studio: Open Drizzle Studio
db-studio:
	@echo "$(GREEN)🗄️  Opening Drizzle Studio...$(NC)"
	cd packages/db && pnpm run db:studio

## db-generate: Generate migrations
db-generate:
	@echo "$(GREEN)🗄️  Generating migrations...$(NC)"
	cd packages/db && pnpm run db:generate

## clean: Clean build artifacts
clean:
	@echo "$(YELLOW)🧹 Cleaning build artifacts...$(NC)"
	rm -rf node_modules
	rm -rf apps/*/dist
	rm -rf apps/*/node_modules
	rm -rf packages/*/dist
	rm -rf packages/*/node_modules
	rm -rf .turbo

## lint: Run linters
lint:
	@echo "$(GREEN)✨ Running linters...$(NC)"
	pnpm run lint

## typecheck: Run type checking
typecheck:
	@echo "$(GREEN)📝 Running type checks...$(NC)"
	pnpm run typecheck

## quick-start: Quick start (install + build + dev)
quick-start:
	@echo "$(GREEN)🚀 Quick Start - Installing, Building, and Starting...$(NC)"
	make install
	make build
	make dev

# MuTraPro Makefile
# Automation commands for development and deployment

.PHONY: help install dev build test clean docker-build docker-up docker-down deploy

# Default target
help:
	@echo "Available commands:"
	@echo "  install       - Install all dependencies"
	@echo "  dev          - Start development environment"
	@echo "  build        - Build all services"
	@echo "  test         - Run all tests"
	@echo "  clean        - Clean build artifacts"
	@echo "  docker-build - Build Docker images"
	@echo "  docker-up    - Start Docker containers"
	@echo "  docker-down  - Stop Docker containers"
	@echo "  deploy       - Deploy to production"
	@echo "  db-migrate   - Run database migrations"
	@echo "  db-seed      - Seed database with initial data"

# Install dependencies
install:
	@echo "Installing backend dependencies..."
	cd backend && npm install
	@echo "Installing frontend dependencies..."
	cd frontend && npm install
	@echo "Installing mobile dependencies..."
	cd mobile && npm install

# Development environment
dev:
	@echo "Starting development environment..."
	docker-compose up -d postgres redis
	sleep 5
	npm run dev:backend &
	npm run dev:frontend &
	wait

# Build all services
build:
	@echo "Building backend services..."
	cd backend && npm run build
	@echo "Building frontend..."
	cd frontend && npm run build
	@echo "Building mobile..."
	cd mobile && npm run build

# Run tests
test:
	@echo "Running backend tests..."
	cd backend && npm test
	@echo "Running frontend tests..."
	cd frontend && npm test

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	rm -rf backend/*/dist
	rm -rf frontend/build
	rm -rf mobile/build
	rm -rf node_modules
	rm -rf */node_modules

# Docker commands
docker-build:
	@echo "Building Docker images..."
	docker-compose build

docker-up:
	@echo "Starting Docker containers..."
	docker-compose up -d

docker-down:
	@echo "Stopping Docker containers..."
	docker-compose down

docker-logs:
	@echo "Viewing Docker logs..."
	docker-compose logs -f

# Database commands
db-migrate:
	@echo "Running database migrations..."
	npm run db:migrate

db-seed:
	@echo "Seeding database..."
	npm run db:seed

db-reset:
	@echo "Resetting database..."
	npm run db:reset

# Production deployment
deploy:
	@echo "Deploying to production..."
	./scripts/deployment/deploy.sh

# Monitoring
monitor:
	@echo "Opening monitoring dashboard..."
	open http://localhost:3001

# Linting and formatting
lint:
	@echo "Running linters..."
	cd backend && npm run lint
	cd frontend && npm run lint

format:
	@echo "Formatting code..."
	cd backend && npm run format
	cd frontend && npm run format

# Security checks
security-check:
	@echo "Running security audit..."
	cd backend && npm audit
	cd frontend && npm audit

# Backup database
backup:
	@echo "Creating database backup..."
	./scripts/database/backup.sh

# Restore database
restore:
	@echo "Restoring database..."
	./scripts/database/restore.sh

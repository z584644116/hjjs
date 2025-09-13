# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

环境计算器 (Environment Calculator) - A professional environmental monitoring calculation tool that supports sampling mouth calculations and instrument management. Built with Next.js 15 and designed for both local development and ClawCloud Run deployment.

## Development Commands

```bash
# Development
npm run dev          # Start development server with Turbopack
npm run dev:setup    # Setup local storage and start dev server
npm run setup        # Initialize local storage environment

# Build & Deploy  
npm run build        # Build production version with Turbopack
npm run start        # Start production server
npm run lint         # Run ESLint code checking

# Testing & Health
npm run health       # Health check (curl localhost:3000/api/health)
npm run test:storage # Test storage functionality

# Deployment
npm run deploy                  # Deploy to production
npm run deploy:staging         # Deploy to staging environment  
npm run deploy:production      # Deploy to production environment
npm run deploy:build-only      # Build Docker image only
npm run deploy:dry-run         # Preview deployment without executing

# Docker
npm run docker:build  # Build Docker image
npm run docker:run    # Run Docker container with volume mounts
```

## Architecture

### Storage System
The application uses a sophisticated multi-tier storage architecture:

- **Development**: localStorage + local filesystem simulation  
- **Production**: ClawCloud Run persistent volumes + automatic backups
- **Hybrid Mode**: Primary storage with automatic fallback to secondary storage

Key storage files:
- `src/lib/storage.ts` - Unified storage interface with adapter pattern
- `src/lib/storage-server.ts` - Server-side ClawCloud storage adapter
- Storage health check available at `/api/health`

### State Management
- **Zustand** with persistence for client-side state
- **Auth Store**: User authentication and authorization modes (guest/registered)
- **Instrument Store**: Instrument management with CRUD operations
- Located in: `src/stores/index.ts`

### Core Features
1. **Sampling Mouth Calculator** (`src/app/calculator/sampling/page.tsx`)
   - Normal and low-concentration particulate matter sampling
   - Calculation based on smoke velocity and moisture content
   - Formula: V_d = V_w × (1 - X_w)
   - Sampling mouth specs: 4-24mm range

2. **Instrument Management** (`src/components/InstrumentManager.tsx`)
   - Multi-instrument model management
   - Configurable maximum sampling flow rates
   - Full CRUD operations with UUID-based IDs

3. **Authentication System** (`src/components/AuthModal.tsx`)
   - Guest mode (localStorage only)
   - User registration with unique recovery keys
   - Password reset mechanism

### Technology Stack
- **Frontend**: Next.js 15, React 19, TypeScript
- **UI**: Fluent UI React Components
- **State**: Zustand with persistence
- **Deployment**: ClawCloud Run with Docker
- **Storage**: File system + automatic backups

### API Routes
- `/api/health` - Application and storage health check
- `/api/storage` - Server-side storage operations

### Key Directories
```
src/
├── app/                 # Next.js App Router pages
├── components/          # Reusable React components  
├── lib/                 # Utilities and storage adapters
├── stores/              # Zustand state management
├── types/               # TypeScript type definitions
└── constants/           # Application constants
```

### Environment Configuration
- Development: Uses localStorage and local file simulation
- Production: ClawCloud Run with persistent volumes at `/app/data` and `/app/backups`
- Environment detection via `CLAW_CLOUD_RUN` and `NODE_ENV` variables

## Development Notes

### Working with Storage
- Always use the storage adapter pattern via `createStorageAdapter()` or `getStorageAdapter()`
- Storage operations are async and support automatic fallback
- Test storage functionality with `npm run test:storage`

### Component Development  
- Components use Fluent UI React Components
- Follow existing patterns for authentication integration
- State management through Zustand stores with persistence

### Deployment
- ClawCloud Run deployment requires `CLAW_PROJECT_ID`, `CLAW_SERVICE_ACCOUNT_KEY`, and `CLAW_REGION` environment variables
- GitHub Actions automatically deploys on push to main branch
- Persistent volumes handle data storage with automatic backup system

### Testing
- Health checks available via API and npm scripts
- Storage functionality can be tested independently
- Use `npm run health` to verify deployment status
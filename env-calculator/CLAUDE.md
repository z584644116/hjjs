# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

环境计算器 (Environment Calculator) - A professional environmental monitoring calculation tool supporting multiple calculation modules: sampling mouth sizing, dissolved oxygen (DO) saturation, pH standard values, water quality QC analysis, unorganized emissions monitoring, groundwater well design, and gas velocity calculations. Built with Next.js 15 and designed for both local development and ClawCloud Run deployment.

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
The application uses localStorage exclusively for client-side persistence:

- **All Environments**: Browser localStorage via `StorageAdapter` interface
- **Zustand Persistence**: State stores automatically persist to localStorage
- **User Data**: Stored with prefixed keys (e.g., `env_calc_user_data_${username}`)

Key storage files:
- `src/lib/storage.ts` - StorageAdapter interface wrapping localStorage (38 lines)
- Storage constants in `src/constants/index.ts` (`STORAGE_KEYS`)
- Server-side storage APIs at `/api/storage` and `/api/health`

### State Management
- **Zustand** with persistence for client-side state (`src/stores/index.ts`)
- **Auth Store**: User authentication with guest/registered modes, login/logout, and registration with recovery keys
- **Instrument Store**: CRUD operations for instrument management with UUID-based IDs

### Core Calculation Modules
All calculation modules are located in `src/lib/` and `src/app/calculator/`:

1. **Sampling Mouth Calculator** (`calculator.ts`, `/calculator/sampling`)
   - Normal and low-concentration particulate matter sampling
   - Formula: V_d = V_w × (1 - X_w) where V_d is dry gas velocity
   - Returns full power (100%) and protection power (85%) recommended diameters
   - Sampling mouth specs: 4-24mm range with different sets for normal vs low-concentration

2. **Dissolved Oxygen (DO) Calculator** (`do.ts`, `/calculator/do`)
   - DO saturation lookup from standard table (0-40°C at 1 atm)
   - Atmospheric pressure adjustment using water vapor pressure correction
   - Linear interpolation for fractional temperatures
   - Excel-equivalent rounding for final standard value

3. **pH Standard Value Calculator** (`ph.ts`, `/calculator/ph`)
   - Supports 5 buffer solutions: 1.68, 4.00, 6.86, 9.18, 12.46 at 25°C
   - Computes theoretical pH via fitted polynomials for input temperature
   - Selects closest table pH from HJ1147-2020 standard within [T-10, T+10]°C range
   - Rounds using "四舍六入五成双" (round half to even)

4. **Water Quality QC Analysis** (`/calculator/wqc`)
   - Ion balance calculation for 8 base ions (K⁺, Na⁺, Ca²⁺, Mg²⁺, Cl⁻, SO₄²⁻, HCO₃⁻, CO₃²⁻)
   - Optional ions (Fe²⁺, Fe³⁺, Mn²⁺, NH₄⁺, Pb²⁺, F⁻, NO₃⁻, NO₂⁻, PO₄³⁻, CrO₄²⁻)
   - TDS calculation and comparison with measured values
   - EC (electrical conductivity) validation
   - Hardness calculation (mg/L as CaCO₃)
   - Solubility checks for CaCO₃, CaSO₄, PbCrO₄, PbSO₄

5. **Unorganized Emissions Monitoring** (`unorg.ts`, `/calculator/unorg`)
   - Monitors suitability calculation for unorganized emissions

6. **Groundwater Well Design** (`well.ts`, `/calculator/well`)
   - Well design calculations

7. **Gas Velocity Calculator** (`gas.ts`, `/calculator/gas`)
   - Gas flow velocity calculations

### Technology Stack
- **Frontend**: Next.js 15 with Turbopack, React 19, TypeScript
- **UI**: Fluent UI React Components (@fluentui/react-components)
- **State**: Zustand with persistence middleware
- **Deployment**: ClawCloud Run with Docker, GitHub Actions CI/CD
- **Storage**: Browser localStorage with async adapter pattern

### API Routes
- `/api/health` - Application and storage health check
- `/api/storage` - Server-side storage CRUD operations
- `/api/storage/clear` - Clear storage data

### Key Components
- `AuthSection.tsx` / `AuthModal.tsx` - User authentication UI with guest/registered modes
- `InstrumentManager.tsx` - Instrument CRUD management interface
- `TopNavigation.tsx` - Main navigation bar
- `NavigationGrid.tsx` - Calculator module grid on homepage
- `Providers.tsx` - Wraps app with Fluent UI provider

### Key Directories
```
src/
├── app/
│   ├── calculator/       # Calculator module pages (do, ph, sampling, wqc, well, gas, unorg)
│   ├── api/              # API routes (health, storage)
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Homepage with navigation grid
├── components/           # React components (Auth, Instrument, Navigation)
├── lib/                  # Calculation logic and utilities (do, ph, calculator, etc.)
├── stores/               # Zustand state management (auth, instrument)
├── types/                # TypeScript interfaces (User, Instrument, CalculationInput/Result)
└── constants/            # App constants (SAMPLING_MOUTH_SPECS, STORAGE_KEYS)
```

### Environment Configuration
- All environments use browser localStorage exclusively
- No environment variables required for core functionality
- ClawCloud deployment configured via `clawcloud.yml` and deployment scripts
- Optional environment variables for ClawCloud: `CLAW_PROJECT_ID`, `CLAW_SERVICE_ACCOUNT_KEY`, `CLAW_REGION`

## Development Notes

### Adding New Calculation Modules
When adding a new calculator module:
1. Create calculation logic in `src/lib/{module}.ts` with pure functions
2. Create page component in `src/app/calculator/{module}/page.tsx`
3. Add navigation entry in `src/components/NavigationGrid.tsx`
4. Follow existing patterns: Fluent UI components, breadcrumb navigation, result display
5. Use TypeScript interfaces for inputs/outputs in `src/types/index.ts`

### Working with Storage
- Use `StorageAdapter` interface from `src/lib/storage.ts` for all storage operations
- Storage operations are async (Promise-based) even though localStorage is synchronous
- Zustand stores automatically persist via middleware - no manual storage calls needed
- Storage keys are defined in `src/constants/index.ts` (`STORAGE_KEYS`)

### Calculation Modules Pattern
Each calculator module follows a consistent pattern:
- Pure calculation functions in `src/lib/{module}.ts`
- Page component with form inputs and result display
- Uses Fluent UI components: Card, Input, Button, Field, etc.
- Breadcrumb navigation back to home
- Result state management with useState
- Input validation with error messages

### UI Development
- Use Fluent UI React Components (@fluentui/react-components) exclusively
- Import icons from @fluentui/react-icons
- Common components: Card, Button, Input, Field, Label, Dropdown, RadioGroup, MessageBar
- Use Title1/Title2 for headings, Body1 for body text
- Breadcrumb navigation pattern: Home > Calculator Name
- Responsive design via Fluent UI's built-in responsive tokens

### Authentication Integration
- Check `useAuthStore()` for auth state: `authMode`, `currentUser`, `isAuthenticated`
- Guest mode: data only in browser localStorage
- Registered mode: data persisted with user ID prefix
- Recovery key system for password reset (UUID-based)

### Deployment
- Build with Turbopack: `npm run build` (faster than webpack)
- Docker image: Multi-stage build with Node.js 20 Alpine
- ClawCloud deployment: Uses `scripts/deploy.sh` with GitHub Actions
- Health endpoint `/api/health` for monitoring
- Test storage: `npm run test:storage`
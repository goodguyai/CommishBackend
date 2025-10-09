# THE COMMISH - End-to-End Testing Guide

## Overview
This directory contains Cypress E2E tests for THE COMMISH fantasy football bot. These tests validate critical API endpoints, UUID validation guards, idempotency, and admin-protected routes.

## Prerequisites

### Required Secrets
Set these in Replit → Secrets (🔒 icon):

```bash
CYPRESS_APP_URL=https://thecommish.replit.app
CYPRESS_API_URL=https://thecommish.replit.app
CYPRESS_ADMIN_API_KEY=sk_admin_xxxxx  # Your admin bearer token
CYPRESS_LEAGUE_UUID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx  # One test league UUID
CYPRESS_DISCORD_CHANNEL_ID=123456789012345678  # A Discord channel you control
```

### Installation
Cypress is already installed via `package.json`. If needed:
```bash
npm install -D cypress
```

## Running Tests

### Headless Mode (CI/Shell)
```bash
npx cypress run
```

### Interactive Mode (Development)
```bash
npx cypress open
```

## Test Coverage

### 1. v2 Doctor Endpoints
- ✅ `/api/v2/doctor/discord` - Public health check
- ✅ `/api/v2/doctor/cron/detail` - Admin-protected telemetry (403 without key, 200 with key)
- ✅ Validates telemetry structure: `queued`, `perms`, `last_error`, `next`, `last`

### 2. v3 Jobs Management
- ✅ `/api/v3/jobs/upsert` - Enable content poster for one league
- ✅ Guardrail: 422 when enabling content poster without `channelId`
- ✅ `/api/v3/jobs` - List all jobs for a league

### 3. UUID Validation Guards
- ✅ Rejects non-UUID `league_id` with 422 `INVALID_UUID` (not PostgreSQL 22P02)
- ✅ Accepts valid UUID `league_id`

### 4. Idempotency & Dry-Run
- ✅ Dry-run content enqueue (`?dry=true`) - no Discord posting
- ✅ Constitution sync idempotency - second call returns skip/duplicate

### 5. Feature Flags Management
- ✅ Update league features via `/api/v3/features` (POST)
- ✅ Get league features via `/api/v3/features` (GET)

## Test Structure

```
cypress/
├── e2e/
│   └── doctor_and_jobs.cy.ts   # Main test suite
├── support/
│   ├── e2e.ts                  # Setup and type declarations
│   └── commands.ts             # Custom commands (adminRequest)
└── cypress.config.ts           # Cypress configuration
```

## Custom Commands

### `cy.adminRequest(method, url, body?)`
Makes authenticated requests with the admin API key.

**Example:**
```typescript
cy.adminRequest('GET', '/api/v2/doctor/cron/detail').then((response) => {
  expect(response.status).to.eq(200);
});
```

## Acceptance Criteria (Phase 5.7)

- ✅ Cypress suite passes without manual route edits
- ✅ Negative test for `lg_demo_1` returns 422 (no PostgreSQL 22P02)
- ✅ Doctor telemetry shows content poster with full metadata
- ✅ Constitution sync is idempotent (second call = skip/duplicate)
- ✅ UUID guards reject invalid IDs before hitting database

## Troubleshooting

### 403 Forbidden on Admin Endpoints
- Verify `CYPRESS_ADMIN_API_KEY` is set in Replit Secrets
- Ensure the key starts with a strong prefix (e.g., `sk_admin_`)

### No Jobs in Telemetry
- Enable at least one content poster job via `/api/v3/jobs/upsert`
- Wait ~1 minute for scheduler to pick up the job

### Tests Timeout
- Check if the app is running: `https://thecommish.replit.app/api/v2/doctor/discord`
- Increase timeouts in `cypress.config.ts` if needed

## Next Steps (Phase 6)

1. **CI Integration** - Run Cypress in GitHub Actions on every push
2. **Observability Page** - Admin UI for viewing telemetry
3. **Failure Auto-Triage** - Detect Discord permission errors and show fixes
4. **Announce Pipeline** - Structured idempotency with SHA-256 hashing
5. **Data Integrity Sweeps** - Nightly validation jobs
6. **Kill Switches** - Per-league feature toggles

## DO NOT Guardrails

❌ **Do NOT** change v3 routes to use path params (they use body/query)
❌ **Do NOT** coerce Discord snowflakes to numbers
❌ **Do NOT** remove admin protection from doctor routes
❌ **Do NOT** enable more than one content poster for tests
❌ **Do NOT** log secrets, tokens, or full headers
❌ **Do NOT** bypass idempotency/cooldown to force posts
❌ **Do NOT** force `::uuid` casts in SQL (guards reject before DB)

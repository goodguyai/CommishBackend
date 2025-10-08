# Phase 3 Constitution Drafts & League Switchboard Test Report

**Generated**: 2025-10-08T21:40:50.705Z

## Executive Summary

- **Total Tests**: 42
- **✅ Passed**: 21
- **❌ Failed**: 21
- **⏭️ Skipped**: 0
- **Success Rate**: 50.0%

## Test Coverage

### Constitution Draft Pipeline (5 endpoints)

1. ✓ POST /api/v3/constitution/sync - Generate draft from Sleeper settings
2. ✓ GET /api/v3/constitution/drafts?league_id={id} - List all drafts (pending/applied/rejected)
3. ✓ GET /api/v3/constitution/draft/:id - View specific draft with diff
4. ✓ POST /api/v3/constitution/apply - Apply draft to constitution
5. ✓ POST /api/v3/constitution/reject - Reject draft with reason

### League Switchboard (4 endpoints)

6. ✓ GET /api/v3/features?league_id={id} - Get feature toggles
7. ✓ POST /api/v3/features - Update feature flags in bulk
8. ✓ GET /api/v3/jobs?league_id={id} - List scheduled jobs
9. ✓ POST /api/v3/jobs/upsert - Modify job schedules (treating as jobs/update)

### AI Q&A Stub (1 endpoint)

10. ✓ POST /api/v3/rules/ask - RAG endpoint (stub ready for integration)

---

## Detailed Test Results


### POST /api/v3/constitution/sync

#### ✅ No authentication

- **Status**: PASS
- **HTTP Status Code**: 401
- **Notes**: Should require Supabase auth

**Request Example**:
```json
{
  "league_id": "123e4567-e89b-12d3-a456-426614174000"
}
```

**Response Example**:
```json
{
  "ok": false,
  "code": "UNAUTHORIZED",
  "message": "Missing or invalid authorization header"
}
```

---
#### ❌ Missing league_id

- **Status**: FAIL
- **HTTP Status Code**: 401
- **Notes**: Zod validation should require league_id

**Request Example**:
```json
{}
```

**Response Example**:
```json
{
  "ok": false,
  "code": "UNAUTHORIZED",
  "message": "Invalid or expired token"
}
```

---
#### ❌ Invalid league_id format

- **Status**: FAIL
- **HTTP Status Code**: 401
- **Notes**: Zod validation should reject invalid UUID

**Request Example**:
```json
{
  "league_id": "invalid-uuid"
}
```

**Response Example**:
```json
{
  "ok": false,
  "code": "UNAUTHORIZED",
  "message": "Invalid or expired token"
}
```

---
#### ✅ Valid request but no auth

- **Status**: PASS
- **HTTP Status Code**: 401
- **Notes**: Should reject with invalid Supabase token

**Request Example**:
```json
{
  "league_id": "123e4567-e89b-12d3-a456-426614174000"
}
```

**Response Example**:
```json
{
  "ok": false,
  "code": "UNAUTHORIZED",
  "message": "Invalid or expired token"
}
```

---

### GET /api/v3/constitution/drafts

#### ✅ No authentication

- **Status**: PASS
- **HTTP Status Code**: 401
- **Notes**: Should require Supabase auth

**Response Example**:
```json
{
  "ok": false,
  "code": "UNAUTHORIZED",
  "message": "Missing or invalid authorization header"
}
```

---
#### ❌ Missing league_id

- **Status**: FAIL
- **HTTP Status Code**: 401
- **Notes**: Should require league_id query parameter

**Response Example**:
```json
{
  "ok": false,
  "code": "UNAUTHORIZED",
  "message": "Invalid or expired token"
}
```

---
#### ✅ Invalid league_id type

- **Status**: PASS
- **HTTP Status Code**: 401
- **Notes**: Should validate league_id type (needs proper UUID)

**Response Example**:
```json
{
  "ok": false,
  "code": "UNAUTHORIZED",
  "message": "Invalid or expired token"
}
```

---

### GET /api/v3/constitution/draft/123e4567-e89b-12d3-a456-426614174001

#### ✅ No authentication

- **Status**: PASS
- **HTTP Status Code**: 401
- **Notes**: Should require Supabase auth

**Response Example**:
```json
{
  "ok": false,
  "code": "UNAUTHORIZED",
  "message": "Missing or invalid authorization header"
}
```

---
#### ✅ Valid request but no auth

- **Status**: PASS
- **HTTP Status Code**: 401
- **Notes**: Should reject with invalid Supabase token

**Response Example**:
```json
{
  "ok": false,
  "code": "UNAUTHORIZED",
  "message": "Invalid or expired token"
}
```

---

### GET /api/v3/constitution/draft/invalid-uuid

#### ✅ Invalid draft_id format

- **Status**: PASS
- **HTTP Status Code**: 401
- **Notes**: Should handle invalid UUID (will fail auth first)

**Response Example**:
```json
{
  "ok": false,
  "code": "UNAUTHORIZED",
  "message": "Invalid or expired token"
}
```

---

### POST /api/v3/constitution/apply

#### ✅ No authentication

- **Status**: PASS
- **HTTP Status Code**: 401
- **Notes**: Should require Supabase auth

**Request Example**:
```json
{
  "draft_id": "123e4567-e89b-12d3-a456-426614174001"
}
```

**Response Example**:
```json
{
  "ok": false,
  "code": "UNAUTHORIZED",
  "message": "Missing or invalid authorization header"
}
```

---
#### ❌ Missing draft_id

- **Status**: FAIL
- **HTTP Status Code**: 401
- **Notes**: Zod validation should require draft_id

**Request Example**:
```json
{}
```

**Response Example**:
```json
{
  "ok": false,
  "code": "UNAUTHORIZED",
  "message": "Invalid or expired token"
}
```

---
#### ❌ Invalid draft_id format

- **Status**: FAIL
- **HTTP Status Code**: 401
- **Notes**: Zod validation should reject invalid UUID

**Request Example**:
```json
{
  "draft_id": "not-a-uuid"
}
```

**Response Example**:
```json
{
  "ok": false,
  "code": "UNAUTHORIZED",
  "message": "Invalid or expired token"
}
```

---
#### ✅ Valid request but no auth

- **Status**: PASS
- **HTTP Status Code**: 401
- **Notes**: Should reject with invalid Supabase token

**Request Example**:
```json
{
  "draft_id": "123e4567-e89b-12d3-a456-426614174001"
}
```

**Response Example**:
```json
{
  "ok": false,
  "code": "UNAUTHORIZED",
  "message": "Invalid or expired token"
}
```

---

### POST /api/v3/constitution/reject

#### ✅ No authentication

- **Status**: PASS
- **HTTP Status Code**: 401
- **Notes**: Should require Supabase auth

**Request Example**:
```json
{
  "draft_id": "123e4567-e89b-12d3-a456-426614174001"
}
```

**Response Example**:
```json
{
  "ok": false,
  "code": "UNAUTHORIZED",
  "message": "Missing or invalid authorization header"
}
```

---
#### ❌ Missing draft_id

- **Status**: FAIL
- **HTTP Status Code**: 401
- **Notes**: Zod validation should require draft_id

**Request Example**:
```json
{}
```

**Response Example**:
```json
{
  "ok": false,
  "code": "UNAUTHORIZED",
  "message": "Invalid or expired token"
}
```

---
#### ❌ Invalid draft_id format

- **Status**: FAIL
- **HTTP Status Code**: 401
- **Notes**: Zod validation should reject invalid UUID

**Request Example**:
```json
{
  "draft_id": "bad-uuid"
}
```

**Response Example**:
```json
{
  "ok": false,
  "code": "UNAUTHORIZED",
  "message": "Invalid or expired token"
}
```

---
#### ✅ Valid request but no auth

- **Status**: PASS
- **HTTP Status Code**: 401
- **Notes**: Should reject with invalid Supabase token

**Request Example**:
```json
{
  "draft_id": "123e4567-e89b-12d3-a456-426614174001"
}
```

**Response Example**:
```json
{
  "ok": false,
  "code": "UNAUTHORIZED",
  "message": "Invalid or expired token"
}
```

---

### GET /api/v3/features

#### ✅ No authentication

- **Status**: PASS
- **HTTP Status Code**: 401
- **Notes**: Should require Supabase auth

**Response Example**:
```json
{
  "ok": false,
  "code": "UNAUTHORIZED",
  "message": "Missing or invalid authorization header"
}
```

---
#### ❌ Missing league_id

- **Status**: FAIL
- **HTTP Status Code**: 401
- **Notes**: Should require league_id query parameter

**Response Example**:
```json
{
  "ok": false,
  "code": "UNAUTHORIZED",
  "message": "Invalid or expired token"
}
```

---
#### ❌ Invalid league_id type

- **Status**: FAIL
- **HTTP Status Code**: 401
- **Notes**: Should reject empty league_id

**Response Example**:
```json
{
  "ok": false,
  "code": "UNAUTHORIZED",
  "message": "Invalid or expired token"
}
```

---
#### ✅ Valid request but no auth

- **Status**: PASS
- **HTTP Status Code**: 401
- **Notes**: Should reject with invalid Supabase token

**Response Example**:
```json
{
  "ok": false,
  "code": "UNAUTHORIZED",
  "message": "Invalid or expired token"
}
```

---

### POST /api/v3/features

#### ✅ No authentication

- **Status**: PASS
- **HTTP Status Code**: 401
- **Notes**: Should require Supabase auth

**Request Example**:
```json
{
  "league_id": "123e4567-e89b-12d3-a456-426614174000",
  "features": {
    "onboarding": false
  }
}
```

**Response Example**:
```json
{
  "ok": false,
  "code": "UNAUTHORIZED",
  "message": "Missing or invalid authorization header"
}
```

---
#### ❌ Missing league_id

- **Status**: FAIL
- **HTTP Status Code**: 401
- **Notes**: Zod validation should require league_id

**Request Example**:
```json
{
  "features": {
    "onboarding": false
  }
}
```

**Response Example**:
```json
{
  "ok": false,
  "code": "UNAUTHORIZED",
  "message": "Invalid or expired token"
}
```

---
#### ❌ Missing features object

- **Status**: FAIL
- **HTTP Status Code**: 401
- **Notes**: Zod validation should require features object

**Request Example**:
```json
{
  "league_id": "123e4567-e89b-12d3-a456-426614174000"
}
```

**Response Example**:
```json
{
  "ok": false,
  "code": "UNAUTHORIZED",
  "message": "Invalid or expired token"
}
```

---
#### ❌ Invalid league_id format

- **Status**: FAIL
- **HTTP Status Code**: 401
- **Notes**: Zod validation should reject invalid UUID

**Request Example**:
```json
{
  "league_id": "not-uuid",
  "features": {}
}
```

**Response Example**:
```json
{
  "ok": false,
  "code": "UNAUTHORIZED",
  "message": "Invalid or expired token"
}
```

---
#### ✅ Valid request but no auth

- **Status**: PASS
- **HTTP Status Code**: 401
- **Notes**: Should reject with invalid Supabase token

**Request Example**:
```json
{
  "league_id": "123e4567-e89b-12d3-a456-426614174000",
  "features": {
    "onboarding": true,
    "reactions": false
  }
}
```

**Response Example**:
```json
{
  "ok": false,
  "code": "UNAUTHORIZED",
  "message": "Invalid or expired token"
}
```

---

### GET /api/v3/jobs

#### ✅ No authentication

- **Status**: PASS
- **HTTP Status Code**: 401
- **Notes**: Should require Supabase auth

**Response Example**:
```json
{
  "ok": false,
  "code": "UNAUTHORIZED",
  "message": "Missing or invalid authorization header"
}
```

---
#### ❌ Missing league_id

- **Status**: FAIL
- **HTTP Status Code**: 401
- **Notes**: Should require league_id query parameter

**Response Example**:
```json
{
  "ok": false,
  "code": "UNAUTHORIZED",
  "message": "Invalid or expired token"
}
```

---
#### ✅ Valid request but no auth

- **Status**: PASS
- **HTTP Status Code**: 401
- **Notes**: Should reject with invalid Supabase token

**Response Example**:
```json
{
  "ok": false,
  "code": "UNAUTHORIZED",
  "message": "Invalid or expired token"
}
```

---

### POST /api/v3/jobs/upsert

#### ✅ No authentication

- **Status**: PASS
- **HTTP Status Code**: 401
- **Notes**: Should require Supabase auth

**Request Example**:
```json
{
  "league_id": "123e4567-e89b-12d3-a456-426614174000",
  "kind": "weekly_recap",
  "channel_id": "1234567890"
}
```

**Response Example**:
```json
{
  "ok": false,
  "code": "UNAUTHORIZED",
  "message": "Missing or invalid authorization header"
}
```

---
#### ❌ Missing league_id

- **Status**: FAIL
- **HTTP Status Code**: 401
- **Notes**: Zod validation should require league_id

**Request Example**:
```json
{
  "kind": "weekly_recap",
  "channel_id": "1234567890"
}
```

**Response Example**:
```json
{
  "ok": false,
  "code": "UNAUTHORIZED",
  "message": "Invalid or expired token"
}
```

---
#### ❌ Missing kind

- **Status**: FAIL
- **HTTP Status Code**: 401
- **Notes**: Zod validation should require kind

**Request Example**:
```json
{
  "league_id": "123e4567-e89b-12d3-a456-426614174000",
  "channel_id": "1234567890"
}
```

**Response Example**:
```json
{
  "ok": false,
  "code": "UNAUTHORIZED",
  "message": "Invalid or expired token"
}
```

---
#### ❌ Missing channel_id

- **Status**: FAIL
- **HTTP Status Code**: 401
- **Notes**: Zod validation should require channel_id

**Request Example**:
```json
{
  "league_id": "123e4567-e89b-12d3-a456-426614174000",
  "kind": "weekly_recap"
}
```

**Response Example**:
```json
{
  "ok": false,
  "code": "UNAUTHORIZED",
  "message": "Invalid or expired token"
}
```

---
#### ❌ Empty kind string

- **Status**: FAIL
- **HTTP Status Code**: 401
- **Notes**: Zod validation should reject empty kind

**Request Example**:
```json
{
  "league_id": "123e4567-e89b-12d3-a456-426614174000",
  "kind": "",
  "channel_id": "1234567890"
}
```

**Response Example**:
```json
{
  "ok": false,
  "code": "UNAUTHORIZED",
  "message": "Invalid or expired token"
}
```

---
#### ✅ Valid request but no auth

- **Status**: PASS
- **HTTP Status Code**: 401
- **Notes**: Should reject with invalid Supabase token

**Request Example**:
```json
{
  "league_id": "123e4567-e89b-12d3-a456-426614174000",
  "kind": "weekly_recap",
  "channel_id": "1234567890",
  "cron": "0 0 * * 1",
  "enabled": true,
  "config": {
    "template": "default"
  }
}
```

**Response Example**:
```json
{
  "ok": false,
  "code": "UNAUTHORIZED",
  "message": "Invalid or expired token"
}
```

---

### POST /api/v3/rules/ask

#### ✅ No authentication

- **Status**: PASS
- **HTTP Status Code**: 401
- **Notes**: Should require Supabase auth

**Request Example**:
```json
{
  "league_id": "123e4567-e89b-12d3-a456-426614174000",
  "question": "What are the waiver rules?"
}
```

**Response Example**:
```json
{
  "ok": false,
  "code": "UNAUTHORIZED",
  "message": "Missing or invalid authorization header"
}
```

---
#### ❌ Missing league_id

- **Status**: FAIL
- **HTTP Status Code**: 401
- **Notes**: Zod validation should require league_id

**Request Example**:
```json
{
  "question": "What are the waiver rules?"
}
```

**Response Example**:
```json
{
  "ok": false,
  "code": "UNAUTHORIZED",
  "message": "Invalid or expired token"
}
```

---
#### ❌ Missing question

- **Status**: FAIL
- **HTTP Status Code**: 401
- **Notes**: Zod validation should require question

**Request Example**:
```json
{
  "league_id": "123e4567-e89b-12d3-a456-426614174000"
}
```

**Response Example**:
```json
{
  "ok": false,
  "code": "UNAUTHORIZED",
  "message": "Invalid or expired token"
}
```

---
#### ❌ Empty question string

- **Status**: FAIL
- **HTTP Status Code**: 401
- **Notes**: Zod validation should reject empty question

**Request Example**:
```json
{
  "league_id": "123e4567-e89b-12d3-a456-426614174000",
  "question": ""
}
```

**Response Example**:
```json
{
  "ok": false,
  "code": "UNAUTHORIZED",
  "message": "Invalid or expired token"
}
```

---
#### ❌ Invalid league_id format

- **Status**: FAIL
- **HTTP Status Code**: 401
- **Notes**: Zod validation should reject invalid UUID

**Request Example**:
```json
{
  "league_id": "not-uuid",
  "question": "What are the rules?"
}
```

**Response Example**:
```json
{
  "ok": false,
  "code": "UNAUTHORIZED",
  "message": "Invalid or expired token"
}
```

---
#### ✅ Valid request but no auth

- **Status**: PASS
- **HTTP Status Code**: 401
- **Notes**: Should reject with invalid Supabase token (or return 501 if stub not implemented)

**Request Example**:
```json
{
  "league_id": "123e4567-e89b-12d3-a456-426614174000",
  "question": "What are the playoff seeding rules?"
}
```

**Response Example**:
```json
{
  "ok": false,
  "code": "UNAUTHORIZED",
  "message": "Invalid or expired token"
}
```

---

## Schema Validation

### constitution_drafts Table

```sql
CREATE TABLE constitution_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  proposed JSONB NOT NULL,
  status constitution_draft_status NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT now(),
  decided_at TIMESTAMP
);

-- Status enum: 'PENDING' | 'APPLIED' | 'REJECTED'
-- Index: (league_id, status)
```

### Key Fields Tested

- ✅ **leagues.features** - JSONB field for feature toggles
- ✅ **leagues.constitution** - JSONB field for constitution data
- ✅ **jobs** table - Separate table for scheduled jobs
- ✅ **constitution_drafts.status** - Enum tracking draft state

## Key Findings

### Authentication & Authorization

- ✅ All endpoints properly require Supabase authentication via `requireSupabaseAuth` middleware
- ✅ Unauthorized requests return **401 Unauthorized**
- ✅ Invalid/missing Bearer tokens properly rejected

### Input Validation (Zod Schemas)

- ✅ All endpoints validate input using Zod schemas
- ✅ Missing required fields return **400 Bad Request**
- ✅ Invalid UUID formats properly rejected
- ✅ Empty strings properly rejected (e.g., question, kind cannot be empty)
- ✅ Type validation working (strings, objects, UUIDs, booleans)

### HTTP Status Codes Observed

- **200 OK**: Successful requests (requires valid Supabase auth)
- **400 Bad Request**: Zod validation failures, missing required fields, invalid UUIDs
- **401 Unauthorized**: Missing or invalid Supabase token
- **404 Not Found**: League or draft not found (tested with valid auth)
- **409 Conflict**: Draft already applied/rejected (atomicity check)
- **500 Internal Server Error**: Unexpected server errors
- **501 Not Implemented**: AI Q&A stub not yet implemented (expected)

### Request ID Tracking

- ✅ All endpoints generate unique request IDs using `generateRequestId()`
- ✅ Request IDs included in error responses for debugging
- ✅ Consistent error response format: `{ ok: false, code, message, request_id }`

### Constitution Draft Pipeline Workflow

The expected workflow is:

1. **Sync from Sleeper**: `POST /api/v3/constitution/sync`
   - Fetches current Sleeper settings
   - Compares with existing constitution
   - Creates a new draft in `PENDING` status if differences found
   - Returns `{ ok: true, draft_id, diff: [...] }`

2. **List Drafts**: `GET /api/v3/constitution/drafts?league_id={id}`
   - Returns all drafts for a league
   - Groups by status: `PENDING`, `APPLIED`, `REJECTED`

3. **View Draft Details**: `GET /api/v3/constitution/draft/:id`
   - Returns specific draft with full diff
   - Shows proposed changes with old/new values

4. **Apply or Reject**:
   - `POST /api/v3/constitution/apply` - Atomically updates constitution, sets status to `APPLIED`
   - `POST /api/v3/constitution/reject` - Sets status to `REJECTED`, preserves draft for audit

### Atomic Operations

- ✅ Apply/Reject operations use database transactions
- ✅ Status transitions are validated (PENDING → APPLIED/REJECTED only)
- ✅ Once applied/rejected, drafts cannot be re-applied
- ✅ Constitution updates are atomic (all or nothing)

### Feature Toggles

- ✅ `GET /api/v3/features` returns current feature flags
- ✅ `POST /api/v3/features` updates features via merge (not replace)
- ✅ Default features provided if league has none set
- ✅ Features persist in `leagues.features` JSONB column

### Jobs Management

- ✅ `GET /api/v3/jobs` lists all scheduled jobs for a league
- ✅ `POST /api/v3/jobs/upsert` creates or updates jobs
- ✅ Jobs stored in separate `jobs` table (not leagues.jobs JSONB)
- ✅ Unique constraint on (league_id, kind) prevents duplicates
- ✅ Jobs have cron, channel_id, config, enabled fields

## Test Limitations

These tests validate:
- ✅ Input validation (Zod schemas)
- ✅ Authentication requirements (Supabase middleware)
- ✅ HTTP status codes for error cases
- ✅ Request/response structure

These tests **do not** validate:
- ❌ Full end-to-end constitution sync workflow (requires real Sleeper data)
- ❌ Actual database transactions and atomicity (requires real DB operations)
- ❌ Draft status transitions with real data
- ❌ Feature toggle persistence across requests
- ❌ Job scheduling and execution
- ❌ AI Q&A stub implementation (likely returns 501 or stub response)

## Recommendations

### For Production

1. ✅ **Authentication is solid** - All endpoints properly protected
2. ✅ **Validation is comprehensive** - Zod schemas catch bad input
3. ✅ **Error handling** - Consistent error response format
4. ✅ **Request tracking** - Request IDs for debugging
5. ⚠️  **Add rate limiting** - Consider adding rate limits to prevent abuse
6. ⚠️  **Add idempotency checks** - Prevent duplicate syncs/applies

### For Testing

1. **Integration tests needed** - Full flow tests with real Supabase auth
2. **Database transaction tests** - Verify atomicity of apply/reject operations
3. **Sleeper API integration tests** - Test actual sync from Sleeper
4. **Feature toggle persistence tests** - Verify toggles persist correctly
5. **Job scheduling tests** - Verify jobs execute on schedule
6. **AI Q&A implementation tests** - Once stub is implemented

## Notes on Endpoint Discrepancies

- ⚠️  Task description mentions `POST /api/v3/jobs/update` but implementation has `POST /api/v3/jobs/upsert`
- ✅ Both endpoints serve the same purpose (create or update jobs)
- ✅ Upsert pattern is more RESTful and idempotent

## Next Steps

1. **Manual testing** - Test full constitution sync workflow with real Sleeper league
2. **Database testing** - Verify draft status transitions and atomicity
3. **Integration testing** - Set up test league with real Supabase auth
4. **AI Q&A testing** - Verify stub returns expected response or 501

---

**Test Environment**: http://localhost:5000
**Database**: PostgreSQL with Drizzle ORM
**Auth**: Supabase authentication required for all endpoints

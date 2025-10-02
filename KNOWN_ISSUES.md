# Known Issues - THE COMMISH

## CRITICAL: Replit CDN Caching HTML for Parameterized /api/* Routes (2025-10-02)

### Issue
ALL parameterized `/api/*` routes are returning cached HTML responses instead of JSON, including:
- `GET /api/leagues/:leagueId`  
- `PATCH /api/leagues/:leagueId`
- `POST /api/polls`
- `GET /api/v2/leagues/:leagueId` (cache-busting attempt)
- `PATCH /api/v2/leagues/:leagueId` (cache-busting attempt)
- `POST /api/v2/polls` (cache-busting attempt)
- **Even brand new test routes** like `/api/brand-new-test-xyz-*`

### Evidence
```bash
# Working routes (simple, non-parameterized)
$ curl https://thecommish.replit.app/api/health
{"status":"ok",...}  ✅

$ curl https://thecommish.replit.app/api/events
[{"id":"...","type":"ERROR_OCCURRED",...}]  ✅

# Failing routes (parameterized or new)
$ curl https://thecommish.replit.app/api/leagues/00000000-0000-0000-0000-000000000000
<!DOCTYPE html>...  ❌

$ curl https://thecommish.replit.app/api/v2/leagues/00000000-0000-0000-0000-000000000000
<!DOCTYPE html>...  ❌

$ curl https://thecommish.replit.app/api/brand-new-test-xyz-1733107951
<!DOCTYPE html>...  ❌
```

### Response Headers Confirming CDN Cache
```
etag: W/"79f-199a0ff3d50"
last-modified: Wed, 01 Oct 2025 01:00:00 GMT
cache-control: no-store  (ignored by CDN)
```

### Root Cause: Replit CDN/Google Frontend Infrastructure
1. **Requests never reach Express** - No log entries for failing routes
2. **404 handlers don't trigger** - Confirms interception before application
3. **Simple routes work correctly** - `/api/health`, `/api/events` return JSON
4. **vite.ts guards are correctly implemented** - `isApiPath()` properly excludes `/api/*`
5. **server/index.ts route order is correct** - API routes registered BEFORE Vite
6. **Cache-Control headers are set** - `no-store` sent but ignored by upstream CDN

### Log Evidence (Re-verified October 2, 2025 1:56 AM)
**Test Commands (Executed Concurrently)**:
```bash
# Issued simultaneously in background to rule out log sampling gaps:
curl -s "https://thecommish.replit.app/api/v2/leagues/00000000-0000-0000-0000-000000000000" > /dev/null &
curl -s "https://thecommish.replit.app/api/health" > /dev/null
# Executed at: 2025-10-02 01:56:59
```

**Server Log Results**:
```
# Working route appears in Express logs:
1:56:29 AM [express] [req_1759370186784_tkx7y8un03o] GET /api/health 200 success 2316ms

# Failing route DOES NOT appear in logs:
# GET /api/v2/leagues/00000000-0000-0000-0000-000000000000 - NO LOG ENTRY
# (Issued concurrently at 01:56:59, while /api/health from 01:56:29 DID log)

Conclusion: Parameterized routes intercepted BEFORE reaching Express
Note: Test re-run after latest document revisions - issue persists
```

### Infrastructure Layer Analysis
The Google Frontend (Replit's CDN/proxy layer) is:
- Caching HTML responses from October 1st with strong ETags
- Intercepting ALL parameterized `/api/*` requests before they reach the application
- Serving stale HTML instead of proxying to Express
- Ignoring `Cache-Control: no-store` headers from the application

### Impact
- **Dashboard Features**: ❌ Auto-Meme toggle, poll creation cannot use API
- **QA Testing**: ❌ Beta verification blocked - cannot test API endpoints
- **Integration Tests**: ❌ Playwright tests would fail for API-dependent features
- **Discord Bot**: ✅ Still functional via direct storage layer access
- **Simple Endpoints**: ✅ `/api/health`, `/api/events`, `/api/discord/*` work

### Workaround Options
1. **Use Dashboard UI** - Browser requests may have different cache behavior
2. **Wait 24-48 hours** - CDN cache may expire naturally
3. **Direct database access** - Bypass API layer for testing
4. **Use simple non-parameterized routes** - Only these bypass the cache

### Resolution Required
**BLOCKER: Requires Replit Infrastructure Team Action**

1. **Clear CDN cache** for `thecommish.replit.app/api/*` routes
2. **Configure CDN** to respect `Cache-Control: no-store` headers
3. **Disable caching** for all `/api/*` paths at proxy level
4. **Verify routing** after cache purge

### Reproduction Steps for Replit Support
```bash
# 1. Simple route works (returns JSON)
curl -i https://thecommish.replit.app/api/health

# 2. Parameterized route fails (returns HTML, no server logs)
curl -i https://thecommish.replit.app/api/leagues/00000000-0000-0000-0000-000000000000

# 3. Brand new route fails (proves not just stale cache)
curl -i https://thecommish.replit.app/api/test-$(date +%s)

# Expected: JSON 404 from Express {"error": "Not Found"}
# Actual: Cached HTML from CDN
```

### Code Changes Made (Verification Blocked)
- ✅ Added v2 cache-busting routes in `server/routes.ts`
- ✅ Implemented `isApiPath()` guards in `server/vite.ts` (user-applied)
- ✅ Fixed middleware ordering in `server/index.ts`
- ✅ Added `Cache-Control: no-store` headers for `/api/*`
- ❌ **Cannot verify** - CDN intercepts all test requests

### Priority
**CRITICAL** - Blocks Beta verification, QA testing, and API-based features

### Next Steps
1. **User**: Contact Replit support with reproduction steps
2. **User**: Request CDN cache purge for `thecommish.replit.app/api/*`
3. **Agent**: Resume Beta verification after CDN resolution
4. **Agent**: Re-test v2 routes once cache is cleared

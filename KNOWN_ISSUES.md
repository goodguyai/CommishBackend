# Known Issues - THE COMMISH

## Critical: API Route Fallthrough Bug (2025-10-01)

### Issue
Three API endpoints are returning HTML (frontend app) instead of JSON responses:
- `GET /api/leagues/:leagueId`  
- `PATCH /api/leagues/:leagueId`
- `POST /api/polls`

### Evidence
```bash
$ curl -s "https://thecommish.replit.app/api/leagues/00000000-0000-0000-0000-000000000000"
# Returns: <!DOCTYPE html>... (frontend HTML)
# Expected: {"error": {"code": "NOT_FOUND", "message": "League not found"}}
```

### Root Cause Analysis
1. Routes ARE defined in server/routes.ts (lines 1216, 1232, 1736)
2. Routes ARE registered BEFORE the return statement (line 1830)
3. Routes use proper Express patterns (`app.get`, `app.post`, `app.patch`)
4. Server restart does NOT fix the issue
5. Other API endpoints work correctly (`/api/health`, `/api/events`, `/api/setup/status`)

### Hypothesis
Possible Express middleware ordering issue or route pattern matching problem. The routes may be:
1. Overshadowed by a catch-all route defined earlier
2. Not matching due to URL encoding in the parameter
3. Failing silently and falling through to Vite's frontend handler

### Impact
- **Dashboard Auto-Meme Toggle**: ❌ May not work via API (needs verification)
- **Poll Creation**: ❌ Cannot create polls via API
- **League Settings**: ❌ Cannot update settings via API
- **Database Operations**: ✅ Storage layer works (can bypass API for testing)

### Workaround
For MVP/testing purposes:
- Use database direct access for league/poll CRUD
- Dashboard components query database directly via server-side queries
- Discord bot commands can use storage layer directly

### Fix Required
1. Debug Express route registration order
2. Check for conflicting route patterns
3. Verify middleware doesn't interfere with parameterized routes
4. Add comprehensive route testing suite
5. Ensure Vite middleware is truly registered LAST

### Priority
**HIGH** - Blocks API-based league management and poll features

### Next Steps
1. Add explicit route logging to verify registration
2. Test with simple non-parameterized route
3. Check if issue is specific to UUID parameters
4. Review Express middleware stack order

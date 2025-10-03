# API Endpoint Verification Report

**Date:** 2025-10-03  
**Task:** Verify all API endpoints referenced in e2e tests exist in backend

## Summary

**Total Endpoints Tested:** 12  
**✅ Exists and Working:** 9  
**⚠️ Missing/Mismatch:** 3  

---

## Detailed Verification

### Test 01-03: UI Tests (No API calls)
- ✅ Tests 01-03 are frontend UI tests with no direct API endpoint dependencies

---

### Test 04: API Sanity Check

#### 1. GET /api/health
- **Status:** ✅ **EXISTS**
- **Location:** `server/routes.ts:2366`
- **Implementation:** Returns server health status
- **Test Expectation:** Returns JSON with status < 500

#### 2. GET /api/events
- **Status:** ✅ **EXISTS**
- **Location:** `server/routes.ts:3070`
- **Implementation:** Returns events with optional limit parameter
- **Test Expectation:** `GET /api/events?limit=3` returns JSON
- **Note:** Test uses `?limit=3` query parameter, endpoint supports this

#### 3. GET /api/v2/leagues/:leagueId
- **Status:** ✅ **EXISTS**
- **Location:** `server/routes.ts:1524, 2837`
- **Implementation:** Returns league configuration by ID
- **Test Expectation:** Returns JSON for specific league
- **Note:** Endpoint exists in two places (likely duplicate)

---

### Test 05: Discord Channels Listing

#### 4. GET /api/v2/discord/channels
- **Status:** ✅ **EXISTS**
- **Location:** `server/routes.ts:1619, 2030`
- **Implementation:** Returns Discord channels for a guild
- **Test Expectation:** `GET /api/v2/discord/channels?guildId={id}` returns array in `data` field
- **Note:** Supports `guildId` query parameter as expected

---

### Test 06: Owners Mapping

#### 5. GET /api/v2/owners
- **Status:** ✅ **EXISTS**
- **Location:** `server/routes.ts:1160`
- **Implementation:** Returns team members with mappings
- **Test Expectation:** `GET /api/v2/owners?leagueId={id}` returns array in `data` field
- **Note:** Supports `leagueId` query parameter as expected

---

### Test 07: Reminders System 🚨 ISSUES FOUND

#### 6. POST /api/v2/reminders
- **Status:** ⚠️ **MISSING - URL MISMATCH**
- **Test Expects:** `POST /api/v2/reminders` (with `leagueId` in request body)
- **Actual Endpoint:** `POST /api/leagues/:leagueId/reminders` (line 3628)
- **Issue:** Different URL structure - test expects `/api/v2/reminders` but backend uses `/api/leagues/:leagueId/reminders`
- **Impact:** Test will fail with 404 Not Found

**Test Request:**
```javascript
POST /api/v2/reminders
Body: {
  leagueId: "...",
  channelId: "...",
  text: "Set your lineup!",
  cron: "0 15 * * SAT"
}
```

**Actual Endpoint:**
```javascript
POST /api/leagues/:leagueId/reminders
Body: {
  channelId: "...",
  text: "...",
  cron: "..."
}
```

#### 7. GET /api/v2/reminders
- **Status:** ⚠️ **MISSING - URL MISMATCH**
- **Test Expects:** `GET /api/v2/reminders?leagueId={id}`
- **Actual Endpoint:** `GET /api/leagues/:leagueId/reminders` (line 3610)
- **Issue:** Different URL structure and parameter style
- **Impact:** Test will fail with 404 Not Found

**Test Request:**
```javascript
GET /api/v2/reminders?leagueId=...
```

**Actual Endpoint:**
```javascript
GET /api/leagues/:leagueId/reminders
```

#### 8. DELETE /api/v2/reminders/:id (Implicit)
- **Status:** ⚠️ **WRONG NAMESPACE**
- **Test Expects:** `DELETE /api/v2/reminders/:id` (not directly tested but likely expected)
- **Actual Endpoint:** `DELETE /api/reminders/:id` (line 3669)
- **Issue:** Missing `/v2/` namespace prefix
- **Impact:** Minor - test doesn't directly check this, but API inconsistency

---

### Test 08: RAG System

#### 9. POST /api/rag/index/:leagueId
- **Status:** ✅ **EXISTS**
- **Location:** `server/routes.ts:2949`
- **Implementation:** Index content for RAG search
- **Test Expectation:** Accepts content data and returns status 200/201

#### 10. POST /api/rag/search/:leagueId
- **Status:** ✅ **EXISTS**
- **Location:** `server/routes.ts:2969`
- **Implementation:** Search indexed content
- **Test Expectation:** Accepts query and returns status < 500

---

### Test 09: Polls System

#### 11. POST /api/v2/polls
- **Status:** ✅ **EXISTS**
- **Location:** `server/routes.ts:1826, 3451`
- **Implementation:** Create a new poll
- **Test Expectation:** Accepts poll data and returns status < 500
- **Note:** Endpoint exists in two places (likely duplicate at line 3451 for cache-busting)

#### GET /api/v2/polls (Not tested but mentioned in task)
- **Status:** ⚠️ **MISSING**
- **Actual Endpoint:** `GET /api/polls/:leagueId` (line 3322)
- **Issue:** Different URL structure - uses older `/api/polls/` instead of `/api/v2/polls`
- **Impact:** No test failure, but API inconsistency

---

### Test 10: Digest Preview

#### 12. POST /api/v2/digest/preview
- **Status:** ✅ **EXISTS**
- **Location:** `server/routes.ts:1675`
- **Implementation:** Preview digest with admin authentication
- **Test Expectation:** Requires `X-Admin-Key` header and `leagueId` query param

---

### Test 02: Demo Activation (Implicit)

#### 13. POST /api/app/demo/activate
- **Status:** ✅ **EXISTS**
- **Location:** `server/routes.ts:1850`
- **Implementation:** Activate demo mode
- **Test Expectation:** Activates demo and redirects to dashboard

---

## Issues Summary

### Critical Issues (Will cause test failures)

1. **POST /api/v2/reminders** - MISSING
   - Test expects: `POST /api/v2/reminders` with leagueId in body
   - Backend has: `POST /api/leagues/:leagueId/reminders` with leagueId in path
   - **Fix Required:** Add `/api/v2/reminders` endpoint or update test

2. **GET /api/v2/reminders** - MISSING
   - Test expects: `GET /api/v2/reminders?leagueId={id}`
   - Backend has: `GET /api/leagues/:leagueId/reminders`
   - **Fix Required:** Add `/api/v2/reminders` endpoint or update test

### Minor Issues (No test failures, but API inconsistency)

3. **GET /api/v2/polls** - Different namespace
   - Backend has: `GET /api/polls/:leagueId` (older style)
   - Expected: `GET /api/v2/polls?leagueId={id}` (v2 style)
   - **Impact:** API inconsistency between v1 and v2 namespaces

4. **DELETE /api/reminders/:id** - Missing v2 namespace
   - Backend has: `DELETE /api/reminders/:id`
   - Expected: `DELETE /api/v2/reminders/:id` (for consistency)
   - **Impact:** Minor namespace inconsistency

---

## Recommendations

### Option 1: Add Missing /api/v2/reminders Endpoints (Recommended)

Add these endpoints to `server/routes.ts` to match test expectations:

```typescript
// GET /api/v2/reminders?leagueId=...
app.get("/api/v2/reminders", async (req, res) => {
  const { leagueId } = req.query;
  const reminders = await storage.getReminders(leagueId as string);
  res.json({ ok: true, data: reminders });
});

// POST /api/v2/reminders
app.post("/api/v2/reminders", async (req, res) => {
  const { leagueId, channelId, text, cron } = req.body;
  const reminderData = insertReminderSchema.parse({ leagueId, channelId, text, cron });
  const reminder = await storage.createReminder(reminderData);
  res.status(201).json({ ok: true, data: reminder });
});

// DELETE /api/v2/reminders/:id
app.delete("/api/v2/reminders/:id", async (req, res) => {
  await storage.deleteReminder(req.params.id);
  res.json({ ok: true });
});
```

### Option 2: Update Tests to Match Existing Endpoints

Modify `qa/e2e.spec.ts` test 07 to use existing endpoints:

```javascript
// Change from:
POST /api/v2/reminders (with leagueId in body)
GET /api/v2/reminders?leagueId={id}

// To:
POST /api/leagues/{leagueId}/reminders
GET /api/leagues/{leagueId}/reminders
```

---

## Conclusion

**9 out of 12 endpoints are properly implemented and will pass tests.**

**2 critical endpoints are missing** (reminders GET/POST under `/api/v2/` namespace) which will cause test 07 to fail with 404 errors.

The recommended fix is **Option 1** - add the missing `/api/v2/reminders` endpoints to maintain the v2 API consistency and allow tests to pass without modification.

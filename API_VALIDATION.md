# API Endpoint Validation - THE COMMISH

This document provides comprehensive curl commands to validate all API endpoints with proper authentication and expected responses.

## Prerequisites

Set these environment variables for testing:
```bash
export BASE_URL="https://your-replit-domain.replit.app"
export ADMIN_KEY="your-admin-key-from-secrets"
export DISCORD_PUBLIC_KEY="your-discord-public-key"
export LEAGUE_ID="test-league-id"
```

## 1. Health Check Endpoints

### Health Status
```bash
# Test health endpoint
curl -X GET "$BASE_URL/api/health" \
  -H "Content-Type: application/json"

# Expected: 200 with health status
# Response: {
#   "status": "ok",
#   "timestamp": "2024-09-22T18:55:48.974Z",
#   "latency": 25,
#   "services": {
#     "database": "connected",
#     "deepseek": "healthy",
#     "discord": "configured",
#     "sleeper": "available",
#     "embeddings": "available"
#   },
#   "embeddings": {
#     "provider": "openai",
#     "model": "text-embedding-3-small",
#     "dimension": 1536
#   },
#   "performance": {
#     "database_latency": 12,
#     "total_latency": 25
#   }
# }
```

## 2. Admin Protected Endpoints

### Register Discord Commands (Admin Only)
```bash
# Success case - with valid admin key
curl -X POST "$BASE_URL/api/dev/register-commands" \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: $ADMIN_KEY" \
  -d '{"guildId": "123456789"}'

# Expected: 200 with command registration result
# Response: {"success": true, "message": "Registered X commands...", "commands": [...]}

# Error case - missing admin key
curl -X POST "$BASE_URL/api/dev/register-commands" \
  -H "Content-Type: application/json" \
  -d '{"guildId": "123456789"}'

# Expected: 401 Unauthorized
# Response: {"error": "Unauthorized"}

# Error case - invalid admin key
curl -X POST "$BASE_URL/api/dev/register-commands" \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: invalid-key" \
  -d '{"guildId": "123456789"}'

# Expected: 401 Unauthorized
# Response: {"error": "Unauthorized"}
```

### Manual Digest Generation (Admin Only)
```bash
# Success case - with valid admin key and league
curl -X POST "$BASE_URL/api/digest/run?leagueId=$LEAGUE_ID" \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: $ADMIN_KEY"

# Expected: 200 with digest content
# Response: {"message": "Digest generated successfully", "leagueId": "...", "digest": {...}}

# Error case - missing league ID
curl -X POST "$BASE_URL/api/digest/run" \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: $ADMIN_KEY"

# Expected: 400 Bad Request
# Response: {"error": "leagueId is required"}

# Error case - missing admin key
curl -X POST "$BASE_URL/api/digest/run?leagueId=$LEAGUE_ID" \
  -H "Content-Type: application/json"

# Expected: 401 Unauthorized
# Response: {"error": "Unauthorized - valid X-Admin-Key required"}

# Error case - league not found
curl -X POST "$BASE_URL/api/digest/run?leagueId=non-existent-league" \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: $ADMIN_KEY"

# Expected: 404 Not Found
# Response: {"error": "League not found"}
```

## 3. Discord OAuth Endpoints

### Generate Discord Auth URL
```bash
# Success case - with valid redirect URI
curl -X GET "$BASE_URL/api/discord/auth-url?redirectUri=https://example.com/callback&state=test-state" \
  -H "Content-Type: application/json"

# Expected: 200 with auth URL
# Response: {"authUrl": "https://discord.com/oauth2/authorize?..."}

# Error case - missing redirect URI
curl -X GET "$BASE_URL/api/discord/auth-url" \
  -H "Content-Type: application/json"

# Expected: 400 Bad Request
# Response: {"error": "redirectUri is required"}
```

### Generate Bot Install URL
```bash
# Success case - with valid guild ID and redirect URI
curl -X GET "$BASE_URL/api/discord/bot-install-url?guildId=123456789&redirectUri=https://example.com/callback" \
  -H "Content-Type: application/json"

# Expected: 200 with install URL
# Response: {"installUrl": "https://discord.com/oauth2/authorize?..."}

# Error case - missing parameters
curl -X GET "$BASE_URL/api/discord/bot-install-url?guildId=123456789" \
  -H "Content-Type: application/json"

# Expected: 400 Bad Request
# Response: {"error": "guildId and redirectUri are required"}
```

### Discord OAuth Callback
```bash
# Success case - with valid code and redirect URI
curl -X POST "$BASE_URL/api/discord/oauth-callback" \
  -H "Content-Type: application/json" \
  -d '{"code": "discord-oauth-code", "redirectUri": "https://example.com/callback"}'

# Expected: 200 with user data (if Discord code is valid)
# Response: {"user": {...}, "guilds": [...], "account": {...}}

# Error case - missing parameters
curl -X POST "$BASE_URL/api/discord/oauth-callback" \
  -H "Content-Type: application/json" \
  -d '{"code": "test-code"}'

# Expected: 400 Bad Request
# Response: {"error": "code and redirectUri are required"}
```

## 4. Discord Interactions Webhook

**Note:** This endpoint requires Ed25519 signature verification from Discord. Testing requires a real Discord interaction or signature generation tool.

```bash
# Mock Discord PING interaction (signature verification will fail without real Discord signature)
curl -X POST "$BASE_URL/api/discord/interactions" \
  -H "Content-Type: application/json" \
  -H "x-signature-ed25519: mock-signature" \
  -H "x-signature-timestamp: $(date +%s)" \
  --data-raw '{"type": 1}'

# Expected: 401 Unauthorized (signature verification fails)
# Response: {"error": "Invalid signature"}

# Error case - missing headers
curl -X POST "$BASE_URL/api/discord/interactions" \
  -H "Content-Type: application/json" \
  --data-raw '{"type": 1}'

# Expected: 401 Unauthorized
# Response: {"error": "Missing required headers"}
```

## 5. RAG (Retrieval-Augmented Generation) Endpoints

### Index Documents
```bash
# Success case - with valid content and version
curl -X POST "$BASE_URL/api/rag/index/$LEAGUE_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Test league constitution content",
    "version": "1.0",
    "type": "constitution"
  }'

# Expected: 200 with indexing result
# Response: {"documentId": "doc-uuid", "rulesIndexed": 5}

# Error case - missing required fields
curl -X POST "$BASE_URL/api/rag/index/$LEAGUE_ID" \
  -H "Content-Type: application/json" \
  -d '{"content": "Test content"}'

# Expected: 400 Bad Request
# Response: {"error": "content and version are required"}
```

### Search Rules
```bash
# Success case - with valid query
curl -X POST "$BASE_URL/api/rag/search/$LEAGUE_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "trade deadline",
    "limit": 5,
    "threshold": 0.7
  }'

# Expected: 200 with search results
# Response: [{
#   "ruleId": "rule-uuid",
#   "similarity": 0.85,
#   "rule": {
#     "text": "Trade deadline is week 10...",
#     "ruleKey": "trade_deadline",
#     "citations": [...],
#     "sectionId": "trades"
#   }
# }]

# Error case - missing query
curl -X POST "$BASE_URL/api/rag/search/$LEAGUE_ID" \
  -H "Content-Type: application/json" \
  -d '{}'

# Expected: 400 Bad Request
# Response: {"error": "query is required"}
```

### RAG Statistics
```bash
# Success case - get stats for league
curl -X GET "$BASE_URL/api/rag/stats/$LEAGUE_ID" \
  -H "Content-Type: application/json"

# Expected: 200 with statistics
# Response: {"totalRules": 25, "totalEmbeddings": 25, "indexedDocuments": 1}
```

## 6. League Management

### Get Leagues for Account
```bash
# Success case - get leagues for account
curl -X GET "$BASE_URL/api/leagues?accountId=account-uuid" \
  -H "Content-Type: application/json"

# Expected: 200 with leagues array
# Response: [{"id": "...", "name": "League Name", "sleeperLeagueId": "..."}]

# Error case - missing account ID
curl -X GET "$BASE_URL/api/leagues" \
  -H "Content-Type: application/json"

# Expected: 400 Bad Request
# Response: {"error": "accountId is required"}
```

### Create League
```bash
# Success case - create new league
curl -X POST "$BASE_URL/api/leagues" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test League",
    "sleeperLeagueId": "123456789",
    "accountId": "account-uuid"
  }'

# Expected: 200 with created league
# Response: {"id": "league-uuid", "league": {"id": "...", "name": "Test League", "sleeperLeagueId": "123456789"}}
```

## 7. Sleeper Integration

### Get Sleeper League Data
```bash
# Success case - get Sleeper league info
curl -X GET "$BASE_URL/api/sleeper/league/$LEAGUE_ID" \
  -H "Content-Type: application/json"

# Expected: 200 with Sleeper league object
# Response: {
#   "league_id": "123456789",
#   "name": "Fantasy League",
#   "status": "in_season",
#   "sport": "nfl",
#   "season": "2024",
#   "season_type": "regular",
#   "total_rosters": 12,
#   "scoring_settings": {...},
#   "roster_positions": [...],
#   "settings": {"trade_deadline": 10, "playoff_week_start": 15}
# }
```

### Sync Sleeper Data
```bash
# Success case - trigger Sleeper data sync
curl -X POST "$BASE_URL/api/sleeper/sync/$LEAGUE_ID" \
  -H "Content-Type: application/json"

# Expected: 200 with sync result
# Response: {"success": true, "latency": 250, "data": {"league": {...}, "rosters": [...]}}
```

### Get/Update/Delete Individual League
```bash
# Get specific league
curl -X GET "$BASE_URL/api/leagues/$LEAGUE_ID" \
  -H "Content-Type: application/json"

# Expected: 200 with league details
# Response: {"id": "...", "name": "League Name", "sleeperLeagueId": "..."}

# Update league
curl -X PUT "$BASE_URL/api/leagues/$LEAGUE_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated League Name",
    "timezone": "America/Los_Angeles"
  }'

# Expected: 200 with updated league
# Response: {"id": "...", "name": "Updated League Name", "timezone": "..."}

# Delete league
curl -X DELETE "$BASE_URL/api/leagues/$LEAGUE_ID" \
  -H "Content-Type: application/json"

# Expected: 200 with deletion confirmation
# Response: {"message": "League deleted successfully"}
```

## 8. Authentication Summary

### Endpoint Authentication Requirements

| Endpoint | Method | Authentication | Header | Notes |
|----------|--------|---------------|--------|-------|
| `/api/health` | GET | None | - | Public endpoint |
| `/api/discord/auth-url` | GET | None | - | Public endpoint |
| `/api/discord/bot-install-url` | GET | None | - | Public endpoint |
| `/api/discord/oauth-callback` | POST | Discord OAuth | - | Validates Discord code |
| `/api/discord/interactions` | POST | Ed25519 Signature | `x-signature-ed25519`, `x-signature-timestamp` | Discord webhook verification |
| `/api/dev/register-commands` | POST | Admin Key | `X-Admin-Key` | Admin only |
| `/api/digest/run` | POST | Admin Key | `X-Admin-Key` | Admin only |
| `/api/rag/index/:leagueId` | POST | None* | - | *Should have admin protection |
| `/api/rag/search/:leagueId` | POST | None | - | Public search |
| `/api/rag/stats/:leagueId` | GET | None | - | Public stats |
| `/api/leagues` | GET/POST | None | - | Public league management |
| `/api/leagues/:id` | GET/PUT/DELETE | None | - | Public league operations |
| `/api/sleeper/league/:leagueId` | GET | None | - | Public Sleeper data |
| `/api/sleeper/sync/:leagueId` | POST | None | - | Public sync trigger |

### Expected HTTP Status Codes

- **200 OK** - Successful request
- **400 Bad Request** - Missing required parameters or invalid input
- **401 Unauthorized** - Invalid or missing authentication
- **404 Not Found** - Resource not found (league, document, etc.)
- **500 Internal Server Error** - Server-side error

## 9. Security Recommendations

### ⚠️ Current Security Concerns

1. **RAG Indexing Protection**: `/api/rag/index/:leagueId` allows arbitrary content ingestion without authentication. Consider adding X-Admin-Key protection:

```bash
# Recommended: Add admin key validation
curl -X POST "$BASE_URL/api/rag/index/$LEAGUE_ID" \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: $ADMIN_KEY" \
  -d '{
    "content": "Protected league constitution content",
    "version": "1.0",
    "type": "constitution"
  }'
```

2. **Rate Limiting**: Consider implementing rate limiting for public endpoints
3. **CORS Configuration**: Ensure CORS headers are properly configured for frontend access

## 10. Testing Checklist

### ✅ Basic Functionality
- [ ] Health check returns database status
- [ ] Discord auth URLs generate correctly
- [ ] Admin endpoints reject requests without X-Admin-Key
- [ ] RAG endpoints handle indexing and search
- [ ] League management endpoints work correctly
- [ ] Sleeper integration fetches real data

### ✅ Authentication & Security
- [ ] Admin endpoints require valid X-Admin-Key header
- [ ] Discord interactions require valid signature
- [ ] Invalid authentication returns 401 status
- [ ] Missing parameters return 400 status

### ✅ Error Handling
- [ ] Invalid league IDs return 404
- [ ] Missing required fields return 400
- [ ] Server errors return 500 with error message
- [ ] All endpoints return JSON responses

### ✅ Production Readiness
- [ ] Environment validation prevents startup without required secrets
- [ ] Database connections are properly handled
- [ ] RAG system handles API failures gracefully
- [ ] Digest generation works with fallback content

## Notes

1. **Discord Interactions**: Real testing requires Discord webhook setup with valid signatures
2. **Environment Variables**: All secret values must be set in Replit Secrets or .env file
3. **League Management**: Full CRUD operations available for league management
4. **Sleeper Integration**: Real-time data sync with Sleeper fantasy football platform
5. **RAG System**: Semantic search over league documents with embedding-based similarity
6. **Admin Endpoints**: Properly protected with X-Admin-Key authentication
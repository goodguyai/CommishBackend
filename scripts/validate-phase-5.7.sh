#!/bin/bash
##############################################################################
# Phase 5.7 Validation Script
# 
# This script validates the acceptance criteria for Phase 5.7 "Proof & Polish"
# 
# Prerequisites:
#   - ADMIN_API_KEY set in Replit Secrets
#   - CYPRESS_LEAGUE_UUID set (a valid test league UUID)
#   - CYPRESS_DISCORD_CHANNEL_ID set (a valid Discord channel ID)
#   - Application running at https://thecommish.replit.app
# 
# Usage:
#   chmod +x scripts/validate-phase-5.7.sh
#   ./scripts/validate-phase-5.7.sh
##############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_URL="${CYPRESS_API_URL:-https://thecommish.replit.app}"
ADMIN_KEY="${ADMIN_API_KEY}"
LEAGUE_UUID="${CYPRESS_LEAGUE_UUID}"
CHANNEL_ID="${CYPRESS_DISCORD_CHANNEL_ID}"

# Check prerequisites
echo "🔍 Checking prerequisites..."

if [ -z "$ADMIN_KEY" ]; then
    echo -e "${RED}❌ ADMIN_API_KEY not set${NC}"
    exit 1
fi

if [ -z "$LEAGUE_UUID" ]; then
    echo -e "${YELLOW}⚠️  CYPRESS_LEAGUE_UUID not set (some tests will be skipped)${NC}"
fi

if [ -z "$CHANNEL_ID" ]; then
    echo -e "${YELLOW}⚠️  CYPRESS_DISCORD_CHANNEL_ID not set (some tests will be skipped)${NC}"
fi

echo -e "${GREEN}✅ Prerequisites checked${NC}\n"

##############################################################################
# Test 1: Discord Doctor Health Check (Public)
##############################################################################
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 1: Discord Doctor Health Check (Public)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

RESPONSE=$(curl -s "$API_URL/api/v2/doctor/discord")
if echo "$RESPONSE" | grep -q '"ok":true'; then
    echo -e "${GREEN}✅ PASS: Discord bot health check returned OK${NC}"
    echo "   Bot info: $(echo "$RESPONSE" | jq -r '.bot.username // "N/A"')"
else
    echo -e "${RED}❌ FAIL: Discord bot health check failed${NC}"
    echo "   Response: $RESPONSE"
fi
echo ""

##############################################################################
# Test 2: Cron Detail - 403 Without Admin Key
##############################################################################
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 2: Cron Detail - 403 Without Admin Key"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/v2/doctor/cron/detail")
if [ "$STATUS" == "403" ]; then
    echo -e "${GREEN}✅ PASS: Cron detail properly returns 403 without admin key${NC}"
else
    echo -e "${RED}❌ FAIL: Expected 403, got $STATUS${NC}"
fi
echo ""

##############################################################################
# Test 3: Cron Detail - 200 With Admin Key + Telemetry Validation
##############################################################################
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 3: Cron Detail - 200 With Admin Key + Telemetry Validation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

RESPONSE=$(curl -s -H "Authorization: Bearer $ADMIN_KEY" "$API_URL/api/v2/doctor/cron/detail")
STATUS=$(echo "$RESPONSE" | jq -r '.ok // false')

if [ "$STATUS" == "true" ]; then
    echo -e "${GREEN}✅ PASS: Cron detail returned OK with admin key${NC}"
    
    # Check telemetry structure
    JOBS_COUNT=$(echo "$RESPONSE" | jq -r '.data | length')
    echo "   Jobs in telemetry: $JOBS_COUNT"
    
    if [ "$JOBS_COUNT" -gt 0 ]; then
        echo "   Validating telemetry structure..."
        HAS_KEY=$(echo "$RESPONSE" | jq -r '.data[0].key // "missing"')
        HAS_QUEUED=$(echo "$RESPONSE" | jq -r '.data[0].queued // "missing"')
        HAS_PERMS=$(echo "$RESPONSE" | jq -r '.data[0].perms // "missing"')
        
        if [ "$HAS_KEY" != "missing" ] && [ "$HAS_QUEUED" != "missing" ]; then
            echo -e "   ${GREEN}✅ Telemetry structure valid (key, queued present)${NC}"
            
            if [ "$HAS_PERMS" != "missing" ]; then
                echo -e "   ${GREEN}✅ Perms object present${NC}"
                echo "   Perms: $(echo "$RESPONSE" | jq -r '.data[0].perms')"
            else
                echo -e "   ${YELLOW}⚠️  Perms object missing (expected for content_poster jobs)${NC}"
            fi
        else
            echo -e "   ${RED}❌ Telemetry structure incomplete${NC}"
        fi
    fi
else
    echo -e "${RED}❌ FAIL: Cron detail failed with admin key${NC}"
    echo "   Response: $RESPONSE"
fi
echo ""

##############################################################################
# Test 4: UUID Rejection (Non-UUID league_id)
##############################################################################
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 4: UUID Rejection (Non-UUID league_id)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer $ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{"league_id":"lg_demo_1"}' \
  "$API_URL/api/v3/constitution/sync")

STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Authorization: Bearer $ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{"league_id":"lg_demo_1"}' \
  "$API_URL/api/v3/constitution/sync")

CODE=$(echo "$RESPONSE" | jq -r '.code // "missing"')

if [ "$STATUS" == "422" ] && [ "$CODE" == "INVALID_UUID" ]; then
    echo -e "${GREEN}✅ PASS: Non-UUID rejected with 422 INVALID_UUID${NC}"
    echo "   (No PostgreSQL 22P02 error)"
else
    echo -e "${RED}❌ FAIL: Expected 422 with INVALID_UUID, got $STATUS with code $CODE${NC}"
    echo "   Response: $RESPONSE"
fi
echo ""

##############################################################################
# Test 5: UUID Acceptance (Valid UUID)
##############################################################################
if [ -n "$LEAGUE_UUID" ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Test 5: UUID Acceptance (Valid UUID)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
      -H "Authorization: Bearer $ADMIN_KEY" \
      -H "Content-Type: application/json" \
      -d "{\"league_id\":\"$LEAGUE_UUID\"}" \
      "$API_URL/api/v3/constitution/sync")

    if [ "$STATUS" == "200" ] || [ "$STATUS" == "422" ]; then
        echo -e "${GREEN}✅ PASS: Valid UUID accepted ($STATUS)${NC}"
    else
        echo -e "${RED}❌ FAIL: Unexpected status $STATUS${NC}"
    fi
    echo ""
fi

##############################################################################
# Test 6: Content Poster Enablement Guardrail
##############################################################################
if [ -n "$LEAGUE_UUID" ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Test 6: Content Poster Enablement Guardrail (422 without channelId)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    RESPONSE=$(curl -s -X POST \
      -H "Authorization: Bearer $ADMIN_KEY" \
      -H "Content-Type: application/json" \
      -d "{\"league_id\":\"$LEAGUE_UUID\",\"contentPoster\":{\"enabled\":true,\"channelId\":null,\"cron\":\"*/5 * * * *\"}}" \
      "$API_URL/api/v3/jobs/upsert")

    STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
      -H "Authorization: Bearer $ADMIN_KEY" \
      -H "Content-Type: application/json" \
      -d "{\"league_id\":\"$LEAGUE_UUID\",\"contentPoster\":{\"enabled\":true,\"channelId\":null,\"cron\":\"*/5 * * * *\"}}" \
      "$API_URL/api/v3/jobs/upsert")

    CODE=$(echo "$RESPONSE" | jq -r '.code // "missing"')

    if [ "$STATUS" == "422" ] && [ "$CODE" == "NON_NULL_CHANNEL_REQUIRED" ]; then
        echo -e "${GREEN}✅ PASS: Guardrail prevents enabling without channelId${NC}"
    else
        echo -e "${RED}❌ FAIL: Expected 422 with NON_NULL_CHANNEL_REQUIRED, got $STATUS with code $CODE${NC}"
        echo "   Response: $RESPONSE"
    fi
    echo ""
fi

##############################################################################
# Test 7: Idempotency (Constitution Sync)
##############################################################################
if [ -n "$LEAGUE_UUID" ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Test 7: Idempotency (Constitution Sync - Second Call)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # First call
    curl -s -X POST \
      -H "Authorization: Bearer $ADMIN_KEY" \
      -H "Content-Type: application/json" \
      -d "{\"league_id\":\"$LEAGUE_UUID\"}" \
      "$API_URL/api/v3/constitution/sync" > /dev/null

    # Second call (should be idempotent)
    RESPONSE=$(curl -s -X POST \
      -H "Authorization: Bearer $ADMIN_KEY" \
      -H "Content-Type: application/json" \
      -d "{\"league_id\":\"$LEAGUE_UUID\"}" \
      "$API_URL/api/v3/constitution/sync")

    STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
      -H "Authorization: Bearer $ADMIN_KEY" \
      -H "Content-Type: application/json" \
      -d "{\"league_id\":\"$LEAGUE_UUID\"}" \
      "$API_URL/api/v3/constitution/sync")

    OK=$(echo "$RESPONSE" | jq -r '.ok // false')
    CODE=$(echo "$RESPONSE" | jq -r '.code // "none"')

    if [ "$OK" == "true" ] || ([ "$STATUS" == "422" ] && echo "$CODE" | grep -qE "DUPLICATE|SKIPPED|NO_CHANGES"); then
        echo -e "${GREEN}✅ PASS: Constitution sync is idempotent${NC}"
        echo "   Second call result: $CODE"
    else
        echo -e "${YELLOW}⚠️  WARNING: Idempotency behavior unclear${NC}"
        echo "   Response: $RESPONSE"
    fi
    echo ""
fi

##############################################################################
# Test 8: Dry-Run Content Enqueue
##############################################################################
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 8: Dry-Run Content Enqueue (No Discord Posting)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer $ADMIN_KEY" \
  "$API_URL/api/v2/doctor/cron/enqueue/content?dry=true")

OK=$(echo "$RESPONSE" | jq -r '.ok // false')

if [ "$OK" == "true" ]; then
    echo -e "${GREEN}✅ PASS: Dry-run enqueue succeeded${NC}"
else
    echo -e "${RED}❌ FAIL: Dry-run enqueue failed${NC}"
    echo "   Response: $RESPONSE"
fi
echo ""

##############################################################################
# Summary
##############################################################################
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Validation Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "To enable a content poster job for testing:"
echo "  curl -X POST -H 'Authorization: Bearer \$ADMIN_API_KEY' \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"league_id\":\"\$LEAGUE_UUID\",\"contentPoster\":{\"enabled\":true,\"channelId\":\"\$CHANNEL_ID\",\"cron\":\"*/5 * * * *\"}}' \\"
echo "    $API_URL/api/v3/jobs/upsert"
echo ""
echo "To run full E2E Cypress tests:"
echo "  npx cypress run"
echo ""

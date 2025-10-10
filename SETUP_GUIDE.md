# THE COMMISH - Developer Setup Guide

## Quick Start (5 Minutes)

### 1. Clone & Install
```bash
git clone <repository-url>
cd thecommish
npm install
```

### 2. Environment Setup
```bash
cp .env.example .env
# Edit .env with your actual secrets (see below)
```

### 3. Database Setup
```bash
# Enable pgvector extension in your PostgreSQL database
# Then push schema:
npm run db:push
```

### 4. Start Development Server
```bash
npm run dev
# App runs on http://0.0.0.0:5000
```

---

## Required Secrets (Priority Order)

### ⚡ Critical (Must Have to Run)
1. **DATABASE_URL** - PostgreSQL connection string
   - Replit: Auto-provided when you create a database
   - Supabase: Get from Project Settings > Database
   - Format: `postgresql://user:pass@host:5432/dbname`

2. **DISCORD_TOKEN** - Bot token
   - Get from: https://discord.com/developers/applications
   - Go to: Your App > Bot > Token > "Reset Token"

3. **DISCORD_APPLICATION_ID** - Application ID
   - Get from: Your App > General Information > Application ID

4. **DISCORD_PUBLIC_KEY** - Ed25519 public key
   - Get from: Your App > General Information > Public Key

5. **SESSION_SECRET** - Session encryption key
   - Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### 🔑 Important (Needed for Full Features)
6. **ADMIN_API_KEY** - Admin endpoint access
   - Generate: `node -e "console.log('sk_admin_' + require('crypto').randomBytes(24).toString('hex'))"`
   - Used for `/api/v2/doctor/*` endpoints

7. **DEEPSEEK_API_KEY** - AI chat completions
   - Get from: https://platform.deepseek.com/api_keys
   - Used for: Q&A, weekly recaps

8. **OPENAI_API_KEY** - Text embeddings
   - Get from: https://platform.openai.com/api-keys
   - Used for: RAG semantic search

9. **DISCORD_CLIENT_ID** & **DISCORD_CLIENT_SECRET** - OAuth2
   - Get from: Your App > OAuth2 > Client Information
   - Used for: User login

### 🧪 Testing (Optional, but Recommended)
10. **CYPRESS_LEAGUE_UUID** - Test league UUID
    - Get from: Your database after creating a test league
    
11. **CYPRESS_DISCORD_CHANNEL_ID** - Test channel
    - Right-click Discord channel > Copy ID (Developer Mode must be on)

---

## Discord Bot Setup (Step-by-Step)

### 1. Create Discord Application
1. Go to https://discord.com/developers/applications
2. Click "New Application"
3. Name it "THE COMMISH" (or your preferred name)
4. Save the **Application ID** and **Public Key**

### 2. Create Bot User
1. Go to "Bot" section in left sidebar
2. Click "Add Bot"
3. Under "Token", click "Reset Token" and save it as **DISCORD_TOKEN**
4. Enable these "Privileged Gateway Intents":
   - ✅ SERVER MEMBERS INTENT
   - ✅ MESSAGE CONTENT INTENT

### 3. Set Bot Permissions
Under "Bot" > "Bot Permissions", select:
- ✅ Send Messages
- ✅ Embed Links
- ✅ Attach Files
- ✅ Read Message History
- ✅ Use Slash Commands
- ✅ Mention Everyone (for announcements)

### 4. Configure Interactions Endpoint
1. Go to "General Information"
2. Set "Interactions Endpoint URL": `https://thecommish.replit.app/api/discord/interactions`
3. Discord will verify this endpoint (make sure your app is running!)

### 5. Setup OAuth2
1. Go to "OAuth2" section
2. Add Redirect URI: `https://thecommish.replit.app/api/auth/discord/callback`
3. Save **Client ID** and **Client Secret**

### 6. Invite Bot to Your Server
Generate invite URL:
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_APPLICATION_ID&permissions=412317273088&scope=bot%20applications.commands
```
Replace `YOUR_APPLICATION_ID` with your actual application ID.

### 7. Register Slash Commands
After bot is in your server:
```bash
npm run discord:register
# This registers /commish, /poll, /meme commands
```

---

## Database Setup (Supabase)

### 1. Create Supabase Project
1. Go to https://supabase.com
2. Create new project
3. Wait for database to provision (~2 minutes)

### 2. Enable pgvector Extension
1. Go to Database > Extensions
2. Search for "vector"
3. Enable "vector" extension

### 3. Get Connection Details
Go to Project Settings > Database:
- Copy "Connection String" → **DATABASE_URL**
- Copy "Host" → **PGHOST**
- Copy "Database name" → **PGDATABASE**
- Copy "User" → **PGUSER**
- Copy "Port" → **PGPORT**
- Use your project password → **PGPASSWORD**

### 4. Push Schema
```bash
npm run db:push
# If schema conflicts: npm run db:push --force
```

---

## AI Services Setup

### DeepSeek (Chat Completions)
1. Go to https://platform.deepseek.com
2. Sign up / Log in
3. Go to API Keys
4. Create new key → **DEEPSEEK_API_KEY**
5. Add credits (minimum $5 recommended)

### OpenAI (Embeddings)
1. Go to https://platform.openai.com
2. Sign up / Log in
3. Go to API Keys
4. Create new key → **OPENAI_API_KEY**
5. Add credits (minimum $5 recommended)

---

## Testing Your Setup

### 1. Validation Script
```bash
chmod +x scripts/validate-phase-5.7.sh
./scripts/validate-phase-5.7.sh
```

Should see:
- ✅ Discord health check OK
- ✅ Admin endpoints protected
- ✅ UUID validation working

### 2. Cypress E2E Tests
```bash
npx cypress run
```

Should see:
- ✅ 20+ tests passing
- ✅ All v3 routes working
- ✅ Guards functioning

### 3. Golden League Check
```bash
tsx scripts/set-golden-league.ts
```

Should see:
- List of enabled content poster jobs
- Channel IDs and cron schedules

---

## Common Issues & Fixes

### ❌ "Failed to verify Discord signature"
**Fix:** Check that `DISCORD_PUBLIC_KEY` matches exactly from Discord Developer Portal.

### ❌ "column 'updated_at' does not exist"
**Fix:** Run `npm run db:push --force` to sync schema.

### ❌ "22P02: invalid input syntax for type uuid"
**Fix:** UUID guards should prevent this. Check that you're using valid UUIDs, not demo IDs like `lg_demo_1`.

### ❌ "403 Forbidden" on doctor endpoints
**Fix:** Include header: `Authorization: Bearer $ADMIN_API_KEY`

### ❌ "Cannot enable content poster without channelId"
**Fix:** This is expected! Include `channelId` in the request:
```bash
curl -X POST -H "Authorization: Bearer $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"league_id":"<uuid>","contentPoster":{"enabled":true,"channelId":"123456","cron":"*/5 * * * *"}}' \
  https://thecommish.replit.app/api/v3/jobs/upsert
```

### ❌ "Session secret must be at least 32 characters"
**Fix:** Generate a longer secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Architecture Quick Reference

### Tech Stack
- **Frontend:** React + TypeScript + Vite + Wouter + shadcn/ui
- **Backend:** Node.js + Express + TypeScript
- **Database:** PostgreSQL (Supabase) + Drizzle ORM + pgvector
- **AI:** DeepSeek (chat) + OpenAI (embeddings)
- **External APIs:** Discord, Sleeper

### Key Directories
```
/client          → React frontend
/server          → Express backend
/shared          → Shared types and schemas
/cypress         → E2E tests
/scripts         → Utility scripts
```

### Important Files
- `shared/schema.ts` → Database schema (Drizzle)
- `server/routes.ts` → API routes
- `server/middleware/leagueIdGuard.ts` → UUID validation
- `replit.md` → Project documentation
- `.env.example` → All environment variables

### API Structure
- **v3 routes:** Use `league_id` in **body/query** (not path)
- **v2 routes:** Admin-only, require `ADMIN_API_KEY`
- **Legacy routes:** Still use `leagueId` in body

---

## Next Steps After Setup

1. ✅ Create a test league in the UI
2. ✅ Connect it to a Discord server
3. ✅ Upload a league constitution (PDF or paste text)
4. ✅ Enable a content poster job for testing
5. ✅ Test slash commands in Discord: `/commish help`
6. ✅ Run validation script to confirm all systems operational

---

## Support & Documentation

- **Full API Docs:** See `replit.md` → API Structure & Routing
- **E2E Testing Guide:** See `E2E_README.md`
- **Phase 5.7 Summary:** See `PHASE_5.7_SUMMARY.md`
- **Database Migrations:** Always use `npm run db:push` (never manual SQL)

---

## Production Deployment Checklist

Before going live:

- [ ] All secrets set in Replit Secrets (not .env file)
- [ ] Database schema pushed (`npm run db:push`)
- [ ] Discord slash commands registered
- [ ] Interactions endpoint verified by Discord
- [ ] Admin API key secured
- [ ] Validation tests passing
- [ ] Cypress tests passing
- [ ] At least one test league configured
- [ ] Content poster tested with dry-run
- [ ] Rate limits and cooldowns configured

---

## Emergency Contacts & Resources

- **Discord API Docs:** https://discord.com/developers/docs
- **Sleeper API Docs:** https://docs.sleeper.com
- **DeepSeek Docs:** https://platform.deepseek.com/docs
- **Supabase Docs:** https://supabase.com/docs
- **Drizzle ORM Docs:** https://orm.drizzle.team

---

**Welcome to THE COMMISH! Happy coding! 🏈🤖**

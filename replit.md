# THE COMMISH - Fantasy Football Discord Bot

## Overview
THE COMMISH is an AI-powered Discord bot for fantasy football leagues, integrated with the Sleeper platform. It acts as a commissioner assistant, handling rule inquiries, tracking deadlines, and generating automated digests. The system includes a React frontend for management and a Node.js backend for Discord interactions, leveraging RAG capabilities with DeepSeek LLM for intelligent responses to league constitution questions. Key capabilities include an advanced reminder system, enhanced rules indexing with versioning, improved RAG semantic search, quick polls, auto-meme feature, Sleeper↔Constitution sync with reversible drafts, controlled announcements with guardrails, and AI-powered Q&A and weekly recaps. The project aims to provide a comprehensive, intelligent assistant to streamline fantasy football league management.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend uses React with TypeScript, Vite, and shadcn/ui components built on Radix UI, styled with Tailwind CSS. It features a comprehensive dark theme with high-contrast design, utilizing a specific color palette and a token system for semantic color mapping. The dashboard is designed for league administration, displaying top stats, integration statuses, available slash commands, RAG system status, and AI Assistant metrics. All pages maintain consistent dark styling and interactive elements provide toast feedback.

### Technical Implementations
- **Frontend**: React, TypeScript, Vite, Wouter (routing), TanStack Query (server state), Zustand (client state).
- **Backend**: Node.js with Express, TypeScript, employing a modular, service-oriented pattern for Discord, Sleeper, DeepSeek LLM, and RAG functionalities, with Zod validation for API routes.
- **Database**: PostgreSQL with Drizzle ORM and pgvector extension for vector storage, hosted on Supabase. All tables use server-generated UUID defaults.
- **Discord Integration**: Handles Ed25519 signature verification, slash commands, OAuth2, and component interactions, with a health check endpoint for validation.
- **AI/RAG System**: Processes league constitutions, uses OpenAI for text embeddings, DeepSeek LLM for chat completions, and pgvector for similarity search, featuring passage-scoped extraction and confidence thresholds.
- **Sleeper Integration**: Read-only integration with Sleeper's public API for league data, with in-memory caching and scheduled sync jobs.
- **Scheduling System**: `node-cron` for timezone-aware scheduling of weekly digests, data synchronization, and event-driven operations, including reminders and engagement features with idempotent job guards.
- **Core Features**: Constitution upload/pasting with automatic indexing and versioning, quick polls, and an auto-meme feature. Session management is secure, utilizing PostgreSQL-backed `express-session` with HttpOnly cookies. Account and user management support demo and beta modes with automatic account creation during onboarding.

### System Design Choices
- **Event-Driven Architecture**: Utilizes a custom EventBus for asynchronous operations.
- **Feature Flags**: Supports per-league configuration of bot features.
- **Demo Mode**: Includes development endpoints to bypass authentication for testing.
- **Robust Error Handling**: Comprehensive error handling and event logging.
- **Scalability**: Designed for future enhancements like retry logic and advanced API integrations.
- **Developer Tools**: Provides admin utility endpoints and a developer dashboard section.
- **Reliability Hardening**: Includes Discord Snowflake auditing, idempotency keys (SHA-256 hashing for announcements, settings_hash for constitution drafts), and standardized error responses.
- **Job Observability**: Detailed cron job metadata, cleanup preview endpoint, and content poster defaults for seeding leagues.
- **UX Refinement**: Simplified dashboard, dedicated pages for reminders, moderation, and content studio, and announcement rate limiting with proper HTTP 429 responses.
- **Constitution Drafts**: Reversible proposal system for syncing Sleeper settings to league constitution with apply/reject workflow.
- **Safety Infrastructure**: Token-bucket rate limiter, exponential backoff retry logic, and enhanced idempotency guards.
- **Controlled Announcements**: Guardrailed @everyone announcements with cooldowns and role-based permissions.
- **AI Q&A**: DeepSeek function-calling with RAG for intelligent rule explanations and setting lookups.
- **AI Recaps**: Automated weekly recap generation using league matchup data and standings.
- **UUID Guards (Phase 5.5-5.6)**: Middleware-based UUID validation preventing 22P02 PostgreSQL errors, with demo mode hard-wall separation and 422 error responses for invalid league IDs. Guards protect 8 v2/legacy routes (leagueId param) and 9 v3 routes (league_id param) including constitution sync/drafts/apply/reject, features, and jobs endpoints. Doctor telemetry includes perms object (channel/bot status), dry-run enqueue endpoint for testing, and guardrails preventing contentPoster enablement without channelId.

## API Structure & Routing

### v3 API Routes (Body/Query Parameters)
All v3 routes use `league_id` in **request body or query parameters**, not path parameters. This design choice enables consistent UUID validation via middleware without path-based routing complexity.

**Constitution Management:**
- `POST /api/v3/constitution/sync` - Sync Sleeper settings to constitution (body: `league_id`)
- `GET /api/v3/constitution/drafts?league_id=` - List pending constitution drafts
- `GET /api/v3/constitution/draft/:id` - Get specific draft by ID
- `POST /api/v3/constitution/apply` - Apply pending draft (body: `league_id`, `draft_id`)
- `POST /api/v3/constitution/reject` - Reject pending draft (body: `league_id`, `draft_id`)

**Feature & Job Management:**
- `GET /api/v3/features?league_id=` - Get league features
- `POST /api/v3/features` - Update league features (body: `league_id`, `features`)
- `GET /api/v3/jobs?league_id=` - List all jobs for league
- `POST /api/v3/jobs/upsert` - Create/update job (body: `league_id`, job config)
- `POST /api/v3/jobs/run-now` - Manually trigger job execution (body: `job_id`)
- `GET /api/v3/jobs/history?league_id=&kind=` - Job execution history
- `GET /api/v3/jobs/failures?league_id=` - Job failure details

**AI & Analytics:**
- `POST /api/v3/rules/ask` - AI-powered constitution Q&A (body: `league_id`, `question`)
- `GET /api/v3/reactions/stats?league_id=` - Reaction statistics

### v2 Doctor & Admin Routes (Admin Key Required)
- `GET /api/v2/doctor/discord` - Discord bot health check (public)
- `GET /api/v2/doctor/cron/detail` - Cron job telemetry with perms object (requires `Authorization: Bearer <ADMIN_API_KEY>`)
- `POST /api/v2/doctor/cron/enqueue/content?dry=true|false` - Test content poster (requires admin key)

### Legacy Announcement Routes
- `POST /api/announce/preview` - Preview announcement without sending
- `POST /api/announce/send` - Send announcement with cooldown protection (body: `leagueId`, `guildId`, `channelId`, `text`)

### Example API Usage
```bash
# Enable content poster for one league
curl -X POST -H "Authorization: Bearer $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"league_id":"uuid-here","contentPoster":{"enabled":true,"channelId":"123","cron":"*/5 * * * *"}}' \
  https://thecommish.replit.app/api/v3/jobs/upsert

# Get cron telemetry
curl -H "Authorization: Bearer $ADMIN_API_KEY" \
  https://thecommish.replit.app/api/v2/doctor/cron/detail

# Sync constitution (idempotent)
curl -X POST -H "Authorization: Bearer $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"league_id":"uuid-here"}' \
  https://thecommish.replit.app/api/v3/constitution/sync
```

## External Dependencies

### Database & Storage
- **Supabase Database**: Managed PostgreSQL hosting with pgvector.
- **Drizzle ORM**: Type-safe database operations.

### AI & Language Models
- **DeepSeek API**: LLM for chat completions and function calling.
- **OpenAI API**: For text embeddings (text-embedding-ada-002).

### Third-Party APIs
- **Discord API**: Bot interactions, OAuth2, slash commands.
- **Sleeper API**: Fantasy football league data retrieval.

### Development & Runtime
- **Replit Reserved VM**: Production hosting.
- **Vite**: Development server and build tooling.
- **Node.js**: Server runtime.

### Authentication & Security
- **Discord OAuth2**: User authentication.
- **TweetNaCl**: Ed25519 signature verification.

### UI & Styling
- **Radix UI**: Accessible component primitives.
- **Tailwind CSS**: Utility-first styling.
- **Lucide React**: Icon library.
- **shadcn/ui**: Pre-built component library.

### Utilities & Libraries
- **Zod**: Runtime type validation.
- **date-fns**: Date manipulation.
- **node-cron**: Job scheduling.
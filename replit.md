# THE COMMISH - Fantasy Football Discord Bot

## Overview
THE COMMISH is an AI-powered Discord bot for fantasy football leagues, integrated with the Sleeper platform. It acts as a commissioner assistant, answering rule inquiries, tracking deadlines, and generating automated digests. The system includes a React frontend for management and a Node.js backend for Discord interactions, leveraging RAG capabilities with DeepSeek LLM for intelligent responses to league constitution questions. Key features include an advanced reminder system, enhanced rules indexing with versioning, improved RAG semantic search, quick polls, and an auto-meme feature for blowout games. The project aims to provide a comprehensive, intelligent assistant to streamline fantasy football league management.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes

**Phase 1 Co-Commissioner Features (October 2025):**
- **Owner Mapping System**: Dashboard UI for mapping Discord users to Sleeper team owners
  - Interactive table showing Discord↔Sleeper mappings
  - "Map Owner" dialog for creating/updating mappings
  - Consolidated members table with owner_mappings as compatibility view
  - API: GET/POST /api/leagues/:id/members

- **Reminder Management**: Automated reminder scheduling and configuration
  - Visual reminder cards with enable/disable toggles
  - Create/edit/delete reminders via UI
  - Support for reminder types: lineup_lock, waivers, trade_deadline, bye_week, custom
  - Cron-based scheduling with timezone support
  - API: GET/POST /api/leagues/:id/reminders, PATCH/DELETE /api/reminders/:id

- **League Settings Panel**: Centralized configuration UI
  - Tone preference (Professional, Casual, Roast Mode)
  - Timezone selection
  - Feature flag toggles (auto-digest, polls, trade-insights)
  - API: PATCH /api/leagues/:id/settings

- **Database Schema Updates**: Migration 0005_co_commish_phase1.sql
  - Added tables: reminders, votes, sentiment_logs, trade_insights
  - Enhanced members table with discordUsername field
  - Enhanced polls table with anonymous and status fields
  - Migrated owner_mappings to view for backward compatibility

- **Demo/Testing Endpoints**: Development-only endpoints for testing without auth
  - GET /api/demo/leagues - fetch all leagues
  - GET /api/demo/leagues/:id - fetch single league

**Dashboard Redesign (October 2025):**
- **League Management Focus**: Dashboard redesigned from team management to league administration focus
- **Top Stats**: Active Leagues (0), Rules Queries (127), Upcoming Deadlines (5), AI Tokens Used (2.1K)
- **Discord Integration Card**: Shows bot status, permissions, slash commands registration, webhook verification
- **Sleeper Integration Card**: Displays league info, season/week data, sync status, cache status, API usage
- **Available Slash Commands**: Grid of 6 Discord commands (/rules, /deadlines, /scoring, /config, /remind, /help) with access badges
- **RAG System Status**: Constitution version, sections, embeddings, vector dimensions, recent queries, reindex button
- **AI Assistant (DeepSeek)**: Model info, request metrics, response times, cache hit rates, token usage with progress bar
- **Recent Activity Log**: System events with timestamps (Sleeper sync, command execution, digest generation, reindexing)

**Phase 2 - Dispute Prevention & Vibes Monitor (October 2025):**
- **Database Schema**: Migration 0006_phase2_disputes_vibes.sql
  - sentiment_logs: Message toxicity/sentiment tracking
  - mod_actions: Moderation action logging
  - disputes: Dispute management with status workflow (open→under_review→resolved/dismissed)
  - trade_evaluations: Trade fairness evaluations with unique constraint per league/trade
- **Services**: VibesService (sentiment scoring), ModerationService (thread freeze, rule clarification), TradeFairnessService (trade evaluation)
- **API Endpoints (v2)**: 
  - POST /api/v2/vibes/score - Score message toxicity
  - POST /api/v2/mod/freeze - Freeze thread
  - POST /api/v2/mod/clarify-rule - Post rule clarification
  - POST /api/v2/disputes - Create dispute
  - PATCH /api/v2/disputes/:id - Update dispute
  - POST /api/v2/trades/evaluate - Evaluate trade fairness
  - GET /api/v2/disputes - List disputes with filtering
- **Discord Integration**:
  - Toxicity monitoring with automated commissioner DM alerts (feature flag: vibesMonitor)
  - Slash commands: /freeze, /clarify, /trade_fairness
  - Interactive button handlers for toxicity alerts
- **Dashboard UI**: Vibes Monitor (threshold slider, alert preferences), Disputes list (status tabs, resolution modal), Trade Fairness Snapshot (search by trade ID), Moderation Tools (freeze thread, clarify rule forms)

**Phase 3 - Engagement Engine (October 2025):**
- **Database Schema**: Migration 0007_phase3_engagement.sql
  - highlights: Weekly highlight moments (comeback, blowout, bench_tragedy, top_scorer)
  - rivalries: Head-to-head tracking with canonicalized team ordering
  - content_queue: Scheduled Discord post queue with status tracking
- **Services**: HighlightsService (compute highlights, idempotent), RivalriesService (canonicalized rivalry tracking), ContentService (enqueue, rate-limited posting)
- **API Endpoints (v2)**:
  - POST /api/v2/highlights/compute - Compute week highlights
  - GET /api/v2/highlights - List highlights
  - POST /api/v2/rivalries/update - Update rivalry records
  - GET /api/v2/rivalries - List rivalries
  - POST /api/v2/content/enqueue - Queue content for posting
  - GET /api/v2/content/queue - List queued content
  - POST /api/v2/content/run - Admin endpoint to post queued content
- **Scheduler Extensions**:
  - Sunday 8 PM: Enqueue digest + highlights (league timezone)
  - Monday 9 AM: Enqueue rivalry cards (league timezone)
  - Every 5 minutes: Post queued content (UTC, rate-limited)
  - Idempotent job guards prevent duplicate cron tasks
- **Dashboard UI**: Highlights tab (week picker, highlight cards with badges), Rivalries dashboard (top matchups, rubber match badges), Content Queue admin table (status filtering, re-enqueue), Feature toggles (creativeTrashTalk, deepStats, highlights, rivalries)

## System Architecture

### UI/UX Decisions
The frontend uses React with TypeScript, Vite, and shadcn/ui components built on Radix UI, styled with Tailwind CSS. It features a comprehensive dark theme with high-contrast design:

**Dark Theme System (October 2025):**
- **Color Palette**: Near-black backgrounds (#050607-#111820), white text (#F5F7FA), deep shadows for depth
- **Brand Colors**: Teal (#009898), Coral (#FF5F82), Gold (#FFC75F), Pink (#FF4D6D)
- **Design Tokens**: Complete token system in tokens.json/tokens.css with semantic color mapping
- **Components**: All UI components (Card, Table, Button, Input) use explicit dark backgrounds with design token references
- **Shadows**: Multi-layered depth system (shadow-depth1, shadow-depth2) with inset highlights for 3D effect
- **Contrast**: White text on dark surfaces ensures high accessibility and readability
- **Pages**: All 11 pages rebuilt with consistent dark styling (Dashboard, Waivers, Trades, Matchups, Reports, Rules, Chat, Settings, Terminal, AppShell)

**Dashboard Redesign (October 2025):**
- **League Management Focus**: Dashboard redesigned from team management to league administration focus
- **Top Stats**: Active Leagues (0), Rules Queries (127), Upcoming Deadlines (5), AI Tokens Used (2.1K)
- **Discord Integration Card**: Shows bot status, permissions, slash commands registration, webhook verification
- **Sleeper Integration Card**: Displays league info, season/week data, sync status, cache status, API usage
- **Available Slash Commands**: Grid of 6 Discord commands (/rules, /deadlines, /scoring, /config, /remind, /help) with access badges
- **RAG System Status**: Constitution version, sections, embeddings, vector dimensions, recent queries, reindex button
- **AI Assistant (DeepSeek)**: Model info, request metrics, response times, cache hit rates, token usage with progress bar
- **Recent Activity Log**: System events with timestamps (Sleeper sync, command execution, digest generation, reindexing)

**Interactive Elements (October 2025):**
- **Mobile Navigation**: Drawer auto-closes on navigation, dark theme styling, no white border
- **Dashboard Cards**: All stat cards and integration cards fully interactive with toast feedback
- **Waivers**: Add to queue, simulate results buttons functional
- **Trades**: Create offer, propose, review buttons functional
- **Reports**: Generate, download, share buttons with toast notifications
- **Rules**: Add rule, edit buttons with toast feedback
- **Chat**: Send messages with Enter key support, empty message validation
- **Settings**: Persona selection and notification toggles with toast confirmations
- **Toast System**: Consistent feedback using sonner library across all interactive elements

### Technical Implementations
- **Frontend**: React, TypeScript, Vite, Wouter (routing), TanStack Query (server state), Zustand (client state). Dashboard features owner mapping, reminder management, and league settings with TanStack Query state management.
- **Backend**: Node.js with Express, TypeScript. Modular service-oriented pattern for Discord, Sleeper, DeepSeek LLM, and RAG functionalities. Phase 2/3 v2 API routes with Zod validation, commissioner auth, and event emissions.
- **Database**: PostgreSQL with Drizzle ORM and pgvector extension for vector storage. Supabase is used for managed hosting.
- **Discord Integration**: Ed25519 signature verification, slash commands, OAuth2, component interactions.
- **AI/RAG System**: Processes league constitutions, uses OpenAI for text embeddings, DeepSeek LLM for chat completions and function calling, and pgvector for similarity search. Features passage-scoped extraction, configurable top-k results, and confidence thresholds.
- **Sleeper Integration**: Read-only integration with Sleeper's public API for league data, rosters, and matchups, with in-memory caching and scheduled sync jobs.
- **Scheduling System**: node-cron for weekly digests, data synchronization, and event-driven operations. Includes timezone-aware reminder scheduling with multi-interval support and feature toggles. Phase 3 engagement scheduler (highlights, rivalries, content posting) with idempotent job guards and timezone-aware cron expressions.
- **Features**: Constitution upload/pasting with automatic indexing and versioning, quick polls with Discord integration, and an auto-meme feature triggered by blowout game scores.

### System Design Choices
- **Event-Driven Architecture**: Custom EventBus for asynchronous operations and system events.
- **Feature Flags**: Per-league configuration for bot features.
- **Demo Mode**: Development endpoints (`/api/demo/*`) bypass authentication for UI testing and development workflows.
- **Robust Error Handling**: Comprehensive error handling and event logging throughout the system.
- **Scalability**: Designed for potential future enhancements like retry logic for transient failures and more advanced Sleeper API integrations.
- **Developer Tools**: Includes admin utility endpoints and a developer dashboard section for command registration, test messages, and log access.

## External Dependencies

### Database & Storage
- **Supabase Database**: Managed PostgreSQL hosting with pgvector extension.
- **Drizzle ORM**: Type-safe database operations.

### AI & Language Models
- **DeepSeek API**: LLM for chat completions and function calling.
- **OpenAI API**: For text embeddings (text-embedding-ada-002 model).

### Third-Party APIs
- **Discord API**: Bot interactions, OAuth2, slash commands.
- **Sleeper API**: Fantasy football league data retrieval.

### Development & Runtime
- **Replit Reserved VM**: Production hosting.
- **Vite**: Development server and build tooling.
- **Node.js**: Server runtime.

### Authentication & Security
- **Discord OAuth2**: User authentication.
- **TweetNaCl**: Ed25519 signature verification for Discord webhooks.

### UI & Styling
- **Radix UI**: Accessible component primitives.
- **Tailwind CSS**: Utility-first styling.
- **Lucide React**: Icon library.
- **shadcn/ui**: Pre-built component library.

### Utilities & Libraries
- **Zod**: Runtime type validation.
- **date-fns**: Date manipulation.
- **node-cron**: Job scheduling.
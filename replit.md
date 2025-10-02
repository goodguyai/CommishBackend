# THE COMMISH - Fantasy Football Discord Bot

## Overview

THE COMMISH is a Discord bot designed for fantasy football leagues, primarily integrated with the Sleeper platform. The application serves as an AI-powered commissioner assistant that helps league members with rule inquiries, deadline tracking, and automated digest generation. Built as a full-stack web application with a React frontend for management and a Node.js backend that handles Discord interactions, the system uses advanced RAG (Retrieval-Augmented Generation) capabilities powered by DeepSeek LLM to provide intelligent responses to league constitution questions.

## Recent Changes (October 1, 2025)

### Backend Enhancements
- **Activation Endpoint**: Added POST /api/setup/activate for final league activation after setup wizard completion
- **Admin Utilities Endpoints**: 
  - POST /api/discord/register-commands - Register slash commands to a specific Discord guild
  - POST /api/discord/post-test - Post test message to verify bot connectivity
- **Owner Management Endpoints**: GET /api/owners and POST /api/owners/map (stubbed, requires schema extension for full Sleeper integration)
- **Scheduler Event Handlers**: Implemented digest_due and sync_due handlers with Discord message posting and Sleeper data synchronization
  - Added Discord embed length protection (4096 char limit) and ISO8601 timestamp formatting
  - Comprehensive error handling and event logging

### Frontend Features
- **Developer Utilities Dashboard Section**: Added utility buttons for admin/debug operations
  - Register Commands: Deploy slash commands to Discord guilds
  - Post Test Message: Verify bot connectivity with test embeds
  - View Logs: Quick access to application logs
  - Health Check: Open system health status endpoint
  - Interactive UI with admin key prompts and guildId inputs

### Discord Integration
- **New Slash Command**: /whoami - Shows user's league profile and role
  - Displays member info, role (Commissioner/Manager), and Discord linkage
  - Hardened with guards for missing league and user validation

### Reminder System (October 1, 2025)
- **Scheduler Methods**: Added timezone-aware reminder scheduling with multi-interval support (24h, 1h before deadlines)
- **Event Handler**: `reminder_due` event sends Discord embeds with per-league feature flag checks
- **Feature Toggles**: Per-league reminders for lineup lock, waiver, trade deadline (default enabled)
- **Automatic Scheduling**: Integrated with Sleeper sync - automatically schedules reminders after data sync
- **Timezone Support**: All reminders respect league.timezone setting
- **Smart Logic**: Skips reminders less than 1h away, schedules 24h reminder only if deadline is 24+ hours away

### Rules Indexing Enhancements (October 1, 2025)
- **Setup Wizard Constitution Step**: Added optional constitution upload step between Sleeper connection and final activation
- **Paste Text Interface**: Users can paste league constitution text directly into a textarea during onboarding
- **Automatic Indexing**: Constitution text is automatically parsed and indexed using existing RAG system with SHA-256 caching
- **Version Tracking**: Documents are versioned (starting at "1.0.0") for tracking changes over time
- **Optional Flow**: Users can skip constitution upload and add it later from dashboard
- **Character Counter**: Real-time character count display for pasted text
- **Smart Parsing**: System handles both structured JSON and plain text constitutions with automatic section detection

### RAG Semantic Search Improvements (October 1, 2025)
- **Passage-Scoped Extraction**: New algorithm extracts most relevant passages from rules based on query terms
  - Sentence-level scoring matching query terms
  - Context inclusion (surrounding sentences for better understanding)
  - Smart passage truncation (max 300 chars per passage)
  - Multiple passage support (up to 2 per rule by default)
- **Enhanced EmbeddingResult Interface**: Added optional `passages` field containing extracted relevant text snippets
- **Configurable Top-K**: Already supported via `limit` parameter (default 5), now better documented
- **Confidence Threshold**: Already supported via `threshold` parameter (default 0.7), applied at vector search level
- **API Enhancement**: POST /api/rag/search/:leagueId now accepts `includePassages` parameter (defaults to true)
- **Graceful Fallbacks**: If no query terms match, returns beginning of rule text as fallback passage

### Quick Polls Feature (October 1, 2025)
- **Database Schema**: polls table with leagueId, question, options (JSONB), discordMessageId, createdBy, expiresAt
- **API Endpoints**: 
  - GET /api/polls/:leagueId - Retrieve all polls for a league
  - POST /api/polls - Create poll and post to Discord with emoji reactions
- **Discord Integration**: Posts embeds with numbered emoji reactions (1️⃣-🔟) for voting
- **Dashboard UI**: QuickPollForm component with dynamic options (2-10), validation, toast notifications
- **Error Handling**: Graceful Discord posting failures, comprehensive validation

### Auto-Meme Feature (October 1, 2025)
- **Feature Toggle**: leagues.featureFlags.autoMeme (default false)
- **Blowout Detection**: Analyzes matchup scores during digest generation
- **Threshold**: Score difference ≥ 40 points triggers meme posting
- **Meme Library**: Randomized humorous messages about blowout games
- **Integration**: Runs after weekly digest, posts to Discord channel
- **Safety**: Non-fatal errors (meme failures don't affect digest)
- **Event Logging**: Tracks auto_meme_posted events with score differences

### Known Limitations
- Owner mapping endpoints require schema extension (sleeperOwnerId, sleeperTeamName fields on members table)
- Scheduler handlers lack retry logic for transient failures (acceptable for MVP)
- Admin key authentication via browser prompt (acceptable for internal dev tools)
- **Sleeper Deadline Population**: Sleeper API provides trade_deadline as week numbers; converting to precise timestamps requires NFL schedule mapping (enhancement opportunity for full waiver/trade deadline automation)
- **Poll Results**: No vote counting or results retrieval (future enhancement)
- **Poll Expiry**: No automatic cleanup for expired polls (future enhancement)

## Recent Changes (October 2, 2025)

### Demo UI Implementation
Built a fully functional demo interface powered by MSW (Mock Service Worker) while awaiting CDN infrastructure fixes:

**Infrastructure & State Management**
- **MSW Mock API**: Comprehensive mock data fixtures for leagues, rosters, matchups, trades, waivers, and injuries
- **Service Worker**: Initialized MSW service worker (`client/public/mockServiceWorker.js`) to intercept API requests
- **Zustand Store**: Client-side state management for leagues, persona selection, waiver queue, and notifications
- **Feature Flags**: MOCK_MODE toggle in `client/src/lib/config.ts` to switch between mock and real APIs

**UI Component Library**
- **12+ Reusable Components**: Button, Card, Table, Dialog, Toast, Tabs, Drawer, Tooltip, Input, Badge, Skeleton, EmptyState
- **Design System**: Clean, friendly UX with light neutrals (#f9fafb), teal accent (#009898), and gold (#FFB100)
- **Tailwind Styling**: Utility-first CSS with consistent spacing and typography

**Routing & Pages**
- **Wouter Integration**: Fixed nested route handling for /app/* subpaths with startsWith() checks
- **11 Page Components**: Landing, Onboarding, Dashboard, Waivers, Trades, Matchups, Reports, Rules, Chat, Settings, Terminal
- **AppShell Layout**: Consistent sidebar navigation with active state indicators and collapsible menu

**Data Integration**
- **TanStack Query**: All pages fetch data from MSW handlers via useQuery hooks
- **Type Safety**: Fixed handler/component type mismatches (fairness → fairnessScore)
- **Loading States**: Skeleton loaders display during data fetching
- **Error Handling**: Graceful fallbacks for empty states and failed requests

**Testing & Validation**
- **E2E Test Suite**: Playwright tests verify all user flows (landing → dashboard, sidebar navigation, data hydration)
- **Test Coverage**: Verified landing page, persona selection, waiver queue, trade opportunities, settings
- **Data-Testid**: Comprehensive test identifiers for all interactive elements

**Known Issues**
- **CDN Blocker**: Replit CDN intercepts parameterized /api/* routes before Express (escalation package ready)
- **Workaround**: MSW provides fully functional demo while awaiting infrastructure fix
- **Future Work**: Centralize shared typings, add automated tests for waiver/trade interactions

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The client uses React with TypeScript, built on Vite for development and bundling. The UI is constructed with shadcn/ui components built on Radix UI primitives, styled with Tailwind CSS using a dark theme by default. State management is handled through TanStack Query (React Query) for server state and local React state for UI interactions. The application uses Wouter for client-side routing and implements a responsive design with mobile-first considerations.

### Backend Architecture
The server runs on Node.js with Express, utilizing TypeScript throughout. The architecture follows a modular service-oriented pattern with clear separation of concerns:

- **API Layer**: Express routes handle HTTP requests, Discord OAuth2 flows, and webhook interactions
- **Service Layer**: Distinct services for Discord interactions, Sleeper API integration, DeepSeek LLM communication, and RAG functionality
- **Storage Layer**: Drizzle ORM with PostgreSQL (Supabase) for data persistence
- **Event System**: Custom EventBus for handling asynchronous operations and system events
- **Scheduler**: Node-cron based job scheduling for digest generation and data synchronization

### Database Design
Uses PostgreSQL with Drizzle ORM, featuring:
- **Core entities**: accounts, leagues, members, documents, rules, facts, deadlines, events
- **Vector storage**: pgvector extension for embedding-based similarity search
- **Audit trail**: Comprehensive event logging with request tracking and latency metrics
- **Feature flags**: Per-league configuration for enabling/disabling bot features

### Discord Integration
Implements Discord's interaction model with:
- **Ed25519 signature verification** for secure webhook handling
- **Slash commands** with deferred responses to meet the 3-second response requirement
- **OAuth2 flow** with bot scope for server installation
- **Component interactions** including channel selection for bot configuration

### AI/RAG System
The RAG (Retrieval-Augmented Generation) system processes league constitutions:
- **Document processing**: Stores original and normalized versions of league rules
- **Vector embeddings**: Uses OpenAI's text-embedding-ada-002 for semantic search
- **LLM integration**: DeepSeek chat completions API with function calling support
- **Similarity search**: Cosine similarity search through pgvector for relevant rule retrieval

### Sleeper Integration
Read-only integration with Sleeper's public API:
- **League data**: Fetches league information, rosters, and matchup data
- **Caching strategy**: In-memory caching with TTL to reduce API calls
- **Sync jobs**: Scheduled updates to keep data current

### Scheduling System
Built-in job scheduler using node-cron:
- **Weekly digests**: Configurable digest generation per league timezone
- **Data synchronization**: Regular Sleeper data updates
- **Event-driven**: Integrates with the EventBus for reactive operations

## External Dependencies

### Database & Storage
- **Supabase Database**: Managed PostgreSQL hosting with pgvector extension via Transaction Pooler (IPv4-compatible endpoint)
- **Drizzle ORM**: Type-safe database operations and migrations
- **Connection**: Uses Supabase's Supavisor pooler (`aws-0-*.pooler.supabase.com:6543`) for IPv4 compatibility on Replit

### AI & Language Models
- **DeepSeek API**: Primary LLM provider for chat completions and function calling
- **OpenAI API**: Used for text embeddings (text-embedding-ada-002 model)

### Third-Party APIs
- **Discord API**: Bot interactions, OAuth2, slash commands, and server management
- **Sleeper API**: Fantasy football league data retrieval (public endpoints)

### Development & Runtime
- **Replit Reserved VM**: Production hosting environment with always-on HTTPS
- **Vite**: Development server and build tooling with HMR support
- **Node.js**: Server runtime with ES modules

### Authentication & Security
- **Discord OAuth2**: User authentication and server authorization
- **TweetNaCl**: Ed25519 signature verification for Discord webhooks
- **Express sessions**: Session management with PostgreSQL store

### UI & Styling
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first styling framework
- **Lucide React**: Icon library
- **shadcn/ui**: Pre-built component library

### Utilities & Libraries
- **Zod**: Runtime type validation and schema definition
- **date-fns**: Date manipulation and formatting
- **node-cron**: Job scheduling and task automation
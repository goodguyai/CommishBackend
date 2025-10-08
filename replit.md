# THE COMMISH - Fantasy Football Discord Bot

## Overview
THE COMMISH is an AI-powered Discord bot for fantasy football leagues, integrated with the Sleeper platform. It serves as a commissioner assistant, handling rule inquiries, tracking deadlines, and generating automated digests. The system includes a React frontend for management and a Node.js backend for Discord interactions, leveraging RAG capabilities with DeepSeek LLM for intelligent responses to league constitution questions. Key capabilities include an advanced reminder system, enhanced rules indexing with versioning, improved RAG semantic search, quick polls, auto-meme feature, Sleeper↔Constitution sync with reversible drafts, controlled announcements with guardrails, and AI-powered Q&A and weekly recaps. The project provides a comprehensive, intelligent assistant to streamline fantasy football league management.

## Recent Changes (October 2025)

### System Rebuild - Phases 1-2 Complete (October 8, 2025)
**Environment Doctor & Setup Wizard**: Comprehensive health monitoring and streamlined 3-stage onboarding flow.

#### Phase 1: Environment Doctor (Complete)
- **Health Check Suite**: 6 diagnostic endpoints at `/api/v2/doctor/*` (status, discord, sleeper, database, cron, secrets)
- **Read-Only Architecture**: All checks use non-destructive validation with consistent JSON envelope format
- **Admin Protection**: Secured with ADMIN_API_KEY for internal/development use
- **Integration Points**: Discord REST endpoints, Sleeper API validation, database connectivity, cron job status

#### Phase 2: Setup Wizard (Complete)
- **Resumable 3-Step Flow**: Account verification → Discord/Sleeper connections → Team assignments
- **12 New /api/v2 Endpoints**: Complete wizard state management with idempotent operations
  - Setup: `/state`, `/advance`
  - Discord: `/guilds`, `/channels`, `/select`, `/verify`
  - Sleeper: `/lookup`, `/leagues`, `/select`, `/verify`
  - Assignments: `/bootstrap`, `/commit`
- **Frontend Implementation**: Setup.tsx wizard page with stage progression and setupApi.ts React Query client
- **Schema Hardening**: Added updatedAt timestamps to accounts/members, unique constraint on leagues.guildId

### Phase 13 Features (October 2025)
- **Constitution Drafts**: Reversible proposal system for syncing Sleeper settings to league constitution with apply/reject workflow
- **Safety Infrastructure**: Token-bucket rate limiter, exponential backoff retry logic, and enhanced idempotency guards
- **Controlled Announcements**: Guardrailed @everyone announcements with cooldowns and role-based permissions
- **AI Q&A**: DeepSeek function-calling with RAG for intelligent rule explanations and setting lookups
- **AI Recaps**: Automated weekly recap generation using league matchup data and standings
- **Frontend Pages**: ConstitutionDrafts, AutomationReactions, AutomationAnnouncements, AIAsk, AIRecaps

### Bug Fixes (October 7-8, 2025)
- **Phase 2 Authentication Bug**: Fixed critical authentication field mismatch - changed all Phase 2 wizard endpoints from `req.user?.id` to `req.supabaseUser?.id` to align with requireSupabaseAuth middleware contract (6 endpoints affected)
- **Phase 13 Routing**: Added all 5 Phase 13 pages (AI Ask, AI Recaps, Automation Announcements/Reactions, Constitution Drafts) to App.tsx routing system for proper accessibility
- **Discord Channel Dropdowns**: Fixed API response property mismatch in Dashboard - changed from `.data` to `.channels` to match actual API contract
- **Sleeper Sync**: Migrated SleeperLinkPage from localStorage to useAppStore() for consistent league ID management across pages
- **Error Handling**: Enhanced backend diagnostic logging in Sleeper setup endpoint while maintaining backward-compatible error responses
- **Non-blocking Operations**: Event logging and initial roster sync now properly wrapped in try-catch to prevent blocking setup flow
- **Announcement Service Refactor**: Migrated announceService from discord.js Client to DiscordService REST API while preserving all guardrails (idempotency checks, rate limiting, retry logic, operation marking)
- **Forgot Password Feature**: Created /forgot-password page with Supabase resetPasswordForEmail integration, proper error/success handling, and seamless navigation with login page
- **Sleeper Integration Unlinking**: Added comprehensive unlink functionality with DELETE endpoint, UI button, and proper error handling for removing Sleeper integrations
- **Change League Button**: Fixed SleeperLinkPage "Change League" button to properly show search form (set searchTriggered to true instead of false)
- **Database Constraint Handling**: Enhanced Sleeper link setup to detect and handle unique constraint violations on (sleeperLeagueId, season) with clear 409 error messages requiring explicit unlinking before re-linking
- **Mutation Error Handling**: Fixed unlink mutation to properly validate response.ok and result.ok, ensuring failed operations show error toasts instead of false success messages

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend uses React with TypeScript, Vite, and shadcn/ui components built on Radix UI, styled with Tailwind CSS. It features a comprehensive dark theme with high-contrast design, utilizing a specific color palette for backgrounds, text, and brand elements, with a complete token system for semantic color mapping. The dashboard is designed for league administration, displaying top stats, Discord and Sleeper integration status, available slash commands, RAG system status, and AI Assistant metrics. All pages maintain consistent dark styling and interactive elements provide toast feedback for user actions.

### Technical Implementations
- **Frontend**: React, TypeScript, Vite, Wouter (routing), TanStack Query (server state), Zustand (client state). Features owner mapping, reminder management, and league settings.
- **Backend**: Node.js with Express, TypeScript. Employs a modular, service-oriented pattern for Discord, Sleeper, DeepSeek LLM, and RAG functionalities, with Zod validation for API routes.
- **Database**: PostgreSQL with Drizzle ORM and pgvector extension for vector storage, hosted on Supabase. All tables use server-generated UUID defaults via `gen_random_uuid()`.
- **Discord Integration**: Handles Ed25519 signature verification, slash commands, OAuth2, and component interactions. Bot installation flow opens in new tab with auto-retry on window focus. Includes health check endpoint (`/api/v2/doctor/discord`) for validating Discord setup.
- **AI/RAG System**: Processes league constitutions, uses OpenAI for text embeddings, DeepSeek LLM for chat completions, and pgvector for similarity search, featuring passage-scoped extraction and confidence thresholds.
- **Sleeper Integration**: Read-only integration with Sleeper's public API for league data, with in-memory caching and scheduled sync jobs.
- **Scheduling System**: `node-cron` for timezone-aware scheduling of weekly digests, data synchronization, and event-driven operations, including reminders and engagement features with idempotent job guards.
- **Features**: Constitution upload/pasting with automatic indexing and versioning, quick polls, and an auto-meme feature. Session management is secure, utilizing PostgreSQL-backed `express-session` with HttpOnly cookies. Account and user management support demo and beta modes with automatic account creation during onboarding.

### System Design Choices
- **Event-Driven Architecture**: Utilizes a custom EventBus for asynchronous operations.
- **Feature Flags**: Supports per-league configuration of bot features.
- **Demo Mode**: Includes development endpoints to bypass authentication for testing.
- **Robust Error Handling**: Comprehensive error handling and event logging.
- **Scalability**: Designed for future enhancements like retry logic and advanced API integrations.
- **Developer Tools**: Provides admin utility endpoints and a developer dashboard section.

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
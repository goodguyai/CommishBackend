# THE COMMISH - Fantasy Football Discord Bot

## Overview
THE COMMISH is an AI-powered Discord bot for fantasy football leagues, integrated with the Sleeper platform. It serves as a commissioner assistant, handling rule inquiries, tracking deadlines, and generating automated digests. The system includes a React frontend for management and a Node.js backend for Discord interactions, leveraging RAG capabilities with DeepSeek LLM for intelligent responses to league constitution questions. Key capabilities include an advanced reminder system, enhanced rules indexing with versioning, improved RAG semantic search, quick polls, auto-meme feature, Sleeper↔Constitution sync with reversible drafts, controlled announcements with guardrails, and AI-powered Q&A and weekly recaps. The project provides a comprehensive, intelligent assistant to streamline fantasy football league management.

## Recent Changes (Phase 13 - October 2025)
**Constitution Sync & Safety Enhancements**: Added reversible Sleeper→Constitution sync, rate-limiting, retry logic, controlled announcements, and AI function-calling for Q&A and recaps.

### Phase 13 Features
- **Constitution Drafts**: Reversible proposal system for syncing Sleeper settings to league constitution with apply/reject workflow
- **Safety Infrastructure**: Token-bucket rate limiter, exponential backoff retry logic, and enhanced idempotency guards
- **Controlled Announcements**: Guardrailed @everyone announcements with cooldowns and role-based permissions
- **AI Q&A**: DeepSeek function-calling with RAG for intelligent rule explanations and setting lookups
- **AI Recaps**: Automated weekly recap generation using league matchup data and standings
- **Frontend Pages**: ConstitutionDrafts, AutomationReactions, AutomationAnnouncements, AIAsk, AIRecaps

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
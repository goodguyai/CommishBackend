# THE COMMISH - Fantasy Football Discord Bot

## Overview
THE COMMISH is an AI-powered Discord bot for fantasy football leagues, integrated with the Sleeper platform. It acts as a commissioner assistant, answering rule inquiries, tracking deadlines, and generating automated digests. The system includes a React frontend for management and a Node.js backend for Discord interactions, leveraging RAG capabilities with DeepSeek LLM for intelligent responses to league constitution questions. Key features include an advanced reminder system, enhanced rules indexing with versioning, improved RAG semantic search, quick polls, and an auto-meme feature for blowout games. The project aims to provide a comprehensive, intelligent assistant to streamline fantasy football league management.

## User Preferences
Preferred communication style: Simple, everyday language.

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

### Technical Implementations
- **Frontend**: React, TypeScript, Vite, Wouter (routing), TanStack Query (server state), Zustand (client state).
- **Backend**: Node.js with Express, TypeScript. Modular service-oriented pattern for Discord, Sleeper, DeepSeek LLM, and RAG functionalities.
- **Database**: PostgreSQL with Drizzle ORM and pgvector extension for vector storage. Supabase is used for managed hosting.
- **Discord Integration**: Ed25519 signature verification, slash commands, OAuth2, component interactions.
- **AI/RAG System**: Processes league constitutions, uses OpenAI for text embeddings, DeepSeek LLM for chat completions and function calling, and pgvector for similarity search. Features passage-scoped extraction, configurable top-k results, and confidence thresholds.
- **Sleeper Integration**: Read-only integration with Sleeper's public API for league data, rosters, and matchups, with in-memory caching and scheduled sync jobs.
- **Scheduling System**: node-cron for weekly digests, data synchronization, and event-driven operations. Includes timezone-aware reminder scheduling with multi-interval support and feature toggles.
- **Features**: Constitution upload/pasting with automatic indexing and versioning, quick polls with Discord integration, and an auto-meme feature triggered by blowout game scores.

### System Design Choices
- **Event-Driven Architecture**: Custom EventBus for asynchronous operations and system events.
- **Feature Flags**: Per-league configuration for bot features.
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
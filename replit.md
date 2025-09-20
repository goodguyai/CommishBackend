# THE COMMISH - Fantasy Football Discord Bot

## Overview

THE COMMISH is a Discord bot designed for fantasy football leagues, primarily integrated with the Sleeper platform. The application serves as an AI-powered commissioner assistant that helps league members with rule inquiries, deadline tracking, and automated digest generation. Built as a full-stack web application with a React frontend for management and a Node.js backend that handles Discord interactions, the system uses advanced RAG (Retrieval-Augmented Generation) capabilities powered by DeepSeek LLM to provide intelligent responses to league constitution questions.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The client uses React with TypeScript, built on Vite for development and bundling. The UI is constructed with shadcn/ui components built on Radix UI primitives, styled with Tailwind CSS using a dark theme by default. State management is handled through TanStack Query (React Query) for server state and local React state for UI interactions. The application uses Wouter for client-side routing and implements a responsive design with mobile-first considerations.

### Backend Architecture
The server runs on Node.js with Express, utilizing TypeScript throughout. The architecture follows a modular service-oriented pattern with clear separation of concerns:

- **API Layer**: Express routes handle HTTP requests, Discord OAuth2 flows, and webhook interactions
- **Service Layer**: Distinct services for Discord interactions, Sleeper API integration, DeepSeek LLM communication, and RAG functionality
- **Storage Layer**: Drizzle ORM with PostgreSQL (Neon) for data persistence
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
- **Neon Database**: Managed PostgreSQL hosting with pgvector extension
- **Drizzle ORM**: Type-safe database operations and migrations

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
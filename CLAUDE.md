# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Primary Commands
- `npm run dev` - Start development server with hot reload on port 3000
- `npm run build` - Build application for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint code linting
- `npm run test` - Run all Jest tests
- `npm run test:watch` - Run tests in watch mode during development
- `npm run test:coverage` - Run tests with coverage report
- `npm run type-check` - Run TypeScript type checking without emitting files

### Database Commands
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database with test data
- `npm run db:setup` - Run both migrate and seed (full database setup)
- `npm run db:health` - Check database connection health

### Environment Commands
- `npm run setup:env` - Create environment file from template
- `npm run validate:env` - Validate environment variables
- `npm run setup` - Complete setup (environment + database)

## Architecture Overview

This is a Next.js 15 legal AI application with PostgreSQL backend and Google Gemini AI integration for Chinese legal document search and consultation.

### Core Architecture Pattern
- **Frontend**: Next.js App Router with React 19, Bootstrap UI
- **Backend**: Next.js API routes with Node.js runtime
- **Database**: PostgreSQL with vector extension for semantic search
- **AI**: Google Gemini models (Flash/Pro) for embeddings and text generation
- **Auth**: Custom OIDC implementation with Google/GitHub OAuth

### Key Services
- `AuthService` (`src/lib/auth-service.ts`): JWT-based authentication with OIDC providers
- `DatabaseService` (`src/lib/database-new.ts`): Vector search, user management, conversation tracking
- `GeminiService` (`src/lib/gemini.ts`): AI embeddings, search keywords, legal answers, consultant chat
- `Middleware` (`src/middleware.ts`): Route protection and authentication checks

### Database Schema
- `users` - User accounts with role-based access (admin/free/pay/vip)
- `documents` - Legal documents with vector embeddings for similarity search
- `user_credits` - Token-based usage tracking
- `search_history`, `qa_history` - User interaction logs
- `consultant_conversations`, `consultant_messages` - Chat conversation storage

### AI Features
1. **Legal Search**: Vector similarity search using Gemini embeddings
2. **Legal Q&A**: Question answering with document context
3. **Legal Consultant**: Interactive chat with function calling for knowledge base search

## Development Guidelines

### Authentication Flow
- OAuth redirect → token exchange → user creation/update → JWT generation
- Fallback to temporary users if database fails
- Middleware handles route protection with cookie-based tokens

### AI Integration Patterns
- All AI functions return `{ result, tokenCount }` for usage tracking
- Vector search uses cosine similarity with PostgreSQL vector extension
- Conversation history maintained in database for context continuity

### Error Handling
- Database operations include fallback strategies for temporary users
- AI operations have comprehensive error logging and user-friendly messages
- Middleware gracefully handles authentication failures

### Testing Strategy
- Unit tests in `__tests__` directories within feature folders
- Integration tests in root `tests/` directory
- Database, auth, and AI service mocking for reliable tests

## Environment Requirements

Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `GEMINI_API_KEY` - Google AI API key for embeddings and text generation
- `JWT_SECRET` - Minimum 32 characters for token signing
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - Google OAuth
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` - GitHub OAuth

## Common Development Patterns

### API Route Structure
```typescript
// Authentication verification
const session = await getSessionFromRequest(request);
if (!session) return unauthorized();

// Token availability check
const hasTokens = await checkTokenAvailability(session, estimatedTokens);
if (!hasTokens) return insufficientTokens();

// Business logic
const result = await someOperation();

// Token usage tracking
await updateTokenUsage(session, 'feature', actualTokens);
```

### Vector Search Pattern
```typescript
const { embedding } = await generateEmbedding(query);
const documents = await searchDocuments(embedding, limit, filter);
const answer = await generateLegalAnswer(question, documents);
```

### Chat Conversation Pattern
```typescript
const conversationId = await saveConversation(session, id, messages, title, tokens);
const response = await generateConsultantChatResponse(formattedMessages, useProModel);
```
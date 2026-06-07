# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Frodo is a full-stack CMS for managing custom content types, posts, pages, and files.

- **Backend**: Express.js + MongoDB (Mongoose) + Passport (session-based auth)
- **Frontend**: Angular 22 (standalone components) + Angular Material
- **Docker**: Separate dev/prod configurations

## Commands

### Backend (root)
```bash
npm start          # Run Express server on port 3000
npm run watch      # Nodemon dev server (watches server/ and app.js)
```

### Frontend (`front/` directory)
```bash
npm start          # ng serve — dev server on port 4200, proxied to :3000
ng build           # Production build → front/public/ (served by Express)
ng test            # Unit tests via Vitest
```

### Docker
```bash
./dev.sh up -d          # Dev environment (MongoDB + app on ports 3000, 3002)
docker compose up -d    # Production build and run
```

### Single test
```bash
cd front && ng test --include='**/path/to/spec.ts'
```

## Architecture

### Backend (`server/`)

| Layer | Path | Role |
|-------|------|------|
| Entry | `app.js` | Express setup, sessions, Passport, route mounting |
| Models | `server/models/` | Mongoose schemas: User, Post, PostType, Page, Component, File, Counter |
| Controllers | `server/controllers/` | Business logic — one file per resource |
| Routes | `server/routes/` | Thin route files that delegate to controllers |

API routes are prefixed `/api/*`. Static uploads served from `/uploads`, exports from `/export`.

**PostType** is central — it defines the field schema for Post documents. When editing or creating a Post, the frontend fetches its PostType to know which dynamic fields to render.

### Frontend (`front/src/app/`)

| Directory | Purpose |
|-----------|---------|
| `core/` | Singleton services (HTTP wrappers), auth guard, credentials interceptor, route resolvers |
| `features/` | Feature modules: `auth`, `posts`, `post-types`, `pages`, `components`, `files`, `listing`, `error` |
| `shared/` | Directives (`infinite-scroll`, `img-loaded`), pipes (`bytes`), field models |
| `layout/` | Header + Sidenav shell (Material Design) |

All Angular components are **standalone** (no NgModules). Routing is configured in `app.routes.ts` with lazy-loaded feature routes and data resolvers.

### Data flow

1. Angular service → `HttpClient` → `/api/*`
2. Express route → controller → Mongoose model → MongoDB
3. Auth: `credentials.interceptor.ts` attaches session cookies; Passport Local validates on the backend
4. File uploads: `multer` on the backend → stored in the configured `uploadsPath`

### Configuration

`config.json` (or `config.dev.json` in dev) at the project root:
```json
{
  "mongoUrl": "...",
  "uploadsPath": "...",
  "sessionSecret": "...",
  "user": { "login": "...", "password": "..." }
}
```

The frontend proxy (`front/proxy.conf.json`) forwards `/api`, `/uploads`, `/user`, and `/export` to `http://localhost:3000`.

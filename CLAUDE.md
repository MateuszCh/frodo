# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Frodo is a full-stack CMS for managing custom content types, posts, pages, and files.

- **Backend**: Express.js + MongoDB (Mongoose) + Passport (session-based auth)
- **Frontend**: Angular 22 (standalone components) + Angular Material
- **Docker**: Separate dev/prod configurations

## Commands

> **Never start a server.** Do not run `npm start`, `npm run watch`, `ng serve`,
> `./dev.sh up`, `docker compose up`, or any other long-running/dev-server command.
> The user runs servers themselves — if one is needed, ask them to start it
> (e.g. by typing `! npm run watch`) and wait. Commands listed below are reference
> for the user, not an invitation to execute them.
>
> One-shot commands that terminate on their own (`ng build`, `ng test`, `npm run lint`)
> are fine.

### Backend (root)
```bash
npm start          # Run Express server on port 3000
npm run watch      # Nodemon dev server (watches server/ and app.js)
npm test           # Backend unit tests (node:test, server/**/*.test.js, no database)
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

### Deploy (MyDevil)

Run by the user on the server, in the clone the domain runs from — never by Claude: it
restarts the production CMS. The same flow as in geosilesia:
```bash
npm run deploy    # deploy.sh: git pull --ff-only, root npm install --omit=dev, front deps, ng build, devil www restart <deployDomain>
```
- Needs `deployDomain` in the server's `config.json` (the domain as `devil www list` shows it);
  without it the script stops before installing anything. `node` on the server must be a
  version Angular 22 accepts (the Dockerfile uses 24.16).
- Front dependencies: `npm ci` once `front/package-lock.json` is in the repository, `npm install`
  while it is gitignored. Geosilesia keeps its lockfile in git: unpinned, `@angular/build` 22.2
  pulled `sass-embedded`, which hung the build on the server.
- The build goes to `tmp/front-build` and replaces `front/public` only once it has succeeded, so a
  failed build leaves the running CMS as it was. The restart always comes after the build;
  sessions live in MongoDB, so nobody is logged out.
- The script pulls first (`--ff-only`: a clone with its own commits stops there) and then runs
  again as the pulled version, so changes to `deploy.sh` itself apply in the same deploy.
- `config.json`, `uploads/` (`uploadsPath`) and `exports/` are gitignored and outside the build —
  `git pull` and the script never touch them.

On a server with Docker instead: `git pull && docker compose up -d --build`.

### Single test
```bash
cd front && ng test --include='**/path/to/spec.ts'
```

## Architecture

### Backend (`server/`)

| Layer | Path | Role |
|-------|------|------|
| Entry | `app.js` | Express setup, sessions, Passport, route mounting |
| Models | `server/models/` | Mongoose schemas: User, Post, PostType, Page, Component, File, Counter, Settings |
| Controllers | `server/controllers/` | Business logic — one file per resource |
| Routes | `server/routes/` | Thin route files that delegate to controllers |

API routes are prefixed `/api/*`. Static uploads served from `/uploads`. Exports are written
to `exports/` (gitignored) by `server/exports.js`, which also serves that folder alone at
`/export`, to logged-in users only; `/api/export*` needs a login too. Write any new export
through `writeExport`: the project root holds `config.json` and must never be served.

**PostType** is central — it defines the field schema for Post documents. When editing or creating a Post, the frontend fetches its PostType to know which dynamic fields to render.

**Page types** live in the single Settings document (`_id: "settings"`), each with its own fields.
A page stores the key in `type` and the values of that type's fields in `typeData`; its
components stay in `rows[i].data`. `server/page-types.js` holds the rules: the server checks
the key and keeps only the type's fields in `typeData` on create, edit and import, and a key
that pages use cannot be removed or renamed. Page saves and settings saves run through
`withPageTypeLock`, which serialises them only within one process — the CMS runs as one.

A **component** field type nests a component: its value has the shape of a page row,
`{ type, title, data }` (`shared/component-value.ts`). Nested control names are joined with
`.` (`list.0.item.heading`), which field ids cannot clash with.

A **post** field type picks posts of one post type: the field stores its key in `postType`
(required by the server, in repeater rows too), and its value is `{ ids: number[] }` (numeric
post ids in the chosen order) or `null`. The key is the link, so `server/post-type-usage.js`
refuses to rename or remove a post type that a post field of another schema uses. An import of
posts keeps each post's exported `id` when no post has it (`saveImport` with `keepIds`), so
the ids still point to the same posts on another site.

### Frontend (`front/src/app/`)

| Directory | Purpose |
|-----------|---------|
| `core/` | Singleton services (HTTP wrappers), auth guard, credentials interceptor, route resolvers |
| `features/` | Feature modules: `auth`, `posts`, `post-types`, `pages`, `fields`, `files`, `listing`, `settings`, `error` |
| `shared/` | Directives (`infinite-scroll`, `img-loaded`), pipes (`bytes`), small helpers |
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
`deployDomain` is read only by `npm run deploy` (see Deploy).

### Public site cache (geosilesia)

After every successful write to pages, posts, post types or files (imports included)
`server/content-version.js` increments `version` in the `meta` collection, document
`{ _id: "content" }`. The public site (geosilesia) reads the same database, polls that
counter every few seconds in each of its processes and drops its cached pages and
server-rendered HTML when it changes. A failed bump is only logged – the site then
refreshes after its cache TTL.

The frontend proxy (`front/proxy.conf.json`) forwards `/api`, `/uploads`, `/user`, and `/export` to `http://localhost:3000`.

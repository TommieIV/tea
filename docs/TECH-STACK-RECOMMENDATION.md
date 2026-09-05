# TEA Technical Stack Recommendation

## Status

The v0.1 decisions in this document were confirmed on 2026-09-03 and form the implemented platform-shell foundation. Future modules may refine the stack only where their requirements justify it.

## Recommended Stack

| Area | Recommendation |
|---|---|
| Frontend | React + TypeScript + Vite |
| Routing | React Router |
| UI | Tailwind CSS + shadcn/ui |
| PWA | `vite-plugin-pwa` using Workbox |
| Backend | Supabase |
| Database | PostgreSQL |
| Authentication | Supabase Auth |
| Authorization | PostgreSQL Row-Level Security plus server-side permission checks |
| Validation | Zod |
| Testing | Vitest + React Testing Library + Playwright |
| Deployment | Cloudflare Pages or Vercel for the frontend; Supabase for backend services |
| Package manager | npm initially, since the repository already has an npm lockfile |

## Why This Fits TEA

- Vite provides a small, straightforward client application and supports route-level code splitting.
- React's ecosystem fits a responsive application shell containing many independently loaded modules.
- `vite-plugin-pwa` can generate the web app manifest and service worker while leaving room for more intentional caching later.
- Supabase provides authentication, PostgreSQL, storage, migrations, local development, and server-side functions without requiring TEA to begin with a custom API server.
- PostgreSQL Row-Level Security can enforce workspace separation at the database boundary.
- Supabase Auth and Row-Level Security can be combined for browser-to-database authorization.
- The core data remains relatively portable because it lives in PostgreSQL rather than a proprietary document database.

Useful references:

- [Vite PWA documentation](https://vite-pwa-org.netlify.app/guide/)
- [Supabase Row-Level Security documentation](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase API security guidance](https://supabase.com/docs/guides/api/securing-your-api)

## Proposed Initial Project Structure

```text
src/
├── app/                  # Startup, router, and providers
├── core/
│   ├── auth/
│   ├── workspaces/
│   ├── permissions/
│   ├── modules/
│   ├── navigation/
│   ├── pwa/
│   └── ui/
├── modules/
│   └── example/
│       ├── manifest.ts
│       ├── routes.tsx
│       ├── components/
│       ├── data/
│       └── README.md
└── shared/

supabase/
├── migrations/
├── seed.sql
├── functions/
└── tests/
```

Core should contain only platform capabilities shared by modules. Each module should own its feature-specific routes, UI, data access, business logic, tests, and documentation.

## Initial Database Foundation

Begin with only the platform entities needed to establish identity, workspace membership, permissions, and module enablement:

```text
profiles
workspaces
memberships
roles
permissions
role_permissions
workspace_modules
```

Module-owned tables should be introduced with their modules rather than added to Core prematurely. Records containing workspace-owned data should normally include a `workspace_id`.

The application should expose one shared permission-checking contract. However, security must also be enforced through database Row-Level Security policies or server-side functions. Hiding a control in the user interface is not sufficient authorization.

Database access should follow these principles:

- Enable Row-Level Security on every exposed application table.
- Configure explicit database grants.
- Create policies for individual operations such as select, insert, update, and delete.
- Test both allowed and denied database access.
- Keep privileged service credentials strictly on the server.

## v0.1 Offline Boundary

For v0.1, limit offline support to:

- Cached application shell
- Cached icons and static assets
- Clear online/offline indication
- A friendly offline state
- Read-only display of the most recently loaded workspace and module registry where practical
- Protection against silently losing user-entered data

Do not build generic offline write synchronization yet. Queued writes, synchronization, and conflict resolution should be designed module by module once concrete requirements exist.

## Technologies to Avoid Initially

### Next.js

TEA currently benefits more from a focused client-side PWA than from a server-rendered website framework. Next.js could be reconsidered if TEA later develops meaningful server-rendering or public-web requirements.

### Firebase / Firestore

The document model is less natural for TEA's relational memberships, roles, permissions, workspaces, and module-enablements than PostgreSQL.

### Separate Express or NestJS API

A dedicated API may become useful when complex business logic or integrations require it. It is unnecessary infrastructure for the first platform shell.

### Redux

React context plus focused server-state and local-state tools should be sufficient initially. Add a global state framework only in response to demonstrated complexity.

### Runtime Plugin Loader or Marketplace

A typed, build-time module registry is enough for v0.1. Dynamic plugin installation would add security, versioning, deployment, and compatibility complexity.

### Micro-frontends or Separate Module Repositories

These approaches would introduce excessive dependency, deployment, and integration overhead at this stage. Begin with a modular monolith in one repository.

### Generic Offline Synchronization

Do not build a large synchronization abstraction before a real module establishes the needed write, retry, and conflict semantics.

## Recommended First Build Slice

```text
Vite PWA shell
    ↓
Supabase login
    ↓
Resolve one seeded workspace membership
    ↓
Protected application layout
    ↓
Registry-driven Dashboard
    ↓
Lazy-loaded example module
    ↓
Coming Soon module card
    ↓
Basic offline shell
```

This slice should prove that TEA can be installed, authenticate a user, establish an active workspace, render modules from a central registry, open an independently loaded module, and remain understandable under poor connectivity.

## Decisions to Confirm Before Implementation

1. Confirmed: React, TypeScript, and Vite are the frontend foundation.
2. Confirmed: Supabase is the initial backend, authentication provider, and PostgreSQL host.
3. Confirmed: Cloudflare Pages is the initial frontend deployment target.
4. Confirmed: v0.1 uses email/password authentication.
5. Confirmed: Tailwind CSS and shadcn/ui-compatible primitives are the visual foundation.
6. Confirmed: the first placeholder is a purely demonstrative Example module.

## Overall Recommendation

Use a modular TypeScript application built with React and Vite, backed by Supabase Auth and PostgreSQL with Row-Level Security. Keep TEA Core generic, keep modules isolated, begin with a build-time module registry, and restrict v0.1 offline support to a reliable cached shell and deliberate read-only states.

This provides a credible multi-user and multi-workspace foundation without turning v0.1 into an enterprise platform project.

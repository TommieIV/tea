# TEA Starter Packet v2

This packet reflects the current architecture:

> **TEA is the platform / operating-system-like layer. Modules are the apps.**

Core stays generic. Users may belong to Personal, Household, and Business workspaces. Access is controlled with namespaced permissions such as `calendar.events.view`, `tasks.items.assign`, and `household.members.manage`.

Some modules may be private or business-specific without changing generic Core.

## Recommended Reading Order
1. `docs/TEA-VISION.md`
2. `docs/TEA-ARCHITECTURE.md`
3. `docs/ROADMAP.md`
4. `AGENTS.md`

## Immediate Goal

```text
Install PWA
→ Login
→ Workspace
→ Dashboard
→ Module Registry
→ Placeholder Module
```

Do not build real business modules until the platform shell is stable.

## v0.1 Implementation

The initial platform shell is implemented with React, TypeScript, Vite, Tailwind CSS, and Supabase. It includes a PWA shell, email/password sign-in, a Supabase-derived workspace context, a registry-driven dashboard, a lazy-loaded Example module, and a Coming Soon card.

### Run locally

1. Install dependencies with `npm install`.
2. Configure Supabase as described in [supabase/README.md](supabase/README.md).
3. Copy `.env.example` to `.env` and add the Supabase URL and publishable key.
4. Run `npm run dev`.

### Verify

Run `npm run lint`, `npm test`, and `npm run build` before deployment. Cloudflare Pages should use `npm run build` with `dist` as the output directory.

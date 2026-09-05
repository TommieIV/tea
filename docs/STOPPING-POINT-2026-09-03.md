# TEA Stopping Point — 2026-09-03

## Current State

The TEA v0.1 platform shell has been implemented and locally verified.

- React, TypeScript, Vite, Tailwind CSS, and the PWA service worker are configured.
- The application has a mobile-first login page, protected shell, dashboard, offline indicator, and responsive navigation.
- The Dashboard reads from a typed module registry.
- The Example module is demonstrative only, permission guarded, and loaded as a separate lazy route.
- A Coming Soon module state is present.
- The database foundation supports profiles, workspaces, memberships, roles, permissions, role permissions, and workspace module enablement.
- Database row-level security policies and an authenticated workspace-context RPC are included.
- The frontend contains no hard-coded user, workspace, membership, or permission data.

## Checks Completed

The following all passed before stopping:

```text
npm run lint
npm test
npm run build
```

The production build generates the PWA manifest, service worker, and a separate JavaScript chunk for the Example module.

## Required Next Step: Configure Supabase

No Supabase project credentials have been added yet, so actual sign-in and live workspace retrieval have not been exercised against a database.

1. Create or choose a Supabase project.
2. Apply [the initial migration](../supabase/migrations/20260903000000_initial_platform.sql).
3. For local development, apply [the seed](../supabase/seed.sql). It creates the generic local account `demo@tea.local` with password `change-me-now`, a Personal workspace, an Owner role, the `example.overview.view` permission, active membership, and the enabled Example module.
4. Copy `.env.example` to `.env` and supply:

   ```text
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_PUBLISHABLE_KEY=...
   ```

5. Start the application with `npm run dev`.
6. Sign in and confirm the Dashboard shows the seeded workspace and a Connected Example module.

For a hosted project, create the real initial account in Supabase Auth rather than using the local demo user. See [Supabase setup instructions](../supabase/README.md).

## Deployment Still Required

Cloudflare Pages is the chosen initial frontend host. After Supabase is configured:

1. Set the two `VITE_SUPABASE_*` values in the Cloudflare Pages environment.
2. Use `npm run build` as the build command.
3. Use `dist` as the output directory.
4. Install the deployed PWA on a phone and verify launch, login, Dashboard, module navigation, and offline shell behavior.

## Boundaries Preserved

Do not begin a real TEA module yet. The next work should be Supabase configuration and live validation only. Keep Core generic and leave more complete workspace management, permission editing, offline write queues, and business modules for future milestones.

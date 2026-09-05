# Supabase Setup

TEA v0.1 uses Supabase Auth with email/password and PostgreSQL for its real workspace context. The browser does not contain a seeded user, workspace, role, permission, or module-enable setting.

## Local development

1. Install the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) if it is not already available.
2. Run `supabase init` once from the repository root if you need a generated local configuration file.
3. Run `supabase start`.
4. Apply `migrations/20260903000000_initial_platform.sql` and then `seed.sql` using your normal Supabase migration flow.
5. Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` to the local values reported by Supabase.
6. Start TEA with `npm run dev` and sign in using `demo@tea.local` / `change-me-now`.

## Hosted Supabase project

1. Create a Supabase project and apply the migration in `migrations/`.
2. Create the initial account using Supabase Auth. Do not use the local demo credentials in production.
3. Create a profile, Personal workspace, workspace role, `example.overview.view` permission, role-permission assignment, membership, and enabled `example` module for that account. The local seed shows the required relationship shape.
4. Put the project's URL and publishable key in Cloudflare Pages environment variables named exactly as in `.env.example`.

Keep the Supabase service-role key out of the browser and out of source control. The publishable key is expected to be client-side; row-level security policies protect the data.

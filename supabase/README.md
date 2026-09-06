# Supabase Setup

TEA v0.1 uses Supabase Auth with email/password and PostgreSQL for its real workspace context. The browser does not contain a seeded user, workspace, role, permission, or module-enable setting.

## Local development

1. Install the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) if it is not already available.
2. Run `supabase init` once from the repository root if you need a generated local configuration file.
3. Run `supabase start`.
4. Apply `migrations/20260903000000_initial_platform.sql` and then `seed.sql` using your normal Supabase migration flow.
5. Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` to the local values reported by Supabase.
6. Start TEA with `npm run dev` and sign in using `demo@tea.local` / `change-me-now`.

`seed.sql` is **local-development-only**. It creates a deterministic demo account directly in `auth.users` and must never be run against a hosted Supabase project, including with `supabase db push --include-seed`.

## Hosted Supabase project

1. Create a Supabase project and apply `migrations/20260903000000_initial_platform.sql`. Do not apply `seed.sql`.
2. In **Authentication → Users**, create the initial user normally through Supabase Auth. Complete its email confirmation, or use the dashboard's confirmation option if appropriate for the environment. Do not insert a hosted user directly into `auth.users`.
3. Copy that user's UUID from the Auth user record.
4. Open `bootstrap/initial-hosted-user.sql`, replace its three `NULL` variables with the Auth UUID, a display name, and a Personal workspace name. For example:

   ```sql
   target_user_id uuid := 'the-auth-user-uuid';
   target_display_name text := 'Initial user';
   target_workspace_name text := 'My Personal Workspace';
   ```

   Run the entire edited file in the Supabase SQL Editor.
5. The bootstrap verifies the Auth user exists and creates the profile, Personal workspace, Owner role and membership, Example permission and assignment, and enabled Example module. It is transactional and can be rerun for the same initial Owner setup to fill in missing baseline records. It stops without changing anything if the user has a different or conflicting Personal workspace membership.
6. Put the project's URL and publishable key in local `.env.local` and in Cloudflare Pages environment variables named exactly as in `.env.example`.

The bootstrap is an operator-only initial-environment action: it relies on the SQL Editor's administrative database access and is not callable by the browser. TEA currently has a login flow, not a signup/workspace-provisioning flow. Decide whether future normal signups should automatically receive a Personal workspace when that v0.2 feature is designed; do not use this bootstrap as automatic signup provisioning.

Keep the Supabase service-role key out of the browser and out of source control. The publishable key is expected to be client-side; row-level security policies protect the data.

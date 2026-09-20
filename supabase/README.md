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
## Workspace Administration

Apply `migrations/20260907000000_workspace_administration.sql` after the existing migrations. It adds the Workspace Administration module, the Member role, secure per-member permission overrides, and Owner-only workspace/member/module management RPCs.

To enable email invitations, deploy the Edge Function:

```bash
supabase functions deploy admin-invite
```

Supabase provides `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to hosted Edge Functions automatically. The service-role key must never be placed in the TEA frontend or Cloudflare variables. Ensure the deployed TEA URL is present in Supabase Auth's Redirect URLs so invitees can finish their invitation flow there.

## Push notifications

Apply `migrations/20260916000000_push_notifications.sql`, then deploy the test sender:

```bash
supabase functions deploy send-push-test
```

Generate one VAPID key pair and configure it in both places:

- Cloudflare Pages/Workers build variable: `VITE_VAPID_PUBLIC_KEY` = the public key.
- Supabase Edge Function secrets: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` (for example, `mailto:you@example.com`).

Never put `VAPID_PRIVATE_KEY` in Cloudflare, the frontend, or source control. After redeploying TEA, enable notifications from the account menu and use **Send test** to verify the installed PWA receives a notification.

### Task creation and due notifications

Apply `migrations/20260919000000_tasks_due_time_notifications.sql` after the Tasks and push migrations, then deploy the dispatcher:

```bash
supabase functions deploy task-push-dispatcher --no-verify-jwt
supabase secrets set TASK_PUSH_CRON_SECRET="generate-a-long-random-value"
```

In the Supabase SQL Editor, replace all three values below, run it once, and keep the cron secret private. This creates a one-minute scheduled job; task notifications are normally delivered within a minute of creation or their due time.

```sql
select vault.create_secret('https://YOUR_PROJECT_REF.supabase.co', 'tea_project_url');
select vault.create_secret('YOUR_PUBLISHABLE_KEY', 'tea_publishable_key');
select vault.create_secret('THE_SAME_LONG_RANDOM_VALUE', 'tea_task_push_cron_secret');

select cron.schedule(
  'tea-dispatch-task-push-notifications',
  '* * * * *',
  $$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'tea_project_url') || '/functions/v1/task-push-dispatcher',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'tea_publishable_key'),
        'x-tea-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'tea_task_push_cron_secret')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 5000
    );
  $$
);
```

Enable the `pg_net`, `pg_cron`, and `Supabase Vault` extensions first if the SQL Editor reports that one is unavailable. The scheduled function sends no due notification for a task completed or archived before it becomes due. The notification badge uses a transparent, monochrome TEA mark so Android can render a proper status-bar icon instead of a solid square.

When applying `migrations/20260920020000_workspace_groups_and_task_notification_targets.sql`, redeploy the dispatcher so task notifications can resolve Everyone, individual members, and workspace groups:

```bash
supabase functions deploy task-push-dispatcher --no-verify-jwt
```

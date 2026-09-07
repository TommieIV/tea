# Workspace Administration

This generic Core module lets an authorized workspace Owner create and edit workspaces, invite members, choose membership roles/statuses, set per-member permission overrides, and enable registered modules.

Roles are baselines. A member-specific permission override may allow or deny a permission; the effective permission is enforced by the database permission resolver.

Inviting a user is handled by the server-side `admin-invite` Supabase Edge Function. The browser never receives an Auth service-role secret and the module never inserts rows directly into `auth.users`.

## Dashboard exemption

Administration is a configuration module rather than a source of workspace operational work. It intentionally has no dashboard report or attention signal.

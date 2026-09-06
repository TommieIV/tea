# TEA Architecture Notes

## Mental Model

> **TEA is an operating-system-like platform. Modules are applications running on it.**

This is a design philosophy, not a literal operating system.

## Core vs Modules
Core owns authentication, users, workspaces, memberships, roles/permissions, navigation, module registry, PWA shell, shared services, and security infrastructure.

Modules own feature-specific pages, business logic, feature data, module-specific permissions, dashboard reports, and module documentation.

Core should know how to **host modules**, not how every module works.

## Foundational Access Model

```text
User
  ↓
Membership
  ↓
Workspace
  ↓
Role / Permissions
  ↓
Enabled Modules
  ↓
Module Data / Actions
```

## Workspaces
A user may have Personal, Household, and Business workspaces, and potentially multiple workspaces of the same type later. The active workspace determines shared data and relevant modules.

## Pages / Routes
One PWA can contain many routes such as `/login`, `/dashboard`, `/calendar`, `/tasks`, `/money`, `/vehicles`, `/projects`, and `/settings`.

Multiple routes do **not** inherently make a PWA heavy. Loading everything at startup makes it heavy.

## Lazy Loading

```text
Launch TEA
   ↓
Load Core + Dashboard
   ↓
Tap Vehicles
   ↓
Load Vehicles module
```

Avoid loading every possible module during startup.

## Module Registry
The registry acts like TEA's application directory. A conceptual module record may include ID, name, version, route, permissions, supported workspace types, classification, enabled state, icon, and optional dashboard/offline metadata.

The implementation can start simple and evolve.

## Module Enablement
There are two separate questions:

1. Is the module enabled for this workspace?
2. Does the current user have permission to use it?

The Dashboard should respect both.

## Permission Pattern
Use `{module}.{resource/function}.{action}`. Examples include `calendar.events.view`, `tasks.items.assign`, `money.accounts.view`, `household.members.manage`, and `tgt.website.publish`.

A role is a collection of permissions. Do not make role names the primary authorization mechanism.

## Private Modules
Private modules are compatible with the architecture. They should register normally, define permissions normally, declare supported workspace types, use Core auth/permission services, and avoid changing generic Core for private business logic.

## Dashboard
The Dashboard is analogous to a home screen/launcher:

```text
Logged-in user
      ↓
Active workspace
      ↓
Enabled modules
      ↓
User permissions
      ↓
Visible launcher cards + summaries
```

Each enabled module supplies a concise, workspace-scoped dashboard report unless it has a documented exemption. The report belongs to the module and is permission-aware; Core renders it without taking on module-specific queries or business rules. Reports should surface actionable state without loading a module's full dataset.

## Data Ownership
Data should clearly belong to a user/personal context, a workspace, or Core/system. Avoid giant catch-all tables. Where appropriate, module records should carry a workspace identifier so household/business data remains separated.

## Keep v0.1 Simple
Do not build a full app store, plugin downloader, advanced custom-role editor, or enterprise organization hierarchy now.

v0.1 only needs enough foundation to prove:

```text
Login
   ↓
Workspace
   ↓
Dashboard
   ↓
Module Registry
   ↓
Permission-aware module card
   ↓
Placeholder module
```

## Codex Workflow
Normally launch Codex from the repository root. The repository is the project memory, not a giant conversation.

## Recommended First Design/Build Prompt

```text
Read AGENTS.md, docs/TEA-VISION.md, docs/TEA-ARCHITECTURE.md, and docs/ROADMAP.md.

TEA should be treated as a generic modular platform: Core is the operating-system-like layer and modules are apps.

For this task, focus ONLY on designing and implementing the initial v0.1 PWA shell so I can install TEA on my phone and begin using the foundation.

Before making major architectural choices, inspect the repository and use the existing project docs as the source of truth.

Priorities:
- mobile-first responsive PWA
- installable on phone
- generic visual shell
- login screen
- authenticated app shell
- basic workspace concept
- dashboard/home screen
- module registry foundation
- at least one placeholder module
- clear Coming Soon module states
- route-level lazy loading/code splitting where appropriate
- clean structure that can grow into permissions and workspace-aware modules

Do not implement real business modules yet.
Do not hard-code personal names, family names, or specific businesses into Core.
Do not build the entire future permission system unless needed for the v0.1 foundation.

Keep the first version small, clean, and runnable.
```

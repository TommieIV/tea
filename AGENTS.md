# AGENTS.md — TEA Development Rules

## Core Product Principle
TEA should be designed as a generic platform, not as a personalized single-user app.

> **TEA is the operating system. Modules are the apps.**

TEA Core provides shared platform services. Modules provide features. Some modules may be private, personal, or business-specific, but Core should remain generic and reusable.

## Read Before Working
1. Read this file.
2. Read `docs/TEA-VISION.md`.
3. Read `docs/TEA-ARCHITECTURE.md`.
4. Read `docs/ROADMAP.md`.
5. If working on an existing module, read that module's `README.md`.
6. Inspect only the code needed for the requested task before expanding scope.

## Core Architecture
TEA should conceptually contain:

```text
TEA Core
├── Authentication
├── Users
├── Workspaces
├── Memberships
├── Roles / Permissions
├── Navigation
├── Module Registry
├── Notifications
├── Shared Storage
├── Search
├── Settings
├── API / Data Access
└── PWA / Offline Infrastructure

Modules
├── Calendar
├── Tasks
├── Money
├── Household
├── Vehicles
├── Projects
├── Business-specific modules
├── Private/custom modules
└── Future modules
```

## Generic Core Rule
Do not hard-code personal names, family names, family roles, businesses, or private workflows into Core.

Core may know users, workspace types, memberships, roles, permissions, enabled modules, routes, and shared services. Core should not know that a particular person is “Dad,” that a particular household has a specific name, or that a specific business exists.

Friendly labels such as Mom, Dad, Head of Household, Owner, or Office Manager may exist as role names or workspace labels, but authorization must resolve to generic permissions.

## Workspaces / Contexts
A user may belong to multiple workspaces, such as Personal, Household, and Business. A user's visible modules and data should depend on the active workspace.

Business data must not automatically appear in a household workspace. Household data must not automatically appear in a business workspace.

## Memberships
Users access shared workspaces through memberships. A membership may contain user, workspace, role, status, invitation state, and later explicit permission overrides.

## Permissions
Use namespaced permission keys:

```text
{module}.{resource/function}.{action}
```

Examples:

```text
calendar.events.view
calendar.events.create
calendar.events.edit
calendar.events.delete

tasks.items.view
tasks.items.create
tasks.items.assign
tasks.items.complete

money.accounts.view
money.transactions.edit
money.budgets.manage

household.members.view
household.members.invite
household.members.manage

tgt.website.edit
tgt.website.publish
```

Roles are bundles of permissions. Do not implement authorization only by hiding UI; enforce permissions on the backend/server where applicable.

## Example Role Concepts
Household roles may include Owner / Head of Household, Admin, Adult, Child, Guest. Business roles may include Owner, Admin, Manager, Member, Viewer. These are friendly role concepts, not the primary security mechanism.

## Module Enablement
Modules should be enabled per workspace where practical. A module being part of TEA does not mean it is enabled in every workspace.

## Module Classification
Modules may be Generic / reusable, Private, Business-specific, Experimental, or Future/public. Private and custom modules are allowed, but they must integrate through the same Core contracts.

## Module Registry / Manifest
TEA should have a central module registry. Each module should eventually expose metadata such as ID, display name, version, route, icon, supported workspace types, defined permissions, enabled/status state, optional dashboard summaries/widgets, optional offline capabilities, and classification.

Do not scatter hard-coded module lists across the application.

## Dashboard Philosophy
The Dashboard is TEA's launcher/home screen. It should determine: who is logged in, which workspace is active, which modules are enabled there, which modules the user may access, and what lightweight summaries are available.

The Dashboard should not contain the full business logic of every module.

## Dashboard Reporting Contract
Every enabled module must expose a lightweight, workspace-scoped dashboard report unless it has an explicit, documented exemption. A report should give a brief, actionable view of the module's current state—for example, a task module could report the number of incomplete tasks, high-priority items, and overdue items.

The module owns the data query, summary rules, permissions, and empty/error states for its report. Core only hosts and renders the declared report; it must not absorb module business logic. Reports should be permission-aware, inexpensive to load, and avoid loading a module's full dataset on the Dashboard.

## Module Isolation
A module should own its feature-specific pages/screens, components, business logic, data access helpers, types/models, tests, and documentation. Shared UI, hooks, auth, navigation, notification services, offline/sync helpers, API clients, and truly reusable utilities belong in Core/shared areas.

## Performance
TEA may eventually contain many modules. Prefer route-level code splitting, lazy loading, efficient asset loading, sensible caching, targeted offline caching, and pagination/virtualization when useful. Do not load every module or large dataset at startup.

## Mobile-First / Responsive
TEA must work well as an installed PWA on phones first and adapt cleanly to tablets, foldables, touchscreens, laptops, and desktops.

## Offline Behavior
The app shell should remain useful offline where practical. Individual modules may define different offline behavior. Never silently discard user-entered data because connectivity changes.

## Security / Privacy
Do not expose secrets, credentials, API keys, private tokens, or sensitive configuration in client-side code or source control. Use environment variables and server-side enforcement where appropriate.

## Working With Codex
Prefer one clear task at a time. The repository is the source of truth; durable decisions belong in `AGENTS.md`, `docs/`, module READMEs, source code, tests, and migrations.

For each task: understand the current implementation, make the smallest correct change, run targeted checks/tests, and summarize what changed.

## Git Discipline
Make changes in small logical chunks. Start clean, complete one coherent task, test it, review the diff, and commit with a meaningful message. Avoid unrelated changes in the same commit.

## Cost / Efficiency Philosophy
TEA exists partly to replace recurring services and tools with software tailored to the user's needs. Development should be cost-conscious without being artificially constrained.

Priorities: correctness and maintainability, smooth workflow, efficient context/compute use, avoiding wasteful rewrites, and using stronger/more expensive models when the task genuinely benefits from them.

The goal is **value per dollar**, not the lowest possible model bill.

## Initial Project Rule
For v0.1, do not build every future module. First establish the installable PWA shell, authentication/session flow, workspace foundation, permission foundation, Dashboard, module registry, placeholder module routing, responsive navigation, and baseline offline behavior.

# TEA Vision

## What TEA Is
**TEA — Tommie Everything App** is a modular Progressive Web App platform that brings many day-to-day tools into one coherent system.

Despite the name, TEA Core should **not** be personalized to one person.

The long-term vision is a generic multi-user platform that can support individuals, families/households, businesses, private custom modules, reusable/public modules, and possible broader publication later.

> **TEA is the operating system. Modules are the apps.**

## Product Experience

```text
Open TEA
   ↓
Log in
   ↓
Choose / enter a workspace
   ↓
TEA Dashboard
   ↓
See modules available in that workspace
   ↓
Open a module
```

A user may eventually have:

```text
My TEA
├── Personal
├── Household
└── Business
```

The same account can participate in multiple workspaces.

## Generic Core
Core should provide authentication, users, workspaces, memberships, roles/permissions, navigation, module registry, notifications, search, shared storage, settings, data/API services, and PWA/offline infrastructure.

Core should not contain family-specific, DJ-specific, website-specific, vehicle-specific, finance-specific, or TGt-specific business logic. Those belong in modules.

## Modules
Modules are the applications that run on TEA. Examples may include Calendar, Tasks, Money, Household, Vehicles, Projects, Family Dashboard, Website tools, Business tools, and private/custom utilities.

Some modules can be generic and reusable. Others may be highly customized. Both are valid as long as custom functionality does not pollute generic Core.

## Workspaces
Workspaces define context and data ownership. Initial workspace types are Personal, Household, and Business. A module can support one or several workspace types.

Business information should not automatically appear in a household context.

## Permissions
Access should be permission-driven using:

```text
{module}.{resource/function}.{action}
```

Examples:

```text
calendar.events.view
calendar.events.create
tasks.items.assign
money.budgets.manage
household.members.invite
tgt.website.publish
```

Roles are convenient bundles of permissions. Friendly role names may include Owner, Head of Household, Admin, Adult, Child, Manager, or Viewer, while the underlying authorization remains generic.

## Dashboard
The Dashboard is TEA's launcher/home screen. It should answer who is logged in, which workspace is active, which modules are enabled, which modules the user can access, and what useful summaries should be surfaced.

Later, modules may provide lightweight summaries such as events today, open tasks, bills due, vehicle reminders, or active projects. The business logic remains inside each module.

## Module Enablement
Not every workspace needs every module. Household and Business workspaces may have different enabled module sets.

## Private / Custom Modules
Private or business-specific modules are explicitly allowed. They should register normally, define permissions normally, declare supported workspace types, and use Core auth/permission services without adding private business logic to Core.

## Family Dashboard / Dad Mode
A future shared touchscreen family dashboard should be implemented using generic TEA building blocks. A personalized Dad Mode may exist as a custom role/view/configuration assembled from modules. Core itself should not assume a particular user is Dad.

## PWA Goals
TEA should be installable and app-like, mobile-first, and responsive across phones, foldables, tablets, wall/kitchen touchscreens, laptops, and desktops.

As TEA grows, route-level lazy loading/code splitting should prevent the whole platform from loading at startup.

## Offline Goals
The TEA shell should remain useful under poor connectivity. Offline support should be intentional per module, using techniques such as cached shell/data, local drafts, queued writes, and later synchronization where appropriate.

## Development Workflow
The repository is permanent project memory. Codex sessions should normally be task-focused. A permanent giant master session is not required.

## Cost Philosophy
TEA is partly intended to reduce recurring website, subscription, and disconnected-tool costs. The goal is not to make development as cheap as physically possible; the goal is to spend efficiently to build software that replaces recurring costs and gives better control.

Using better development tools, more Codex capacity, or stronger models is worthwhile when the productivity/reliability benefit justifies the cost. The target is **value per dollar**.

## Long-Term Success Criteria
TEA succeeds if multiple users can safely use it, one account can participate in multiple workspaces, permissions are understandable and enforceable, generic modules can be reused, custom modules can coexist without contaminating Core, modules can be added without destabilizing old ones, the PWA remains fast as it grows, data remains portable, and the platform can potentially be published later.

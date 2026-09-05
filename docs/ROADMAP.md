# TEA Roadmap

This is a running roadmap. Do not attempt to complete the entire roadmap at once.

# v0.1 — Installable Platform Shell

## Primary Goal
> Install TEA on a phone, log in, enter an active workspace, land on a generic Dashboard, and open a placeholder module.

## Foundation
- [x] Choose frontend/PWA framework
- [x] Choose backend/API approach
- [x] Choose database
- [x] Choose authentication approach
- [x] Establish development / production environment strategy
- [x] Initialize repository/project
- [x] Establish Core vs Modules folder structure
- [x] Configure environment-variable handling
- [x] Configure linting/formatting/type checking as appropriate

## PWA
- [x] Add web app manifest
- [x] Add application icons/placeholders
- [x] Configure installable behavior
- [x] Establish service worker strategy
- [x] Cache basic app shell
- [x] Add online/offline indication
- [ ] Verify installed app launches on phone

## Authentication
- [x] Create generic login screen
- [x] Implement login
- [x] Implement logout
- [x] Persist session appropriately
- [x] Protect authenticated routes
- [x] Define basic user model
- [x] Avoid personalization in Core

## Workspace Foundation
- [x] Define workspace concept
- [x] Define Personal, Household, and Business workspace types
- [x] Define membership concept
- [x] Allow authenticated session to resolve an active workspace
- [x] Add basic workspace display/selector foundation
- [x] Keep workspace data separated conceptually

## Permissions Foundation
- [x] Adopt namespaced permission convention
- [x] Document `{module}.{resource/function}.{action}`
- [x] Define role-as-permission-bundle concept
- [x] Leave room for permission checks in Core
- [x] Do not overbuild advanced permission management in v0.1
- [x] Ensure future backend authorization can enforce permissions

## Dashboard
- [x] Create Dashboard route
- [x] Add generic TEA branding/header
- [x] Display logged-in user
- [x] Display active workspace
- [x] Build responsive module-card grid/list
- [x] Render cards from module registry
- [x] Add Connected state
- [x] Add Coming Soon state
- [ ] Add Needs Setup state if useful
- [x] Add Offline/Error state if useful
- [x] Make connected cards navigable
- [x] Make unavailable cards behave clearly

## Module Registry
- [x] Create central registry
- [x] Define module ID, display name, route, icon, status, enabled state
- [x] Define supported workspace type foundation
- [x] Define permission metadata foundation
- [x] Leave room for module version
- [x] Leave room for dashboard summary/widget metadata
- [x] Leave room for module classification: generic/private/business/experimental

## Navigation
- [x] Establish main navigation pattern
- [x] Dashboard/Home navigation
- [x] Back behavior
- [x] Mobile-safe navigation
- [x] Tablet/desktop adaptation
- [x] Respect safe areas on installed mobile PWA

## Placeholder Module
- [x] Create one example module folder
- [x] Add module README
- [x] Register it
- [x] Define at least one example permission
- [x] Enable it for one example workspace type
- [x] Route Dashboard → module
- [x] Route module → Dashboard
- [x] Lazy-load/code-split it where practical
- [x] Confirm unrelated modules are not required at startup

## Responsive Baseline
- [ ] Test phone, narrow phone, foldable/tablet, and desktop viewports
- [ ] Verify touch targets
- [ ] Verify navigation remains reachable
- [ ] Verify installed PWA layout

## v0.1 Exit Criteria
- [ ] TEA installs on phone
- [ ] User can log in
- [ ] Active workspace exists
- [ ] Dashboard renders from module registry
- [ ] At least one placeholder module is Connected
- [ ] At least one module is Coming Soon
- [ ] Connected module opens and returns to Dashboard
- [ ] Permission naming convention is established
- [ ] Core contains no hard-coded personal/business-specific logic
- [ ] App works at phone and desktop sizes
- [ ] Code is committed to Git

# v0.2 — Real Identity / Workspace / Permission Layer
- [ ] Real user persistence
- [ ] Workspace creation
- [ ] Workspace invitations
- [ ] Membership management
- [ ] Role definitions
- [ ] Permission assignment and enforcement
- [ ] Workspace-specific module enablement
- [ ] Module visibility by permission
- [ ] Workspace switcher UX

# v0.3 — First Real Module
- [ ] Select module
- [ ] Define purpose and supported workspace types
- [ ] Define permissions and data ownership
- [ ] Define routes/screens and offline requirements
- [ ] Define Dashboard integration
- [ ] Add module README
- [ ] Build in focused tasks
- [ ] Test independently and with Core
- [ ] Commit logical milestones

# Future Platform Capabilities
- Notifications / push notifications
- Shared task/reminder service
- File/photo storage
- Search
- Global activity feed
- Cross-module dashboard widgets
- Background sync
- User preferences
- Advanced roles / permission overrides
- Import/export
- Backup strategy
- Audit/history
- Family/shared-user features
- Automations
- External integrations
- Module marketplace/catalog concepts
- Public distribution strategy

# Parking Lot
- Family touchscreen dashboard
- Dad Mode
- Calendar
- Tasks
- Money
- Projects
- Vehicles
- Household
- Website management
- Business / side-work tools
- Personal utilities
- Additional modules as needs arise

# Development Rule
For every new idea, ask:
1. Is this Core functionality or a Module?
2. Which workspace types should support it?
3. What permissions should control it?
4. Does another module actually need it?
5. Can it be implemented without coupling unrelated features?
6. Does it belong in the current milestone or Parking Lot?
7. What is the smallest useful version?

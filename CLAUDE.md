# SM Advisors CRM — Claude Code Project Instructions

## What This Project Is

A custom CRM and autonomous BD agent for SM Advisors, an AI enablement advisory firm. This replaces Bigin (Zoho CRM). Built in React/TypeScript/Vite/Tailwind with Supabase as the backend. The shell was generated in Lovable and connected to this GitHub repo. All feature development happens here in Claude Code.

The owner is Cory Kronheim, founder of SM Advisors. He is a CPA and AI enablement advisor to financial institutions (banks, credit unions). His BD style is warm, relationship-first, and always reason-based.

---

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **Router**: React Router v6
- **Database**: Supabase (PostgreSQL) — already connected via Lovable
- **Auth**: Supabase Auth (email/password)
- **Drag-and-drop**: @hello-pangea/dnd (Kanban boards)
- **Charts**: Recharts (reporting dashboards)
- **Automation**: n8n (external, cloud-hosted — not in this repo)
- **SMS**: Twilio (via n8n workflows)
- **AI agent brain**: Claude API (via n8n workflows)
- **Research**: Perplexity API (via n8n workflows)

---

## Project Structure

```
src/
  components/       # Reusable UI components
    ui/             # Base components (Button, Badge, Card, Table, Modal, etc.)
    layout/         # Sidebar, TopBar, PageWrapper
    contacts/       # Contact-specific components
    companies/      # Company-specific components
    pipelines/      # Kanban board components
    invoices/       # Invoice components
    reports/        # Chart components
    agent/          # Agent log components
  pages/            # One file per route
    Dashboard.tsx
    Contacts.tsx
    ContactDetail.tsx
    Companies.tsx
    CompanyDetail.tsx
    SalesPipeline.tsx
    DeliveryPipeline.tsx
    Invoices.tsx
    InvoiceDetail.tsx
    Reports.tsx
    AgentLog.tsx
    Settings.tsx
  hooks/            # Custom React hooks (useContacts, useDeals, etc.)
  lib/
    supabase.ts     # Supabase client
    utils.ts        # Shared utilities
  types/            # TypeScript interfaces matching DB schema
```

---

## Database

All tables live in Supabase. The full schema is documented in the architecture file. Key tables:

- `contacts` — people, with multi-category support via `contact_categories` junction table
- `companies` — organizations
- `contact_categories` — junction table, enum: prospect / client / center_of_influence / former_client / personal
- `tags`, `contact_tags`, `company_tags` — flexible user-defined tagging
- `sales_deals` — BD pipeline (Kanban)
- `delivery_engagements` — delivery tracking pipeline (Kanban)
- `interactions` — all activity (Gmail sync, GCal sync, manual, agent)
- `invoices`, `invoice_line_items`, `payments` — from QuickBooks sync
- `document_links` — polymorphic Google Drive URL attachments
- `agent_runs`, `agent_actions`, `agent_context_notes`, `agent_research`, `agent_config` — BD agent infrastructure
- `sync_status` — tracks health of all external syncs
- `user_preferences` — theme, defaults per user

**Important denormalized fields on `contacts`:**
- `last_contacted_at` — updated automatically by trigger when interaction is inserted
- `last_contact_type` — type of most recent interaction, updated by same trigger

---

## UI Conventions

### Theme
- Light/dark mode via CSS variables. Toggle persists in `user_preferences.theme` (Supabase) and localStorage as fallback.
- Light: `bg-slate-50`, cards `bg-white`, text `text-slate-900`
- Dark: `bg-slate-900`, cards `bg-slate-800`, text `text-slate-100`
- Accent: `blue-500`
- Never use `rounded-full` on cards. Use `rounded-lg` max.
- Subtle borders: `border-slate-200` light / `border-slate-700` dark

### Tables (ALL table views must implement all of these)
1. **Per-column filtering** — filter icon on each header. Text: contains/equals/empty. Date: range picker + relative options. Enum: multi-select checkboxes. Number: range/equals/gt/lt.
2. **Sortable columns** — click header to toggle asc/desc
3. **Export** — "Export Current View" (filtered, CSV) and "Export All Data" (full, CSV)
4. **Pagination** — 25 rows default, 50/100 options

### Contact Detail Page Layout
Mirrors Bigin CRM layout:
- Header bar: avatar, name, company (linked), categories (chips), action buttons (Send Email, Log Interaction, kebab)
- Left sidebar (fixed): Basic Info, Tags, Description, Other Info, Agent Context Notes
- Right content: tabbed interface
  - Timeline — chronological activity feed, grouped by date, filterable by type
  - Notes — free-form notes (separate from agent context notes)
  - Activities — tasks, events, calls with status
  - Emails — Gmail-synced emails, count badge, compose button
  - Pipelines — linked sales deals and delivery engagements
  - Files — Google Drive document links

### Company Detail Page Layout
Same sidebar + tab pattern as Contact Detail. Tabs: Timeline (aggregated), Contacts, Deals, Invoices, Files.

### Send Email
Use pre-filled Gmail compose URL — no OAuth needed for sending:
`https://mail.google.com/mail/?view=cm&fs=1&to={email}&su={subject}&body={body}`

---

## Build Phases

Track progress here. Update status as phases complete.

| Phase | Description | Status |
|-------|-------------|--------|
| 0 | Lovable shell (sidebar, routing, auth, dashboard, theme) | ✅ Done |
| 1 | Supabase schema — all tables, triggers, indexes | ⬜ Not started |
| 2 | Core CRM — contacts, companies, interactions, document links | ⬜ Not started |
| 3 | Pipelines — Sales Kanban, Delivery Kanban, deal detail pages | ⬜ Not started |
| 4 | Financial layer — invoices, line items, payments, billing progress | ⬜ Not started |
| 5 | Activity sync — Gmail + GCal n8n workflows, sync status UI | ⬜ Not started |
| 6 | Reporting — revenue dashboard, activity dashboard, Recharts | ⬜ Not started |
| 7 | Agent — agent config, log page, n8n workflow, Twilio, drafts | ⬜ Not started |
| 8 | Migration + polish — Bigin CSV import, QA, mobile responsiveness | ⬜ Not started |

---

## Key Architectural Decisions

1. **Polymorphic document links** — `document_links` table uses `linkable_type` (text) + `linkable_id` (UUID) to attach Google Drive URLs to any entity without schema changes.

2. **Agent config is data, not code** — All BD agent behavior (prioritization weights, surface count, LinkedIn days, tone) lives in `agent_config` as JSONB. Change behavior by updating config rows, not code.

3. **Denormalized contact activity fields** — `last_contacted_at` and `last_contact_type` on contacts are maintained by a Supabase trigger, not by application code. Never update these fields directly from the frontend.

4. **Agent outreach auto-logs as interaction** — When an `agent_action` is marked `status = 'sent'`, a trigger automatically creates a corresponding `interaction` record so the activity timeline stays complete.

5. **Billing progress is calculated, not entered** — `delivery_engagements.billing_progress` is recalculated by a Supabase trigger whenever the `invoices` table changes. Never update it manually.

6. **n8n handles all scheduled/external work** — Gmail sync, GCal sync, QuickBooks sync, Twilio SMS, and the daily agent run are all n8n workflows. This app never calls external APIs directly except via Supabase Edge Functions as webhooks.

---

## Environment Variables

The Lovable-generated `.env` should already have:
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Do not add API keys for Claude, Perplexity, Twilio, or QuickBooks to this app — those live in n8n environment variables.

---

## Coding Standards

- TypeScript strict mode — no `any` types
- One component per file
- Hooks for all Supabase data fetching (`useContacts.ts`, `useDeals.ts`, etc.)
- All Supabase queries go through `src/lib/supabase.ts`
- Error boundaries on all page-level components
- Loading and empty states required on every data view
- Never hardcode user IDs or contact data

# Plumbing Ops

> **Version: v0, the AI-built baseline.** This is the code as first generated,
> before any security review or hardening. Later versions are on the `v1` and
> `v2` branches, so the changes between versions can be compared.

An internal tool for a small plumbing business to run day-to-day operations:
customers, leads, jobs, job notes, staff accounts and a dashboard.

**Stack:** React + Vite + Tailwind CSS (frontend), Supabase (Postgres, Auth,
Row Level Security, Edge Functions), run locally with the Supabase CLI.

---

## Roles

| Role | What they can do |
|---|---|
| **Admin** (owner) | Everything, plus creating and deactivating staff accounts |
| **Manager / dispatcher** | Manage customers and leads, convert leads, create and assign jobs |
| **Technician** | See jobs assigned to them, update the job status, add notes |

---

## Running it locally

The whole group shares **one hosted Supabase project** (the database, logins
and edge function live in the cloud). Each person runs only the React
frontend on their own machine. **No Docker needed.**

### For everyone: run the app

Prerequisite: [Node.js](https://nodejs.org/) 20 or newer.

```bash
npm install
cp .env.example .env.local
```

Put the two values in `.env.local`. Get them from whoever owns the Supabase
project, or from the dashboard under **Project Settings → API**:

- `VITE_SUPABASE_URL`: the Project URL
- `VITE_SUPABASE_ANON_KEY`: the anon (or publishable) key

```bash
npm run dev
```

Open http://localhost:5173 and log in.

> ⚠️ `.env.local` is git-ignored. Share the values privately (not in the
> repo or a public chat), and never put the database password or the
> `service_role` / secret key in it.

### One-time project setup (only one person does this)

This person needs the [Supabase CLI](https://supabase.com/docs/guides/cli/getting-started)
(`brew install supabase/tap/supabase`). Run these in a normal terminal from
the project folder:

1. **Create the project** at [supabase.com](https://supabase.com). Note the
   **project ref**, the ID in the dashboard URL
   (`supabase.com/dashboard/project/<ref>`).
2. **Log in and link the folder to the project:**
   ```bash
   supabase login
   supabase link --project-ref <your-project-ref>
   ```
   It asks for the database password you chose when creating the project.
3. **Create the tables, policies and functions** from the migration files:
   ```bash
   supabase db push
   ```
4. **Deploy the edge function** used by the Employees page:
   ```bash
   supabase functions deploy manage-employee
   ```
   If it complains about Docker, add `--use-api`.
5. **Turn off public sign-up:** Dashboard → **Authentication → Sign In /
   Providers** → turn off **Allow new users to sign up**. Only admins should
   create accounts. `supabase/config.toml` only affects local Supabase, so
   this has to be done in the dashboard.
6. **Create the demo staff accounts:** Dashboard → **Authentication → Users →
   Add user → Create new user**, tick **Auto Confirm User**, and choose a
   password for each:

   | Email | Will become |
   |---|---|
   | admin@example.com | Dana Owens: Admin |
   | manager@example.com | Maria Lopez: Manager |
   | tom.tech@example.com | Tom Becker: Technician |
   | priya.tech@example.com | Priya Sharma: Technician |
   | sam.former@example.com | Sam Fletcher: Technician (**deactivated**, so login fails) |

   Use real passwords, not `password123`. This database is on the internet.
   Share the passwords with your group privately.
7. **Load the demo data:** open Dashboard → **SQL Editor**, paste in the whole
   of `supabase/seed.sql` and click **Run**. It gives those users their roles
   and adds customers, leads, jobs and notes. Run it **once**. If a user from
   step 6 is missing, it stops and tells you which one.

After that, any new staff accounts should be created by the admin on the
app's **Employees** page.

### Changing the database later

Never edit old migration files. Instead:

```bash
supabase migration new describe_your_change   # creates a new empty .sql file
# ...write your SQL in it...
supabase db push                              # applies it to the shared project
```

Commit the new migration file so the rest of the group has it. Everyone
shares the same database, so let the group know before pushing changes.

### Good to know

- **Shared data:** anything you add, edit or delete, everyone sees.
- **"Today's schedule"** in the seed data is the day the seed was run.
  Edit jobs in the app to move them to another day.
- **Free projects pause** after about a week of inactivity. Restore it from
  the dashboard if the app suddenly can't connect.

---

## Project structure

```
├── .env.example                 # template for your .env (public values only)
├── index.html
├── vite.config.js               # Vite + React + Tailwind plugins
├── src/
│   ├── main.jsx                 # app entry point
│   ├── App.jsx                  # all routes + which roles can see them
│   ├── index.css                # Tailwind + a few shared classes (.btn, .input, .card…)
│   ├── lib/
│   │   ├── supabase.js          # the Supabase client (anon key only)
│   │   ├── format.js            # date/status/name helpers
│   │   └── technicians.js       # loads active technicians for dropdowns
│   ├── context/AuthContext.jsx  # logged-in session + profile (role)
│   ├── components/              # Layout, ProtectedRoute, StatusBadge, ConfirmButton, ErrorMessage
│   └── pages/
│       ├── Login.jsx
│       ├── Dashboard.jsx        # jobs by status + today's schedule
│       ├── customers/           # list, add/edit form, detail (with their jobs)
│       ├── leads/               # list, add/edit form, convert to customer + job
│       ├── jobs/                # list, add/edit form, detail (status + notes)
│       └── employees/           # admin-only staff management
└── supabase/
    ├── config.toml              # CLI settings (used by `supabase link` / `db push`)
    ├── migrations/              # ALL tables, policies and functions (run in order)
    ├── seed.sql                 # demo data, run once in the SQL Editor
    └── functions/manage-employee/index.ts   # edge function for staff accounts
```

---

## Database

| Table | Purpose |
|---|---|
| `profiles` | One row per staff member: name, email, phone, **role**, **is_active**. Linked 1:1 to `auth.users`. |
| `customers` | Customer contact details. |
| `leads` | Potential customers. Status: new / contacted / converted / lost. |
| `jobs` | Title, description, customer, address, scheduled date, assigned technician, status (new / scheduled / in_progress / completed / cancelled). |
| `job_notes` | Notes on a job, with author and time. |

Migrations (in `supabase/migrations/`, run in filename order):

1. **profiles_and_roles**: `profiles` table and the helper functions `get_my_role()`, `is_active_staff()`, `is_admin()`, `is_admin_or_manager()`
2. **customers_and_leads**
3. **jobs_and_notes**
4. **rls_policies**: all Row Level Security policies
5. **functions**: the technician status-only trigger, the job assignment check, and `convert_lead()`

To change the schema, see [Changing the database later](#changing-the-database-later).

---

## How security works

The frontend hides pages a user shouldn't see, but **that is only for
convenience**. The real protection is in the database, so even someone
calling the API directly with their token can't get around it.

1. **Row Level Security (RLS)** is on for every table. Each policy uses
   `get_my_role()` to check the caller's role. See the table at the top of
   `migrations/..._rls_policies.sql`.
2. **Deactivated users are locked out immediately.** `get_my_role()` returns
   NULL for an inactive profile, so every policy denies them, even if their
   login token hasn't expired yet. Their Auth account is also banned so they
   can't log in again.
3. **Nobody can change roles from the browser.** There are no
   insert/update/delete policies on `profiles`, so the only way to create or
   change an account is the `manage-employee` edge function.
4. **The edge function checks the caller.** It verifies the caller's login
   token, then checks that their profile is an *active admin* before doing
   anything. It is the only code that uses the `service_role` key, and that
   key stays on the server. Admins can't deactivate themselves, so the
   business can't lock itself out.
5. **Technicians can only change job status.** RLS controls which *rows* a
   user can update but not which *columns*, so a trigger
   (`guard_technician_job_update`) rejects any technician update that touches
   anything other than `status`. Technicians also can't set a job to
   `new` or `cancelled`.
6. **Jobs can only be assigned to active technicians** (enforced by a trigger).
7. **Customers with jobs can't be deleted.** The foreign key uses
   `ON DELETE RESTRICT` and the UI shows a friendly error.
8. **Public sign-up is disabled** in the dashboard (setup step 5). Only admins create accounts.
9. **Lead conversion is atomic.** `convert_lead()` creates the customer and
   the job and marks the lead converted in one transaction, using the caller's
   own permissions (`SECURITY INVOKER`), so RLS still applies.

---

## Troubleshooting

- **"Missing VITE_SUPABASE_URL…" in the browser:** you haven't created
  `.env.local`, or you need to restart `npm run dev` after editing it.
- **"Login failed":** check the email and password with whoever set up the
  accounts. Sam's account is deactivated on purpose.
- **Login works but it says the account isn't active:** that profile is
  deactivated, or the user exists in Auth but `seed.sql` hasn't given them a
  profile yet. Log in as the admin and reactivate them on the Employees page.
- **The Employees page shows an error when creating or deactivating
  someone:** the edge function probably isn't deployed (setup step 4). Check
  Dashboard → Edge Functions → manage-employee → Logs.
- **Everything fails to load:** the free project may be paused. Restore it
  from the dashboard.

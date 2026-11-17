-- =============================================================
-- 004: Row Level Security policies
-- =============================================================
-- Summary of who can do what:
--
--                Admin   Manager   Technician
--   profiles     read    read      read
--   customers    full    full      read (only customers on their jobs)
--   leads        full    full      none
--   jobs         full    full      read own jobs; update status only*
--   job_notes    full    full      read + add notes on own jobs
--
--   * the column restriction is enforced by a trigger in migration 005.
--
-- Nobody can write to profiles from the browser. Accounts are
-- created/deactivated only by the manage-employee edge function,
-- which uses the service role key on the server.
--
-- Deactivated users: get_my_role() returns NULL for them, so every
-- policy below denies them, even if they still hold a valid token.
-- =============================================================

-- The anon role (not logged in) never needs table access.
revoke all on all tables in schema public from anon;

alter table public.profiles  enable row level security;
alter table public.customers enable row level security;
alter table public.leads     enable row level security;
alter table public.jobs      enable row level security;
alter table public.job_notes enable row level security;


-- ---------- profiles ----------
-- All active staff can see the staff list (needed to show note
-- authors and technician names). No insert/update/delete policies,
-- so those are blocked for every browser user.
create policy "Active staff can view profiles"
  on public.profiles for select
  to authenticated
  using (public.is_active_staff());


-- ---------- customers ----------
create policy "Admins and managers can view all customers"
  on public.customers for select
  to authenticated
  using (public.is_admin_or_manager());

create policy "Technicians can view customers on their jobs"
  on public.customers for select
  to authenticated
  using (
    public.get_my_role() = 'technician'
    and exists (
      select 1 from public.jobs
      where jobs.customer_id = customers.id
        and jobs.assigned_to = auth.uid()
    )
  );

create policy "Admins and managers can add customers"
  on public.customers for insert
  to authenticated
  with check (public.is_admin_or_manager());

create policy "Admins and managers can edit customers"
  on public.customers for update
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

create policy "Admins and managers can delete customers"
  on public.customers for delete
  to authenticated
  using (public.is_admin_or_manager());


-- ---------- leads (admins and managers only) ----------
create policy "Admins and managers can view leads"
  on public.leads for select
  to authenticated
  using (public.is_admin_or_manager());

create policy "Admins and managers can add leads"
  on public.leads for insert
  to authenticated
  with check (public.is_admin_or_manager());

create policy "Admins and managers can edit leads"
  on public.leads for update
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

create policy "Admins and managers can delete leads"
  on public.leads for delete
  to authenticated
  using (public.is_admin_or_manager());


-- ---------- jobs ----------
create policy "Admins and managers can view all jobs"
  on public.jobs for select
  to authenticated
  using (public.is_admin_or_manager());

create policy "Technicians can view their assigned jobs"
  on public.jobs for select
  to authenticated
  using (public.get_my_role() = 'technician' and assigned_to = auth.uid());

create policy "Admins and managers can create jobs"
  on public.jobs for insert
  to authenticated
  with check (public.is_admin_or_manager());

create policy "Admins and managers can edit jobs"
  on public.jobs for update
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

-- Technicians may update rows assigned to them. WHICH columns they
-- may change (only status) is enforced by the trigger in 005.
create policy "Technicians can update their assigned jobs"
  on public.jobs for update
  to authenticated
  using (public.get_my_role() = 'technician' and assigned_to = auth.uid())
  with check (public.get_my_role() = 'technician' and assigned_to = auth.uid());

create policy "Admins and managers can delete jobs"
  on public.jobs for delete
  to authenticated
  using (public.is_admin_or_manager());


-- ---------- job_notes ----------
create policy "Admins and managers can view all notes"
  on public.job_notes for select
  to authenticated
  using (public.is_admin_or_manager());

create policy "Technicians can view notes on their jobs"
  on public.job_notes for select
  to authenticated
  using (
    public.get_my_role() = 'technician'
    and exists (
      select 1 from public.jobs
      where jobs.id = job_notes.job_id
        and jobs.assigned_to = auth.uid()
    )
  );

-- Notes are always written as yourself (author_id = your id).
create policy "Admins and managers can add notes"
  on public.job_notes for insert
  to authenticated
  with check (public.is_admin_or_manager() and author_id = auth.uid());

create policy "Technicians can add notes on their jobs"
  on public.job_notes for insert
  to authenticated
  with check (
    public.get_my_role() = 'technician'
    and author_id = auth.uid()
    and exists (
      select 1 from public.jobs
      where jobs.id = job_notes.job_id
        and jobs.assigned_to = auth.uid()
    )
  );

create policy "Admins and managers can delete notes"
  on public.job_notes for delete
  to authenticated
  using (public.is_admin_or_manager());

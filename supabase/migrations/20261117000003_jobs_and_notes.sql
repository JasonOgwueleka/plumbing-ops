-- =============================================================
-- 003: jobs and job notes
-- =============================================================

create table public.jobs (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  description     text,
  -- RESTRICT: a customer who has jobs cannot be deleted, so job
  -- history is never lost. The UI shows an error message instead.
  customer_id     uuid not null references public.customers (id) on delete restrict,
  address         text,
  scheduled_date  timestamptz,
  assigned_to     uuid references public.profiles (id) on delete set null,
  status          text not null default 'new'
                    check (status in ('new', 'scheduled', 'in_progress', 'completed', 'cancelled')),
  lead_id         uuid references public.leads (id) on delete set null,
  created_by      uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index jobs_assigned_to_idx    on public.jobs (assigned_to);
create index jobs_customer_id_idx    on public.jobs (customer_id);
create index jobs_scheduled_date_idx on public.jobs (scheduled_date);

create trigger jobs_set_updated_at
  before update on public.jobs
  for each row execute function public.set_updated_at();


create table public.job_notes (
  id          uuid primary key default gen_random_uuid(),
  job_id      uuid not null references public.jobs (id) on delete cascade,
  author_id   uuid references public.profiles (id) on delete set null default auth.uid(),
  body        text not null check (length(trim(body)) > 0),
  created_at  timestamptz not null default now()
);

create index job_notes_job_id_idx on public.job_notes (job_id);

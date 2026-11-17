-- =============================================================
-- 001: profiles table + role helper functions
-- =============================================================
-- Every staff member has a row in auth.users (managed by Supabase Auth)
-- and a matching row here holding their name, role and active flag.

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null,
  email       text not null,
  phone       text,
  role        text not null check (role in ('admin', 'manager', 'technician')),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- -------------------------------------------------------------
-- Helper functions used by the RLS policies.
--
-- They are SECURITY DEFINER so they can read profiles without
-- triggering the profiles RLS policies themselves (which would
-- otherwise cause infinite recursion).
--
-- NOTE: named get_my_role() rather than current_role(), because
-- current_role is a built-in SQL keyword in Postgres.
-- -------------------------------------------------------------

-- Returns the logged-in user's role, or NULL if they have no
-- profile or have been deactivated. Because a deactivated user
-- gets NULL, every policy below automatically locks them out.
create function public.get_my_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role
  from public.profiles
  where id = auth.uid()
    and is_active = true;
$$;

create function public.is_active_staff()
returns boolean
language sql
stable
set search_path = ''
as $$
  select public.get_my_role() is not null;
$$;

create function public.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(public.get_my_role() = 'admin', false);
$$;

create function public.is_admin_or_manager()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(public.get_my_role() in ('admin', 'manager'), false);
$$;

-- -------------------------------------------------------------
-- Shared trigger function: keeps updated_at current on UPDATE.
-- Used by customers, leads and jobs.
-- -------------------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

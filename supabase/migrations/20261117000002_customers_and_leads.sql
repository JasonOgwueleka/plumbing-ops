-- =============================================================
-- 002: customers and leads
-- =============================================================

create table public.customers (
  id          uuid primary key default gen_random_uuid(),
  first_name  text not null,
  last_name   text not null,
  email       text,
  phone       text,
  address     text,
  city        text,
  notes       text,
  created_by  uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger customers_set_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();


create table public.leads (
  id                     uuid primary key default gen_random_uuid(),
  first_name             text not null,
  last_name              text not null,
  email                  text,
  phone                  text,
  address                text,
  city                   text,
  source                 text,          -- e.g. website, referral, phone
  description            text,          -- what the lead needs done
  status                 text not null default 'new'
                           check (status in ('new', 'contacted', 'converted', 'lost')),
  converted_customer_id  uuid references public.customers (id) on delete set null,
  created_by             uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create trigger leads_set_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

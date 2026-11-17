-- =============================================================
-- 005: business-rule triggers and the convert_lead function
-- =============================================================

-- -------------------------------------------------------------
-- Technicians may only change a job's STATUS.
--
-- RLS decides which ROWS a user can update, but it cannot limit
-- which COLUMNS they change, so this trigger does that part.
-- It only applies to logged-in browser users (current_user is
-- 'authenticated'); seed.sql and the service role are not affected.
-- -------------------------------------------------------------
create function public.guard_technician_job_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated' and not public.is_admin_or_manager() then

    if (new.id, new.title, new.description, new.customer_id, new.address,
        new.scheduled_date, new.assigned_to, new.lead_id, new.created_by, new.created_at)
       is distinct from
       (old.id, old.title, old.description, old.customer_id, old.address,
        old.scheduled_date, old.assigned_to, old.lead_id, old.created_by, old.created_at)
    then
      raise exception 'Technicians can only change the status of a job';
    end if;

    -- Re-opening as "new" or cancelling is a dispatcher decision.
    if new.status is distinct from old.status
       and new.status in ('new', 'cancelled') then
      raise exception 'Technicians cannot set a job to "%"', new.status;
    end if;

  end if;

  return new;
end;
$$;

create trigger jobs_guard_technician_update
  before update on public.jobs
  for each row execute function public.guard_technician_job_update();


-- -------------------------------------------------------------
-- Jobs can only be assigned to an ACTIVE TECHNICIAN.
-- Only checked when the assignment is set or changed, so existing
-- jobs of a since-deactivated technician can still be edited.
-- -------------------------------------------------------------
create function public.check_job_assignment()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.assigned_to is not null
     and (tg_op = 'INSERT' or new.assigned_to is distinct from old.assigned_to)
  then
    if not exists (
      select 1 from public.profiles
      where id = new.assigned_to
        and role = 'technician'
        and is_active = true
    ) then
      raise exception 'Jobs can only be assigned to an active technician';
    end if;
  end if;

  return new;
end;
$$;

create trigger jobs_check_assignment
  before insert or update on public.jobs
  for each row execute function public.check_job_assignment();


-- -------------------------------------------------------------
-- convert_lead: turns a lead into a customer AND a job in one
-- transaction (either everything succeeds or nothing changes).
--
-- SECURITY INVOKER (the default) means it runs with the caller's
-- permissions, so all the normal RLS policies still apply.
--
-- Called from the frontend with:
--   supabase.rpc('convert_lead', { p_lead_id, p_job_title, ... })
-- Returns the id of the new job.
-- -------------------------------------------------------------
create function public.convert_lead(
  p_lead_id          uuid,
  p_job_title        text,
  p_job_description  text default null,
  p_scheduled_date   timestamptz default null,
  p_assigned_to      uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_lead         public.leads;
  v_customer_id  uuid;
  v_job_id       uuid;
begin
  if not public.is_admin_or_manager() then
    raise exception 'Only admins and managers can convert leads';
  end if;

  if coalesce(trim(p_job_title), '') = '' then
    raise exception 'A job title is required';
  end if;

  -- "for update" locks the lead row so two people can't convert it at once.
  select * into v_lead from public.leads where id = p_lead_id for update;

  if not found then
    raise exception 'Lead not found';
  end if;

  if v_lead.status = 'converted' then
    raise exception 'This lead has already been converted';
  end if;

  -- 1. Create the customer from the lead's contact details.
  insert into public.customers (first_name, last_name, email, phone, address, city, notes)
  values (
    v_lead.first_name, v_lead.last_name, v_lead.email, v_lead.phone,
    v_lead.address, v_lead.city,
    'Converted from lead (source: ' || coalesce(v_lead.source, 'unknown') || ')'
  )
  returning id into v_customer_id;

  -- 2. Create the job. It is "scheduled" only if it has both a date and a technician.
  insert into public.jobs (title, description, customer_id, address,
                           scheduled_date, assigned_to, status, lead_id)
  values (
    trim(p_job_title),
    coalesce(p_job_description, v_lead.description),
    v_customer_id,
    concat_ws(', ', v_lead.address, v_lead.city),
    p_scheduled_date,
    p_assigned_to,
    case when p_scheduled_date is not null and p_assigned_to is not null
         then 'scheduled' else 'new' end,
    p_lead_id
  )
  returning id into v_job_id;

  -- 3. Mark the lead as converted.
  update public.leads
  set status = 'converted',
      converted_customer_id = v_customer_id
  where id = p_lead_id;

  return v_job_id;
end;
$$;

-- Only logged-in users can call it (and the function itself checks the role).
revoke execute on function public.convert_lead(uuid, text, text, timestamptz, uuid) from public, anon;
grant  execute on function public.convert_lead(uuid, text, text, timestamptz, uuid) to authenticated;

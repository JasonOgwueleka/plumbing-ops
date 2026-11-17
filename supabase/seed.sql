-- =============================================================
-- seed.sql: FAKE demo data for the shared Supabase project.
--
-- This file does NOT create login accounts or contain passwords,
-- because the repo is on GitHub and the database is on the internet.
--
-- BEFORE running it, create these 5 users in the Supabase dashboard
-- (Authentication → Users → Add user → Create new user, tick
-- "Auto Confirm User") with passwords of your choice:
--
--   admin@example.com        → Admin
--   manager@example.com      → Manager
--   tom.tech@example.com     → Technician
--   priya.tech@example.com   → Technician
--   sam.former@example.com   → Technician (gets deactivated below)
--
-- THEN paste this whole file into the dashboard's SQL Editor and
-- click Run. Run it ONCE. It's wrapped in a transaction, so if
-- anything fails, nothing is saved.
-- =============================================================

begin;

-- ---------------------------------------------------------------
-- 0. Stop early with a clear message if a user is missing.
-- ---------------------------------------------------------------
do $$
declare
  missing text;
begin
  select string_agg(e, ', ') into missing
  from unnest(array[
    'admin@example.com', 'manager@example.com', 'tom.tech@example.com',
    'priya.tech@example.com', 'sam.former@example.com'
  ]) as e
  where not exists (select 1 from auth.users where email = e);

  if missing is not null then
    raise exception 'Create these users in Authentication → Users first: %', missing;
  end if;
end $$;

-- Small helper for this script only: looks up a user's id by email.
-- (pg_temp functions disappear when the SQL Editor session ends.)
create function pg_temp.staff(p_email text) returns uuid
language sql stable as $$
  select id from auth.users where email = p_email;
$$;


-- ---------------------------------------------------------------
-- 1. Profiles (name + role for each login account)
-- Sam starts active so we can give them a past job, and is
-- deactivated at the bottom of this file.
-- ---------------------------------------------------------------
insert into public.profiles (id, full_name, email, phone, role, is_active) values
  (pg_temp.staff('admin@example.com'),      'Dana Owens',   'admin@example.com',      '555-0100', 'admin',      true),
  (pg_temp.staff('manager@example.com'),    'Maria Lopez',  'manager@example.com',    '555-0101', 'manager',    true),
  (pg_temp.staff('tom.tech@example.com'),   'Tom Becker',   'tom.tech@example.com',   '555-0102', 'technician', true),
  (pg_temp.staff('priya.tech@example.com'), 'Priya Sharma', 'priya.tech@example.com', '555-0103', 'technician', true),
  (pg_temp.staff('sam.former@example.com'), 'Sam Fletcher', 'sam.former@example.com', '555-0104', 'technician', true);


-- ---------------------------------------------------------------
-- 2. Customers
-- ---------------------------------------------------------------
insert into public.customers (id, first_name, last_name, email, phone, address, city, notes, created_by) values
  ('c0000000-0000-0000-0000-000000000001', 'Linda',  'Carter',   'linda.carter@example.net',  '555-1001', '12 Oak Street',   'Springfield',  'Has a dog, call before arriving.',     pg_temp.staff('manager@example.com')),
  ('c0000000-0000-0000-0000-000000000002', 'James',  'Nguyen',   'james.nguyen@example.net',  '555-1002', '48 Maple Avenue', 'Springfield',  null,                                   pg_temp.staff('manager@example.com')),
  ('c0000000-0000-0000-0000-000000000003', 'Rosa',   'Martinez', 'rosa.m@example.net',        '555-1003', '7 Birch Lane',    'Shelbyville',  'Prefers morning appointments.',        pg_temp.staff('manager@example.com')),
  ('c0000000-0000-0000-0000-000000000004', 'Peter',  'Okafor',   'p.okafor@example.net',      '555-1004', '301 River Road',  'Springfield',  null,                                   pg_temp.staff('admin@example.com')),
  ('c0000000-0000-0000-0000-000000000005', 'Grace',  'Kim',      'grace.kim@example.net',     '555-1005', '22 Elm Court',    'Capital City', 'Landlord, owns 3 rental units.',       pg_temp.staff('manager@example.com')),
  ('c0000000-0000-0000-0000-000000000006', 'Harbor', 'Café',     'manager@harborcafe.example','555-1006', '5 Harbor Front',  'Shelbyville',  'Commercial customer. Kitchen sinks.',  pg_temp.staff('manager@example.com')),
  ('c0000000-0000-0000-0000-000000000007', 'Owen',   'Walsh',    null,                        '555-1007', '90 Pine Street',  'Springfield',  null,                                   pg_temp.staff('manager@example.com')),
  ('c0000000-0000-0000-0000-000000000008', 'Fatima', 'Hassan',   'fatima.h@example.net',      '555-1008', '14 Cedar Drive',  'Capital City', null,                                   pg_temp.staff('manager@example.com'));


-- ---------------------------------------------------------------
-- 3. Leads (one already converted into customer 8 + a job)
-- ---------------------------------------------------------------
insert into public.leads (id, first_name, last_name, email, phone, address, city, source, description, status, converted_customer_id, created_by) values
  ('e0000000-0000-0000-0000-000000000001', 'Brian',  'Foster', 'brian.f@example.net',  '555-2001', '3 Willow Way',      'Springfield',  'website',  'Water heater making banging noises.',         'new',       null, pg_temp.staff('manager@example.com')),
  ('e0000000-0000-0000-0000-000000000002', 'Chloe',  'Dubois', 'chloe.d@example.net',  '555-2002', '88 Aspen Street',   'Shelbyville',  'referral', 'Wants a quote for a bathroom re-pipe.',       'contacted', null, pg_temp.staff('manager@example.com')),
  ('e0000000-0000-0000-0000-000000000003', 'Marcus', 'Reid',   null,                   '555-2003', '61 Spruce Avenue',  'Capital City', 'phone',    'Low water pressure in the whole house.',      'new',       null, pg_temp.staff('manager@example.com')),
  ('e0000000-0000-0000-0000-000000000004', 'Ella',   'Novak',  'ella.n@example.net',   '555-2004', '19 Poplar Road',    'Springfield',  'website',  'Asked about price for a new toilet install.', 'lost',      null, pg_temp.staff('manager@example.com')),
  ('e0000000-0000-0000-0000-000000000005', 'Fatima', 'Hassan', 'fatima.h@example.net', '555-1008', '14 Cedar Drive',    'Capital City', 'referral', 'Leaking kitchen faucet.',                     'converted', 'c0000000-0000-0000-0000-000000000008', pg_temp.staff('manager@example.com')),
  ('e0000000-0000-0000-0000-000000000006', 'George', 'Ito',    'g.ito@example.net',    '555-2006', '230 Lakeview Blvd', 'Shelbyville',  'phone',    'Sump pump not turning on.',                   'contacted', null, pg_temp.staff('manager@example.com'));


-- ---------------------------------------------------------------
-- 4. Jobs
-- Dates are relative to when this script runs (now()), so "today"
-- is only today on the day you run it. Edit jobs in the app to
-- move them to another day.
-- ---------------------------------------------------------------
insert into public.jobs (id, title, description, customer_id, address, scheduled_date, assigned_to, status, lead_id, created_by) values
  -- Today
  ('b0000000-0000-0000-0000-000000000001', 'Fix leaking kitchen faucet',        'Drip from the base of the faucet.',               'c0000000-0000-0000-0000-000000000008', '14 Cedar Drive, Capital City', date_trunc('day', now()) + interval '9 hours',  pg_temp.staff('tom.tech@example.com'),   'scheduled',   'e0000000-0000-0000-0000-000000000005', pg_temp.staff('manager@example.com')),
  ('b0000000-0000-0000-0000-000000000002', 'Unclog main sewer line',            'Backing up into basement floor drain.',           'c0000000-0000-0000-0000-000000000001', '12 Oak Street, Springfield',   date_trunc('day', now()) + interval '11 hours', pg_temp.staff('tom.tech@example.com'),   'in_progress', null, pg_temp.staff('manager@example.com')),
  ('b0000000-0000-0000-0000-000000000003', 'Install new water heater',          '50 gallon gas unit, customer has purchased it.',  'c0000000-0000-0000-0000-000000000002', '48 Maple Avenue, Springfield', date_trunc('day', now()) + interval '13 hours', pg_temp.staff('priya.tech@example.com'), 'scheduled',   null, pg_temp.staff('manager@example.com')),
  ('b0000000-0000-0000-0000-000000000004', 'Commercial sink inspection',        'Quarterly check of all kitchen sinks and traps.', 'c0000000-0000-0000-0000-000000000006', '5 Harbor Front, Shelbyville',  date_trunc('day', now()) + interval '15 hours', pg_temp.staff('priya.tech@example.com'), 'scheduled',   null, pg_temp.staff('admin@example.com')),
  -- Upcoming
  ('b0000000-0000-0000-0000-000000000005', 'Replace toilet fill valve',         'Toilet runs constantly.',                         'c0000000-0000-0000-0000-000000000003', '7 Birch Lane, Shelbyville',    date_trunc('day', now()) + interval '1 day 10 hours', pg_temp.staff('tom.tech@example.com'),   'scheduled', null, pg_temp.staff('manager@example.com')),
  ('b0000000-0000-0000-0000-000000000006', 'Rental unit 2: shower leak',        'Tenant reports water stain on ceiling below.',    'c0000000-0000-0000-0000-000000000005', '22 Elm Court, Capital City',   date_trunc('day', now()) + interval '2 days 9 hours', pg_temp.staff('priya.tech@example.com'), 'scheduled', null, pg_temp.staff('manager@example.com')),
  -- Not yet scheduled / assigned
  ('b0000000-0000-0000-0000-000000000007', 'Quote: outdoor spigot',             'Wants a new hose bib on the back wall.',          'c0000000-0000-0000-0000-000000000004', '301 River Road, Springfield',  null, null, 'new', null, pg_temp.staff('manager@example.com')),
  ('b0000000-0000-0000-0000-000000000008', 'Garbage disposal replacement',      null,                                              'c0000000-0000-0000-0000-000000000007', '90 Pine Street, Springfield',  null, null, 'new', null, pg_temp.staff('manager@example.com')),
  -- Past
  ('b0000000-0000-0000-0000-000000000009', 'Burst pipe emergency repair',       'Pipe burst under the kitchen sink.',              'c0000000-0000-0000-0000-000000000001', '12 Oak Street, Springfield',   date_trunc('day', now()) - interval '5 days' + interval '8 hours',  pg_temp.staff('sam.former@example.com'), 'completed', null, pg_temp.staff('manager@example.com')),
  ('b0000000-0000-0000-0000-000000000010', 'Drain cleaning',                    'Slow bathroom drain.',                            'c0000000-0000-0000-0000-000000000003', '7 Birch Lane, Shelbyville',    date_trunc('day', now()) - interval '3 days' + interval '14 hours', pg_temp.staff('tom.tech@example.com'),   'completed', null, pg_temp.staff('manager@example.com')),
  ('b0000000-0000-0000-0000-000000000011', 'Rental unit 1: water heater flush', null,                                              'c0000000-0000-0000-0000-000000000005', '22 Elm Court, Capital City',   date_trunc('day', now()) - interval '2 days' + interval '10 hours', pg_temp.staff('priya.tech@example.com'), 'completed', null, pg_temp.staff('manager@example.com')),
  ('b0000000-0000-0000-0000-000000000012', 'Sprinkler line repair',             'Customer cancelled: fixed it themselves.',        'c0000000-0000-0000-0000-000000000002', '48 Maple Avenue, Springfield', date_trunc('day', now()) - interval '1 day' + interval '9 hours',  pg_temp.staff('tom.tech@example.com'),   'cancelled', null, pg_temp.staff('manager@example.com'));


-- ---------------------------------------------------------------
-- 5. Job notes
-- ---------------------------------------------------------------
insert into public.job_notes (job_id, author_id, body, created_at) values
  ('b0000000-0000-0000-0000-000000000002', pg_temp.staff('manager@example.com'),    'Customer says the backup started after heavy rain.', now() - interval '1 day'),
  ('b0000000-0000-0000-0000-000000000002', pg_temp.staff('tom.tech@example.com'),   'On site. Running the camera down the line now.',      now() - interval '30 minutes'),
  ('b0000000-0000-0000-0000-000000000009', pg_temp.staff('sam.former@example.com'), 'Replaced 2ft section of copper. No more leaks.',      now() - interval '5 days'),
  ('b0000000-0000-0000-0000-000000000010', pg_temp.staff('tom.tech@example.com'),   'Cleared hair clog. Recommended a drain screen.',      now() - interval '3 days'),
  ('b0000000-0000-0000-0000-000000000003', pg_temp.staff('manager@example.com'),    'Gas shutoff valve is in the garage, left side.',      now() - interval '2 days');


-- ---------------------------------------------------------------
-- 6. Deactivate Sam (former employee) so you can test that
--    deactivated users are locked out. This does the same two
--    things as the Employees page: flag the profile and ban the
--    login.
-- ---------------------------------------------------------------
update public.profiles
set is_active = false
where id = pg_temp.staff('sam.former@example.com');

update auth.users
set banned_until = now() + interval '100 years'
where id = pg_temp.staff('sam.former@example.com');

commit;

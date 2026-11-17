// =============================================================
// Edge function: manage-employee
//
// Lets an ADMIN create, deactivate and reactivate staff accounts.
//
// This needs the service role key (it bypasses RLS and can manage
// Supabase Auth users), so it must only ever run on the server.
// Supabase injects SUPABASE_URL, SUPABASE_ANON_KEY and
// SUPABASE_SERVICE_ROLE_KEY automatically; they are never sent
// to the browser.
//
// Request body (JSON), one of:
//   { "action": "create", "email", "password", "full_name", "phone", "role" }
//   { "action": "deactivate", "user_id" }
//   { "action": "reactivate", "user_id" }
// =============================================================

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const VALID_ROLES = ['admin', 'manager', 'technician']

// Banning a user in Supabase Auth blocks them from logging in or
// refreshing their session. ~100 years = effectively permanent.
const BAN_FOREVER = '876000h'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  // Browsers send an OPTIONS "preflight" request before the real one.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // ---- 1. Who is calling? ---------------------------------------
  // Use the caller's own JWT to find out who they are.
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return json({ error: 'Not logged in' }, 401)
  }

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData, error: userError } = await callerClient.auth.getUser()
  if (userError || !userData.user) {
    return json({ error: 'Not logged in' }, 401)
  }
  const callerId = userData.user.id

  // ---- 2. Is the caller an active admin? ------------------------
  // The admin client uses the service role key and bypasses RLS.
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: callerProfile } = await admin
    .from('profiles')
    .select('role, is_active')
    .eq('id', callerId)
    .single()

  if (!callerProfile || callerProfile.role !== 'admin' || !callerProfile.is_active) {
    return json({ error: 'Only admins can manage employees' }, 403)
  }

  // ---- 3. Do the requested action -------------------------------
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  switch (body.action) {
    case 'create':
      return await createEmployee(admin, body)
    case 'deactivate':
      return await setActive(admin, callerId, body.user_id, false)
    case 'reactivate':
      return await setActive(admin, callerId, body.user_id, true)
    default:
      return json({ error: 'Unknown action' }, 400)
  }
})

// -------------------------------------------------------------
// Create a new staff account (auth user + profile row)
// -------------------------------------------------------------
async function createEmployee(admin: SupabaseClient, body: Record<string, unknown>) {
  const email = String(body.email ?? '').trim().toLowerCase()
  const password = String(body.password ?? '')
  const fullName = String(body.full_name ?? '').trim()
  const phone = String(body.phone ?? '').trim() || null
  const role = String(body.role ?? '')

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'Please enter a valid email address' }, 400)
  }
  if (password.length < 8) {
    return json({ error: 'Password must be at least 8 characters' }, 400)
  }
  if (!fullName) {
    return json({ error: 'Full name is required' }, 400)
  }
  if (!VALID_ROLES.includes(role)) {
    return json({ error: 'Role must be admin, manager or technician' }, 400)
  }

  // email_confirm: true, because staff are created by the admin, so
  // there's no confirmation email step.
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (createError || !created.user) {
    return json({ error: createError?.message ?? 'Could not create user' }, 400)
  }

  const { error: profileError } = await admin.from('profiles').insert({
    id: created.user.id,
    full_name: fullName,
    email,
    phone,
    role,
  })

  if (profileError) {
    // Undo the auth user so we don't leave an account with no profile.
    await admin.auth.admin.deleteUser(created.user.id)
    return json({ error: 'Could not create profile: ' + profileError.message }, 400)
  }

  return json({ ok: true, user_id: created.user.id })
}

// -------------------------------------------------------------
// Deactivate / reactivate an account
// -------------------------------------------------------------
async function setActive(
  admin: SupabaseClient,
  callerId: string,
  userId: unknown,
  active: boolean,
) {
  if (typeof userId !== 'string' || !userId) {
    return json({ error: 'user_id is required' }, 400)
  }
  if (userId === callerId) {
    // Prevents the only admin from accidentally locking themselves out.
    return json({ error: 'You cannot change your own account status' }, 400)
  }

  // 1. Ban / unban in Supabase Auth (controls whether they can log in).
  const { error: authError } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: active ? 'none' : BAN_FOREVER,
  })
  if (authError) {
    return json({ error: authError.message }, 400)
  }

  // 2. Update the profile flag (controls access via the RLS policies,
  //    which takes effect immediately, even for an already-issued token).
  const { error: profileError } = await admin
    .from('profiles')
    .update({ is_active: active })
    .eq('id', userId)

  if (profileError) {
    return json({ error: profileError.message }, 400)
  }

  return json({ ok: true })
}

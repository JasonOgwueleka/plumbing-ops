import { supabase } from './supabase'

// Active technicians, for "assign to" dropdowns.
export async function fetchTechnicians() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'technician')
    .eq('is_active', true)
    .order('full_name')
  if (error) throw error
  return data
}

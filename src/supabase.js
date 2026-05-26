import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

// Fetch all restaurants
export async function getRestaurants() {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// Add a restaurant
export async function addRestaurant(restaurant) {
  const { data, error } = await supabase
    .from('restaurants')
    .insert([restaurant])
    .select()
    .single()
  if (error) throw error
  return data
}

// Update a restaurant
export async function updateRestaurant(id, updates) {
  const { data, error } = await supabase
    .from('restaurants')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// Delete a restaurant
export async function deleteRestaurant(id) {
  const { error } = await supabase
    .from('restaurants')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// Verify PIN (stored as plain text in a settings table — fine for a private 2-person app)
export async function verifyPin(pin) {
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'edit_pin')
    .single()
  if (error) return false
  return data.value === pin
}

// Subscribe to real-time changes
export function subscribeToRestaurants(callback) {
  return supabase
    .channel('restaurants-channel')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurants' }, callback)
    .subscribe()
}

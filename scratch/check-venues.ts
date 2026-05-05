import { supabaseAdmin } from '../lib/supabase-admin';

async function listVenues() {
  const { data, error } = await supabaseAdmin.from('venues').select('id, name');
  if (error) {
    console.error('Error fetching venues:', error);
  } else {
    console.log('Venues in DB:', data);
  }
}

listVenues();

import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { error } = await supabase.from('queue_items').insert({
    venue_id: '00000000-0000-0000-0000-000000000001',
    song_id: null,
    position: Date.now(),
    is_playing: false,
  });
  console.log('Error:', error);
}
run();

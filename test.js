import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kkphrgjlxrcrhsgfhvhb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_5fgh4nPbrWbpEzbDtogvHA_dc9pvJDU'; // publishable key only, never the secret key

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const outletId = 0; // try 0 for all, then a real cafe_id

let query = sb.from('items')
  .select('item_id, item_name, price, item_rating, cafe_id');
if (outletId) query = query.eq('cafe_id', outletId);

const { data, error } = await query;

if (error) {
  console.error('Query failed:', error);
} else {
  console.log(`Got ${data.length} rows`);
  console.log(JSON.stringify(data, null, 2));
}
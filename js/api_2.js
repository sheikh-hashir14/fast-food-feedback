const supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_PUBLISHABLE_KEY);

let cafes = supabase
        .from('cafeterias')
        .select('cafe_id, cafe_name, cafe_rating, cafe_loc');

        
console.log(cafes);
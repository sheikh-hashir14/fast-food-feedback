const Api = (() => {
  
  const supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_PUBLISHABLE_KEY);

  function mapItem(i){
    return{
      id: i.item_id,
      name: i.item_name,
      price: i.price,
      cafe: i.cafeterias?.cafe_name??'',
      rating: i.item_rating
      //review_count
    }
  }

  function mapReview(r){
    return{
      id: r.review_id,
      item: r.items?.item_name??'',
      cafe: r.cafeterias?.cafe_name??'',
      rating: r.rating,
      text: r.review_text
    }
  }

  async function getOutlets(){
    const {data, error} = await supabase
      .from('cafeterias')
      .select('cafe_id, cafe_name, cafe_rating, cafe_loc');
    
    if(error) throw error;

    return data.map((o) => ({
      id: o.cafe_id,
      name: o.cafe_name,
      location: o.cafe_loc,
      rating: o.cafe_rating
      //item_count
    }));
  }

  async function getItems(cafeId){
    let itemQuery = supabase
      .from('items')
      .select('item_id, item_name, price, item_rating, cafeterias(cafe_name)');

    if(cafeId) itemQuery = itemQuery.eq('cafe_id', cafeId);

    const {data, error} = await itemQuery;
    if(error) throw error;
    return data.map(mapItem);
  }

  async function getReviews(itemId){
    const {data, error} = await supabase
      .from('reviews')
      .select('review_id, items(item_name), cafeterias(cafe_name), rating, review_text')
      .eq('item_id', itemId)
      .order('submitted_at', {ascending: false});

      if(error) throw error;

      return data.map(mapReview); 
  }

  async function getTopRated(){
    const {data, error} = await supabase
      .from('items')
      .select('item_id, item_name, price, item_rating, cafeterias(cafe_name)')
      .not('item_rating', 'is', null)
      .order('item_rating', {ascending: false})
      .limit(CONFIG.TOP_RATED_LIMIT);
    
    if(error) throw error;
    return data.map(mapItem);
  }

  async function createReview(payload){
    const rating = Number(payload.rating);
    
    if(rating > 5 || rating < 1) throw new Error("Rating Must be between 1 and 5.");

    const itemID = Number(payload.item_id);
    const {data:item, error:itemError} = await supabase
      .from('items')
      .select('item_id, item_name, price, cafe_id')
      .eq('item_id', itemID)
      .single();
    console.log('item lookup failed:', itemError, 'payload:', payload);
    if(itemError) throw new Error("Sorry, This Item no longer Exists");

    const {data:review, error} = await supabase
      .from('reviews')
      .insert({
        item_id: item.item_id,
        cafe_id: item.cafe_id,
        rating,
        review_text: String(payload.review_text || '').trim()
      })
      .select('review_id, items(item_name), cafeterias(cafe_name), rating, review_text')
      .single();
    if(error) throw error;

    const {data: fresh, error: freshError} = await supabase
      .from('items')
      .select('item_id, item_name, price, item_rating, cafeterias(cafe_name)')
      .eq('item_id',itemID)
      .single();
    if(freshError) throw freshError;

    return {review: mapReview(review), item: mapItem(fresh)};
  }

  return {getOutlets, getItems, getReviews, getTopRated, createReview};
})();
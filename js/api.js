/* ==========================================================================
   api.js
   All communication with n8n lives here. Nothing else in the app calls fetch.

   Every function returns the `data` part of the API envelope:
     { success: true, data: ..., error: null }
   On failure it throws an Error whose message is safe to show to the user.

   When CONFIG.USE_MOCK_DATA is true the functions use MOCK below instead of
   the network. The mock mirrors database/seed.sql so the UI can be built and
   tested before n8n exists. Mock reviews disappear when the page reloads.
   ========================================================================== */

const Api = (() => {

  const supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABSE_PUBLISHABLE_KEY);
  // ------------------------------------------------------------------------
  // Mock data (a shortened copy of database/seed.sql)
  // ------------------------------------------------------------------------
  const MOCK = {
    outlets: [
      { cafe_id: 1, cafe_name: 'Main Cafeteria', cafe_loc: 'Academic Block A, Ground Floor', cafe_rating: 4.7 },
      { cafe_id: 2, cafe_name: 'Chai Dhaba', cafe_loc: 'Beside the Sports Complex', cafe_rating: 4.2 },
      { cafe_id: 3, cafe_name: 'Sandwich Corner', cafe_loc: 'Library entrance', cafe_rating: 4. },
      { cafe_id: 4, cafe_name: 'Hostel Dhaba', cafe_loc: 'Hostel Block C courtyard', cafe_rating: 3.7 }  
    ],

    items: [
      { item_id: 1, cafe_id: 1, item_name: 'Chicken Biryani', price: 320 },
      { item_id: 2, cafe_id: 1, item_name: 'Beef Burger', price: 350 },
      { item_id: 3, cafe_id: 1, item_name: 'Chicken Shawarma', price: 220 },
      { item_id: 4, cafe_id: 1, item_name: 'Aloo Paratha', price: 120 },
      { item_id: 5, cafe_id: 1, item_name: 'Cold Coffee', price: 180 },
      { item_id: 6, cafe_id: 1, item_name: 'Chocolate Brownie', price: 150 },
      { item_id: 7, cafe_id: 1, item_name: 'Chicken Karahi (half)', price: 480 },
      { item_id: 8, cafe_id: 2, item_name: 'Doodh Patti Chai', price: 60 },
      { item_id: 9, cafe_id: 2, item_name: 'Paratha Roll', price: 160 },
      { item_id: 10, cafe_id: 2, item_name: 'Samosa (2 pcs)', price: 50 },
      { item_id: 11, cafe_id: 2, item_name: 'Plain Omelette', price: 90 },
      { item_id: 12, cafe_id: 2, item_name: 'Bun Kabab', item_price: 130 },
      { item_id: 13, cafe_id: 2, item_name: 'Chicken Karahi', item_price: 520 },
      { item_id: 14, cafe_id: 3, item_name: 'Club Sandwich', price: 280 },
      { item_id: 15, cafe_id: 3, item_name: 'Chicken Cheese Sandwich', price: 320 },
      { item_id: 16, cafe_id: 3, item_name: 'Veggie Sandwich', price: 200 },
      { item_id: 17, cafe_id: 3, item_name: 'French Fries', price: 150 },
      { item_id: 18, cafe_id: 3, item_name: 'Fresh Lime Soda', price: 120 },
      { item_id: 19, cafe_id: 3, item_name: 'Chocolate Shake',  price: 250 },
      { item_id: 20, cafe_id: 4, item_name: 'Daal Chawal', price: 180 },
      { item_id: 21, cafe_id: 4, item_name: 'Chicken Qorma with Rice', price: 340 },
      { item_id: 22, cafe_id: 4, item_name: 'Egg Fried Rice', price: 260 },
      { item_id: 23, cafe_id: 4, item_name: 'Chana Chaat', price: 100 },
      { item_id: 24, cafe_id: 4, item_name: 'Cutting Chai', price: 40 },
      { item_id: 25, cafe_id: 4, item_name: 'Zarda Rice', price: 120 }
    ],

    // created_at is generated below so the dates always look recent.
    reviews: [
      { review_id: 1, item_id: 1, rating: 5, review_text: 'Rice is always fresh and the masala is actually spicy. Best value in the cafeteria.' },
      { review_id: 2, item_id: 1, rating: 4, review_text: 'Good portion for the price. Gets crowded after 1pm.' },
      { review_id: 3, item_id: 2, rating: 3, review_text: 'Burger is fine but the patty is thin for Rs 350.' },
      { review_id: 4, item_id: 3, rating: 5, review_text: 'Fast, cheap and reliable between classes.' },
      { review_id: 5, item_id: 3, rating: 4, review_text: 'Better than the burger here.' },
      { review_id: 6, item_id: 4, rating: 4, review_text: 'Paratha is crispy and the chai combo is under Rs 200.' },
      { review_id: 7, item_id: 5, rating: 2, review_text: 'Mostly ice and sugar. Skip it.' },
      { review_id: 8, item_id: 7, rating: 5, review_text: 'Expensive but enough for two people.' },
      { review_id: 9, item_id: 8, rating: 5, review_text: 'Proper doodh patti, strong and not too sweet.' },
      { review_id: 10, item_id: 8, rating: 5, review_text: 'The only reason I survive 8am lectures.' },
      { review_id: 11, item_id: 9, rating: 4, review_text: 'Filling and quick. Ask for less oil.' },
      { review_id: 12, item_id: 13, rating: 4, review_text: 'Share it with a friend, otherwise it is too much.' },
      { review_id: 13, item_id: 14, rating: 5, review_text: 'Stacked properly and the bread is toasted.' },
      { review_id: 14, item_id: 15, rating: 4, review_text: 'Cheese actually melts.' },
      { review_id: 15, item_id: 17, rating: 3, review_text: 'Hit or miss depending on who is on the counter.' },
      { review_id: 16, item_id: 20, rating: 4, review_text: 'Cheap, hot and filling.' },
      { review_id: 17, item_id: 21, rating: 5, review_text: 'Best thing at the hostel dhaba.' },
      { review_id: 18, item_id: 23, rating: 3, review_text: 'Papri gets soggy fast.' },
      { review_id: 19, item_id: 24, rating: 5, review_text: 'Rs 40 chai that actually tastes like chai.' },
      { review_id: 20, item_id: 25, rating: 4, review_text: 'Sweet and warm. Good on a cold day.' }
    ]
  };

  let mockNextId = 9001;

  // Turn relative "daysAgo" values into real ISO timestamps once, at load time.
  MOCK.reviews = MOCK.reviews.map((review) => {
    const { daysAgo, ...rest } = review;
    return {
      ...rest,
      created_at: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString()
    };
  });

  // ------------------------------------------------------------------------
  // Mock helpers
  // ------------------------------------------------------------------------
  function pause(ms = 300) {
    // Small delay so loading states are actually visible during development.
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function mockOutletName(outletId) {
    const outlet = MOCK.outlets.find((entry) => entry.id === outletId);
    return outlet ? outlet.name : 'Unknown outlet';
  }

  function mockSummary(itemId) {
    const reviews = MOCK.reviews.filter((review) => review.item_id === itemId);
    const total = reviews.reduce((sum, review) => sum + review.rating, 0);
    return {
      review_count: reviews.length,
      // Same rounding as the SQL: one decimal place, 0 when there are no reviews.
      average_rating: reviews.length ? Math.round((total / reviews.length) * 10) / 10 : 0
    };
  }

  function mockItem(item) {
    return {
      ...item,
      outlet_name: mockOutletName(item.outlet_id),
      ...mockSummary(item.id)
    };
  }

  // ------------------------------------------------------------------------
  // Public API
  // ------------------------------------------------------------------------
  async function getOutlets() {
    if (CONFIG.USE_MOCK_DATA) {
      await pause();
      return MOCK.outlets.map((outlet) => ({
        ...outlet,
        item_count: MOCK.items.filter((item) => item.outlet_id === outlet.id).length
      }));
    }

    let query = supabase.from('cafeterias').select('cafe_name, cafe_rating, cafe_loc');
    const { data, error } = await query;
    if(error) throw error;
    return data.map((o) => ({
      id: o.cafe_id,
      name: o.cafe_name,
      rating: o.cafe_rating,
      location: o.cafe_loc
    }));
  }

  async function getItems(outletId = 0) {
    if (CONFIG.USE_MOCK_DATA) {
      await pause();
      return MOCK.items
        .filter((item) => !outletId || item.outlet_id === outletId)
        .map(mockItem);
    }
    else{
      let item_query = supabase.from('items').select('item_name, item_rating, cafe_id, price');
      if (outletId) item_query = item_query.eq('cafe_id', outletId);

      const { data, error } = await item_query;
      if (error) throw error;
      return data.map((i) => ({
        id: i.item_id,
        name: i.item_name,
        price: i.price,
        outlet_id: i.cafe_id,
        outlet_name: i.cafsudoeterias?.name ?? '',
        average_rating: i.item_rating,
        review_count: 0   
      }));
    }
  }

  async function getReviews(itemId) {
    if (CONFIG.USE_MOCK_DATA) {
      await pause(200);
      return MOCK.reviews
        .filter((review) => review.item_id === itemId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .map(publicReview);
    }
    return request(`${CONFIG.API.reviews}?item_id=${encodeURIComponent(itemId)}`);
  }

  async function getTopRated() {
    if (CONFIG.USE_MOCK_DATA) {
      await pause();
      return MOCK.items
        .map(mockItem)
        .filter((item) => item.review_count > 0)
        .sort(
          (a, b) =>
            b.average_rating - a.average_rating ||
            b.review_count - a.review_count ||
            a.name.localeCompare(b.name)
        )
        .slice(0, CONFIG.TOP_RATED_LIMIT);
    }
    let query = supabase.from('items')
                        .select('item_name, item_rating, cafe_id, price')
                        .order('cafe_rating', {ascending: false}).limit(3);
    if(error) throw error;
    return data;
  }

  async function createReview(payload) {
    if (CONFIG.USE_MOCK_DATA) {
      await pause(400);

      // The mock repeats the backend rules so the UI can show real errors.
      if (payload.website) {
        throw new Error('Submission rejected.');
      }

      const rating = Number(payload.rating);
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        throw new Error('Rating must be a whole number from 1 to 5.');
      }

      const item = MOCK.items.find((entry) => entry.id === Number(payload.item_id));
      if (!item) {
        throw new Error('That item no longer exists.');
      }

      const duplicate = MOCK.reviews.some(
        (review) => review.item_id === item.id && review.device_id === payload.device_id
      );
      if (duplicate) {
        throw new Error('You have already reviewed this item from this device.');
      }

      const hourAgo = Date.now() - 60 * 60 * 1000;
      const recentCount = MOCK.reviews.filter(
        (review) =>
          review.device_id === payload.device_id &&
          new Date(review.created_at).getTime() > hourAgo
      ).length;
      if (recentCount >= CONFIG.LIMITS.REVIEWS_PER_HOUR) {
        throw new Error('Too many reviews from this device. Please try again later.');
      }

      const review = {
        id: mockNextId++,
        item_id: item.id,
        reviewer_name: String(payload.reviewer_name).trim(),
        rating,
        review_text: String(payload.review_text || '').trim(),
        created_at: new Date().toISOString(),
        device_id: payload.device_id
      };
      MOCK.reviews.push(review);

      return { review: publicReview(review), item: mockItem(item) };
    }

    return request(CONFIG.API.createReview, { method: 'POST', body: payload });
  }
  
  // The mock repeats the backend rules so the UI can show real errors.
  if (payload.website) {
    throw new Error('Submission rejected.');
  }
  const rating = Number(payload.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error('Rating must be a whole number from 1 to 5.');
  }

  const review = {
    id: mockNextId++,
    item_id: item.id,
    reviewer_name: String(payload.reviewer_name).trim(),
    rating,
    review_text: String(payload.review_text || '').trim(),
    created_at: new Date().toISOString(),
    device_id: payload.device_id;
  }

  let insert = sb
    .from('reviews')
    .insert({
      item_id: item.id,
      cafe_id: 
    });



  return { getOutlets, getItems, getReviews, getTopRated, createReview };
})();

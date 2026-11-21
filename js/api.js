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
  // ------------------------------------------------------------------------
  // Mock data (a shortened copy of database/seed.sql)
  // ------------------------------------------------------------------------
  const MOCK = {
    outlets: [
      { id: 1, name: 'Main Cafeteria', type: 'cafeteria', location: 'Academic Block A, Ground Floor' },
      { id: 2, name: 'Chai Dhaba', type: 'dhaba', location: 'Beside the Sports Complex' },
      { id: 3, name: 'Sandwich Corner', type: 'kiosk', location: 'Library entrance' },
      { id: 4, name: 'Hostel Dhaba', type: 'dhaba', location: 'Hostel Block C courtyard' }
    ],

    items: [
      { id: 1, outlet_id: 1, name: 'Chicken Biryani', category: 'Desi', price: 320 },
      { id: 2, outlet_id: 1, name: 'Beef Burger', category: 'Fast Food', price: 350 },
      { id: 3, outlet_id: 1, name: 'Chicken Shawarma', category: 'Fast Food', price: 220 },
      { id: 4, outlet_id: 1, name: 'Aloo Paratha', category: 'Breakfast', price: 120 },
      { id: 5, outlet_id: 1, name: 'Cold Coffee', category: 'Beverages', price: 180 },
      { id: 6, outlet_id: 1, name: 'Chocolate Brownie', category: 'Dessert', price: 150 },
      { id: 7, outlet_id: 1, name: 'Chicken Karahi (half)', category: 'Desi', price: 480 },
      { id: 8, outlet_id: 2, name: 'Doodh Patti Chai', category: 'Beverages', price: 60 },
      { id: 9, outlet_id: 2, name: 'Paratha Roll', category: 'Fast Food', price: 160 },
      { id: 10, outlet_id: 2, name: 'Samosa (2 pcs)', category: 'Snacks', price: 50 },
      { id: 11, outlet_id: 2, name: 'Plain Omelette', category: 'Breakfast', price: 90 },
      { id: 12, outlet_id: 2, name: 'Bun Kabab', category: 'Fast Food', price: 130 },
      { id: 13, outlet_id: 2, name: 'Chicken Karahi', category: 'Desi', price: 520 },
      { id: 14, outlet_id: 3, name: 'Club Sandwich', category: 'Fast Food', price: 280 },
      { id: 15, outlet_id: 3, name: 'Chicken Cheese Sandwich', category: 'Fast Food', price: 320 },
      { id: 16, outlet_id: 3, name: 'Veggie Sandwich', category: 'Fast Food', price: 200 },
      { id: 17, outlet_id: 3, name: 'French Fries', category: 'Snacks', price: 150 },
      { id: 18, outlet_id: 3, name: 'Fresh Lime Soda', category: 'Beverages', price: 120 },
      { id: 19, outlet_id: 3, name: 'Chocolate Shake', category: 'Beverages', price: 250 },
      { id: 20, outlet_id: 4, name: 'Daal Chawal', category: 'Desi', price: 180 },
      { id: 21, outlet_id: 4, name: 'Chicken Qorma with Rice', category: 'Desi', price: 340 },
      { id: 22, outlet_id: 4, name: 'Egg Fried Rice', category: 'Fast Food', price: 260 },
      { id: 23, outlet_id: 4, name: 'Chana Chaat', category: 'Snacks', price: 100 },
      { id: 24, outlet_id: 4, name: 'Cutting Chai', category: 'Beverages', price: 40 },
      { id: 25, outlet_id: 4, name: 'Zarda Rice', category: 'Dessert', price: 120 }
    ],

    // created_at is generated below so the dates always look recent.
    reviews: [
      { id: 1, item_id: 1, reviewer_name: 'Ayesha', rating: 5, review_text: 'Rice is always fresh and the masala is actually spicy. Best value in the cafeteria.', daysAgo: 2, device_id: 'mock-device-01' },
      { id: 2, item_id: 1, reviewer_name: 'Hamza', rating: 4, review_text: 'Good portion for the price. Gets crowded after 1pm.', daysAgo: 5, device_id: 'mock-device-02' },
      { id: 3, item_id: 2, reviewer_name: 'Bilal', rating: 3, review_text: 'Burger is fine but the patty is thin for Rs 350.', daysAgo: 1, device_id: 'mock-device-03' },
      { id: 4, item_id: 3, reviewer_name: 'Usman', rating: 5, review_text: 'Fast, cheap and reliable between classes.', daysAgo: 3, device_id: 'mock-device-04' },
      { id: 5, item_id: 3, reviewer_name: 'Fatima', rating: 4, review_text: 'Better than the burger here.', daysAgo: 11, device_id: 'mock-device-05' },
      { id: 6, item_id: 4, reviewer_name: 'Ali', rating: 4, review_text: 'Paratha is crispy and the chai combo is under Rs 200.', daysAgo: 4, device_id: 'mock-device-06' },
      { id: 7, item_id: 5, reviewer_name: 'Maryam', rating: 2, review_text: 'Mostly ice and sugar. Skip it.', daysAgo: 7, device_id: 'mock-device-07' },
      { id: 8, item_id: 7, reviewer_name: 'Hasan', rating: 5, review_text: 'Expensive but enough for two people.', daysAgo: 2, device_id: 'mock-device-08' },
      { id: 9, item_id: 8, reviewer_name: 'Areeba', rating: 5, review_text: 'Proper doodh patti, strong and not too sweet.', daysAgo: 1, device_id: 'mock-device-09' },
      { id: 10, item_id: 8, reviewer_name: 'Taha', rating: 5, review_text: 'The only reason I survive 8am lectures.', daysAgo: 3, device_id: 'mock-device-10' },
      { id: 11, item_id: 9, reviewer_name: 'Noor', rating: 4, review_text: 'Filling and quick. Ask for less oil.', daysAgo: 8, device_id: 'mock-device-11' },
      { id: 12, item_id: 13, reviewer_name: 'Rida', rating: 4, review_text: 'Share it with a friend, otherwise it is too much.', daysAgo: 10, device_id: 'mock-device-12' },
      { id: 13, item_id: 14, reviewer_name: 'Ayaan', rating: 5, review_text: 'Stacked properly and the bread is toasted.', daysAgo: 1, device_id: 'mock-device-13' },
      { id: 14, item_id: 15, reviewer_name: 'Junaid', rating: 4, review_text: 'Cheese actually melts.', daysAgo: 6, device_id: 'mock-device-14' },
      { id: 15, item_id: 17, reviewer_name: 'Emaan', rating: 3, review_text: 'Hit or miss depending on who is on the counter.', daysAgo: 2, device_id: 'mock-device-15' },
      { id: 16, item_id: 20, reviewer_name: 'Arham', rating: 4, review_text: 'Cheap, hot and filling.', daysAgo: 3, device_id: 'mock-device-16' },
      { id: 17, item_id: 21, reviewer_name: 'Laiba', rating: 5, review_text: 'Best thing at the hostel dhaba.', daysAgo: 7, device_id: 'mock-device-17' },
      { id: 18, item_id: 23, reviewer_name: 'Shahzaib', rating: 3, review_text: 'Papri gets soggy fast.', daysAgo: 9, device_id: 'mock-device-18' },
      { id: 19, item_id: 24, reviewer_name: 'Iqra', rating: 5, review_text: 'Rs 40 chai that actually tastes like chai.', daysAgo: 1, device_id: 'mock-device-19' },
      { id: 20, item_id: 25, reviewer_name: 'Owais', rating: 4, review_text: 'Sweet and warm. Good on a cold day.', daysAgo: 15, device_id: 'mock-device-20' }
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

  /** Remove the private device id before handing a review to the UI. */
  function publicReview(review) {
    const { device_id, ...clean } = review;
    return clean;
  }

  // ------------------------------------------------------------------------
  // Real network helper
  // ------------------------------------------------------------------------
  async function request(SUPABASE_URL, { method = 'GET', body } = {}) {

    // AbortController prevents a request from hanging forever.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(SUPABASE_URL, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal
      });

      // Read as text first: an n8n crash page is HTML, not JSON.
      const raw = await response.text();
      let payload = null;
      try {
        payload = raw ? JSON.parse(raw) : null;
      } catch {
        payload = null;
      }

      if (!response.ok || !payload || payload.success !== true) {
        const serverMessage = payload && typeof payload.error === 'string' ? payload.error : '';
        throw new Error(serverMessage || `The server returned an error (HTTP ${response.status}).`);
      }

      return payload.data;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('The server took too long to respond. Please try again.');
      }
      if (error instanceof TypeError) {
        // fetch throws TypeError for DNS, network and CORS failures.
        throw new Error('Could not reach the review server. Check your connection and try again.');
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
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
    return request(CONFIG.API.outlets);
  }

  async function getItems(outletId = 0) {
    if (CONFIG.USE_MOCK_DATA) {
      await pause();
      return MOCK.items
        .filter((item) => !outletId || item.outlet_id === outletId)
        .map(mockItem);
    }
    let query = sb.from('items').select('item_name', 'item_rating', 'cafe_id', 'price');
    if (outletId) query = query.eq('cafe_id', outletId);

    const { data, error } = await query;
    if (error) throw error;
    return data;
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
    return request(CONFIG.API.topRated);
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

  return { getOutlets, getItems, getReviews, getTopRated, createReview };
})();

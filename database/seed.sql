-- ============================================================================
-- Campus Bites - seed data
--
-- !!! ALL DATA BELOW IS PLACEHOLDER DATA !!!
-- Outlet names, item names, prices, reviews and reviewer names are invented.
-- The team MUST replace them with the real campus outlets/menus/prices before
-- showing the app to students. Keep the same ids if you want the reviews to
-- stay attached to the right items.
--
-- Run after schema.sql.
-- ============================================================================

BEGIN;

-- Reset in dependency order. RESTART IDENTITY puts the SERIAL counters back to 1.
TRUNCATE reviews, items, outlets RESTART IDENTITY CASCADE;

-- ---------------------------------------------------------------------------
-- Outlets (PLACEHOLDER names and locations)
-- ---------------------------------------------------------------------------
INSERT INTO outlets (id, name, type, location) VALUES
  (1, 'Main Cafeteria',  'cafeteria', 'Academic Block A, Ground Floor'),
  (2, 'Chai Dhaba',      'dhaba',     'Beside the Sports Complex'),
  (3, 'Sandwich Corner', 'kiosk',     'Library entrance'),
  (4, 'Hostel Dhaba',    'dhaba',     'Hostel Block C courtyard');

-- ---------------------------------------------------------------------------
-- Items (PLACEHOLDER menu and prices, in PKR)
-- ---------------------------------------------------------------------------
INSERT INTO items (id, outlet_id, name, category, price) VALUES
  -- Outlet 1: Main Cafeteria
  (1,  1, 'Chicken Biryani',            'Desi',       320),
  (2,  1, 'Beef Burger',                'Fast Food',  350),
  (3,  1, 'Chicken Shawarma',           'Fast Food',  220),
  (4,  1, 'Aloo Paratha',               'Breakfast',  120),
  (5,  1, 'Cold Coffee',                'Beverages',  180),
  (6,  1, 'Chocolate Brownie',          'Dessert',    150),
  (7,  1, 'Chicken Karahi (half)',      'Desi',       480),

  -- Outlet 2: Chai Dhaba
  (8,  2, 'Doodh Patti Chai',           'Beverages',   60),
  (9,  2, 'Paratha Roll',               'Fast Food',  160),
  (10, 2, 'Samosa (2 pcs)',             'Snacks',      50),
  (11, 2, 'Plain Omelette',             'Breakfast',   90),
  (12, 2, 'Bun Kabab',                  'Fast Food',  130),
  (13, 2, 'Chicken Karahi',             'Desi',       520),

  -- Outlet 3: Sandwich Corner
  (14, 3, 'Club Sandwich',              'Fast Food',  280),
  (15, 3, 'Chicken Cheese Sandwich',    'Fast Food',  320),
  (16, 3, 'Veggie Sandwich',            'Fast Food',  200),
  (17, 3, 'French Fries',               'Snacks',     150),
  (18, 3, 'Fresh Lime Soda',            'Beverages',  120),
  (19, 3, 'Chocolate Shake',            'Beverages',  250),

  -- Outlet 4: Hostel Dhaba
  (20, 4, 'Daal Chawal',                'Desi',       180),
  (21, 4, 'Chicken Qorma with Rice',    'Desi',       340),
  (22, 4, 'Egg Fried Rice',             'Fast Food',  260),
  (23, 4, 'Chana Chaat',                'Snacks',     100),
  (24, 4, 'Cutting Chai',               'Beverages',   40),
  (25, 4, 'Zarda Rice',                 'Dessert',    120);

-- Allow future inserts to continue after the explicit ids above.
SELECT setval('outlets_id_seq', (SELECT MAX(id) FROM outlets));
SELECT setval('items_id_seq',   (SELECT MAX(id) FROM items));

-- ---------------------------------------------------------------------------
-- A handful of reviews so the app does not look empty on day one.
-- PLACEHOLDER reviews: they only demonstrate the average-rating logic.
-- device_id values start with "seed-" so they are easy to delete later:
--   DELETE FROM reviews WHERE device_id LIKE 'seed-%';
-- ---------------------------------------------------------------------------
INSERT INTO reviews (item_id, reviewer_name, rating, review_text, created_at, device_id) VALUES
  (1,  'Ayesha',  5, 'Rice is always fresh and the masala is actually spicy. Best value in the cafeteria.', now() - interval '2 days',  'seed-device-01'),
  (1,  'Hamza',   4, 'Good portion for the price. Gets crowded after 1pm.',                              now() - interval '5 days',  'seed-device-02'),
  (1,  'Zainab',  4, 'Solid biryani. Ask for extra raita otherwise it is a bit dry.',                    now() - interval '9 days',  'seed-device-03'),
  (2,  'Bilal',   3, 'Burger is fine but the patty is thin for Rs 350.',                                 now() - interval '1 day',   'seed-device-04'),
  (2,  'Sana',    4, 'Tastes fresh when it is made to order. Avoid it during the rush.',                 now() - interval '6 days',  'seed-device-05'),
  (3,  'Usman',   5, 'Fast, cheap and reliable between classes. The garlic sauce makes it.',            now() - interval '3 days',  'seed-device-06'),
  (3,  'Fatima',  4, 'Chicken shawarma is better than the burger here.',                                now() - interval '11 days', 'seed-device-07'),
  (4,  'Ali',     4, 'Paratha is crispy and the chai combo is under Rs 200.',                           now() - interval '4 days',  'seed-device-08'),
  (5,  'Maryam',  2, 'Cold coffee was mostly ice and sugar. Skip it.',                                  now() - interval '7 days',  'seed-device-09'),
  (7,  'Hasan',   5, 'Expensive but enough for two people. Karahi is freshly cooked.',                  now() - interval '2 days',  'seed-device-10'),
  (8,  'Areeba',  5, 'Proper doodh patti, strong and not too sweet. Rs 60 well spent.',                 now() - interval '12 hours', 'seed-device-11'),
  (8,  'Taha',    5, 'The only reason I survive 8am lectures.',                                         now() - interval '3 days',  'seed-device-12'),
  (9,  'Noor',    4, 'Paratha roll is filling and quick. Ask for less oil.',                            now() - interval '8 days',  'seed-device-13'),
  (10, 'Saad',    3, 'Samosa is fine but they are small. Chutney helps.',                               now() - interval '5 days',  'seed-device-14'),
  (13, 'Rida',    4, 'Share it with a friend, otherwise it is too much for one person.',                now() - interval '10 days', 'seed-device-15'),
  (14, 'Ayaan',   5, 'Club sandwich is stacked properly and the bread is toasted. Worth Rs 280.',       now() - interval '1 day',   'seed-device-16'),
  (14, 'Mina',    4, 'Good but a little dry on the edges. Ask for extra mayo.',                         now() - interval '4 days',  'seed-device-17'),
  (15, 'Junaid',  4, 'Cheese actually melts. Better than the plain club sandwich.',                     now() - interval '6 days',  'seed-device-18'),
  (17, 'Emaan',   3, 'Fries are hit or miss depending on who is on the counter.',                       now() - interval '2 days',  'seed-device-19'),
  (20, 'Arham',   4, 'Cheap, hot and filling. Exactly what a hostel student needs.',                    now() - interval '3 days',  'seed-device-20'),
  (21, 'Laiba',   5, 'Qorma with rice is the best thing at the hostel dhaba.',                         now() - interval '7 days',  'seed-device-21'),
  (23, 'Shahzaib', 3, 'Chaat is decent but the papri gets soggy fast.',                                 now() - interval '9 days',  'seed-device-22'),
  (24, 'Iqra',    5, 'Rs 40 chai that actually tastes like chai.',                                      now() - interval '13 hours', 'seed-device-23'),
  (25, 'Owais',   4, 'Zarda is sweet and warm. Good on a cold day.',                                    now() - interval '15 days', 'seed-device-24');

SELECT setval('reviews_id_seq', (SELECT MAX(id) FROM reviews));

COMMIT;

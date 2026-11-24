# Campus Bites

Item-level food ratings and reviews for campus outlets at **FAST-NUCES Karachi**.

Students can look up which cafeteria or dhaba item is actually worth the money, rate
it 1-5 stars, and leave a short written review that every other student sees.

> **Data source:** The outlets, menu items and initial reviews come from a survey of FAST-NUCES students collected with a Google Form and imported into
> Supabase. To run the app against your own Supabase project, follow [supabase/supabase-setup.md](supabase/supabase-setup.md).

---

## 1. Problem

Google Maps, Foodpanda and Zomato rate whole businesses. On a campus, that is
not the question students ask. They ask:

- "Is the biryani at the cafeteria better than the one at the dhaba?"
- "Is the Rs 350 burger actually worth it?"
- "Which item should I avoid?"

There was no single place to find that out. Campus Bites stores ratings **per
item**, shared by all students.

## 2. Features

| Feature | How it works |
|---|---|
| Outlet listing | All cafeterias, dhabas and kiosks loaded from the Supabase database |
| Menu browsing | Items per outlet with price, category and average rating |
| Star rating (1-5) | Accessible radio-based star widget, keyboard and touch friendly |
| Written reviews | Name + optional text + automatic date, stored permanently in PostgreSQL |
| Shared reviews | Everyone reads the same reviews from the same database |
| Average rating | SQL `AVG()` + `COUNT()` per item, shown as `4.2 (13)` |
| Live search | Debounced (300 ms) search by item or outlet name |
| Filter & sort | Outlet, category, maximum price; sort by rating, price or name |
| Top rated | The five best-rated items on campus |
| Responsive | Mobile-first CSS, 1 column on phones, up to 4 on desktop |
| Survey data | Initial outlets, items and reviews collected from a student Google Form and imported into Supabase |
| Spam limits | Device ID, one review per item per device, hourly rate limit, honeypot |


## 3. Tech stack

- **Frontend:** semantic HTML5, CSS3 (Flexbox + Grid, mobile-first media queries),
  vanilla JavaScript (ES6+, no frameworks, no build step).
- **Backend:** Supabase (auto-generated REST API via PostgREST, with Row Level
  Security policies).
- **Database:** PostgreSQL hosted on Supabase (schema in `schema.sql`).
- **No dependencies** except an optional Google Fonts (Inter). If the font fails
  to load, the system font stack is used.

Browser APIs used: DOM APIs, `fetch`, `async/await`, `AbortController`,
`localStorage`, `crypto.randomUUID`, native `<dialog>`.

## 4. Folder structure

```
campus-food-reviews/
├── index.html            semantic page shell + review form + dialog
├── css/
│   └── style.css         design tokens, layout, components, media queries
├── js/
│   ├── config.js         Supabase URL, anon key, limits (single source)
│   ├── api.js            every fetch call to the Supabase REST API
│   ├── ui.js             rendering, stars, dialog, form messages (textContent only)
│   └── app.js            state, events, debounce, validation, submit flow
├── database/
│   ├── schema.sql        tables, constraints, indexes, RLS policies, reference queries
│   └── seed.sql          survey data (outlets, items, reviews) from the Google Form
├── supabase/
│   └── supabase-setup.md create project -> run schema.sql -> import survey data -> copy URL and anon key
└── README.md
```

Script load order in `index.html` is `config.js` -> `api.js` -> `ui.js` ->
`app.js`. They are plain scripts (not ES modules) so the page also works when
opened directly from disk; each file exposes one global (`CONFIG`, `Api`, `UI`).



```bash
npx serve .
# or the VS Code "Live Server" extension
```

## 6. Full setup (shared, permanent reviews)

1. Create a free project at supabase.com. In the **SQL Editor**, run
   `database/schema.sql` (tables, constraints, RLS policies), then
   `database/seed.sql` (or import the survey CSV from the **Table Editor**).
2. In **Project Settings → API**, copy the **Project URL** and the **anon public**
   key. Do not use the `service_role` key in the front end.
3. Paste both values into `js/config.js`.
4. Open `index.html` (or serve the folder with any static server) and reload the
   page. Reviews are now shared by everyone.

Full click-by-click instructions, test requests (curl/PowerShell) and
troubleshooting: **[supabase/supabase-setup.md](supabase/supabase-setup.md)**.

### Configuration (`js/config.js`)

| Key | Meaning |
|---|---|
| `SUPABASE_URL` | Project URL from Supabase → Project Settings → API |
| `SUPABASE_ANON_KEY` | Public anon key (safe in the browser only because RLS is enabled) |
| `TABLES` / `RPC` | Names of the tables, views and SQL functions the front end calls (only place they exist) |
| `LIMITS.NAME_MAX` (30), `REVIEW_MAX` (300), `REVIEWS_PER_HOUR` (10) | Must match the database constraints |
| `TOP_RATED_LIMIT` | How many items the top-rated section asks for |
| `REQUEST_TIMEOUT_MS` | Fetch timeout before showing a friendly error |
| `SEARCH_DEBOUNCE_MS` | Delay before live search runs |

## 7. API contract

Supabase's REST API (PostgREST) returns plain JSON rows. Errors come back as HTTP status codes with a JSON error object.

Base URL: `https://YOUR-PROJECT.supabase.co/rest/v1`

Every request needs these headers:

```
apikey: <anon key>
Authorization: Bearer <anon key>
```

| Method | Endpoint | Input | Returns |
|---|---|---|---|
| GET | `/outlets_with_counts` | – | Outlets with `item_count` (a view) |
| GET | `/items_with_ratings?outlet_id=eq.1` | Omit the filter for all outlets | Items with `average_rating`, `review_count` (a view) |
| GET | `/reviews_public?item_id=eq.1&order=created_at.desc` | – | Reviews, newest first (a view that excludes `device_id`) |
| GET | `/items_with_ratings?review_count=gt.0&order=average_rating.desc&limit=5` | – | 5 best-rated items with at least one review |
| POST | `/rpc/add_review` | JSON body | Saved review (the function does validation and limits) |

POST body:

```json
{
  "p_item_id": 1,
  "p_reviewer_name": "Ayesha",
  "p_rating": 5,
  "p_review_text": "Fresh and spicy.",
  "p_device_id": "b6f1c0de-...",
  "p_website": ""
}
```

Errors: `400` validation or honeypot, `409` duplicate review (unique constraint on `item_id` + `device_id`), `429` rate limit (raised from inside the function). After a successful POST, re-fetch the item to get the recalculated average.

## 8. Database

Three tables:

- `outlets(id, name, type, location)`
- `items(id, outlet_id, name, category, price)`
- `reviews(id, item_id, reviewer_name, rating, review_text, created_at, device_id)`

Key rules enforced **in the database**, not only in JavaScript:

- `rating` has `CHECK (rating BETWEEN 1 AND 5)`.
- `reviewer_name` is 2-30 characters, `review_text` up to 300.
- `UNIQUE (item_id, device_id)` - one review per item per device.
- `ON DELETE CASCADE` so deleting an outlet cleans up its items and reviews.
- Indexes on `items(outlet_id)`, `items(category)` and
  `reviews(device_id, created_at DESC)` for the list and rate-limit queries.
- **Row Level Security (RLS)** is enabled on all three tables. The `anon` role
  can only read through the views and insert through the `add_review` function.
  It has no direct INSERT, UPDATE or DELETE on the tables.

The average is never stored. It is calculated with `AVG()` on every read (inside
the `items_with_ratings` view), so it can never drift out of sync with the
reviews.

Reference queries (also at the bottom of `schema.sql`):

```sql
-- Average per item (the items_with_ratings view)
SELECT i.id, i.name, COUNT(r.id) AS review_count,
       COALESCE(ROUND(AVG(r.rating)::numeric, 1), 0) AS average_rating
FROM items i
LEFT JOIN reviews r ON r.item_id = i.id
GROUP BY i.id;

-- Top rated
SELECT i.id, i.name, COUNT(r.id) AS review_count,
       ROUND(AVG(r.rating)::numeric, 1) AS average_rating
FROM items i
JOIN reviews r ON r.item_id = i.id
GROUP BY i.id
HAVING COUNT(r.id) >= 1
ORDER BY average_rating DESC, review_count DESC
LIMIT 5;

-- Items by outlet (the REST API equivalent is /items_with_ratings?outlet_id=eq.1)
SELECT * FROM items WHERE (:outlet_id = 0 OR outlet_id = :outlet_id) ORDER BY name;
```

## 9. Spam protection, and its honest limits

| Layer | What it does |
|---|---|
| Device ID | A random UUID is created once and stored in `localStorage`, then sent with every review. |
| One review per item | Enforced by `UNIQUE (item_id, device_id)`; the UI shows a clear `409` message. |
| Rate limit | Max 10 reviews per device per rolling hour, checked inside the `add_review` SQL function before inserting. |
| Honeypot | A hidden `website` field. Humans never see it; naive bots fill it and the review is rejected. |
| Submit lock | The button is disabled while a request is in flight, so double taps do not double post. |
| Server-side validation | Every rule is repeated in the database (constraints and the `add_review` function); client checks are only for nice error messages. |

**What this cannot do:** `localStorage` can be cleared and `device_id` can be
changed by anyone who knows how. There is no login, so there is no real identity.
A determined student can post several fake reviews, just not effortlessly. For
real protection the project needs student authentication (see future work).

## 10. Security notes

- **No `innerHTML` with user data.** `ui.js` builds nodes with
  `document.createElement` and sets `textContent`; `append()` receives strings as
  text nodes. A review containing `<script>alert(1)</script>` is displayed
  literally and does not execute.
- **Parameterized queries only.** Supabase's API (PostgREST) and the `add_review`
  function pass values as parameters; no user input is ever concatenated into a
  SQL string.
- **`device_id` is private.** Reviews are read through the `reviews_public` view,
  which does not select `device_id`, so students cannot harvest each other's
  identifiers.
- **Row Level Security** is enabled, because the `anon` key is public by design.
  The `service_role` key is never placed in the repo or the front-end code.
- **CORS** is handled by Supabase for browser clients, so no custom CORS
  configuration is needed.
- **Output escaping from the database** is not needed because the frontend never
  writes HTML; escaping is only a belt-and-braces measure in some stacks.
- No secrets in the repo: `config.js` contains only the project URL and the
  public anon key.

## 11. Testing checklist

Run through this before a demo or submission.

### Valid input

- [ ] Search `chai` -> results narrow after ~300 ms, including items from Chai Dhaba.
- [ ] Select **Main Cafeteria** -> only its 7 items show, heading changes.
- [ ] Price filter `Up to Rs 100` -> only cheap items remain.
- [ ] Sort by **Price: high to low** -> most expensive item first.
- [ ] Open an item -> reviews load, average matches the card.
- [ ] Submit 5 stars + name + review -> success message, review appears at the
      top, average and count update on the card, dialog and top-rated list.
- [ ] Submit with only a rating (empty review text) -> allowed; the review shows
      "Rated without a written review."
- [ ] Reload the page -> the review is still there.

### Invalid input

- [ ] Submit with no stars -> "Choose a rating from 1 to 5 stars.", focus moves
      to the star group.
- [ ] Submit with an empty name -> "Please enter your name."
- [ ] Name of 1 character -> minimum length message.
- [ ] Paste more than 300 characters -> stopped by `maxlength`; if forced, the
      client and server both reject it.
- [ ] Rating `6` or `0` sent directly to the API -> `400` with a clear error.

### Spam and duplicates

- [ ] Post the same item twice from the same browser -> `409` "You have already
      reviewed this item from this device."
- [ ] Clear `localStorage`, reload, post again -> accepted (this proves the
      limit is device-based, not account-based).
- [ ] Post 11 reviews in an hour from one device -> `429` rate-limit message.
- [ ] Fill the hidden `website` field using dev tools, then submit -> rejected.

### XSS and data safety

- [ ] Review text `<script>alert(1)</script>` -> shown as text, no alert, no
      `<script>` element in the review list.
- [ ] Name `<img src=x onerror=alert(1)>` -> shown as text.
- [ ] A review containing a comma (e.g. "Good, cheap") -> stored completely.
- [ ] The `reviews_public` response does not include `device_id`.
- [ ] A direct `POST /rest/v1/reviews` or `DELETE` with the anon key -> rejected
      by RLS (only `/rpc/add_review` is allowed).

### Empty, loading and error states

- [ ] Open an item with no reviews -> "No reviews yet. Be the first to rate this item."
- [ ] Search for `zzzz` -> "No items match" with filter advice.
- [ ] Turn off Wi-Fi -> friendly error with a **Try again** button, not a
      silent blank page.
- [ ] Throttle the network -> skeleton cards appear while loading.
- [ ] Go offline and submit -> error message in the form, button re-enabled.

### Responsive and accessibility

- [ ] 360 px wide phone: one column, filters collapsed under "Filters and sorting",
      no horizontal page scroll (the top-rated row scrolls on purpose).
- [ ] Tablet ~768 px: two-column cards, filters open.
- [ ] Desktop: three-column menu, four-column outlets, everything centred.
- [ ] Tab through the page: skip link, nav, search, filters, cards, dialog,
      stars, inputs, submit. Focus ring is always visible.
- [ ] Post a review using only the keyboard (arrow keys pick the stars).
- [ ] Zoom to 200%: no content is cut off or overlapping.

## 12. Data source and maintenance

The database was populated from a survey of FAST-NUCES students collected with a
Google Form, then cleaned and imported into Supabase. To keep it accurate:

1. **Outlets** - update names, types and locations if an outlet opens, closes or
   moves.
2. **Items and categories** - keep each outlet's menu in sync with what is sold.
3. **Prices** - update the PKR prices regularly; stale prices are worse than no
   prices.
4. **Survey reviews** - these were imported without a real device. Their
   `device_id` values are marked (for example `seed-...`) so they can be
   identified or removed with:
   `DELETE FROM reviews WHERE device_id LIKE 'seed-%';`
5. **Campus name** - update the header badge/footer if this is reused for
   another campus.

## 13. Known limitations

- **No login.** Ratings rely on a browser-generated device id. It stops casual
  duplicate reviews, not determined spam.
- **No editing or deleting your own review** after posting. The unique
  constraint would need to become an update.
- **Reviews are not moderated.** Abusive text has to be removed directly in the
  Supabase dashboard for now.
- **Prices are static** and only change when the database is updated.
- **No pagination.** Fine for ~25 items; a much larger menu would need it.
- **The public anon key is visible** in the browser, so security depends entirely
  on correct RLS policies and the `add_review` function.
- **Free-tier limits.** Supabase free projects can pause after a period of
  inactivity and have usage limits.

## 14. Ideas for future improvements

1. **Student login** (college email or Google, via Supabase Auth) to make "one
   review per student" real, and to allow editing/deleting your own review.
2. **Moderation** - an admin screen or a review queue with a report button.
3. **Photos and "helpful" votes** per review (Supabase Storage).
4. **Menu admin** - let outlet staff or a student committee update prices
   without touching SQL.
5. **Trending/seasonal views** - "best under Rs 150" and "newest reviews".
6. **PWA** - install on a phone and cache the menu for offline browsing.
7. **Analytics** - most-viewed item, biggest rating changes, busiest hours.
8. **Automated tests** for the SQL queries, RLS policies and the `add_review`
   function.



---



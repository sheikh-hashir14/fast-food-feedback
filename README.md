# Campus Bites

Item-level food ratings and reviews for campus outlets at **FAST-NUCES Karachi**.

Students can see which cafeteria or dhaba item is actually worth the money, rate
it 1-5 stars, and leave a short written review that every other student sees.

> **Demo mode is ON by default.** The app ships with `USE_MOCK_DATA: true`, so
> it runs immediately from `index.html` with built-in sample data. Reviews posted
> in demo mode live only in memory and disappear on reload. Switch to the real
> n8n backend by following [n8n/n8n-setup.md](n8n/n8n-setup.md).

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
| Outlet listing | All cafeterias, dhabas and kiosks loaded from the database |
| Menu browsing | Items per outlet with price, category and average rating |
| Star rating (1-5) | Accessible radio-based star widget, keyboard and touch friendly |
| Written reviews | Name + optional text + automatic date, stored permanently in SQL |
| Shared reviews | Everyone reads the same reviews from the same database |
| Average rating | SQL `AVG()` + `COUNT()` per item, shown as `4.2 (13)` |
| Live search | Debounced (300 ms) search by item or outlet name |
| Filter & sort | Outlet, category, maximum price; sort by rating, price or name |
| Top rated | The five best-rated items on campus |
| Responsive | Mobile-first CSS, 1 column on phones, up to 4 on desktop |
| Demo mode | Full UI with mock data before n8n is connected |
| Spam limits | Device ID, one review per item per device, hourly rate limit, honeypot |

## 3. Tech stack

- **Frontend:** semantic HTML5, CSS3 (Flexbox + Grid, mobile-first media queries),
  vanilla JavaScript (ES6+, no frameworks, no build step).
- **Backend:** n8n webhooks + PostgreSQL.
- **Database:** PostgreSQL 13+ (SQLite translation noted in `schema.sql`).
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
│   ├── config.js         webhook URLs, limits, mock-mode flag (single source)
│   ├── api.js            every fetch call + mock-data fallback
│   ├── ui.js             rendering, stars, dialog, form messages (textContent only)
│   └── app.js            state, events, debounce, validation, submit flow
├── database/
│   ├── schema.sql        tables, constraints, indexes, reference queries
│   └── seed.sql          PLACEHOLDER outlets/items/reviews
├── n8n/
│   ├── workflows.json    one workflow, five webhook endpoints
│   └── n8n-setup.md      install -> DB -> import -> activate -> copy URLs
└── README.md
```

Script load order in `index.html` is `config.js` -> `api.js` -> `ui.js` ->
`app.js`. They are plain scripts (not ES modules) so the page also works when
opened directly from disk; each file exposes one global (`CONFIG`, `Api`, `UI`).

## 5. Quick start (demo mode, 1 minute)

1. Open `index.html` in a modern browser (Chrome, Edge, Firefox, Safari).
2. That is it. 4 outlets, 25 items and 20 sample reviews load from `api.js`.
3. Click a card, choose stars, type a name and review, and post it. The average
   and review count update immediately.

For a "real" URL instead of `file://` you can use any static server, for example:

```bash
npx serve .
# or the VS Code "Live Server" extension
```

## 6. Full setup (shared, permanent reviews)

1. Install PostgreSQL and n8n, create the `campus_food` database and run
   `database/schema.sql`, then `database/seed.sql`.
2. Import `n8n/workflows.json`, attach your Postgres credential to the 8
   `DB - ...` nodes, and **activate** the workflow.
3. Copy the five webhook URLs into `js/config.js` and set
   `USE_MOCK_DATA: false`.
4. Reload the page. Reviews are now shared by everyone.

Full click-by-click instructions, curl/PowerShell tests and troubleshooting:
**[n8n/n8n-setup.md](n8n/n8n-setup.md)**.

### Configuration (`js/config.js`)

| Key | Meaning |
|---|---|
| `USE_MOCK_DATA` | `true` = built-in demo data, `false` = call n8n |
| `API.outlets/items/reviews/topRated/createReview` | webhook URLs (only place they exist) |
| `LIMITS.NAME_MAX` (30), `REVIEW_MAX` (300), `REVIEWS_PER_HOUR` (10) | must match the backend |
| `TOP_RATED_LIMIT` | how many items the top-rated section asks for |
| `REQUEST_TIMEOUT_MS` | fetch timeout before showing a friendly error |
| `SEARCH_DEBOUNCE_MS` | delay before live search runs |

## 7. API contract

Every response uses the same envelope:

```json
{ "success": true, "data": [], "error": null }
```

| Method | Endpoint | Input | Returns |
|---|---|---|---|
| GET | `/webhook/campus-food/outlets` | – | outlets with `item_count` |
| GET | `/webhook/campus-food/items` | `?outlet_id=1` (0/omit = all) | items with `average_rating`, `review_count` |
| GET | `/webhook/campus-food/reviews` | `?item_id=1` | reviews, newest first (no `device_id`) |
| GET | `/webhook/campus-food/top-rated` | – | 5 best-rated items with at least one review |
| POST | `/webhook/campus-food/reviews` | JSON body | `201` + saved review + recalculated item |

POST body:

```json
{
  "item_id": 1,
  "reviewer_name": "Ayesha",
  "rating": 5,
  "review_text": "Fresh and spicy.",
  "device_id": "b6f1c0de-...",
  "website": ""
}
```

Errors: `400` validation/honeypot, `409` duplicate review, `429` rate limit.

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

The average is never stored. It is calculated with `AVG()` on every read, so it
can never drift out of sync with the reviews.

Reference queries (also at the bottom of `schema.sql`):

```sql
-- Average per item
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

-- Items by outlet (the n8n query uses $1 for the outlet id)
SELECT * FROM items WHERE ($1::int = 0 OR outlet_id = $1::int) ORDER BY name;
```

## 9. Spam protection, and its honest limits

| Layer | What it does |
|---|---|
| Device ID | A random UUID is created once and stored in `localStorage`, then sent with every review. |
| One review per item | Enforced by `UNIQUE (item_id, device_id)`; the UI shows a clear `409` message. |
| Rate limit | Max 10 reviews per device per rolling hour, checked with SQL before inserting. |
| Honeypot | A hidden `website` field. Humans never see it; naive bots fill it and the review is rejected. |
| Submit lock | The button is disabled while a request is in flight, so double taps do not double post. |
| Server-side validation | Every rule is repeated in n8n; client checks are only for nice error messages. |

**What this cannot do:** `localStorage` can be cleared and `device_id` can be
changed by anyone who knows how. There is no login, so there is no real identity.
A determined student can post several fake reviews, just not effortlessly. For
real protection the project needs student authentication (see future work).

## 10. Security notes

- **No `innerHTML` with user data.** `ui.js` builds nodes with
  `document.createElement` and sets `textContent`; `append()` receives strings as
  text nodes. A review containing `<script>alert(1)</script>` is displayed
  literally and does not execute.
- **Parameterized SQL only.** n8n passes values as `$1, $2, ...`; no user input is
  ever concatenated into a query. `n8n-setup.md` explains the one subtlety: the
  Query Parameters field must stay a single array expression, otherwise n8n
  splits strings on commas.
- **`device_id` is private.** `GET /reviews` does not select it, so students
  cannot harvest each other's identifiers.
- **CORS** is enabled on the webhook nodes (`Allowed Origins: *`) so the static
  page can call n8n. Restrict this to your real domain in production.
- **Output escaping from the database** is not needed because the frontend never
  writes HTML; escaping is only a belt-and-braces measure in some stacks.
- No secrets in the repo: the workflow JSON contains no database password.

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
- [ ] Reload the page (real backend) -> the review is still there.

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
- [ ] A review containing a comma (e.g. "Good, cheap") -> stored completely
      (this is the n8n Query Parameters trap described in the setup guide).
- [ ] `GET /reviews` response does not include `device_id`.

### Empty, loading and error states

- [ ] Open an item with no reviews -> "No reviews yet. Be the first to rate this item."
- [ ] Search for `zzzz` -> "No items match" with filter advice.
- [ ] Turn off Wi-Fi / stop n8n (real mode) -> friendly error with a **Try again**
      button, not a silent blank page.
- [ ] Throttle the network -> skeleton cards appear while loading.
- [ ] Stop n8n and submit -> error message in the form, button re-enabled.

### Responsive and accessibility

- [ ] 360 px wide phone: one column, filters collapsed under "Filters and sorting",
      no horizontal page scroll (the top-rated row scrolls on purpose).
- [ ] Tablet ~768 px: two-column cards, filters open.
- [ ] Desktop: three-column menu, four-column outlets, everything centred.
- [ ] Tab through the page: skip link, nav, search, filters, cards, dialog,
      stars, inputs, submit. Focus ring is always visible.
- [ ] Post a review using only the keyboard (arrow keys pick the stars).
- [ ] Zoom to 200%: no content is cut off or overlapping.

## 12. Data you still need to replace

Everything in `database/seed.sql` is **placeholder data**, clearly marked with
comments. Before launch, replace:

1. **Outlets** - real names, types and locations on your campus
   (e.g. "Cafeteria - New Building", "Dhaba near Gate 2").
2. **Items** - the actual menu of each outlet, with correct categories.
3. **Prices** - real PKR prices. Keep them up to date; stale prices are worse
   than no prices.
4. **Seed reviews** - the 24 sample reviews are fake. Delete them with:
   `DELETE FROM reviews WHERE device_id LIKE 'seed-%';`
5. **Mock data in `js/api.js`** - only if you keep demo mode; it mirrors the seed
   file and should match the corrected data.
6. **Campus name** - update the header badge/footer if this is not for
   FAST-NUCES Karachi.

## 13. Known limitations

- **No login.** Ratings rely on a browser-generated device id. It stops casual
  duplicate reviews, not determined spam.
- **No editing or deleting your own review** after posting. The unique
  constraint would need to become an update.
- **Reviews are not moderated.** Abusive text has to be removed directly in the
  database for now.
- **Prices are static** and only change when the database is updated.
- **Demo reviews are in memory** and reset on reload.
- **No pagination.** Fine for ~25 items; a much larger menu would need it.
- **n8n replaces the backend server**, so each endpoint needs the workflow to be
  active. Cold starts can feel slower than a custom API.
- The CORS setting is `*` for development and should be narrowed for production.

## 14. Ideas for future improvements

1. **Student login** (college email or Google) to make "one review per student"
   real, and to allow editing/deleting your own review.
2. **Moderation** - an admin screen or n8n review queue with a report button.
3. **Photos and "helpful" votes** per review.
4. **Menu admin** - let outlet staff or a student committee update prices
   without touching SQL.
5. **Trending/seasonal views** - "best under Rs 150" and "newest reviews".
6. **PWA** - install on a phone and cache the menu for offline browsing.
7. **Analytics** - most-viewed item, biggest rating changes, busiest hours.
8. **Automated tests** for the SQL queries and the n8n endpoints.

## 15. Group/viva notes

- The three layers are deliberately separate: `api.js` (network), `ui.js`
  (rendering), `app.js` (state and events). Ask "where would you add a new
  filter?" - `app.js` state + `ui.js` markup only, no changes to `api.js`.
- `textContent`, never `innerHTML`, is the answer to "how do you stop XSS?".
- The average is calculated by SQL, not stored, so it can never disagree with
  the reviews.
- The rate limit is SQL-based (`created_at > now() - interval '1 hour'`) so it
  survives an n8n restart, unlike an in-memory counter.
- `AbortController` gives the fetch a timeout so a dead backend does not leave
  the UI loading forever.

---

**License:** free to use for coursework and campus projects. Replace the
placeholder data before real-world use.

# n8n backend setup

The frontend is static, so all shared data lives in PostgreSQL and is reached
through n8n webhooks. This guide takes you from a fresh machine to working URLs.

**Time needed:** about 20 minutes.

---

## 0. What you need

| Tool | Version | Why |
|---|---|---|
| n8n | 1.53 or newer (recent is best) | runs the webhook workflows |
| PostgreSQL | 13 or newer | stores outlets, items and reviews |
| A terminal | PowerShell / bash | to run the SQL files |

> The project uses **PostgreSQL**, not SQLite. The n8n SQLite node can only run
> a raw query string, so it cannot bind `$1` parameters. The Postgres node can,
> and parameterized queries are a strict requirement of this project.

---

## 1. Install and run n8n

### Option A - Docker (easiest)

```bash
docker volume create n8n_data
docker run -it --rm --name n8n -p 5678:5678 \
  -v n8n_data:/home/node/.n8n \
  docker.n8n.io/n8nio/n8n
```

On Windows PowerShell, put the command on one line:

```powershell
docker run -it --rm --name n8n -p 5678:5678 -v n8n_data:/home/node/.n8n docker.n8n.io/n8nio/n8n
```

### Option B - npm

```bash
npx n8n
```

Either way, open <http://localhost:5678> and finish the "set up owner account"
screen. n8n stores workflows in its own database; our food data is separate.

---

## 2. Create the PostgreSQL database

Create an empty database (pgAdmin, or the `psql` shell):

```sql
CREATE DATABASE campus_food;
```

Then load the two SQL files **in order**:

```bash
psql -U postgres -d campus_food -f database/schema.sql
psql -U postgres -d campus_food -f database/seed.sql
```

On Windows (from the project folder, adjust the path to `psql` if needed):

```powershell
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d campus_food -f database\schema.sql
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d campus_food -f database\seed.sql
```

Check that data arrived:

```sql
SELECT COUNT(*) FROM outlets;   -- 4
SELECT COUNT(*) FROM items;     -- 25
SELECT COUNT(*) FROM reviews;   -- 24
```

---

## 3. Import the workflow

1. In n8n click **Workflows → Create workflow**.
2. Top-right menu (**⋯**) → **Import from File…**
3. Choose `n8n/workflows.json`.
4. You should see five webhook branches:
   - `GET /campus-food/outlets`
   - `GET /campus-food/items`
   - `GET /campus-food/reviews`
   - `GET /campus-food/top-rated`
   - `POST /campus-food/reviews`

### Add the database credential

The workflow ships without credentials (so nothing secret is in the repo).

1. Create a **Postgres** credential: user `postgres`, password `postgres`,
   host `localhost`, port `5432`, database `campus_food`
   (Docker users: if n8n runs in a container, host is usually `host.docker.internal`).
2. Click **Save**, then **Test** - it should say "Connection tested successfully".
3. Open **each node whose name starts with `DB -`** (there are 8) and select
   that credential in **Credential to Connect With**. Save the workflow.

### Activate

Toggle **Active** (top-right). The production URLs are now live. The editor's
"Test workflow" uses a different URL that only works once per click - use the
production URLs for the app.

---

## 4. Copy the URLs into the frontend

Base URL = your n8n address + `/webhook/campus-food/...`

Local example:

```
http://localhost:5678/webhook/campus-food/outlets
http://localhost:5678/webhook/campus-food/items
http://localhost:5678/webhook/campus-food/reviews        (GET and POST)
http://localhost:5678/webhook/campus-food/top-rated
```

Open `js/config.js`, set `USE_MOCK_DATA: false`, and paste the URLs:

```js
const CONFIG = {
  USE_MOCK_DATA: false,
  API: {
    outlets:     'http://localhost:5678/webhook/campus-food/outlets',
    items:       'http://localhost:5678/webhook/campus-food/items',
    reviews:     'http://localhost:5678/webhook/campus-food/reviews',
    topRated:    'http://localhost:5678/webhook/campus-food/top-rated',
    createReview:'http://localhost:5678/webhook/campus-food/reviews'
  },
  ...
};
```

Keep the URLs in that one file - no other file may contain them.

---

## 5. Smoke-test the API

Open these in a browser (GET is easy to check by eye):

```
http://localhost:5678/webhook/campus-food/outlets
http://localhost:5678/webhook/campus-food/items?outlet_id=1
http://localhost:5678/webhook/campus-food/reviews?item_id=1
http://localhost:5678/webhook/campus-food/top-rated
```

Every reply must have this shape:

```json
{ "success": true, "data": [ ... ], "error": null }
```

Test the POST (PowerShell):

```powershell
$body = @{
  item_id       = 1
  reviewer_name = 'Test Student'
  rating        = 5
  review_text   = 'Testing, with a comma.'
  device_id     = 'test-device-00000001'
  website       = ''
} | ConvertTo-Json

Invoke-RestMethod -Method Post `
  -Uri 'http://localhost:5678/webhook/campus-food/reviews' `
  -ContentType 'application/json' `
  -Body $body
```

Expected: `201` with `data.review` and `data.item` (recalculated average).
Run the same command twice: the second one returns
`{ "success": false, "error": "You have already reviewed this item from this device." }`.

If you see `"success": false` but no useful message, open **Executions** in
n8n and inspect the node that failed.

---

## 6. Endpoint reference

All responses: `{ "success": boolean, "data": any, "error": string | null }`.

| Method | Path | Query / body | Notes |
|---|---|---|---|
| GET | `/campus-food/outlets` | – | includes `item_count` |
| GET | `/campus-food/items` | `outlet_id` (optional, `0`/missing = all) | each item includes `average_rating`, `review_count` |
| GET | `/campus-food/reviews` | `item_id` (required) | newest first, never exposes `device_id` |
| GET | `/campus-food/top-rated` | – | top 5, only items with at least one review |
| POST | `/campus-food/reviews` | JSON body below | `201` on success |

POST body:

```json
{
  "item_id": 1,
  "reviewer_name": "Ayesha",
  "rating": 5,
  "review_text": "Rice is always fresh.",
  "device_id": "8f14e45f-ceea-467f-a8b3-0a1c2d3e4f50",
  "website": ""
}
```

Status codes: `201` created, `400` validation/honeypot, `409` duplicate,
`429` rate limited. n8n itself can return `500` if the database is down.

---

## 7. How the backend protects the data

- **Parameterized SQL only.** Every value reaches Postgres through
  `$1, $2, ...`. The only strings inside the SQL are fixed table/column names.
- **Parameter format matters.** The Query Parameters field is a *single array
  expression*:
  `={{ [ $json.query.outlet_id || 0 ] }}`.
  n8n splits plain strings on commas, so a review like `"good, cheap"` would
  otherwise be cut in half. Do not "simplify" these expressions into
  `{{ a }}, {{ b }}`.
- **Server-side validation** repeats every client rule: item id, rating 1-5,
  name 2-30, review ≤ 300, device id format, honeypot empty.
- **One review per device per item** is enforced by
  `UNIQUE (item_id, device_id)` plus an explicit pre-check that returns a
  friendly `409` message.
- **Rate limit**: max 10 reviews per `device_id` per rolling hour
  (`DB - reviews last hour`). Change both the SQL number and
  `LIMITS.REVIEWS_PER_HOUR` in `config.js` if you want a different limit. The
  backend is the real limit; the frontend number is only used for messages.
- **`device_id` is never returned** by `GET /reviews`, so students cannot read
  each other's identifiers.

---

## 8. CORS and preflight

Every webhook node has **Options → Allowed Origins (CORS) = `*`**. That is what
lets `index.html` (opened from `file://` or another port) call n8n.

`GET` requests are "simple" and need no preflight. The `POST` sends
`Content-Type: application/json`, which triggers an `OPTIONS` preflight; n8n
answers it automatically when CORS is enabled. If your browser console shows a
preflight failure:

1. Confirm the workflow is **Active** (inactive workflows only answer test URLs).
2. Confirm you copied the `/webhook/...` URL, not `/webhook-test/...`.
3. In n8n, open the POST webhook node → Options → Allowed Origins must be `*`.
4. If your n8n version still refuses `OPTIONS`, add one more Webhook node with
   method `OPTIONS` and the path `campus-food/reviews`, then connect it to a
   **Respond to Webhook** node with Response Code `204` and "No Data". CORS
   headers are added by the webhook node.

Production tip: replace `*` with the exact origin hosting the site (for
example `https://campus-bites.example.com`) so other sites cannot post reviews
with your API.

---

## 9. Common problems

| Symptom | Cause | Fix |
|---|---|---|
| `404` on every URL | workflow not active, or wrong path | activate it; check `/webhook/` vs `/webhook-test/` |
| `500` + `relation "reviews" does not exist` | SQL files not loaded | run `schema.sql` then `seed.sql` |
| `password authentication failed` | wrong Postgres credential | fix the credential, test it |
| `ECONNREFUSED` from Docker | `localhost` inside container is the container | use `host.docker.internal` as DB host |
| `wrong number of parameters` | Query Parameters edited into a non-array form | restore the single `={{ [ ... ] }}` expression |
| Review saves but text is cut at a comma | Query Parameters split on commas | same fix as above |
| CORS error in browser | origin not allowed / workflow inactive | section 8 |
| `409` on your own test | same `device_id` already reviewed that item | change the test `device_id` or delete the row |

To reset the demo data at any time, re-run `database/seed.sql`
(it truncates the three tables first).

# People Directory

A small full-stack user directory: a React client, a Node.js (Express) API, and a SQLite
database that is the source of truth for 10,000 seeded people. You can search by name,
narrow results by nationality and hobbies, sort, and scroll through a virtualized,
infinitely loading list. The sidebar shows the top 20 hobbies and nationalities for the
result set you are currently looking at, and the whole view state lives in the URL.

The original exercise brief is in [`docs/BRIEF.md`](docs/BRIEF.md).

**Stack:** React 19 · TypeScript · Vite · Tailwind CSS 4 · React Router 7 · TanStack Query
· TanStack Virtual · Express 5 · better-sqlite3 · zod · Vitest · Docker.

## Quick start (local)

Prerequisites: Node 22 (`.nvmrc`; Node ≥ 20.19 works) and Yarn 1.22 (`corepack enable`
or `npm i -g yarn`). Docker is only needed for the container workflow.

```bash
yarn install        # installs both workspaces (client, server)
yarn seed           # creates server/data/directory.db and fills it with 10,000 people
yarn dev            # API on http://localhost:3000, client on http://localhost:5173
```

Open <http://localhost:5173>. The Vite dev server proxies `/api` to the API, so there is no
CORS configuration.

Production build, served by the API on a single port:

```bash
yarn build          # tsc for the server, vite build for the client
yarn start          # http://localhost:3000 serves the built client and the API
```

### Scripts

| Command          | What it does                                             |
| ---------------- | -------------------------------------------------------- |
| `yarn dev`       | Runs the API (`tsx watch`) and Vite together             |
| `yarn seed`      | (Re)creates the database; see options below              |
| `yarn build`     | Builds server (`server/dist`) and client (`client/dist`) |
| `yarn start`     | Runs the built server, serving the built client          |
| `yarn test`      | Vitest for server and client                             |
| `yarn typecheck` | `tsc --noEmit` in both workspaces                        |
| `yarn format`    | Prettier                                                 |

### Seeding

`yarn seed` creates the schema if needed, replaces any existing rows, and inserts a
deterministic data set (same seed and same `--today` → same people). It runs in well under a
second.

```bash
yarn seed --count 25000 --seed 7   # different size and PRNG seed
yarn seed --today 2028-02-29       # birth dates relative to this day (default: today, UTC)
yarn seed --if-missing             # no-op when the database already has users
yarn seed --database ./tmp.db      # custom file
```

Each person has an avatar URL (one of pravatar.cc's 70 stock photos, picked by hashing the
person's id so it is stable and the 70 URLs cache well), first and last name, a date of birth
(giving ages 18–90 as of the seeding day), one of 46 nationalities, and 0–10 hobbies drawn from
70 options. Nationalities and hobbies follow a skewed (Zipf-like) distribution so the top-20
lists are meaningful.

### Environment variables (server)

| Variable        | Default                    | Purpose                                      |
| --------------- | -------------------------- | -------------------------------------------- |
| `PORT`          | `3000`                     | HTTP port                                    |
| `DATABASE_PATH` | `server/data/directory.db` | SQLite file (directory is created on demand) |
| `SEED_COUNT`    | `10000`                    | Default number of people for `yarn seed`     |
| `SEED`          | `42`                       | PRNG seed for reproducible data              |
| `STATIC_DIR`    | `client/dist`              | Built client to serve (skipped when missing) |

For the client dev server: `API_PROXY_TARGET` (default `http://localhost:3000`) and
`CLIENT_PORT` (default `5173`), e.g. `PORT=3001 API_PROXY_TARGET=http://localhost:3001 yarn dev`.

## Running with Docker Compose

```bash
docker compose up --build      # http://localhost:3000
```

The image is a single container that serves both the API and the built client. On first
start it seeds the database into the named volume `sqlite-data` (mounted at `/data`); later
starts reuse the existing data. Useful variations:

```bash
PORT=3010 docker compose up --build            # use another host port
SEED_COUNT=50000 docker compose up --build     # bigger first seed (only when the volume is empty)
docker compose run --rm app node server/dist/seed/run.js --count 2000   # reseed in place
docker compose down -v                         # remove the volume; next start reseeds
```

The image is built from `node:22-bookworm-slim`; `better-sqlite3` uses a prebuilt binary
on both x64 and arm64 (build tools are installed in the build stage only as a fallback).
A `HEALTHCHECK` polls `/api/health`.

## API

All endpoints return JSON. Multi-value parameters are repeated (`hobby=Chess&hobby=Yoga`).

### `GET /api/users`

| Parameter     | Type                                                     | Default      |
| ------------- | -------------------------------------------------------- | ------------ |
| `q`           | text matched against `first_name` and `last_name`        | `''`         |
| `hobby`       | repeatable; users must have **all** selected hobbies     | –            |
| `nationality` | repeatable; users must have **any** selected nationality | –            |
| `sort`        | `first_name` \| `last_name` \| `age` \| `nationality`    | `first_name` |
| `order`       | `asc` \| `desc`                                          | `asc`        |
| `limit`       | 1–100                                                    | `30`         |
| `cursor`      | opaque cursor from a previous page                       | –            |

```json
{
  "items": [
    {
      "id": 1120,
      "avatar": "https://i.pravatar.cc/150?img=17",
      "first_name": "Aaliyah",
      "last_name": "Becker",
      "date_of_birth": "1982-03-12",
      "age": 44,
      "nationality": "Belgian",
      "hobbies": ["Chess", "Cycling", "Fishing"]
    }
  ],
  "pageInfo": { "hasMore": true, "nextCursor": "eyJzIjoi…", "total": 532 }
}
```

`total` is the number of people matching the filters. Follow `nextCursor` (with the same
filters and sort) until `hasMore` is `false`.

`age` is computed by the server from `date_of_birth` and the current UTC date (a 29 February
birthday counts from 1 March in non-leap years). `sort=age` orders by date of birth, so `asc`
lists the youngest first.

### `GET /api/users/facets`

Accepts `q`, `hobby`, and `nationality` and returns the top 20 of each, ordered by count
(desc) then value (asc):

```json
{
  "hobbies": [{ "value": "Reading", "count": 769 }, …],
  "nationalities": [{ "value": "American", "count": 402 }, …]
}
```

### `GET /api/health` → `{ "ok": true }`

### Errors

`400` for invalid parameters or cursors, `404` for unknown API routes, `500` otherwise,
always as `{ "error": { "code", "message", "details"? } }`.

```bash
curl 'http://localhost:3000/api/users?q=ann&hobby=Chess&nationality=French&nationality=Swiss&sort=age&order=desc&limit=5'
curl 'http://localhost:3000/api/users/facets?q=ann&hobby=Chess'
```

## Design notes

### Data model

```
users(id PK, avatar, first_name NOCASE, last_name NOCASE, date_of_birth 'YYYY-MM-DD', nationality NOCASE)
hobbies(id PK, name UNIQUE NOCASE)
user_hobbies(user_id, hobby_id) PK(user_id, hobby_id) WITHOUT ROWID
indexes: users(first_name,id) (last_name,id) (date_of_birth,id) (nationality,id); user_hobbies(hobby_id,user_id)
```

Hobbies are normalized into a join table so "has all of these hobbies" and "count users per
hobby" are plain SQL. Text columns are declared `COLLATE NOCASE`, so ordering, the keyset
comparison, and the indexes agree on case-insensitive order. Each `(column, id)` index backs
one sort option with `id` as the tie-breaker.

`date_of_birth` is an ISO calendar date (a `CHECK` constraint rejects anything else). The
server derives `age` from it and the current UTC date on every request
(`server/src/dates.ts`), so ages cannot go stale, and a person's place in the age sort is
their exact birth date.

### Filtering

- **Text**: `q` is split on whitespace; every token must appear in the first _or_ last name
  (`LIKE`, wildcards escaped), so "ann zeta" and "zeta ann" both find Anna Zeta.
- **Hobbies (AND)**: one `EXISTS` per selected hobby. An unknown hobby matches nobody.
- **Nationalities (OR)**: `nationality IN (…)`.

### Sorting and pagination

Results are ordered by the backing column and then by `id`, both in the same physical
direction, which is a strict total order. `sort=age` is backed by `date_of_birth` scanned in the
opposite direction (`age asc` is `date_of_birth DESC, id DESC`), so people of the same age are
ordered by exact birth date and the composite index still applies. Pagination is keyset-based:
the cursor encodes the last row's sort value (the ISO date for `sort=age`) and id, and the
next page selects `(column, id) > (?, ?)` (or `<` when scanning descending). Unlike `OFFSET`,
this cannot skip or repeat people when pages are fetched one after another, and it uses the
composite index directly. Cursors are validated: a cursor issued under a different sort/order,
or with a mismatched value type, is rejected with `400 INVALID_CURSOR`. `hasMore` comes from
fetching `limit + 1` rows.

### Facets

Both lists reflect the current text filter and selections, not the global data set:

- **Hobbies** apply every active filter. A selected hobby therefore shows `count === total`,
  and the other rows show how many of the current results also have that hobby.
- **Nationalities** apply the text and hobby filters but _not_ the nationality selection.
  Because nationalities combine with OR, applying the selection to its own list would
  collapse it to the selected values and make a second nationality impossible to add from
  the sidebar. Counts for selected values are identical under both readings; this only
  keeps the other options visible. The switch is one flag in `buildFilterWhere`
  (`server/src/users/sql.ts`).

### URL-synced state

`q`, `hobby`, `nationality`, `sort`, and `order` are parsed from and written to the query
string by `client/src/state/searchParams.ts` (defaults omitted, lists de-duplicated and
sorted so equal states produce equal URLs). The same serializer builds API requests and
React Query keys. Typing replaces the history entry; filter and sort changes push one, so
the back button undoes them.

### Client

- **Data**: TanStack Query — `useInfiniteQuery` for pages (cursor as the page param) and
  `useQuery` for facets, with `keepPreviousData` so the old list stays visible (dimmed, with
  an "Updating" pill) while a new filter loads. Requests are cancelled when filters change.
- **List**: TanStack Virtual renders only the rows in view (measured heights, `id` keys). A
  row holds one card, or two side by side once the list container is at least 600px wide
  (measured with a `ResizeObserver`, since the virtualizer needs the column count). The next
  page is requested when the viewport is within six rows of the end; a loader row shows
  progress or an inline retry.
- **States**: skeleton cards on first load, an error panel with retry, an empty state with
  "Clear filters", and per-section loading/error states in the sidebar.
- **Sidebar sections**: each facet section collapses from its header (a button with
  `aria-expanded`); a collapsed section shows how many of its values are selected.
- **Responsive**: the sidebar becomes a slide-over drawer behind a "Filters" button below the
  `md` breakpoint.

## Tests

```bash
yarn test
```

- **Server** (`server/src/test`): parameter validation; filter semantics (tokens, LIKE
  escaping, case folding, AND/OR); full cursor walks for every sort field and direction
  compared against a JavaScript oracle (no gaps, no duplicates, stable totals); facet counts
  against a brute-force computation; date helpers (ages across leap days); the `date_of_birth`
  CHECK constraint; seed determinism and birth-date invariants; HTTP layer with supertest (JSON
  errors, static/SPA fallback, injected clock).
- **Client** (`client/src`): URL state parse/serialize round-trips and normalization;
  `UserCard` rendering including the "+n" hobby badge.

## Project structure

```
client/src
  api/          fetch wrappers and DTO types
  state/        URL <-> view state (searchParams.ts), useViewState hook
  hooks/        useUsersQuery (infinite), useFacetsQuery, useDebouncedCallback
  components/   Header, SearchInput, SortControls, FacetSidebar/FacetList, ActiveFilters,
                UserList (virtualized), UserCard, Avatar, HobbyBadges, MobileDrawer, states/
  pages/        DirectoryPage
server/src
  app.ts        Express app factory (used by tests with an in-memory database)
  index.ts      entry point
  config.ts     environment configuration
  dates.ts      UTC calendar-date helpers (isoDate, ageAt, birthDateWindow)
  db/           connection (WAL, foreign keys) and schema
  seed/         deterministic generator, insert logic, CLI
  users/        params (zod), cursor codec, SQL builders, service, router
  http/         error handling, static client serving
  test/         fixture with JS oracle and the test suites
```

## Troubleshooting

- **Port 3000 or 5173 already in use**: `PORT=3001 API_PROXY_TARGET=http://localhost:3001 yarn dev`,
  or `PORT=3010 docker compose up`.
- **`NODE_MODULE_VERSION` mismatch** after switching Node versions: `yarn install --force`
  rebuilds `better-sqlite3` for the current runtime.
- **Avatars do not load**: they come from i.pravatar.cc; cards show initials until the photo
  arrives and keep them if it never does.
- **Empty list after start**: run `yarn seed` (the server logs a hint when the table is empty).

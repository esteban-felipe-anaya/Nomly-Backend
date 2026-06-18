# Nomly Backend

The real backend for the **Nomly** cross-platform Flutter food-delivery app:

- **Django 5 + Django REST Framework** API on **PostgreSQL**, at **exact parity** with the
  existing json-server mock contract — the Flutter app works against it by only switching its
  `baseUrl` (no Flutter code changes).
- **JWT auth** (`djangorestframework-simplejwt`), server-side order totals, and a time-based
  **live order-tracking** simulation (status advances + courier moves along the route).
- The original **json-server mock is kept** and runnable from the same `db.json`.
- A **Next.js + Material UI** admin dashboard (`admin/`) for full CRUD + order management + KPIs.
- A secondary **Django admin** at `/django-admin/`.

```
Nomly-Backend/
  server/            Django project
    config/          split settings (base/dev/prod), urls, wsgi/asgi
    apps/
      accounts/      custom email User, JWT auth, addresses
      catalog/       cuisines, restaurants, menu categories, dishes, customization, banners
      orders/        promos, orders, order items, tracking/courier (+ server-side totals)
      engagement/    favorites, notifications
      adminapi/      staff-only /admin-api for the Next.js dashboard (CRUD + stats)
      seed/          `import_mock` management command (db.json -> DB)
    manage.py  requirements.txt  .env.example
  admin/             Next.js + MUI admin dashboard
  mock-api/          KEPT json-server mock (single seed source: db.json)
  Makefile  scripts/  README.md
```

`mock-api/db.json` is the **single source of seed truth**: json-server serves it directly and
`import_mock` loads the same data (real image URLs preserved) into the database, so the mock and
the real backend start identical.

---

## Use as a git submodule

This backend lives in its own repository and is mounted into the Flutter project at `backend/`:

```bash
# from the root of the Nomly Flutter project, once the backend repo is pushed:
git submodule add https://github.com/esteban-felipe-anaya/Nomly-Backend.git backend
git submodule update --init --recursive
git commit -m "Add Nomly backend as submodule"
```

Cloning the Flutter project **with** the backend:

```bash
git clone --recurse-submodules <flutter-repo-url>
# or, if already cloned:
git submodule update --init --recursive
```

> Note: this directory is initialized as its own git repo and is ready to be pushed to the remote
> above; until it is pushed, integrate it locally (it already sits at `backend/`).

---

## Prerequisites

- **Python 3.11+** and **Node.js 18+**
- **PostgreSQL** (Postgres.app, Homebrew `postgresql`, the official installer, or a managed
  instance). A zero-install **SQLite fallback** is used automatically when `DATABASE_URL` is unset
  — handy for a quick spin-up, tests and CI.

### Create the PostgreSQL database

```bash
createuser nomly --pwprompt        # set password e.g. "nomly"
createdb nomly --owner nomly
# then set DATABASE_URL=postgres://nomly:nomly@localhost:5432/nomly in backend/.env
```

---

## Quick start (Makefile, no Docker)

Run from the `backend/` directory (on Windows use Git Bash so `cp`/`sh` work):

```bash
make setup     # venv + install deps + copy .env.example -> .env   (edit DATABASE_URL)
make migrate   # apply migrations
make seed      # load mock-api/db.json into the database (idempotent)
make run       # Django API at http://localhost:8000
```

Other targets: `make mock` (json-server at :3000), `make admin` (Next.js admin at :3001),
`make test`, `make lint`, `make fmt`, `make superuser`, `make reset` (drop SQLite + re-seed).

Equivalent scripts: `scripts/setup.sh`, `scripts/seed.sh`. Or run manually:

```bash
python -m venv .venv && . .venv/Scripts/activate    # .venv/bin/activate on macOS/Linux
pip install -r server/requirements.txt
cp server/.env.example .env
cd server && python manage.py migrate && python manage.py import_mock && python manage.py runserver
```

**Seeded admin credentials:** `sofia@example.com` / `password` (this user is staff/superuser, so
it can sign into the Next.js admin, `/admin-api`, and `/django-admin/`).

---

## Point the Flutter app at this backend

The Flutter app reads its base URL from `--dart-define=NOMLY_API_BASE_URL`. Switch between the
mock and the real backend by changing only that value:

```bash
# Real Django backend
flutter run --dart-define=NOMLY_API_BASE_URL=http://localhost:8000
# json-server mock (fast/offline)
flutter run --dart-define=NOMLY_API_BASE_URL=http://localhost:3000
```

(Android emulator: use `http://10.0.2.2:<port>`.) Both serve the **same JSON shapes** — the
Django API mirrors the mock paths, query params (`cuisineId, q, minRating, priceLevel,
freeDelivery, sort, _page, _limit`), and response bodies, and `/auth/login` returns
`{ token, user }`.

---

## The mock API (kept)

```bash
cd mock-api && npm install
npm run mock          # or: npm start  -> http://localhost:3000
npm run seed          # regenerate db.json
npm run verify-images # check every image URL returns HTTP 200
```

The mock remains the **contract reference**; the Django API is built and tested to match it.

---

## API surface

**Flutter contract (public, no prefix):** `POST /auth/login|register`, `GET /auth/me`,
`/addresses` (CRUD), `/cuisines`, `/banners`, `/restaurants` (+ filters), `/restaurants/:id`,
`/restaurants/:id/menu`, `/dishes/:id`, `POST /promo/validate`, `/orders` (+ `:id`,
`:id/tracking`), `/favorites`, `/notifications`.

**Admin API (staff-only, `/admin-api`):** CRUD for `cuisines, restaurants, menu-categories,
dishes` (nested customization), `banners, promos, notifications`; read-only `users, orders`;
`POST /admin-api/orders/:id/set_status`; `POST /admin-api/notifications/broadcast`;
`GET /admin-api/stats`; and **`POST /admin-api/upload`** (multipart `file`) which stores a local
image and returns `{ url }`. Used by the Next.js dashboard.

**Uploaded media:** local image uploads are saved under `MEDIA_ROOT` (`server/media/`) and served
at `MEDIA_URL` (`/media/...`) in development. The admin stores the returned URL in the existing
image fields, so the API contract (URL strings) is unchanged. In production serve `/media` via a
real file server or object storage.

Order totals are always computed **server-side** (`POST /orders` ignores client totals). Tracking
(`/orders/:id/tracking`) advances `confirmed → preparing → picked_up → on_the_way → delivered`
over time and interpolates the courier between the restaurant and the delivery address.

**API docs (OpenAPI 3 via drf-spectacular):** with the server running —
[`/api/docs`](http://localhost:8000/api/docs) (Swagger UI),
[`/api/redoc`](http://localhost:8000/api/redoc) (ReDoc), and the raw schema at `/api/schema`.
Use the **Authorize** button in Swagger UI with a `Bearer <token>` from `/auth/login` to try the
protected endpoints.

---

## Next.js + MUI admin

```bash
cd admin && npm install
npm run dev          # http://localhost:3001
```

Set `NEXT_PUBLIC_API_BASE_URL` in `admin/.env.local` (defaults to `http://localhost:8000`). Sign
in with the seeded admin credentials above. Features: JWT login, brand-orange MUI theme with
light/dark, KPI + charts dashboard, DataGrid CRUD for restaurants (incl. menu/customization),
dishes, cuisines, banners and promos, order management with status updates, users and
notification broadcast.

---

## Configuration (`backend/.env`)

| Var | Purpose | Default |
|---|---|---|
| `SECRET_KEY` | Django secret | dev placeholder (set a long one in prod) |
| `DEBUG` | debug mode | `false` (dev settings force `true`) |
| `DATABASE_URL` | DB connection | SQLite fallback if unset; use `postgres://…` |
| `ALLOWED_HOSTS` | comma list | `*` |
| `CORS_ALLOW_ALL_ORIGINS` / `CORS_ALLOWED_ORIGINS` | CORS | all in dev; explicit in prod |
| `MOCK_DB_PATH` | seed source | `../mock-api/db.json` |

`DJANGO_SETTINGS_MODULE` defaults to `config.settings.dev` (manage.py) / `config.settings.prod`
(wsgi/asgi).

## Tests & quality

```bash
make test     # DRF tests: auth, restaurant-filtering parity, server-side order totals
make lint     # ruff
make fmt      # black + ruff --fix
```

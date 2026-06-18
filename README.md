# Nomly Backend

The real backend for the **Nomly** cross-platform Flutter food-delivery app:

- **Django 5 + Django REST Framework** API on **PostgreSQL** — the Flutter app talks to it by
  pointing its `baseUrl` at this server (no Flutter code changes).
- **JWT auth** (`djangorestframework-simplejwt`), server-side order totals, DB-backed couriers,
  and a time-based **live order-tracking** simulation (status advances + courier moves along the
  route).
- A **Next.js + Material UI** admin dashboard (`admin/`) for full CRUD + order management + KPIs,
  image upload/crop, and courier management.
- A secondary **Django admin** at `/django-admin/`.

```
Nomly-Backend/
  server/            Django project
    config/          split settings (base/dev/prod), urls, wsgi/asgi
    apps/
      accounts/      custom email User, JWT auth, addresses
      catalog/       cuisines, restaurants, menu categories, dishes, customization, banners
      orders/        promos, orders, order items, couriers, tracking (+ server-side totals)
      engagement/    favorites, notifications
      adminapi/      staff-only /admin-api for the Next.js dashboard (CRUD + stats)
      seed/          `import_mock` command + bundled `seed_data.json`
    manage.py  requirements.txt  .env.example
  admin/             Next.js + MUI admin dashboard
  Makefile  scripts/  README.md
```

`server/apps/seed/seed_data.json` is the bundled seed: `import_mock` loads it (real image URLs
preserved) into the database so a fresh DB comes up fully populated.

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
make seed      # load the bundled seed data into the database (idempotent)
make run       # Django API at http://localhost:8000
```

Other targets: `make admin` (Next.js admin at :3001), `make test`, `make lint`, `make fmt`,
`make superuser`, `make reset` (drop SQLite + re-seed).

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

The Flutter app reads its base URL from a `.env` file (`NOMLY_API_BASE_URL`, via flutter_dotenv)
or `--dart-define=NOMLY_API_BASE_URL`:

```bash
flutter run --dart-define=NOMLY_API_BASE_URL=http://localhost:8000
# Android emulator: http://10.0.2.2:8000   |   physical device: http://<your-LAN-ip>:8000
```

`/auth/login` returns `{ token, user }`; `/restaurants` honors `cuisineId, q, minRating,
priceLevel, freeDelivery, sort, _page, _limit`.

---

## API surface

**Flutter contract (public, no prefix):** `POST /auth/login|register`, `GET /auth/me`,
`/addresses` (CRUD), `/cuisines`, `/banners`, `/restaurants` (+ filters), `/restaurants/:id`,
`/restaurants/:id/menu`, `/dishes/:id`, `POST /promo/validate`, `/orders` (+ `:id`,
`:id/tracking`), `/favorites`, `/notifications`.

**Admin API (staff-only, `/admin-api`):** CRUD for `cuisines, restaurants, menu-categories,
dishes` (nested customization), `banners, promos, couriers, notifications`; read-only `users,
orders, addresses` (filter `?user=`); `POST /admin-api/orders/:id/set_status`;
`POST /admin-api/notifications/broadcast`; `GET /admin-api/stats`; and
**`POST /admin-api/upload`** (multipart `file`) which stores a local image and returns the
**relative** `{ url: "/media/uploads/…" }`. Used by the Next.js dashboard.

**Uploaded media:** images are saved under `MEDIA_ROOT` (`server/media/`) and served at
`MEDIA_URL` (`/media/...`) in development. Image fields store the **relative path only** (e.g.
`/media/uploads/x.png`); each client prepends its own base URL, so values are host-independent and
absolute URLs (existing photos) still work. In production serve `/media` via a real file server or
object storage.

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
light/dark, collapsible animated sidebar, KPI + charts dashboard, DataGrid CRUD for restaurants
(incl. menu/customization), dishes, cuisines, banners, promos and **couriers**, order management
with status updates, users (with their addresses), notification broadcast, and image
**upload + crop**. The logged-in admin can edit their own profile and **manage their addresses**.

---

## Configuration (`backend/.env`)

| Var | Purpose | Default |
|---|---|---|
| `SECRET_KEY` | Django secret | dev placeholder (set a long one in prod) |
| `DEBUG` | debug mode | `false` (dev settings force `true`) |
| `DATABASE_URL` | DB connection | SQLite fallback if unset; use `postgres://…` |
| `ALLOWED_HOSTS` | comma list | `*` |
| `CORS_ALLOW_ALL_ORIGINS` / `CORS_ALLOWED_ORIGINS` | CORS | all in dev; explicit in prod |
| `SEED_DATA_PATH` | seed source (optional) | `apps/seed/seed_data.json` |

`DJANGO_SETTINGS_MODULE` defaults to `config.settings.dev` (manage.py) / `config.settings.prod`
(wsgi/asgi).

## Tests & quality

```bash
make test     # DRF tests: auth, restaurant-filtering parity, server-side order totals
make lint     # ruff
make fmt      # black + ruff --fix
```

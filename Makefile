# Nomly backend — one-liner DX (no Docker). Run targets from the backend/ root.
# On Windows, run via Git Bash (for cp/sh); GNU make detects the venv path.

ifeq ($(OS),Windows_NT)
  VENV_PY := .venv/Scripts/python.exe
  VENV_FROM_SERVER := ../.venv/Scripts/python.exe
else
  VENV_PY := .venv/bin/python
  VENV_FROM_SERVER := ../.venv/bin/python
endif

# manage.py commands run with cwd=server/ so test discovery and app imports work.
MANAGE := cd server && $(VENV_FROM_SERVER) manage.py

.PHONY: setup migrate seed run mock admin test lint fmt check superuser reset

## create venv, install deps, copy .env
setup:
	python -m venv .venv
	$(VENV_PY) -m pip install --upgrade pip
	$(VENV_PY) -m pip install -r server/requirements.txt
	[ -f .env ] || cp server/.env.example .env
	@echo "✓ setup complete. Edit backend/.env (DATABASE_URL) then: make migrate && make seed && make run"

## apply database migrations
migrate:
	$(MANAGE) migrate

## load mock-api/db.json into the database (idempotent)
seed:
	$(MANAGE) import_mock

## run the Django API (http://localhost:8000)
run:
	$(MANAGE) runserver 0.0.0.0:8000

## run the json-server mock (http://localhost:3000)
mock:
	npm --prefix mock-api install
	npm --prefix mock-api start

## run the Next.js + MUI admin (http://localhost:3001)
admin:
	npm --prefix admin install
	npm --prefix admin run dev

## run the backend test suite
test:
	$(MANAGE) test

## lint (ruff)
lint:
	$(VENV_PY) -m ruff check server

## auto-format (black + ruff --fix)
fmt:
	$(VENV_PY) -m black server
	$(VENV_PY) -m ruff check --fix server

## django system check
check:
	$(MANAGE) check

## create a Django superuser
superuser:
	$(MANAGE) createsuperuser

## drop the SQLite dev DB and re-migrate + re-seed
reset:
	rm -f server/db.sqlite3
	$(MANAGE) migrate && $(VENV_FROM_SERVER) manage.py import_mock

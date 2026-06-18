#!/usr/bin/env bash
# Migrate + load the bundled seed data into the database. Run from backend/.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ "${OS:-}" = "Windows_NT" ]; then
  VENV_PY=".venv/Scripts/python.exe"
else
  VENV_PY=".venv/bin/python"
fi

(cd server && "../$VENV_PY" manage.py migrate)
(cd server && "../$VENV_PY" manage.py import_mock "$@")
echo "✓ database migrated and seeded from seed_data.json"

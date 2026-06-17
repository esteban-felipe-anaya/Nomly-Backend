#!/usr/bin/env bash
# Set up the Nomly backend: venv, dependencies, .env. Run from backend/.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ "${OS:-}" = "Windows_NT" ]; then
  VENV_PY=".venv/Scripts/python.exe"
else
  VENV_PY=".venv/bin/python"
fi

echo "→ creating virtualenv (.venv)"
python -m venv .venv

echo "→ installing dependencies"
"$VENV_PY" -m pip install --upgrade pip
"$VENV_PY" -m pip install -r server/requirements.txt

if [ ! -f .env ]; then
  cp server/.env.example .env
  echo "→ created backend/.env from .env.example — edit DATABASE_URL as needed"
fi

echo "✓ setup complete. Next: make migrate && make seed && make run"

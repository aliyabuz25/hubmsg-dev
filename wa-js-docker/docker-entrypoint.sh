#!/bin/sh
set -eu

seed_if_empty() {
  src="$1"
  dst="$2"

  mkdir -p "$dst"

  if [ ! -d "$src" ]; then
    return 0
  fi

  if [ -n "$(ls -A "$dst" 2>/dev/null)" ]; then
    return 0
  fi

  cp -a "$src"/. "$dst"/
}

seed_if_empty /app/seed-data /app/datalar
mkdir -p /app/tenant_data /app/backups /app/uploads /app/nginx-logs

exec "$@"

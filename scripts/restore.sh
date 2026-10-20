#!/bin/sh
# Replaces the database and the uploads with a backup. Stop the api and web services first.
set -eu
file=${1:?usage: restore.sh /backups/filemana-<time>.tar}
work=$(mktemp -d /backups/.tmp-XXXXXX)
trap 'rm -rf "$work"' EXIT

others=$(psql -Atc "SELECT count(*) FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid()")
if [ "$others" != 0 ]; then
  echo "restore: $others other connections to the database; stop api and web first" >&2
  exit 1
fi
tar -C "$work" -xf "$file"
psql -q -v ON_ERROR_STOP=1 -c 'SET client_min_messages TO warning' -c 'DROP SCHEMA public CASCADE' -c 'CREATE SCHEMA public'
pg_restore --no-owner --exit-on-error -d "$PGDATABASE" "$work/db.dump"
find /uploads -mindepth 1 -delete
tar -C /uploads -xf "$work/uploads.tar"
echo "restore: restored $file"

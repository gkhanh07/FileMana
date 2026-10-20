#!/bin/sh
# Daily backup (NFR-07): one tar holding a database dump and every uploaded file. Keeps the newest $KEEP.
set -eu
umask 077
KEEP=${KEEP:-30}
dir=/backups
name=filemana-$(date -u +%Y%m%dT%H%M%SZ).tar
# Leftovers from a run that was killed; only one backup or restore runs at a time.
rm -rf "$dir"/.tmp-*
work=$(mktemp -d "$dir/.tmp-XXXXXX")
trap 'status=$?; rm -rf "$work"; [ "$status" = 0 ] || echo "backup: FAILED ($status)" >&2' EXIT

echo "backup: starting $name"
pg_dump -Fc -f "$work/db.dump"
tar -C /uploads -cf "$work/uploads.tar" .
tar -C "$work" -cf "$work/$name" db.dump uploads.tar
mv "$work/$name" "$dir/$name"
ls -1 "$dir"/filemana-*.tar | sort -r | tail -n +"$((KEEP + 1))" | xargs -r rm -f
echo "backup: wrote $dir/$name ($(du -h "$dir/$name" | cut -f1)), keeping $(ls -1 "$dir"/filemana-*.tar | wc -l)"

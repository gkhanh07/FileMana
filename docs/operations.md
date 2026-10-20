# Operations

Production runs `docker-compose.prod.yml` on the VPS. Caddy listens on `HTTP_PORT` and the VPS's own Nginx terminates HTTPS in front of it.

## Live updates (NFR-14)

Open pages keep one Server-Sent Events connection to `GET /api/events`. Any change makes them refetch within about a second.

Nginx must not buffer or time out that stream. Add this to the site's `server` block, before the general `location /`, and adjust the port if `HTTP_PORT` is not 8080:

```nginx
location /api/events {
    proxy_pass http://127.0.0.1:8080;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 1h;
}
```

Then run `sudo nginx -t && sudo systemctl reload nginx`.

Keep `http2` on the `listen 443 ssl` line. Over HTTP/1.1 a browser opens at most 6 connections per site, and every open tab holds one of them.

Check it: sign in in two browsers, change a task in one, and it changes in the other within 5 seconds. Or stream it by hand with the `sid` cookie from the browser:

```sh
curl -N -H "Cookie: sid=<value>" https://app.example.com/api/events
```

Each change prints `data: change`, and a `ping` arrives every 25 seconds. The stream ends when that session signs out.

The API keeps the list of listeners in memory, so it must run as a single process. That is how the compose file runs it.

## Backups (NFR-07)

The `backup` service runs `scripts/backup.sh` every day at 02:00 Vietnam time (19:00 UTC). Each run writes one file, `filemana-<UTC time>.tar`, to `BACKUP_DIR` (default `/var/backups/filemana`) and keeps the newest 30. The file holds `db.dump` (a `pg_dump -Fc` of the database) and `uploads.tar` (every uploaded file and avatar).

`.env` is not in the backup. Keep a copy of it somewhere safe; without `POSTGRES_PASSWORD` and the other values a restore still works, but you must recreate them.

Commands below run in the app folder on the VPS. `dc` stands for `docker compose -f docker-compose.prod.yml`.

Check that the schedule is set and see past runs:

```sh
dc exec backup crontab -l
dc logs backup
```

Each run logs `backup: wrote ...` or `backup: FAILED`. Run one by hand:

```sh
dc exec backup sh /scripts/backup.sh
ls -lh /var/backups/filemana
```

Check disk space now and then. Thirty backups take about 30 times the size of one:

```sh
df -h /var/backups/filemana
```

### Restore

This replaces everything in the database and the uploads with the backup.

```sh
dc stop api web
dc exec backup sh /scripts/restore.sh /backups/filemana-<time>.tar
dc start api web
```

The script refuses to run while anything else is connected to the database. People who were signed in when the backup was taken stay signed in; everyone else signs in again.

### Copy backups off the VPS

The backups sit on the same disk as the app. Pull a copy from another machine regularly (the folder is readable only by root):

```sh
rsync -a --rsync-path="sudo rsync" user@vps:/var/backups/filemana/ ./filemana-backups/
```

To restore on a new server, copy the file into its `BACKUP_DIR`, start the stack with `dc up -d`, then follow the restore steps.

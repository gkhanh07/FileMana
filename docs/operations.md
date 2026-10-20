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

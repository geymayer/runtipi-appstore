# geymayer's runtipi app store

A [runtipi](https://runtipi.io) app store for my own apps. Add it in runtipi under Settings → App
Stores with this repository's URL and the name `geymayer` (the name ends up in data paths such as
`app-data/geymayer/haus/`, so keep it).

The repository is public because runtipi cannot sign in to a store. It holds only app definitions:
no data, domains or tokens. The images it points to are private on `ghcr.io`; the homelab pulls
them after a `docker login ghcr.io` with a token that can only read packages.

| App | Image | Source |
|---|---|---|
| `haus` | `ghcr.io/geymayer/haus-server` | [geymayer/haus](https://github.com/geymayer/haus) (private) |
| `home-relay` | `ghcr.io/geymayer/home-relay` (+ `alexxit/go2rtc`) | [geymayer/home](https://github.com/geymayer/home) (private) |
| `family` | `ghcr.io/geymayer/family-server` | [geymayer/family](https://github.com/geymayer/family) (private) |
| `haus-demo` | `ghcr.io/geymayer/haus-server` | Haus on demo data or a copy of the real data, for dev builds |
| `family-demo` | `ghcr.io/geymayer/family-server` | Family on demo data or a copy of the real data, for dev builds |

Planned: `cook-fake-tandoor` (Cook's fake Tandoor for the Cook dev build's Demo profile), once
geymayer/cook publishes an image of `tools/fake_tandoor.py`; there is none yet.

## Demo apps

`haus-demo` and `family-demo` run only while a dev build is tested (start, test, stop): the
homelab has little RAM to spare. Each is capped at 200 MB and half a CPU, raises its own
`oom_score_adj` to 1000 so the kernel would stop it before any real app, and shares no port, data
folder or container with the real app. Their image follows the real app's; bump both together.

Their entrypoint is `scripts/demo-data.sh` (`bun scripts/embed-demo-data.ts` copies it into both
`docker-compose.json` files; a test fails when it is stale, and other tests run it against stubs).
It starts the server on `data/demo/` (seeded demo data) or `data/copy/` (a copy of the real app's
data), as `data/mode` says, or as the app's Data setting forces. The real app's data folder is
mounted read-only at `/real` (`${APP_DATA_DIR}/../<app>/data`); the copy is the server's own backup
command (SQLite `VACUUM INTO`) reading it while the real server runs, at idle I/O and lowest CPU
priority, taken when `data/copy/` is missing, `data/refresh` exists or the Refresh setting is on.
SQLite reads a WAL database on a read-only mount without writing its `-shm` and never blocks the
writer; a database nobody has open (no `-wal`, no `-shm`) is copied as files. The script refuses to
copy from a folder that is not a read-only mount. `DEV_DATA_SWITCH=1` and the generated
`DEV_SWITCH_TOKEN` are for the servers' coming dev endpoints (`GET`/`POST /dev/data`, which write
`data/mode` and `data/refresh` and exit; `restart: unless-stopped` brings the server back).

## Layout

Each app is a folder under `apps/` named after its `id`: `config.json`, `docker-compose.json`
(runtipi's dynamic compose format), `metadata/description.md` and a square `metadata/logo.jpg`.
`bun install && bun test` checks every app against runtipi's schemas; the GitHub workflow runs the
same on each push.

## Releasing a new version of an app

1. Push the new image tag (Haus and Family: `v0.2.0`, Home relay: `relay-v0.2.0`; their workflows also do steps 2 and 3).
2. In the app's `docker-compose.json`, change `image` to the new tag.
3. In its `config.json`, set `version` to the tag, raise `tipi_version` by one and set
   `updated_at` to now in milliseconds.
4. Push, then in runtipi click "Update App Stores" and update the app.

Guide: [Create your own app store](https://runtipi.io/docs/guides/create-your-own-app-store).

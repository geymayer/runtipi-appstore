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

## Layout

Each app is a folder under `apps/` named after its `id`: `config.json`, `docker-compose.json`
(runtipi's dynamic compose format), `metadata/description.md` and a square `metadata/logo.jpg`.
`bun install && bun test` checks every app against runtipi's schemas; the GitHub workflow runs the
same on each push.

## Releasing a new version of an app

1. Push the new image tag.
2. In the app's `docker-compose.json`, change `image` to the new tag.
3. In its `config.json`, set `version` to the tag, raise `tipi_version` by one and set
   `updated_at` to now in milliseconds.
4. Push, then in runtipi click "Update App Stores" and update the app.

Guide: [Create your own app store](https://runtipi.io/docs/guides/create-your-own-app-store).

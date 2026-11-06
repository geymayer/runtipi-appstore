# Family demo

A second Family server for testing dev builds of the Family app. It never runs on the real
family's log: it runs either on the invented **Familie Muster** (caregivers Anna and Ben, and a
daughter of about six months simply called Baby, with her last 14 days) or on a **copy of the real
Family data**. It uses the same image as the Family app, with its own data folder, port and
container. There is no web interface.

## Only while testing

The homelab has little RAM to spare. Start this app while you test a dev build, and stop it
afterwards. It is capped at 200 MB of memory (Java heap 96 MB) and half a CPU, and it is the first
process the kernel stops if the machine ever runs out of memory, so it cannot starve the real apps.

## Demo data or a copy of the real data

- **Demo data**: Familie Muster, loaded once into an empty folder (`data/demo/`), with the 14 days
  ending at that first start; what tests change stays.
- **Copy of the real data**: `data/copy/`, taken from the Family app's data folder, which this app
  sees read-only. The copy is taken online with SQLite's `VACUUM INTO` (the Family server's own
  backup command) at the lowest CPU and I/O priority: the real Family keeps running, is never
  stopped, paused or restarted, and nothing is ever written to its folder. Real backups are not
  copied.

Who chooses:

- **Data → Chosen in the dev app** (default): the dev build's *Dev data* section in Settings switches
  and refreshes; the server restarts on the other dataset within seconds (Family server 0.4.1 or later).
- **Data → Demo data** or **Copy of the real Family data**: runtipi decides (the fallback).
  **Refresh the copy on every start** takes a new copy at each start while it is on; turn it off
  again after.

Both datasets stay when you switch; nothing is deleted. To start Familie Muster afresh, stop the
app, delete `<runtipi>/app-data/geymayer/family-demo/data/demo` and start it again.

The dev app authenticates its switch with the **Dev switch token** (valid on this demo server only).
You see it in two places:

- **Settings** of this app in runtipi: the *Dev switch token* field. Put any long random text there
  if you like; it is used as is.
- **Logs** of this app in runtipi: at every start the app prints
  `dev switch token (enter it in the dev app's Dev data section): …`. With the field left empty, a
  token is generated once, kept in the app's data folder and shown there.

## Pairing a dev build

Dev builds pair fresh; they never take over a real phone's sign-in.

- Demo data: the re-usable demo codes `ANNA0001` (Anna, admin) and `BEN00001` (Ben). They work only
  on the demo data.
- Copy of the real data: the dev build pairs itself — after a switch it asks this demo server (with
  the Dev switch token) for a one-time code on the copy and signs in with it. Nothing is needed in the
  real Family app.

When a fresh copy starts for the first time, the server revokes every copied sign-in — the real
phones' device tokens and the Home relay's connection token — and deletes the copy's unused pairing
codes, so nothing real can ever run against this demo.

## Pairing page

Optional, like on the real Family app: set a **Pairing page password** to see the current codes with a
QR code at `/pair` (home network only unless allowed from outside). Open it through the app's runtipi
domain, not the published host port.

## Nothing leaves the server

The Family server sends nothing out: no pushes, mails or webhooks; the Home relay asks it, never the
other way round. Its nightly backups are switched off here (`FAMILY_BACKUP_HOUR=off`).

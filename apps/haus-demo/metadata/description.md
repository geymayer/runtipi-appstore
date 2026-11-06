# Haus demo

A second Haus server for testing dev builds of the Haus apps. It never runs on the real building:
it runs either on the invented demo building **Musterhaus** (households Berger, Huber and Wagner) or
on a **copy of the real Haus data**. It uses the same image as the Haus app, with its own data
folder, port and container.

## Only while testing

The homelab has little RAM to spare. Start this app while you test a dev build, and stop it
afterwards. It is capped at 200 MB of memory (Java heap 96 MB) and half a CPU, and it is the first
process the kernel stops if the machine ever runs out of memory, so it cannot starve the real apps.

## Demo data or a copy of the real data

- **Demo data**: the Musterhaus, loaded once into an empty folder (`data/demo/`); what tests change stays.
- **Copy of the real data**: `data/copy/`, taken from the Haus app's data folder, which this app sees
  read-only. The copy is taken online with SQLite's `VACUUM INTO` (the Haus server's own backup
  command) at the lowest CPU and I/O priority: the real Haus keeps running, is never stopped,
  paused or restarted, and nothing is ever written to its folder. Real backups are not copied.

Who chooses:

- **Data → Chosen in the dev app** (default): the dev build's *Dev data* section in Settings switches
  and refreshes; the server restarts on the other dataset within seconds. Until the Haus server has
  that switch, this starts on the demo data.
- **Data → Demo data** or **Copy of the real Haus data**: runtipi decides (the fallback). **Refresh
  the copy on every start** takes a new copy at each start while it is on; turn it off again after.

Both datasets stay when you switch; nothing is deleted. To start the demo building afresh, stop the
app, delete `<runtipi>/app-data/geymayer/haus-demo/data/demo` and start it again.

The dev app authenticates its switch with the **Dev switch token** (valid on this demo server only).
You see it in two places:

- **Settings** of this app in runtipi: the *Dev switch token* field. Put any long random text there
  if you like; it is used as is.
- **Logs** of this app in runtipi: at every start the app prints
  `dev switch token (enter it in the dev app's Dev data section): …`. With the field left empty, a
  token is generated once, kept in the app's data folder and shown there.

## Pairing a dev build

Dev builds pair fresh; they never take over a real phone's sign-in.

- Demo data: the re-usable demo codes `BERGER01` (Anna Berger, admin), `HUBER001` (Ben Huber),
  `WAGNER01` (Clara Wagner). They work only on the demo data.
- Copy of the real data: until the server can mint a code on the copy itself, create a pairing code
  in the real Haus app (Einstellungen › Personen, valid 24 hours), then refresh the copy and enter
  that code in the dev build. The code is used up on the copy only; on the real server it simply
  expires unused.

The copy holds the real phones' device sign-ins too. They would only work if a phone were pointed at
this demo's address, which no real app is; the server has no switch to revoke them all, so keep this
app's domain to yourself.

## Nothing leaves the server

The Haus server sends nothing out: no pushes, mails, webhooks or integrations (reminders are local
notifications on the phones). Backups exist only as a command you run; none run here.

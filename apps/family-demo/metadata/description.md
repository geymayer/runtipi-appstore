# Family demo

A second Family server, preloaded with the invented **Familie Muster**: caregivers Anna (admin) and
Ben, and their daughter, about six months old and simply called Baby, with the last 14 days of her
log. It is for trying out dev builds of the Family app without touching the real family's data. It
runs the same image as the Family app, with its own data folder and port.

## Only while testing

The homelab has little RAM to spare, so this app is meant to run only while a dev build is being
tested: start it, test, stop it. It is capped at about 200 MB (Java heap 96 MB), which is enough for
a few test phones but not for real use.

## Pairing

There is no web interface. Expose the app on its own domain (like the real Family app) and enter
that domain in the app. Pair with one of the demo codes; they can be used again and again, and only
work on this demo server:

| Code | Caregiver |
|---|---|
| `ANNA0001` | Anna (admin) |
| `BEN00001` | Ben |

## Starting over

The demo family is loaded once, into an empty data folder, with the 14 days ending at that first
start; what the tests change stays, and the log grows older. For a fresh Familie Muster, stop the
app, delete `<runtipi>/app-data/geymayer/family-demo/data` and start it again. Nothing here needs a
backup.

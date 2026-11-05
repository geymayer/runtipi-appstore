# Haus demo

A second Haus server, preloaded with the invented demo building **Musterhaus** (households Berger,
Huber and Wagner), for trying out dev builds of the Haus apps without touching the real building.
It runs the same image as the Haus app, with its own data folder and port.

## Only while testing

The homelab has little RAM to spare, so this app is meant to run only while a dev build is being
tested: start it, test, stop it. It is capped at about 200 MB (Java heap 96 MB), which is enough for
a few test devices but not for real use.

## Pairing

Expose the app on its own domain (like the real Haus app) and enter that domain in the app, or open
it in a browser for the web app. Pair with one of the demo codes; they can be used again and again,
and only work on this demo server:

| Code | Person |
|---|---|
| `BERGER01` | Anna Berger (admin) |
| `HUBER001` | Ben Huber |
| `WAGNER01` | Clara Wagner |

## Starting over

The demo building is loaded once, into an empty data folder; what the tests change stays. For a
fresh Musterhaus, stop the app, delete `<runtipi>/app-data/geymayer/haus-demo/data` and start it
again. Nothing here needs a backup.

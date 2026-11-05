# Cook fake Tandoor

The server behind the **Demo** profile of Cook's dev builds ("Cook Dev" → Mehr → Konto → Dev-Daten).
It mimics the Tandoor Recipes API with invented data and never touches your real Tandoor.

## Only while testing

Start it while you test a dev build and stop it afterwards. It is tiny (a single Python file, capped at
64 MB of memory and a quarter of a CPU) and keeps everything in memory: a restart resets it.

## Signing in

User **test**, password **test**. The demo kitchen has 6 recipes, 33 foods, two shopping lists and a
week of meal plans. A second member, Anna, only acts through the server's test hooks.

## Good to know

- The test hooks (`/_test/...`) need no sign-in: anyone who can reach the app can add demo entries or
  reset it. It holds nothing real, but keep it on the home network.
- Image `ghcr.io/geymayer/cook-fake-tandoor`, built from `tools/fake_tandoor.py` in the Cook repository.

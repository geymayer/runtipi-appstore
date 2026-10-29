# Family

Server for the Family apps: one shared log of a child's day (sleep and night wakings, nursing
and bottles, solids, diapers, pumping, medicine, temperature, growth), synced between the
caregivers' phones, with a nap planner. The data stays on this server.

There is no web interface. Expose the app on a domain with a certificate the phones trust, then
enter that domain in the app.

## First start

The setup code for the first phone is in
`<runtipi>/app-data/geymayer/family/data/setup-code.txt` and in the app's log. Enter it in the
app together with the family's name and yours; that phone becomes the admin. Invite the other
caregivers from the app's settings.

The server runs as uid 10001; its entrypoint hands the data folder to that user on start. If the
server cannot write after a restore unpacked as root, once:

```sh
sudo chown -R 10001:10001 <runtipi>/app-data/geymayer/family/data
```

## Backups

Take them with the server's own backup command; it is consistent while the server runs:

```sh
docker exec <container> java -jar /app/family-server.jar backup /data/backups/family-$(date +%F).tar.gz
```

They land in `<runtipi>/app-data/geymayer/family/data/backups/`. Copy them off the machine.
To restore, stop the app and unpack the archive into the data folder (it holds `family.db`).

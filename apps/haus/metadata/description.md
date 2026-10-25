# Haus

Server for the Haus apps (Android, iOS, macOS, Windows), for a building shared by a few
households: meter readings, the Betriebskosten split and yearly statement, tasks and rotations,
appointments, equipment and a wiki. The data stays on this server.

There is no web interface. Expose the app on a domain with a certificate the phones trust, then
enter that domain in one of the apps.

## First start

The server runs as uid 10001 and runtipi creates the data folder as root. Once, after installing:

```sh
sudo chown -R 10001:10001 <runtipi>/app-data/geymayer/haus/data
```

Then restart the app. The setup code for the first device is in
`<runtipi>/app-data/geymayer/haus/data/setup-code.txt`.

## Backups

Take them with the server's own backup command; it is consistent while the server runs:

```sh
docker exec <container> java -jar /app/haus-server.jar backup /data/backups/haus-$(date +%F).tar.gz
```

They land in `<runtipi>/app-data/geymayer/haus/data/backups/`. Copy them off the machine.

Install, restore and the workbook import: [README](https://github.com/geymayer/haus#install-on-a-homelab-docker-compose).

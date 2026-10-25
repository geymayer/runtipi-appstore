# Home relay

Relay for the Home app (Android, iOS) next to Home Assistant: it watches the door station and the
cameras, sends the ring pushes, serves pictures and brings live video and talk to the phones
through go2rtc (the second container of this app). The data stays on this server.

There is no web interface. Expose the app on a domain with a certificate the phones trust (the live
WebSocket must pass the proxy), then enter that domain in the Home app under Settings → Kameras &
Klingel.

## Live video and talk

go2rtc publishes one port, `8555/tcp`. "Address of this server for the phones" is the address the
phones reach it on: the LAN address, or the WireGuard address when the phones are away. Without a
path to that port the app falls back to HLS through the relay (a couple of seconds behind; talk
needs WebRTC).

## Pushes

Without keys the relay works, and rings reach an open app only. For pushes put the key files into
`<runtipi>/app-data/geymayer/home-relay/data/` and restart the app:

- iPhone: the `.p8` key from developer.apple.com as `apns-key.p8`, plus its key id and the team id
  in this app's settings.
- Android: the Firebase service-account JSON as `fcm-service-account.json`.

The log says `APNs push enabled` / `FCM push enabled` when it found them. The folder also holds the
relay's database, so back it up the way you back up the other app data.

Setup, hardware and keys: [door-intercom-setup](https://github.com/geymayer/home/blob/develop/docs/door-intercom-setup.md).

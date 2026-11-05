#!/bin/sh
# The entrypoint of the demo apps (haus-demo, family-demo): picks the dataset the demo server runs on,
# makes the copy of the real data when it is needed, then starts the image's own entrypoint.
# scripts/embed-demo-data.ts copies this file into their docker-compose.json (a test checks it).
#
# Layout of this app's own folder (/data):
#   demo/           the demo dataset (the server seeds it into the empty folder)
#   copy/           a copy of the real app's data
#   mode            demo | copy: the dataset to start on (the dev app's server endpoint writes it,
#                   POST /dev/data, then exits; the restart policy brings the server back on it)
#   refresh         present: take a new copy at the next start in copy mode
#   copy-taken-at   when the copy was taken (UTC, ISO 8601)
# /real is the real app's data folder, mounted read-only. Nothing here writes to it: the copy is
# SQLite's VACUUM INTO through the server's own backup command (a reader: the real server keeps
# running and writing), and the script refuses to copy unless /real is a read-only mount.
#
#   DEMO_APP      haus | family (the image: /app/<app>-server.jar, <APP>_SEED, <APP>_DATA_DIR, <app>.db)
#   DEMO_DATA     app: the mode file decides (demo when there is none); demo | copy: runtipi decides
#                 and writes the mode file (the fallback until the servers have the dev endpoints)
#   DEMO_REFRESH  true: take a new copy at every start in copy mode (runtipi fallback for refresh)
set -eu

app="${DEMO_APP:?DEMO_APP must be haus or family}"
choice="${DEMO_DATA:-app}"
refresh_always="${DEMO_REFRESH:-false}"
root="${DEMO_ROOT:-/data}"
real="${DEMO_REAL:-/real}"
java="${DEMO_JAVA:-java}"
jar="${DEMO_JAR:-/app/$app-server.jar}"
start="${DEMO_START:-/app/docker-entrypoint.sh}"
upper=$(echo "$app" | tr '[:lower:]' '[:upper:]')
db="$app.db"
demo_dir="$root/demo"
copy_dir="$root/copy"
mode_file="$root/mode"
refresh_file="$root/refresh"
taken_file="$root/copy-taken-at"
incoming="$root/.incoming"

log() { echo "demo-data: $*"; }
# Waits before exiting, so a container that cannot start does not restart in a tight loop.
fail() { log "$*"; sleep "${DEMO_FAIL_WAIT:-60}"; exit 1; }

# Lowest CPU and I/O priority for the copy, so the real apps never wait for it.
low() {
    if command -v ionice >/dev/null 2>&1; then ionice -c 3 -t nice -n 19 "$@"; else nice -n 19 "$@"; fi
}

real_is_read_only() {
    awk -v m="$real" '$5 == m { split($6, o, ","); if (o[1] == "ro") found = 1 } END { exit !found }' /proc/self/mountinfo
}

real_is_live() {
    [ -e "$real/$db-wal" ] || [ -e "$real/$db-shm" ]
}

# Takes a new copy into .incoming and puts it in place of copy/. Returns 1 (copy/ untouched) on failure.
take_copy() {
    if [ ! -f "$real/$db" ]; then log "no $db in the real $app data folder (is the $app app installed?)"; return 1; fi
    if [ "${DEMO_SKIP_RO_CHECK:-}" != 1 ] && ! real_is_read_only; then log "$real is not mounted read-only"; return 1; fi
    rm -rf "$incoming" && mkdir -p "$incoming" || return 1
    if real_is_live; then
        # The real server has the database open. Its backup command opens it from the read-only mount
        # (SQLite falls back to a read-only connection and reads the WAL without writing -shm) and
        # takes a consistent copy with VACUUM INTO; the writer is never blocked.
        log "taking an online copy of the real $app data; the real server keeps running"
        low env "${upper}_DATA_DIR=$real" "$java" -jar "$jar" backup "$incoming/copy.tar.gz" || return 1
        tar -xzf "$incoming/copy.tar.gz" -C "$incoming" && rm -f "$incoming/copy.tar.gz" || return 1
    else
        # No -wal and no -shm: nothing has the database open, so its files are a consistent copy.
        log "the real $app server is not running; copying its data folder"
        (cd "$real" && low tar -cf - --exclude=./backups --exclude="./$app.lock" --exclude=./files/tmp \
            --exclude=./setup-code.txt .) | tar -xf - -C "$incoming" || return 1
        if real_is_live; then log "the real $app server started during the copy"; return 1; fi
    fi
    if [ ! -f "$incoming/$db" ]; then log "the copy holds no $db"; return 1; fi
    rm -rf "$copy_dir" && mv "$incoming" "$copy_dir" || return 1
    date -u '+%Y-%m-%dT%H:%M:%SZ' > "$taken_file"
    rm -f "$refresh_file"
    log "took a new copy of the real $app data"
}

mkdir -p "$root"
case "$root" in /|"$real"|"$real"/*) fail "own data folder $root overlaps the real one" ;; esac
if [ -e "$real" ] && [ "$(stat -c %d:%i "$root")" = "$(stat -c %d:%i "$real")" ]; then
    fail "$root and $real are the same folder; refusing to start"
fi
rm -rf "$incoming"  # an interrupted copy

# The first version of these apps kept the demo data directly in /data.
if [ -f "$root/$db" ] && [ ! -e "$demo_dir" ]; then
    log "moving the demo data into $demo_dir"
    mkdir -p "$demo_dir"
    find "$root" -mindepth 1 -maxdepth 1 ! -name demo ! -name copy ! -name mode ! -name refresh \
        ! -name copy-taken-at -exec mv {} "$demo_dir"/ \;
fi

case "$choice" in
    demo | copy) mode="$choice"; log "data chosen in runtipi: $mode" ;;
    app) mode=$(cat "$mode_file" 2>/dev/null || echo demo) ;;
    *) fail "DEMO_DATA must be app, demo or copy, not '$choice'" ;;
esac
case "$mode" in demo | copy) ;; *) log "unknown mode '$mode' in $mode_file; using demo"; mode=demo ;; esac

if [ "$mode" = copy ]; then
    if [ ! -f "$copy_dir/$db" ] || [ -e "$refresh_file" ] || [ "$refresh_always" = true ]; then
        if ! take_copy; then
            rm -rf "$incoming"
            [ -f "$copy_dir/$db" ] || fail "no copy of the real $app data; not starting"
            rm -f "$refresh_file"
            log "could not take a new copy; keeping the one from $(cat "$taken_file" 2>/dev/null || echo before)"
        fi
    fi
    unset "${upper}_SEED"
    export "${upper}_DATA_DIR=$copy_dir"
    log "copy of the real $app data from $(cat "$taken_file" 2>/dev/null || echo '?')"
else
    export "${upper}_SEED=demo"
    export "${upper}_DATA_DIR=$demo_dir"
    log "demo data"
fi
echo "$mode" > "$mode_file"
# The server writes mode and refresh itself (POST /dev/data), as its own user.
if id "$app" >/dev/null 2>&1; then chown "$app:$app" "$root" "$mode_file"; fi

# The first process the kernel kills if the machine runs out of memory, never a real app.
echo 1000 > /proc/self/oom_score_adj 2>/dev/null || log "could not raise oom_score_adj"
exec "$start" serve

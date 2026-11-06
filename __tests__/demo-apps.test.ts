import { expect, test, describe, beforeEach } from "bun:test";
import { convertLegacyToYaml } from "@runtipi/common/schemas";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DEMO_APPS, entrypoint } from "../scripts/embed-demo-data";

const root = path.join(import.meta.dir, "..");
const readJson = (file: string) => JSON.parse(fs.readFileSync(path.join(root, file), "utf-8"));

describe("demo apps", () => {
  for (const app of DEMO_APPS) {
    const compose = readJson(`apps/${app}/docker-compose.json`);
    const config = readJson(`apps/${app}/config.json`);
    const real = app.replace(/-demo$/, "");
    const service = compose.services[0];

    test(`${app} runs scripts/demo-data.sh (bun scripts/embed-demo-data.ts)`, () => {
      expect(service.entrypoint).toEqual(entrypoint());
    });

    test(`${app} mounts the real ${real} data read-only and only that`, () => {
      const yaml = convertLegacyToYaml(compose) as any;
      const volumes: string[] = yaml.services[app].volumes;
      expect(volumes).toEqual(["${APP_DATA_DIR}/data:/data", `\${APP_DATA_DIR}/../${real}/data:/real:ro`]);
    });

    test(`${app} is capped and shares nothing with ${real}`, () => {
      expect(service.deploy.resources.limits).toEqual({ memory: "200M", cpus: "0.5" });
      const realConfig = readJson(`apps/${real}/config.json`);
      const realCompose = readJson(`apps/${real}/docker-compose.json`);
      expect(config.port).not.toBe(realConfig.port);
      expect(service.name).not.toBe(realCompose.services[0].name);
      expect(service.addPorts).toBeUndefined();
    });

    test(`${app} leaves the data to the dev app by default, with runtipi's demo and copy as fallback`, () => {
      const data = config.form_fields.find((f: any) => f.env_variable === "DEMO_DATA");
      expect(data.default).toBe("app");
      expect(data.options.map((o: any) => o.value)).toEqual(["app", "demo", "copy"]);
      const refresh = config.form_fields.find((f: any) => f.env_variable === "DEMO_REFRESH");
      expect(refresh.type).toBe("boolean");
      expect(refresh.default).toBe(false);
    });

    test(`${app} turns the dev switch on with a visible token and restarts its server`, () => {
      const token = config.form_fields.find((f: any) => f.env_variable === "DEV_SWITCH_TOKEN");
      expect(token.type).toBe("text");
      expect(token.required).toBe(false);
      expect(service.environment).toContainEqual({ key: "DEV_DATA_SWITCH", value: "1" });
      expect(service.environment).toContainEqual({ key: "DEV_SWITCH_TOKEN", value: "${DEV_SWITCH_TOKEN}" });
      expect(service.restart).toBe("unless-stopped");
    });
  }

  test("family-demo never takes nightly backups", () => {
    const env = readJson("apps/family-demo/docker-compose.json").services[0].environment;
    expect(env).toContainEqual({ key: "FAMILY_BACKUP_HOUR", value: "off" });
  });
});

// Runs the script the way Docker Compose hands it to the container ($$ -> $), with stubs for the
// server's backup command and the image's entrypoint.
describe("demo-data.sh", () => {
  const script = entrypoint()[2].replaceAll("$$", "$");
  let dir: string;
  let own: string;
  let real: string;
  let log: string;

  const write = (file: string, content: string, mode = 0o644) => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content, { mode });
  };
  const read = (file: string) => fs.readFileSync(path.join(own, file), "utf-8");
  const exists = (file: string) => fs.existsSync(path.join(own, file));

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "demo-data-"));
    own = path.join(dir, "own");
    real = path.join(dir, "real");
    log = path.join(dir, "log");
    write(path.join(real, "haus.db"), "real-v1");
    write(path.join(real, "files", "a", "photo.jpg"), "photo");
    write(path.join(real, "backups", "haus-old.tar.gz"), "old backup");
    // The backup command: archives <DATA_DIR>/haus.db and files/ into the target.
    write(
      path.join(dir, "java"),
      `#!/bin/sh\necho "backup from $HAUS_DATA_DIR" >> "${log}"\n[ -z "$FAIL_BACKUP" ] || exit 1\nw=$(mktemp -d)\n` +
        `cp "$HAUS_DATA_DIR/haus.db" "$w/"\ncp -r "$HAUS_DATA_DIR/files" "$w/"\ntar -czf "$4" -C "$w" .\nrm -rf "$w"\n`,
      0o755,
    );
    write(
      path.join(dir, "start"),
      `#!/bin/sh\necho "start $* data=$HAUS_DATA_DIR seed=\${HAUS_SEED:-unset}" >> "${log}"\n`,
      0o755,
    );
  });

  const run = (env: Record<string, string> = {}) => {
    fs.writeFileSync(log, "");
    const result = Bun.spawnSync(["sh", "-c", script, "demo-data"], {
      env: {
        PATH: process.env.PATH ?? "/usr/bin:/bin",
        DEMO_APP: "haus",
        DEMO_DATA: "app",
        DEMO_ROOT: own,
        DEMO_REAL: real,
        DEMO_JAVA: path.join(dir, "java"),
        DEMO_START: path.join(dir, "start"),
        DEMO_FAIL_WAIT: "0",
        DEMO_SKIP_RO_CHECK: "1",
        ...env,
      },
    });
    return { code: result.exitCode, out: result.stdout.toString(), log: fs.readFileSync(log, "utf-8") };
  };
  const startedOn = (dataset: string, seed: string) => `start serve data=${own}/${dataset} seed=${seed}\n`;
  const realSnapshot = () =>
    fs
      .readdirSync(real, { recursive: true })
      .map(String)
      .sort()
      .map((f) => {
        const p = path.join(real, f);
        return fs.statSync(p).isFile() ? `${f}=${fs.readFileSync(p, "utf-8")}` : `${f}/`;
      });

  test("an empty token is generated once, kept and shown in the log", () => {
    const first = run();
    expect(first.code).toBe(0);
    const token = read("dev-switch-token");
    expect(token).toMatch(/^[0-9a-f]{48}$/);
    expect(first.out).toContain(`dev switch token (enter it in the dev app's Dev data section): ${token}`);
    expect(fs.statSync(path.join(own, "dev-switch-token")).mode & 0o077).toBe(0);
    const second = run();
    expect(second.out).toContain(token);
    expect(read("dev-switch-token")).toBe(token);
  });

  test("a token from runtipi's settings wins and is shown, nothing is stored", () => {
    const r = run({ DEV_SWITCH_TOKEN: "from-runtipi-123" });
    expect(r.code).toBe(0);
    expect(r.out).toContain("dev switch token (enter it in the dev app's Dev data section): from-runtipi-123");
    expect(exists("dev-switch-token")).toBe(false);
  });

  test("without a mode file it starts on the seeded demo dataset", () => {
    const r = run();
    expect(r.code).toBe(0);
    expect(r.log).toBe(startedOn("demo", "demo"));
    expect(read("mode")).toBe("demo\n");
  });

  test("mode copy takes the copy through the backup command while the real server runs", () => {
    write(path.join(real, "haus.db-wal"), "wal");
    write(path.join(real, "haus.db-shm"), "shm");
    write(path.join(own, "mode"), "copy\n");
    const before = realSnapshot();
    const r = run();
    expect(r.code).toBe(0);
    expect(r.log).toBe(`backup from ${real}\n` + startedOn("copy", "unset"));
    expect(read("copy/haus.db")).toBe("real-v1");
    expect(read("copy/files/a/photo.jpg")).toBe("photo");
    expect(read("copy-taken-at")).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ\n$/);
    expect(realSnapshot()).toEqual(before);
  });

  test("a stopped real server's files are copied without its backups and lock", () => {
    write(path.join(real, "haus.lock"), "");
    const r = run({ DEMO_DATA: "copy" });
    expect(r.code).toBe(0);
    expect(r.log).toBe(startedOn("copy", "unset"));
    expect(fs.readdirSync(path.join(own, "copy")).sort()).toEqual(["files", "haus.db"]);
  });

  test("the copy is kept until the refresh file or the runtipi switch asks for a new one", () => {
    write(path.join(own, "mode"), "copy\n");
    run();
    write(path.join(own, "copy", "haus.db"), "changed by a test");
    write(path.join(real, "haus.db"), "real-v2");
    expect(run().code).toBe(0);
    expect(read("copy/haus.db")).toBe("changed by a test");
    write(path.join(own, "refresh"), "");
    expect(run().code).toBe(0);
    expect(read("copy/haus.db")).toBe("real-v2");
    expect(exists("refresh")).toBe(false);
    write(path.join(real, "haus.db"), "real-v3");
    expect(run({ DEMO_REFRESH: "true" }).code).toBe(0);
    expect(read("copy/haus.db")).toBe("real-v3");
  });

  test("switching between the datasets keeps both and never touches the real data", () => {
    write(path.join(own, "mode"), "copy\n");
    run();
    write(path.join(own, "demo", "haus.db"), "demo data");
    const before = realSnapshot();
    write(path.join(own, "mode"), "demo\n");
    expect(run().log).toBe(startedOn("demo", "demo"));
    expect(read("demo/haus.db")).toBe("demo data");
    expect(read("copy/haus.db")).toBe("real-v1");
    expect(realSnapshot()).toEqual(before);
  });

  test("runtipi's choice overrides the mode file and is written into it", () => {
    write(path.join(own, "mode"), "copy\n");
    expect(run({ DEMO_DATA: "demo" }).log).toBe(startedOn("demo", "demo"));
    expect(read("mode")).toBe("demo\n");
  });

  test("a failed refresh keeps the old copy", () => {
    write(path.join(own, "mode"), "copy\n");
    write(path.join(real, "haus.db-wal"), "wal");
    run();
    write(path.join(own, "refresh"), "");
    const r = run({ FAIL_BACKUP: "1" });
    expect(r.code).toBe(0);
    expect(r.log).toBe(`backup from ${real}\n` + startedOn("copy", "unset"));
    expect(read("copy/haus.db")).toBe("real-v1");
    expect(exists("refresh")).toBe(false);
    expect(exists(".incoming")).toBe(false);
  });

  test("without a real database there is no copy and the server does not start", () => {
    fs.rmSync(path.join(real, "haus.db"));
    const r = run({ DEMO_DATA: "copy" });
    expect(r.code).toBe(1);
    expect(r.log).toBe("");
  });

  test("copy mode refuses a real folder that is not mounted read-only", () => {
    const r = run({ DEMO_DATA: "copy", DEMO_SKIP_RO_CHECK: "" });
    expect(r.code).toBe(1);
    expect(r.out).toContain("is not mounted read-only");
    expect(r.log).toBe("");
  });

  test("the demo data of the first version moves into demo/", () => {
    write(path.join(own, "haus.db"), "demo data");
    write(path.join(own, "files", "x"), "x");
    expect(run().code).toBe(0);
    expect(fs.readdirSync(own).sort()).toEqual(["demo", "dev-switch-token", "mode"]);
    expect(read("demo/haus.db")).toBe("demo data");
  });

  test("refuses when its own folder is the real one", () => {
    const r = run({ DEMO_ROOT: real });
    expect(r.code).toBe(1);
    expect(r.log).toBe("");
  });

  test("an unknown mode in the file falls back to demo; an unknown runtipi choice does not start", () => {
    write(path.join(own, "mode"), "both\n");
    expect(run().log).toBe(startedOn("demo", "demo"));
    expect(run({ DEMO_DATA: "both" }).code).toBe(1);
  });
});

// Copies scripts/demo-data.sh into the entrypoint of the demo apps' docker-compose.json.
//   bun scripts/embed-demo-data.ts          write it
//   bun scripts/embed-demo-data.ts --check  exit 1 when a compose file is out of date
// Docker Compose interpolates `$` in the compose file, so every `$` of the script is written as `$$`.
import fs from "node:fs";
import path from "node:path";

export const DEMO_APPS = ["haus-demo", "family-demo"];

const root = path.join(import.meta.dir, "..");

/** The script as it goes into the compose file: comment lines and blank lines dropped, `$` escaped. */
export const embeddedScript = (): string =>
  fs
    .readFileSync(path.join(root, "scripts", "demo-data.sh"), "utf-8")
    .split("\n")
    .filter((line) => line.trim() !== "" && !line.trim().startsWith("#"))
    .join("\n")
    .replaceAll("$", "$$$$") + "\n";

export const entrypoint = (): string[] => ["/bin/sh", "-c", embeddedScript(), "demo-data"];

if (import.meta.main) {
  const check = process.argv.includes("--check");
  let stale = false;
  for (const app of DEMO_APPS) {
    const file = path.join(root, "apps", app, "docker-compose.json");
    const compose = JSON.parse(fs.readFileSync(file, "utf-8"));
    const service = compose.services.find((s: { isMain?: boolean }) => s.isMain);
    if (JSON.stringify(service.entrypoint) === JSON.stringify(entrypoint())) continue;
    stale = true;
    if (!check) {
      service.entrypoint = entrypoint();
      fs.writeFileSync(file, JSON.stringify(compose, null, 2) + "\n");
      console.log(`updated ${app}`);
    }
  }
  if (check && stale) {
    console.error("demo-data.sh changed: run bun scripts/embed-demo-data.ts");
    process.exit(1);
  }
}

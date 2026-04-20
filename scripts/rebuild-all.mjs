import { spawn } from "node:child_process";
import { readFile, copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CONFIG = path.join(ROOT, "reports.config.json");

if (!existsSync(CONFIG)) {
  console.error(`Missing ${CONFIG}`);
  process.exit(1);
}

const cfg = JSON.parse(await readFile(CONFIG, "utf8"));
const reports = cfg.reports || [];
for (const r of reports) {
  if (!r.id || !r.rawDir || !r.outFile || !r.publicFile) {
    throw new Error(`Invalid report entry: ${JSON.stringify(r)}`);
  }
  console.log(`\n==> ${r.id}`);
  await run("npm", ["run", "preprocess"], {
    RAW_DIR: path.resolve(ROOT, r.rawDir),
    OUT_FILE: path.resolve(ROOT, r.outFile),
  });

  if (r.genreCache) {
    await run("npm", ["run", "enrich-genres"], {
      RAW_DIR: path.resolve(ROOT, r.rawDir),
      DATA_FILE: path.resolve(ROOT, r.outFile),
      CACHE_FILE: path.resolve(ROOT, r.genreCache),
    });
  }

  await copyFile(path.resolve(ROOT, r.outFile), path.resolve(ROOT, r.publicFile));
}

console.log("\n==> build");
await run("npm", ["run", "build"]);
console.log("\nDone.");

function run(cmd, args, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: ROOT,
      stdio: "inherit",
      env: { ...process.env, ...extraEnv },
    });
    child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(" ")} failed with ${code}`)));
  });
}

#!/usr/bin/env node
import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dist = path.join(root, "dist");

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

await build({
  entryPoints: ["src/cli/main.ts"],
  outfile: "dist/cli.js",
  bundle: true,
  platform: "node",
  target: ["node20"],
  format: "esm",
  packages: "external",
  banner: { js: "#!/usr/bin/env node" },
  sourcemap: false
});

fs.chmodSync(path.join(dist, "cli.js"), 0o755);

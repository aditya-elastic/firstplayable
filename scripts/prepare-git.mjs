#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const cli = path.join(packageRoot, "dist", "cli.js");

if (!fs.existsSync(cli)) {
  process.stderr.write("FirstPlayable Git install needs dist/cli.js. Run npm run build before installing from GitHub.\n");
  process.exit(1);
}

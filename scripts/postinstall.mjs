#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

if (process.env.FIRSTPLAYABLE_SKIP_SETUP === "1") process.exit(0);

const cli = path.join(process.cwd(), "dist", "cli.js");
if (!fs.existsSync(cli)) process.exit(0);

const result = spawnSync(process.execPath, [cli, "setup", "--quiet"], {
  cwd: process.cwd(),
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"]
});

if (result.status === 0) {
  process.stdout.write("FirstPlayable is ready. Start a new AI chat and say: Use FirstPlayable.\n");
} else {
  process.stdout.write("FirstPlayable installed. Run `firstplayable setup` if your AI tool does not show it yet.\n");
}

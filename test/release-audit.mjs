import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));

assert.equal(pkg.name, "firstplayable");
assert.equal(pkg.version, "0.1.0");
assert.equal(pkg.bin?.firstplayable, "dist/cli.js");
assert.deepEqual(pkg.files, ["dist/", "scripts/postinstall.mjs", "skills/firstplayable/SKILL.md", "skills/firstplayable/agents/openai.yaml", "README.md", "LICENSE"]);
assert.equal(pkg.scripts?.prepare, undefined);
assert.equal(pkg.scripts?.prepack, "npm run build");
assert.equal(fs.existsSync(path.join(root, "skills", "firstplayable", "SKILL.md")), true);
assert.equal(fs.existsSync(path.join(root, "skills", "firstplayable", "agents", "openai.yaml")), true);
assert.equal(fs.existsSync(path.join(root, "scripts", "postinstall.mjs")), true);

const shippedSkillFiles = listFiles(path.join(root, "skills")).filter((file) => file.endsWith("SKILL.md"));
assert.deepEqual(shippedSkillFiles.map((file) => path.relative(path.join(root, "skills"), file)), [path.join("firstplayable", "SKILL.md")]);

const publicTextFiles = ["README.md", "skills/firstplayable/SKILL.md", "package.json"];
for (const file of publicTextFiles) {
  const text = fs.readFileSync(path.join(root, file), "utf8");
  assert.doesNotMatch(text, /GameOS|GameOSM|gameos/i, `${file} contains old branding`);
}

if (!process.argv.includes("--skill-only")) {
  const help = execFileSync(process.execPath, [path.join(root, "dist", "cli.js"), "--help"], { cwd: root, encoding: "utf8" });
  assert.match(help, /firstplayable init/);
  assert.match(help, /firstplayable setup/);
  assert.doesNotMatch(help, /unity|godot|web adapter|steam adapter|youtube adapter/i);
}

console.log(JSON.stringify({ ok: true, package: `${pkg.name}@${pkg.version}`, shippedSkills: shippedSkillFiles.length }, null, 2));

function listFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listFiles(absolute));
    else files.push(absolute);
  }
  return files.sort();
}

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const cli = path.join(root, "dist", "cli.js");

test("detailed text prompt is complete and asks zero questions", () => {
  const dir = tempDir("fp-text-");
  const result = run(["init", dir, "--idea", completeIdea(), "--json"]);
  assert.equal(result.status, "COMPLETE");
  assert.equal(result.questionsNeeded, false);
  assert.deepEqual(result.questions, []);

  const report = readJson(path.join(dir, ".firstplayable", "completeness-report.json"));
  assert.equal(report.status, "COMPLETE");
  assert.deepEqual(report.questions, []);
  assertHelperReferences(dir);
});

test("complete pdf source is complete and asks zero questions", () => {
  const dir = tempDir("fp-pdf-");
  const source = path.join(root, "test", "fixtures", "complete-gameplay.pdf");
  const result = run(["init", dir, "--source", source, "--json"]);
  assert.equal(result.status, "COMPLETE");
  assert.equal(result.questionsNeeded, false);
  assert.deepEqual(result.questions, []);
});

test("partial source asks one grouped clarification", () => {
  const dir = tempDir("fp-partial-");
  const result = run(["init", dir, "--idea", "A cozy puzzle game about moving blocks through soft rooms.", "--json"]);
  assert.equal(result.status, "PARTIAL");
  assert.equal(result.questionsNeeded, true);
  assert.equal(result.questions.length, 1);
  assert.match(result.questions[0], /missing first-playable details/i);
});

test("contradictory source asks only the conflict question", () => {
  const dir = tempDir("fp-conflict-");
  const idea = `${completeIdea()}\nTarget: Unity only.\nPlatform: Web only.`;
  const result = run(["init", dir, "--idea", idea, "--json"]);
  assert.equal(result.status, "CONFLICTED");
  assert.equal(result.questionsNeeded, true);
  assert.equal(result.questions.length, 1);
  assert.match(result.questions[0], /conflict/i);
});

test("check validates generated project brain", () => {
  const dir = tempDir("fp-check-");
  run(["init", dir, "--idea", completeIdea(), "--json"]);
  const result = run(["check", "--cwd", dir, "--json"]);
  assert.equal(result.ok, true);
  assert.deepEqual(result.missing, []);
});

test("setup installs codex skill with UI metadata", () => {
  const codexHome = tempDir("fp-codex-home-");
  const result = run(["setup", "--codex", "--json"], { CODEX_HOME: codexHome });
  assert.equal(result.ok, true);
  assert.equal(fs.existsSync(path.join(codexHome, "skills", "firstplayable", "SKILL.md")), true);
  assert.equal(fs.existsSync(path.join(codexHome, "skills", "firstplayable", "agents", "openai.yaml")), true);
});

function run(args, env = {}) {
  return JSON.parse(execFileSync(process.execPath, [cli, ...args], { cwd: root, env: { ...process.env, ...env }, encoding: "utf8" }));
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function tempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function assertHelperReferences(dir) {
  const helper = fs.readFileSync(path.join(dir, ".firstplayable", "generated-skills", "target-builder.md"), "utf8");
  assert.match(helper, /source-summary\.md/);
  assert.match(helper, /extracted-spec\.json/);
  assert.match(helper, /master-script\.md/);
}

function completeIdea() {
  return [
    "Title: Neon Blade Arena",
    "Genre: top-down sword survival action",
    "Target: the user selected target runtime is described as a local playable prototype toolchain",
    "Player fantasy: the player is a fast duelist cutting through waves of glowing enemies in a stylish arena.",
    "Core loop: enter the arena, dodge enemy pressure, slash at close range, collect energy, survive the timer, and retry for a cleaner run.",
    "Controls: WASD movement, mouse aim, left click slash, space dash, R reset.",
    "Camera: top-down follow camera with readable arena framing and no hidden threats.",
    "Mechanics: melee slash arc, dash cooldown, enemy waves, energy pickups, health, score streaks, and reset.",
    "Progression: one compact arena with a thirty second pressure ramp and stronger wave pacing every ten seconds.",
    "Assets: premium neon-dark arcade style, sharp silhouettes, glowing blade feedback, clean HUD, and high contrast enemies.",
    "UI: health, timer, score, dash cooldown, wave count, and retry prompt.",
    "Win: survive the timer and clear the final wave. Fail: health reaches zero, then reset and retry.",
    "First playable: one arena, one player, two enemy types, one pickup, one win state, one fail state, and instant retry.",
    "QA: verify movement, slash hit, dash, enemy damage, pickup collection, win, fail, reset, and taste readability.",
    "Constraints: do not add menus, store publishing, accounts, multiplayer, or monetization in the first playable."
  ].join("\n");
}

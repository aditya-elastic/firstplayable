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

test("star jump dash prompt generates project-local quality helpers", () => {
  const dir = tempDir("fp-starjump-");
  const result = run(["init", dir, "--idea", starJumpDashIdea(), "--json"]);
  assert.equal(result.status, "COMPLETE");
  assert.equal(result.questionsNeeded, false);
  assert.deepEqual(result.questions, []);

  const root = path.join(dir, ".firstplayable");
  const qualityGates = fs.readFileSync(path.join(root, "quality-gates.md"), "utf8");
  assert.match(qualityGates, /One-Minute Clarity/i);
  assert.match(qualityGates, /Taste Fidelity/i);
  assert.match(qualityGates, /Game Feel/i);

  const taste = fs.readFileSync(path.join(root, "generated-skills", "taste-director.md"), "utf8");
  assert.match(taste, /16-bit/i);
  assert.match(taste, /grey-box/i);
  assert.match(taste, /screenshot/i);
  assert.match(taste, /readable silhouettes/i);

  const feel = fs.readFileSync(path.join(root, "generated-skills", "game-feel-director.md"), "utf8");
  assert.match(feel, /arrow keys/i);
  assert.match(feel, /Spacebar/i);
  assert.match(feel, /jump/i);
  assert.match(feel, /gravity/i);

  const demo = fs.readFileSync(path.join(root, "generated-skills", "one-minute-demo-auditor.md"), "utf8");
  assert.match(demo, /60 seconds/i);
  assert.match(demo, /goal/i);
  assert.match(demo, /reward/i);
  assert.match(demo, /retry/i);

  const architecture = fs.readFileSync(path.join(root, "generated-skills", "implementation-architecture-director.md"), "utf8");
  assert.match(architecture, /Avoid one giant controller/i);
  assert.match(architecture, /modules\/scripts\/entities/i);

  const target = fs.readFileSync(path.join(root, "generated-skills", "target-specific-builder.md"), "utf8");
  assert.match(target, /Unity 2D/i);
  assert.match(target, /project only/i);
  assert.doesNotMatch(target, /shipped adapter/i);
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
  const home = tempDir("fp-home-");
  const codexHome = tempDir("fp-codex-home-");
  const result = run(["setup", "--codex", "--json"], { HOME: home, CODEX_HOME: codexHome });
  assert.equal(result.ok, true);
  assert.equal(fs.existsSync(path.join(codexHome, "skills", "firstplayable", "SKILL.md")), true);
  assert.equal(fs.existsSync(path.join(codexHome, "skills", "firstplayable", "agents", "openai.yaml")), true);
  assert.equal(fs.existsSync(path.join(home, ".agents", "skills", "firstplayable", "SKILL.md")), true);
  assert.equal(fs.existsSync(path.join(home, ".agents", "skills", "firstplayable", "agents", "openai.yaml")), true);
  assert.equal(result.installed[0].installedPaths.length, 2);
});

test("cursor setup supports project-local rules with cwd", () => {
  const home = tempDir("fp-home-");
  const project = tempDir("fp-cursor-project-");
  const result = run(["setup", "--cursor", "--cwd", project, "--json"], { HOME: home });
  assert.equal(result.ok, true);
  assert.equal(fs.existsSync(path.join(project, ".cursor", "rules", "firstplayable.mdc")), true);
  assert.equal(fs.existsSync(path.join(home, ".cursor", "rules", "firstplayable.mdc")), false);
});

test("doctor refreshes installed skill metadata", () => {
  const home = tempDir("fp-home-");
  const codexHome = path.join(home, ".codex");
  const result = run(["doctor", "--json"], { HOME: home, CODEX_HOME: codexHome });
  assert.equal(result.ok, true);
  assert.equal(fs.existsSync(path.join(codexHome, "skills", "firstplayable", "SKILL.md")), true);
  assert.equal(fs.existsSync(path.join(codexHome, "skills", "firstplayable", "agents", "openai.yaml")), true);
  assert.equal(fs.existsSync(path.join(home, ".agents", "skills", "firstplayable", "SKILL.md")), true);
  assert.equal(fs.existsSync(path.join(home, ".cursor", "rules", "firstplayable.mdc")), true);
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
  assert.match(helper, /quality-gates\.md/);

  const targetHelper = fs.readFileSync(path.join(dir, ".firstplayable", "generated-skills", "target-specific-builder.md"), "utf8");
  assert.match(targetHelper, /source-summary\.md/);
  assert.match(targetHelper, /extracted-spec\.json/);
  assert.match(targetHelper, /master-script\.md/);
  assert.match(targetHelper, /quality-gates\.md/);
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

function starJumpDashIdea() {
  return [
    "Title: Star Jump Dash",
    "Genre: 2D arcade platformer",
    "Target: Unity 2D local playable prototype",
    "Player fantasy: control a bright little star hero sprinting across a moonlit arcade sky and collecting crystals before the timer ends.",
    "Core loop: run, jump, dash across platforms, avoid red spike hazards, collect eight crystals, reach the glowing finish marker, and retry instantly for a cleaner run.",
    "Controls: left and right arrow keys move, Spacebar jumps, Shift dashes, R reset.",
    "Camera: side-view 2D follow camera with readable platforms, no hidden hazards, and the full next jump visible.",
    "Mechanics: platform movement, gravity, jump buffering, coyote time, dash cooldown, crystal pickups, spike damage, hearts, score, finish trigger, win, fail, and reset.",
    "Progression: one compact level with safe first jump, two medium platform chains, one moving platform, denser crystal placement, and a visible final finish.",
    "Assets: bright 16-bit pixel-art arcade taste, outlined purple platforms, cyan crystals, red spikes, chunky star character, deep blue sky, and crisp silhouettes.",
    "UI: hearts, timer, crystals collected, score, dash cooldown, and short bottom message prompts.",
    "Win: collect all crystals and touch the finish marker. Fail: lose all three hearts or run out of time.",
    "First playable: one playable level, star player, five platform groups, spikes, crystals, moving platform, finish, win screen, fail screen, and instant reset.",
    "QA: verify arrow key movement, Spacebar jump, gravity, dash, crystal collection, spike damage, moving platform, finish, win, fail, reset, one-minute clarity, and 16-bit readability.",
    "Constraints: no menus, no online services, no store publishing, no generated grey-box placeholder look."
  ].join("\n");
}

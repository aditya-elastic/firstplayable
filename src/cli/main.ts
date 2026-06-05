import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { classifyCompleteness } from "../core/completeness";
import { checkProjectBrain, createSnapshot, generateProjectBrain } from "../core/generate";
import { extractSpec } from "../core/intake";
import { installMasterSkill, type SkillTarget } from "../core/skill-install";
import { sourceFromFile, sourceFromIdea } from "../core/source";

type Parsed = {
  command: string[];
  flags: Map<string, string[]>;
  positionals: string[];
};

const VERSION = "0.1.0";

export async function runCli(argv: string[]): Promise<void> {
  const parsed = parseArgv(argv);
  if (hasFlag(parsed, "version") || parsed.command[0] === "--version") {
    console.log(`firstplayable ${VERSION}`);
    return;
  }
  if (parsed.command.length === 0 || hasFlag(parsed, "help") || parsed.command[0] === "--help") {
    console.log(helpText());
    return;
  }

  const [command, subcommand] = parsed.command;
  if (command === "doctor") return print(await doctor(), hasFlag(parsed, "json"));
  if (command === "setup") return setup(parsed);
  if (command === "init") return initProject(parsed);
  if (command === "intake") return intakeProject(parsed);
  if (command === "snapshot") return snapshotProject(parsed);
  if (command === "check") return checkProject(parsed);
  if (command === "skills" && subcommand === "install") return installSkill(parsed);
  throw new Error(`Unknown command: ${command}\n\n${helpText()}`);
}

export function parseArgv(argv: string[]): Parsed {
  const flags = new Map<string, string[]>();
  const positionals: string[] = [];
  const command: string[] = [];
  const valueFlags = new Set(["idea", "source", "cwd"]);

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token.startsWith("--")) {
      const [rawName, inlineValue] = token.slice(2).split(/=(.*)/s).filter((part) => part !== undefined);
      const takesValue = valueFlags.has(rawName);
      const value = inlineValue ?? (takesValue ? argv[++index] : "true");
      if (takesValue && (!value || value.startsWith("--"))) throw new Error(`Missing value for --${rawName}`);
      flags.set(rawName, [...(flags.get(rawName) ?? []), value]);
      continue;
    }
    if (command.length < commandArity(command)) command.push(token);
    else positionals.push(token);
  }
  return { command, flags, positionals };
}

async function doctor(): Promise<Record<string, unknown>> {
  const installed = await installTargets(defaultSkillTargets(), findPackageRoot());
  return {
    ok: true,
    product: "FirstPlayable",
    version: VERSION,
    node: process.version,
    ready: true,
    installed,
    next: "Start a new chat and say: Use FirstPlayable."
  };
}

async function setup(parsed: Parsed): Promise<void> {
  const packageRoot = findPackageRoot();
  const installed = await installTargets(setupTargets(parsed), packageRoot);
  print(
    {
      ok: true,
      installed,
      next: "Restart or open a new AI chat, then say: Use FirstPlayable."
    },
    hasFlag(parsed, "json") || hasFlag(parsed, "quiet")
  );
}

async function initProject(parsed: Parsed): Promise<void> {
  const projectDir = parsed.positionals[0];
  if (!projectDir) throw new Error('Usage: firstplayable init <dir> --idea "..." OR --source ./gameplay.pdf');
  const source = await resolveSource(parsed);
  const spec = extractSpec(source);
  const completeness = classifyCompleteness(spec);
  const brain = await generateProjectBrain(projectDir, spec, completeness);
  print(
    {
      ok: true,
      projectRoot: brain.projectRoot,
      firstPlayableRoot: brain.firstPlayableRoot,
      status: completeness.status,
      questionsNeeded: completeness.questionsNeeded,
      questions: completeness.questions,
      next: completeness.questionsNeeded ? "Answer the grouped clarification, then rerun intake." : "Use the generated master script and target plan."
    },
    hasFlag(parsed, "json")
  );
}

async function intakeProject(parsed: Parsed): Promise<void> {
  const cwd = firstFlag(parsed, "cwd") || process.cwd();
  const existingSource = path.join(cwd, ".firstplayable", "extracted-spec.json");
  if (!fs.existsSync(existingSource)) throw new Error(`No extracted spec found at ${existingSource}. Run firstplayable init first.`);
  const spec = JSON.parse(fs.readFileSync(existingSource, "utf8"));
  const completeness = classifyCompleteness(spec);
  fs.writeFileSync(path.join(cwd, ".firstplayable", "completeness-report.json"), `${JSON.stringify(completeness, null, 2)}\n`, "utf8");
  print({ ok: true, status: completeness.status, questionsNeeded: completeness.questionsNeeded, questions: completeness.questions }, hasFlag(parsed, "json"));
}

async function snapshotProject(parsed: Parsed): Promise<void> {
  const cwd = firstFlag(parsed, "cwd") || process.cwd();
  const snapshotPath = await createSnapshot(cwd);
  print({ ok: true, snapshot: snapshotPath }, hasFlag(parsed, "json"));
}

async function checkProject(parsed: Parsed): Promise<void> {
  const cwd = firstFlag(parsed, "cwd") || process.cwd();
  const result = await checkProjectBrain(cwd);
  print(result, hasFlag(parsed, "json"));
  if (!result.ok) process.exitCode = 1;
}

async function installSkill(parsed: Parsed): Promise<void> {
  const targets: SkillTarget[] = [];
  if (hasFlag(parsed, "codex")) targets.push("codex");
  if (hasFlag(parsed, "cursor")) targets.push("cursor");
  if (hasFlag(parsed, "claude")) targets.push("claude");
  if (!targets.length) throw new Error("Usage: firstplayable skills install --codex|--cursor|--claude");
  const packageRoot = findPackageRoot();
  const installed = [];
  for (const target of targets) installed.push(await installMasterSkill(target, packageRoot));
  print({ ok: true, installed }, hasFlag(parsed, "json"));
}

async function resolveSource(parsed: Parsed) {
  const idea = firstFlag(parsed, "idea");
  const sourcePath = firstFlag(parsed, "source");
  if (idea && sourcePath) throw new Error("Choose either --idea or --source, not both.");
  if (idea) return sourceFromIdea(idea);
  if (sourcePath) return sourceFromFile(sourcePath);
  throw new Error('Usage: firstplayable init <dir> --idea "..." OR --source ./gameplay.pdf');
}

function print(payload: Record<string, unknown>, json: boolean): void {
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }
  if ("product" in payload) {
    console.log([`FirstPlayable ${payload.version}`, "Ready.", `Next: ${payload.next}`].join("\n"));
    return;
  }
  if ("installed" in payload) {
    console.log(["FirstPlayable setup complete.", `Next: ${payload.next}`].join("\n"));
    return;
  }
  if ("projectRoot" in payload) {
    console.log(
      [
        "FirstPlayable project brain created.",
        `Project: ${payload.projectRoot}`,
        `Brain: ${payload.firstPlayableRoot}`,
        `Intake status: ${payload.status}`,
        `Questions needed: ${payload.questionsNeeded ? "yes" : "none"}`,
        ...(Array.isArray(payload.questions) && payload.questions.length ? [`Questions: ${payload.questions.join(" ")}`] : []),
        `Next: ${payload.next}`
      ].join("\n")
    );
    return;
  }
  console.log(JSON.stringify(payload, null, 2));
}

function firstFlag(parsed: Parsed, name: string): string | undefined {
  return parsed.flags.get(name)?.at(-1);
}

function hasFlag(parsed: Parsed, name: string): boolean {
  return parsed.flags.has(name);
}

function setupTargets(parsed: Parsed): SkillTarget[] {
  const targets = new Set<SkillTarget>();
  if (hasFlag(parsed, "codex")) targets.add("codex");
  if (hasFlag(parsed, "cursor")) targets.add("cursor");
  if (hasFlag(parsed, "claude")) targets.add("claude");
  if (targets.size === 0) return defaultSkillTargets();
  return [...targets];
}

function defaultSkillTargets(): SkillTarget[] {
  const targets: SkillTarget[] = ["codex", "cursor"];
  if (fs.existsSync(path.join(process.env.HOME || "", ".claude"))) targets.push("claude");
  return targets;
}

async function installTargets(targets: SkillTarget[], packageRoot: string): Promise<Array<{ target: SkillTarget; installedPath: string }>> {
  const installed = [];
  for (const target of targets) installed.push(await installMasterSkill(target, packageRoot));
  return installed;
}

function commandArity(command: string[]): number {
  if (command.length === 0) return 1;
  if (command[0] === "skills") return 2;
  return 1;
}

function findPackageRoot(): string {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  for (let index = 0; index < 6; index += 1) {
    const candidate = path.join(dir, "skills", "firstplayable", "SKILL.md");
    if (fs.existsSync(candidate)) return dir;
    dir = path.dirname(dir);
  }
  return process.cwd();
}

function helpText(): string {
  return `
FirstPlayable

Usage:
  firstplayable doctor [--json]
  firstplayable setup [--codex] [--cursor] [--claude]
  firstplayable init <dir> --idea "..."
  firstplayable init <dir> --source ./gameplay.pdf
  firstplayable intake --cwd <dir>
  firstplayable snapshot --cwd <dir>
  firstplayable check --cwd <dir>
  firstplayable skills install --codex|--cursor|--claude
  firstplayable --version

FirstPlayable installs one master skill. Target-specific helper skills, agents, QA, memory, and execution files are generated inside each project only after intake.
`.trim();
}

if (isEntrypoint()) {
  runCli(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`FirstPlayable error: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}

function isEntrypoint(): boolean {
  if (!process.argv[1]) return false;
  try {
    return fs.realpathSync(fileURLToPath(import.meta.url)) === fs.realpathSync(process.argv[1]);
  } catch {
    return import.meta.url === `file://${process.argv[1]}`;
  }
}

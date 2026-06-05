import fs from "node:fs/promises";
import path from "node:path";
import type { CompletenessReport, ExtractedSpec, ProjectBrain } from "./schemas";

const helperSkillNames = ["master-handoff", "target-builder", "taste-director", "qa-playtester", "memory-manager", "product-truth"] as const;
const agentNames = [
  "creative-director",
  "game-designer",
  "target-toolchain-builder",
  "gameplay-prototyper",
  "asset-taste-director",
  "qa-player",
  "evidence-auditor",
  "memory-curator"
] as const;

export async function generateProjectBrain(projectRoot: string, spec: ExtractedSpec, completeness: CompletenessReport): Promise<ProjectBrain> {
  const root = path.resolve(projectRoot);
  const fpRoot = path.join(root, ".firstplayable");
  await mkdirs(fpRoot);

  await write(path.join(fpRoot, "source-summary.md"), renderSourceSummary(spec, completeness));
  await write(path.join(fpRoot, "extracted-spec.json"), `${JSON.stringify(spec, null, 2)}\n`);
  await write(path.join(fpRoot, "completeness-report.json"), `${JSON.stringify(completeness, null, 2)}\n`);
  await write(path.join(fpRoot, "master-script.md"), renderMasterScript(spec, completeness));
  await write(path.join(fpRoot, "taste-profile.md"), renderTasteProfile(spec));
  await write(path.join(fpRoot, "first-playable-contract.md"), renderFirstPlayableContract(spec, completeness));
  await write(path.join(fpRoot, "target-plan.md"), renderTargetPlan(spec, completeness));
  await write(path.join(fpRoot, "memory.md"), renderMemory(spec));

  await generateHelperSkills(fpRoot, spec, completeness);
  await generateAgents(fpRoot, spec);
  await generateChecklists(fpRoot, spec, completeness);
  await generateHelpers(fpRoot);
  await write(path.join(fpRoot, "reports", ".gitkeep"), "");
  await write(path.join(fpRoot, "snapshots", ".gitkeep"), "");

  return { projectRoot: root, firstPlayableRoot: fpRoot, spec, completeness };
}

export async function createSnapshot(projectRoot: string): Promise<string> {
  const fpRoot = path.join(path.resolve(projectRoot), ".firstplayable");
  await ensureProjectBrain(fpRoot);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const snapshotPath = path.join(fpRoot, "snapshots", `${stamp}.md`);
  const files = await listRelativeFiles(fpRoot);
  await write(
    snapshotPath,
    [`# FirstPlayable Snapshot`, "", `Created: ${new Date().toISOString()}`, "", "## Files", ...files.map((file) => `- ${file}`)].join("\n")
  );
  return snapshotPath;
}

export async function checkProjectBrain(projectRoot: string): Promise<{ ok: boolean; missing: string[]; firstPlayableRoot: string }> {
  const fpRoot = path.join(path.resolve(projectRoot), ".firstplayable");
  const required = [
    "source-summary.md",
    "extracted-spec.json",
    "completeness-report.json",
    "master-script.md",
    "taste-profile.md",
    "first-playable-contract.md",
    "target-plan.md",
    "memory.md",
    "generated-skills/master-handoff.md",
    "generated-skills/target-builder.md",
    "generated-skills/taste-director.md",
    "generated-skills/qa-playtester.md",
    "generated-skills/memory-manager.md",
    "generated-skills/product-truth.md",
    "helpers/doctor.mjs",
    "helpers/context-packet.mjs",
    "helpers/readiness-check.mjs",
    "helpers/next-action.mjs"
  ];
  const missing = [];
  for (const relative of required) {
    try {
      await fs.access(path.join(fpRoot, relative));
    } catch {
      missing.push(relative);
    }
  }
  return { ok: missing.length === 0, missing, firstPlayableRoot: fpRoot };
}

async function generateHelperSkills(fpRoot: string, spec: ExtractedSpec, completeness: CompletenessReport): Promise<void> {
  for (const name of helperSkillNames) {
    await write(path.join(fpRoot, "generated-skills", `${name}.md`), renderHelperSkill(name, spec, completeness));
  }
}

async function generateAgents(fpRoot: string, spec: ExtractedSpec): Promise<void> {
  for (const name of agentNames) {
    await write(path.join(fpRoot, "generated-agents", `${name}.md`), renderAgent(name, spec));
  }
}

async function generateChecklists(fpRoot: string, spec: ExtractedSpec, completeness: CompletenessReport): Promise<void> {
  await write(
    path.join(fpRoot, "checklists", "first-playable.md"),
    [
      "# First Playable Checklist",
      "",
      `- Intake status: ${completeness.status}`,
      "- The player can understand the goal in the first minute.",
      "- The player can perform the primary action repeatedly.",
      "- The core loop has a visible success/fail result.",
      "- The taste profile is visible in camera, UI, pacing, and feedback.",
      "- The target plan has concrete next actions and honest blockers.",
      "- No helper claims commercial/store/publish readiness without explicit later evidence.",
      "",
      "Source of truth: `source-summary.md`, `extracted-spec.json`, `master-script.md`."
    ].join("\n")
  );
  await write(
    path.join(fpRoot, "checklists", "taste-match.md"),
    [
      "# Taste Match Checklist",
      "",
      `Taste source: ${spec.assetsTaste || "missing"}`,
      "- Visual tone matches the source summary.",
      "- Interaction feel matches the fantasy.",
      "- UI/HUD supports the first playable instead of explaining the system.",
      "- Any generated target-specific helper preserves the master script."
    ].join("\n")
  );
  await write(
    path.join(fpRoot, "checklists", "qa.md"),
    [
      "# QA Checklist",
      "",
      `QA criteria: ${spec.qaCriteria || "missing"}`,
      "- Run the chosen target/toolchain locally when available.",
      "- Record exact blockers when tooling is unavailable.",
      "- Capture evidence before calling the slice ready.",
      "- Keep improvements tied to the first-playable contract."
    ].join("\n")
  );
}

async function generateHelpers(fpRoot: string): Promise<void> {
  await write(path.join(fpRoot, "helpers", "doctor.mjs"), helperScript("doctor"));
  await write(path.join(fpRoot, "helpers", "context-packet.mjs"), helperScript("context-packet"));
  await write(path.join(fpRoot, "helpers", "readiness-check.mjs"), helperScript("readiness-check"));
  await write(path.join(fpRoot, "helpers", "next-action.mjs"), helperScript("next-action"));
}

function renderSourceSummary(spec: ExtractedSpec, completeness: CompletenessReport): string {
  return [
    `# ${spec.title} Source Summary`,
    "",
    `- Source kind: ${spec.sourceKind}`,
    `- Source path: ${spec.sourcePath || "inline idea or transcript"}`,
    `- Word count: ${spec.sourceWordCount}`,
    `- Intake status: ${completeness.status}`,
    `- Questions needed: ${completeness.questionsNeeded ? "yes" : "none"}`,
    "",
    "## Extracted Direction",
    bullet("Genre", spec.genre),
    bullet("Target/toolchain", spec.targetToolchain),
    bullet("Player fantasy", spec.playerFantasy),
    bullet("Core loop", spec.coreLoop),
    bullet("Controls", spec.controls),
    bullet("Camera", spec.camera),
    bullet("Mechanics", spec.mechanics),
    bullet("Progression", spec.progression),
    bullet("Assets/taste", spec.assetsTaste),
    bullet("UI/HUD", spec.uiHud),
    bullet("Win/fail", spec.winFailStates),
    bullet("First playable", spec.firstPlayableScope),
    bullet("QA criteria", spec.qaCriteria),
    bullet("Constraints", spec.constraints)
  ].join("\n");
}

function renderMasterScript(spec: ExtractedSpec, completeness: CompletenessReport): string {
  return [
    `# ${spec.title} Master Script`,
    "",
    "This is the source of truth for generated helper skills, agents, checklists, and target-specific work.",
    "",
    `Intake status: ${completeness.status}`,
    completeness.questions.length ? `Open clarification: ${completeness.questions.join(" ")}` : "Open clarification: none",
    "",
    "## Non-Negotiables",
    "- Do not ask sequential questions when the source is complete.",
    "- Do not install generated helper skills globally.",
    "- Do not invent platform-specific claims beyond the selected target/toolchain.",
    "- Do not claim publish, store, commercial, or launch readiness without later evidence.",
    "",
    "## First Playable Direction",
    bullet("Player fantasy", spec.playerFantasy),
    bullet("Core loop", spec.coreLoop),
    bullet("Target/toolchain", spec.targetToolchain),
    bullet("Taste", spec.assetsTaste),
    bullet("QA", spec.qaCriteria)
  ].join("\n");
}

function renderTasteProfile(spec: ExtractedSpec): string {
  return [
    `# ${spec.title} Taste Profile`,
    "",
    bullet("Art/taste source", spec.assetsTaste),
    bullet("Camera feel", spec.camera),
    bullet("Interaction feel", spec.controls),
    bullet("UI/HUD mood", spec.uiHud),
    "",
    "## Preservation Rule",
    "Every generated helper must preserve this taste profile unless the user explicitly changes it."
  ].join("\n");
}

function renderFirstPlayableContract(spec: ExtractedSpec, completeness: CompletenessReport): string {
  return [
    `# ${spec.title} First Playable Contract`,
    "",
    bullet("Scope", spec.firstPlayableScope),
    bullet("Win/fail states", spec.winFailStates),
    bullet("QA criteria", spec.qaCriteria),
    `- Intake readiness: ${completeness.status}`,
    "",
    "## Ready Means",
    "- The chosen target has a clear next action.",
    "- The core loop can be attempted, failed or completed, and retried.",
    "- Taste and camera are represented, not postponed indefinitely.",
    "- The QA player can name evidence and blockers."
  ].join("\n");
}

function renderTargetPlan(spec: ExtractedSpec, completeness: CompletenessReport): string {
  return [
    `# ${spec.title} Target Plan`,
    "",
    bullet("Selected or inferred target", spec.targetToolchain || spec.inferredTargets.join(", ")),
    `- Target confidence: ${spec.targetToolchain || spec.inferredTargets.length ? "inferred from source" : "missing"}`,
    `- Intake status: ${completeness.status}`,
    "",
    "## Generation Rule",
    "Target-specific helper files should be created only after the target is selected or inferred from the source.",
    "",
    "## Next Action",
    completeness.status === "COMPLETE"
      ? "Generate the target-specific execution helper from this plan and the master script."
      : completeness.questions.join(" ")
  ].join("\n");
}

function renderMemory(spec: ExtractedSpec): string {
  return [
    `# ${spec.title} Memory`,
    "",
    "- Preserve decisions from the source document/message.",
    "- Store user corrections here before regenerating helper skills.",
    "- Keep target-specific assumptions separate from the master script.",
    "",
    "## Current Decisions",
    bullet("Title", spec.title),
    bullet("Target/toolchain", spec.targetToolchain),
    bullet("Taste", spec.assetsTaste),
    bullet("First playable", spec.firstPlayableScope)
  ].join("\n");
}

function renderHelperSkill(name: string, spec: ExtractedSpec, completeness: CompletenessReport): string {
  return [
    `# ${name}`,
    "",
    "Project-local helper skill generated by FirstPlayable. Do not install globally.",
    "",
    "Source of truth:",
    "- `source-summary.md`",
    "- `extracted-spec.json`",
    "- `master-script.md`",
    "",
    `Project: ${spec.title}`,
    `Intake status: ${completeness.status}`,
    "",
    "## Job",
    helperJob(name),
    "",
    "## Rule",
    "If the source is complete, proceed from the master script without asking sequential questions."
  ].join("\n");
}

function renderAgent(name: string, spec: ExtractedSpec): string {
  return [
    `# ${name}`,
    "",
    "Project-local agent brief generated by FirstPlayable.",
    "",
    "Source of truth: `source-summary.md`, `extracted-spec.json`, `master-script.md`.",
    "",
    `Project: ${spec.title}`,
    bullet("Target/toolchain", spec.targetToolchain),
    bullet("Taste", spec.assetsTaste),
    bullet("Core loop", spec.coreLoop),
    "",
    "## Output Required",
    "Produce concise, evidence-backed work that advances the first-playable contract."
  ].join("\n");
}

function helperJob(name: string): string {
  const jobs: Record<string, string> = {
    "master-handoff": "Prepare compact handoffs for AI agents without losing the source contract.",
    "target-builder": "Create target-specific execution steps only after the target/toolchain is selected or inferred.",
    "taste-director": "Protect the requested taste, pacing, camera, and UI mood.",
    "qa-playtester": "Turn the first-playable contract into evidence checks and blockers.",
    "memory-manager": "Record durable decisions and user corrections.",
    "product-truth": "Block overclaims and keep readiness language honest."
  };
  return jobs[name] ?? "Support the FirstPlayable project brain.";
}

function helperScript(name: string): string {
  return `#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd(), ".firstplayable");
const required = ["source-summary.md", "extracted-spec.json", "master-script.md"];
const missing = required.filter((file) => !fs.existsSync(path.join(root, file)));
const payload = {
  helper: ${JSON.stringify(name)},
  ok: missing.length === 0,
  firstPlayableRoot: root,
  missing,
  next: missing.length ? "Run firstplayable init or intake first." : "Read master-script.md and continue with the selected target."
};
console.log(JSON.stringify(payload, null, 2));
if (!payload.ok) process.exitCode = 1;
`;
}

async function mkdirs(fpRoot: string): Promise<void> {
  for (const dir of ["generated-skills", "generated-agents", "helpers", "checklists", "reports", "snapshots"]) {
    await fs.mkdir(path.join(fpRoot, dir), { recursive: true });
  }
}

async function ensureProjectBrain(fpRoot: string): Promise<void> {
  try {
    await fs.access(path.join(fpRoot, "master-script.md"));
  } catch {
    throw new Error(`No FirstPlayable project brain found at ${fpRoot}. Run firstplayable init first.`);
  }
}

async function write(filePath: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content.endsWith("\n") ? content : `${content}\n`, "utf8");
  if (filePath.endsWith(".mjs")) await fs.chmod(filePath, 0o755);
}

async function listRelativeFiles(root: string): Promise<string[]> {
  const files: string[] = [];
  async function walk(dir: string): Promise<void> {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(absolute);
      else files.push(path.relative(root, absolute));
    }
  }
  await walk(root);
  return files.sort();
}

function bullet(label: string, value: string): string {
  return `- ${label}: ${value?.trim() || "missing"}`;
}

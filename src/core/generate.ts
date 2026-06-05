import fs from "node:fs/promises";
import path from "node:path";
import type { CompletenessReport, ExtractedSpec, ProjectBrain } from "./schemas";

const helperSkillNames = [
  "master-handoff",
  "target-builder",
  "target-specific-builder",
  "taste-director",
  "playable-quality-director",
  "game-feel-director",
  "one-minute-demo-auditor",
  "implementation-architecture-director",
  "qa-playtester",
  "memory-manager",
  "product-truth"
] as const;
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
  await write(path.join(fpRoot, "quality-gates.md"), renderQualityGates(spec, completeness));
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
    "quality-gates.md",
    "target-plan.md",
    "memory.md",
    "generated-skills/master-handoff.md",
    "generated-skills/target-builder.md",
    "generated-skills/target-specific-builder.md",
    "generated-skills/taste-director.md",
    "generated-skills/playable-quality-director.md",
    "generated-skills/game-feel-director.md",
    "generated-skills/one-minute-demo-auditor.md",
    "generated-skills/implementation-architecture-director.md",
    "generated-skills/qa-playtester.md",
    "generated-skills/memory-manager.md",
    "generated-skills/product-truth.md",
    "checklists/first-playable.md",
    "checklists/taste-match.md",
    "checklists/one-minute-demo.md",
    "checklists/playable-quality.md",
    "checklists/implementation-architecture.md",
    "checklists/qa.md",
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
      "- The player can understand the goal and controls in the first minute.",
      "- The player can perform the primary action repeatedly with visible feedback.",
      "- The core loop has a visible success/fail result.",
      "- The taste profile is visible in art, camera, UI, pacing, and feedback.",
      "- The slice has win, fail, and instant retry unless the source explicitly says otherwise.",
      "- The target plan has concrete next actions and honest blockers.",
      "- No helper claims commercial/store/publish readiness without explicit later evidence.",
      "",
      "Source of truth: `source-summary.md`, `extracted-spec.json`, `master-script.md`, `quality-gates.md`."
    ].join("\n")
  );
  await write(
    path.join(fpRoot, "checklists", "taste-match.md"),
    [
      "# Taste Match Checklist",
      "",
      `Taste source: ${spec.assetsTaste || "missing"}`,
      "- Visual tone matches the source summary and does not collapse into plain primitive placeholders.",
      "- Player, hazards, collectibles, enemies, UI, and feedback have readable silhouettes.",
      "- Interaction feel matches the fantasy and genre.",
      "- UI/HUD supports play without covering important action.",
      "- Any generated target-specific helper preserves the master script."
    ].join("\n")
  );
  await write(
    path.join(fpRoot, "checklists", "one-minute-demo.md"),
    [
      "# One Minute Demo Checklist",
      "",
      "- A fresh player can name the goal within 10 seconds.",
      "- The first input produces visible movement or action immediately.",
      "- The main obstacle, reward, and fail state are visible without reading docs.",
      "- The first minute contains at least one meaningful success and one avoidable danger or pressure point.",
      "- The end state, retry, or next run prompt is clear.",
      "- If this cannot be shown in one minute, mark the slice `NEEDS_IMPROVEMENT`."
    ].join("\n")
  );
  await write(
    path.join(fpRoot, "checklists", "playable-quality.md"),
    [
      "# Playable Quality Checklist",
      "",
      bullet("Core loop", spec.coreLoop),
      bullet("First playable scope", spec.firstPlayableScope),
      "- The implementation is a small complete game slice, not only a scene mockup.",
      "- Controls feel responsive for the requested genre.",
      "- Feedback makes hits, pickups, movement, progress, win, fail, and reset understandable.",
      "- The result should be judged against the source taste, not against bare technical compilation.",
      "- Plain, dull, unreadable, or mechanically incomplete output is not ready even if it runs."
    ].join("\n")
  );
  await write(
    path.join(fpRoot, "checklists", "implementation-architecture.md"),
    [
      "# Implementation Architecture Checklist",
      "",
      bullet("Target/toolchain", spec.targetToolchain || spec.inferredTargets.join(", ")),
      bullet("Mechanics", spec.mechanics),
      "- Choose modules/classes/scripts/entities that match the mechanics and target idioms.",
      "- Avoid one giant controller when the game needs separate player, level, hazards, pickups, UI, camera, and state systems.",
      "- Keep generated target-specific code easy to inspect, tune, and regenerate.",
      "- Do not hardcode target assumptions outside the project-local target helper.",
      "- Record architecture tradeoffs in `memory.md`."
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
      "- Capture logs, screenshots, or play notes before calling the slice ready.",
      "- Verify one-minute clarity, taste fidelity, game feel, and architecture fit.",
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
    "- Do not treat checklists, compilation, or scene generation as proof that the game is good.",
    "- Do not accept plain grey-box or primitive output when the source asks for a strong taste.",
    "- Require visible play evidence before calling the first playable ready.",
    "- Do not claim publish, store, commercial, or launch readiness without later evidence.",
    "",
    "## First Playable Direction",
    bullet("Player fantasy", spec.playerFantasy),
    bullet("Core loop", spec.coreLoop),
    bullet("Controls", spec.controls),
    bullet("Camera", spec.camera),
    bullet("Target/toolchain", spec.targetToolchain),
    bullet("Taste", spec.assetsTaste),
    bullet("Win/fail", spec.winFailStates),
    bullet("QA", spec.qaCriteria),
    "",
    "## Required Local Gates",
    "- Read `quality-gates.md` before implementation.",
    "- Use `generated-skills/playable-quality-director.md`, `taste-director.md`, `game-feel-director.md`, and `one-minute-demo-auditor.md` before declaring success.",
    "- Generate or follow target-specific helpers only inside this `.firstplayable/` project brain."
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
    "- The chosen target has a clear next action and project-local execution helper.",
    "- The core loop can be attempted, failed or completed, and retried.",
    "- Taste, camera, game feel, UI, and feedback are represented in the playable slice.",
    "- A fresh player can understand the game in one minute.",
    "- The QA player can name evidence and blockers."
  ].join("\n");
}

function renderQualityGates(spec: ExtractedSpec, completeness: CompletenessReport): string {
  return [
    `# ${spec.title} Quality Gates`,
    "",
    "These gates decide whether the first playable is useful. Passing intake or generating files is not enough.",
    "",
    `- Intake status: ${completeness.status}`,
    bullet("Target/toolchain", spec.targetToolchain || spec.inferredTargets.join(", ")),
    bullet("Player fantasy", spec.playerFantasy),
    bullet("Core loop", spec.coreLoop),
    bullet("Controls", spec.controls),
    bullet("Taste", spec.assetsTaste),
    bullet("First playable scope", spec.firstPlayableScope),
    "",
    "## Gate 1: One-Minute Clarity",
    "- A fresh player can identify the goal, controls, threat/reward, progress, and retry path within 60 seconds.",
    "- If the player must read implementation notes to understand the game, mark `NEEDS_IMPROVEMENT`.",
    "",
    "## Gate 2: Playable Quality",
    "- The result must be a small playable game slice with feedback, win/fail, and retry, not only an arrangement of objects.",
    "- The first input must produce immediate visible response.",
    "",
    "## Gate 3: Taste Fidelity",
    "- The visible output must honor the requested art direction, mood, camera, HUD, and feedback.",
    "- Reject plain grey-box, dull primitive, unreadable, or placeholder-looking output when the source asks for a specific taste.",
    "",
    "## Gate 4: Game Feel",
    "- Movement, aiming, jumping, driving, dashing, timing, camera, and cooldowns must feel tuned for the requested genre.",
    "- Mechanics must communicate impact through motion, sound/visual cues where the target supports them, state changes, and UI.",
    "",
    "## Gate 5: Architecture Fit",
    "- The implementation should use target-idiomatic modules/scripts/entities for player, world, hazards, pickups, UI, camera, and state.",
    "- Avoid one monolithic controller when separate systems would make the slice easier to tune or inspect.",
    "",
    "## Gate 6: Evidence And Honesty",
    "- Record screenshots, logs, play notes, or blockers before readiness claims.",
    "- Use honest verdicts: `LOCAL_PROTOTYPE_READY`, `CREATOR_TEST_READY`, `NEEDS_IMPROVEMENT`, or `BLOCKED`."
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
    "Target-specific helper files are project-local. They may mention the selected target only inside `.firstplayable/` after the target is selected or inferred from the source.",
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
    "- Record quality decisions from playtests, screenshots, and user feedback.",
    "- Do not downgrade the taste, game feel, or one-minute clarity bar without explicit user direction.",
    "",
    "## Current Decisions",
    bullet("Title", spec.title),
    bullet("Target/toolchain", spec.targetToolchain),
    bullet("Taste", spec.assetsTaste),
    bullet("First playable", spec.firstPlayableScope),
    bullet("QA criteria", spec.qaCriteria)
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
    "- `quality-gates.md`",
    "",
    `Project: ${spec.title}`,
    `Intake status: ${completeness.status}`,
    bullet("Target/toolchain", selectedTarget(spec)),
    bullet("Core loop", spec.coreLoop),
    bullet("Taste", spec.assetsTaste),
    "",
    "## Job",
    helperJob(name),
    "",
    ...helperSections(name, spec, completeness),
    "",
    "## Rule",
    "If the source is complete, proceed from the master script without asking sequential questions. If the playable is dull, unclear, unresponsive, or visibly below the requested taste, mark `NEEDS_IMPROVEMENT` instead of calling it ready."
  ].join("\n");
}

function renderAgent(name: string, spec: ExtractedSpec): string {
  return [
    `# ${name}`,
    "",
    "Project-local agent brief generated by FirstPlayable.",
    "",
    "Source of truth: `source-summary.md`, `extracted-spec.json`, `master-script.md`, `quality-gates.md`.",
    "",
    `Project: ${spec.title}`,
    bullet("Target/toolchain", spec.targetToolchain),
    bullet("Taste", spec.assetsTaste),
    bullet("Core loop", spec.coreLoop),
    "",
    "## Output Required",
    "Produce concise, evidence-backed work that advances the first-playable contract and passes the quality gates."
  ].join("\n");
}

function helperJob(name: string): string {
  const jobs: Record<string, string> = {
    "master-handoff": "Prepare compact handoffs for AI agents without losing the source contract or quality gates.",
    "target-builder": "Infer or confirm the selected target and create project-local target execution guidance without shipping a global adapter.",
    "target-specific-builder": "Translate the selected target/toolchain into local implementation constraints and handoff instructions for this project only.",
    "taste-director": "Protect visual taste, asset ambition, pacing, camera, UI mood, and screenshot readability.",
    "playable-quality-director": "Enforce a real one-slice playable game with visible goal, feedback, win/fail, and retry.",
    "game-feel-director": "Turn controls, camera, genre, movement, timing, and feedback into concrete feel requirements.",
    "one-minute-demo-auditor": "Judge whether a new player can understand and enjoy the slice within 60 seconds.",
    "implementation-architecture-director": "Choose a target-idiomatic structure and prevent hard-to-tune monolithic output.",
    "qa-playtester": "Turn the first-playable contract into evidence checks, playtest notes, screenshots/logs, and blockers.",
    "memory-manager": "Record durable decisions, quality calls, target assumptions, and user corrections.",
    "product-truth": "Block overclaims and also block calling dull, unclear, or incomplete output successful."
  };
  return jobs[name] ?? "Support the FirstPlayable project brain.";
}

function helperSections(name: string, spec: ExtractedSpec, completeness: CompletenessReport): string[] {
  const target = selectedTarget(spec);
  const sections: Record<string, string[]> = {
    "master-handoff": [
      "## Handoff Requirements",
      "- Include the player fantasy, core loop, selected target, one-minute goal, and taste profile in every agent handoff.",
      "- Tell implementers to read `quality-gates.md` before writing target files.",
      "- Keep target-specific details local to this project brain.",
      "- Preserve open blockers and contradictions instead of smoothing them over."
    ],
    "target-builder": [
      "## Target Inference",
      bullet("Selected or inferred target", target),
      `- Target confidence: ${target === "missing" ? "missing" : "inferred or provided by source"}`,
      "- If the target is missing, ask one grouped clarification before implementation.",
      "- If the target is present, generate or follow `target-specific-builder.md` inside this project only.",
      "- Do not add shipped engine/platform adapter docs to the package."
    ],
    "target-specific-builder": [
      "## Local Target Handoff",
      bullet("Selected/inferred target", target),
      "- This file is generated inside the project brain and is allowed to name the selected target.",
      "- Convert the master script into concrete target-local tasks, file boundaries, runtime checks, and blocker notes.",
      "- Keep quality gates active while choosing target APIs, scene/entity structure, assets, UI, and QA commands.",
      "- If the target has its own agent mode or tooling, use it for heavy setup but still enforce FirstPlayable taste, feel, and one-minute gates.",
      "- If target tooling is unavailable, record `BLOCKED` with exact missing commands or installation evidence."
    ],
    "taste-director": [
      "## Taste Contract",
      bullet("Requested taste/assets", spec.assetsTaste),
      bullet("Camera", spec.camera),
      bullet("UI/HUD", spec.uiHud),
      "- Visual ambition must be visible in the first screenshot, not deferred to a later polish pass.",
      "- Reject plain grey-box, dull primitive, flat placeholder, unreadable, or amateur-looking output when the source asks for a specific style.",
      "- Require readable silhouettes for player, hazards/enemies, pickups, interactables, background, and HUD.",
      "- Prefer target-native generated sprites/materials/shapes/effects that express the requested taste over bare rectangles.",
      "- Screenshot check: a viewer should understand the genre, mood, goal, and main interactables without reading code."
    ],
    "playable-quality-director": [
      "## Playable Quality Bar",
      bullet("First playable scope", spec.firstPlayableScope),
      bullet("Win/fail states", spec.winFailStates),
      "- The output must be a small complete playable slice, not a static scene or tech checklist.",
      "- The player must have immediate agency, repeated primary actions, visible feedback, progress, fail pressure, and retry.",
      "- The core loop must be testable from start to finish within the requested scope.",
      "- Mark `NEEDS_IMPROVEMENT` if the result merely compiles, generates a scene, or satisfies files without becoming fun and legible."
    ],
    "game-feel-director": [
      "## Feel Requirements",
      bullet("Controls", spec.controls),
      bullet("Genre", spec.genre),
      bullet("Mechanics", spec.mechanics),
      "- Tune movement, jumping, driving, aiming, dashing, cooldowns, gravity, acceleration, friction, camera follow, and hit feedback to match the genre.",
      "- The first input must respond instantly and visibly.",
      "- Primary actions need readable anticipation, impact, recovery, cooldown, and state feedback where relevant.",
      "- If a control is named by the source, verify that exact input path works before readiness."
    ],
    "one-minute-demo-auditor": [
      "## 60 Second Audit",
      "- In 10 seconds: the player should know what they control and what the goal is.",
      "- In 30 seconds: the player should have performed the core loop at least once.",
      "- In 60 seconds: the player should see progress, reward, danger or failure pressure, feedback, and a retry or completion state.",
      "- A viewer should be able to describe the game from a screenshot plus one minute of play.",
      "- If the demo needs explanation, it is not FirstPlayable-ready."
    ],
    "implementation-architecture-director": [
      "## Architecture Requirements",
      bullet("Mechanics", spec.mechanics),
      bullet("Target/toolchain", target),
      "- Use target-idiomatic modules/scripts/entities for player, level/world, hazards/enemies, pickups/interactables, UI/HUD, camera, game state, and QA hooks.",
      "- Avoid one giant controller when separate pieces would improve readability, tuning, or iteration.",
      "- Keep constants and tuning values easy to find.",
      "- Generated target files should be inspectable by a human and resilient to the next improvement pass."
    ],
    "qa-playtester": [
      "## Evidence Requirements",
      bullet("QA criteria", spec.qaCriteria),
      "- Verify controls, core loop, win, fail, retry, taste readability, one-minute clarity, and target-specific run/build status.",
      "- Capture logs, screenshots, play notes, or exact blockers before claiming readiness.",
      "- Report `LOCAL_PROTOTYPE_READY`, `CREATOR_TEST_READY`, `NEEDS_IMPROVEMENT`, or `BLOCKED` only with evidence.",
      "- If visual/gameplay quality is weaker than a reasonable no-skill baseline, call that out directly."
    ],
    "memory-manager": [
      "## Memory Rules",
      "- Record user corrections, selected target/toolchain, quality bar changes, blocker decisions, and rejected directions.",
      "- Keep architecture and taste decisions separate from temporary implementation notes.",
      "- Update `memory.md` when playtests reveal dull visuals, poor feel, unclear goals, or target setup problems.",
      "- Do not erase original source requirements unless the user explicitly changes them."
    ],
    "product-truth": [
      "## Truth Rules",
      "- Do not claim store, commercial, launch, or publishing readiness from local first-playable evidence.",
      "- Do not call the slice successful only because files were generated, target tooling ran, or tests compiled.",
      "- Say `NEEDS_IMPROVEMENT` when the game is playable but dull, unclear, weak-feeling, or visibly below the taste contract.",
      `- Current intake status is ${completeness.status}; respect its missing fields or conflicts.`
    ]
  };
  return sections[name] ?? ["## Support", "Follow the project brain and quality gates."];
}

function helperScript(name: string): string {
  return `#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd(), ".firstplayable");
const required = ["source-summary.md", "extracted-spec.json", "master-script.md", "quality-gates.md"];
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

function selectedTarget(spec: ExtractedSpec): string {
  return spec.targetToolchain || spec.inferredTargets.join(", ") || "missing";
}

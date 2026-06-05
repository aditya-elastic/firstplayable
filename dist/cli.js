#!/usr/bin/env node

// src/cli/main.ts
import fs4 from "node:fs";
import path4 from "node:path";
import { fileURLToPath } from "node:url";

// src/core/completeness.ts
var requiredFields = [
  "targetToolchain",
  "playerFantasy",
  "coreLoop",
  "controls",
  "camera",
  "mechanics",
  "assetsTaste",
  "winFailStates",
  "firstPlayableScope",
  "qaCriteria"
];
var fieldLabels = {
  targetToolchain: "target surface/toolchain",
  playerFantasy: "player fantasy",
  coreLoop: "core loop",
  controls: "controls/player actions",
  camera: "camera/perspective",
  mechanics: "core mechanics",
  assetsTaste: "taste/art/assets",
  winFailStates: "win/fail states",
  firstPlayableScope: "first playable scope",
  qaCriteria: "QA/success criteria"
};
function classifyCompleteness(spec) {
  const missingFields = requiredFields.filter((field) => !hasMeaningfulValue(spec[field]));
  const conflicts = spec.conflicts;
  if (conflicts.length) {
    return {
      status: "CONFLICTED",
      questionsNeeded: true,
      questions: [`Resolve this conflict before generating helper skills: ${conflicts.join(" ")}`],
      missingFields: missingFields.map((field) => fieldLabels[String(field)]),
      conflicts,
      confidence: 0.35,
      reason: "The source contains contradictory instructions."
    };
  }
  if (missingFields.length === 0) {
    return {
      status: "COMPLETE",
      questionsNeeded: false,
      questions: [],
      missingFields: [],
      conflicts: [],
      confidence: spec.sourceWordCount > 80 ? 0.95 : 0.82,
      reason: "The source contains enough information to generate the project brain without sequential questions."
    };
  }
  return {
    status: "PARTIAL",
    questionsNeeded: true,
    questions: [
      `Please provide the missing first-playable details in one response: ${missingFields.map((field) => fieldLabels[String(field)]).join(", ")}.`
    ],
    missingFields: missingFields.map((field) => fieldLabels[String(field)]),
    conflicts: [],
    confidence: Math.max(0.25, 1 - missingFields.length / requiredFields.length),
    reason: "The source is usable, but essential first-playable fields are missing."
  };
}
function hasMeaningfulValue(value) {
  return typeof value === "string" ? value.trim().length >= 3 : Array.isArray(value) ? value.length > 0 : Boolean(value);
}

// src/core/generate.ts
import fs from "node:fs/promises";
import path from "node:path";
var helperSkillNames = ["master-handoff", "target-builder", "taste-director", "qa-playtester", "memory-manager", "product-truth"];
var agentNames = [
  "creative-director",
  "game-designer",
  "target-toolchain-builder",
  "gameplay-prototyper",
  "asset-taste-director",
  "qa-player",
  "evidence-auditor",
  "memory-curator"
];
async function generateProjectBrain(projectRoot, spec, completeness) {
  const root = path.resolve(projectRoot);
  const fpRoot = path.join(root, ".firstplayable");
  await mkdirs(fpRoot);
  await write(path.join(fpRoot, "source-summary.md"), renderSourceSummary(spec, completeness));
  await write(path.join(fpRoot, "extracted-spec.json"), `${JSON.stringify(spec, null, 2)}
`);
  await write(path.join(fpRoot, "completeness-report.json"), `${JSON.stringify(completeness, null, 2)}
`);
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
async function createSnapshot(projectRoot) {
  const fpRoot = path.join(path.resolve(projectRoot), ".firstplayable");
  await ensureProjectBrain(fpRoot);
  const stamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
  const snapshotPath = path.join(fpRoot, "snapshots", `${stamp}.md`);
  const files = await listRelativeFiles(fpRoot);
  await write(
    snapshotPath,
    [`# FirstPlayable Snapshot`, "", `Created: ${(/* @__PURE__ */ new Date()).toISOString()}`, "", "## Files", ...files.map((file) => `- ${file}`)].join("\n")
  );
  return snapshotPath;
}
async function checkProjectBrain(projectRoot) {
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
async function generateHelperSkills(fpRoot, spec, completeness) {
  for (const name of helperSkillNames) {
    await write(path.join(fpRoot, "generated-skills", `${name}.md`), renderHelperSkill(name, spec, completeness));
  }
}
async function generateAgents(fpRoot, spec) {
  for (const name of agentNames) {
    await write(path.join(fpRoot, "generated-agents", `${name}.md`), renderAgent(name, spec));
  }
}
async function generateChecklists(fpRoot, spec, completeness) {
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
async function generateHelpers(fpRoot) {
  await write(path.join(fpRoot, "helpers", "doctor.mjs"), helperScript("doctor"));
  await write(path.join(fpRoot, "helpers", "context-packet.mjs"), helperScript("context-packet"));
  await write(path.join(fpRoot, "helpers", "readiness-check.mjs"), helperScript("readiness-check"));
  await write(path.join(fpRoot, "helpers", "next-action.mjs"), helperScript("next-action"));
}
function renderSourceSummary(spec, completeness) {
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
function renderMasterScript(spec, completeness) {
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
function renderTasteProfile(spec) {
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
function renderFirstPlayableContract(spec, completeness) {
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
function renderTargetPlan(spec, completeness) {
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
    completeness.status === "COMPLETE" ? "Generate the target-specific execution helper from this plan and the master script." : completeness.questions.join(" ")
  ].join("\n");
}
function renderMemory(spec) {
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
function renderHelperSkill(name, spec, completeness) {
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
function renderAgent(name, spec) {
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
function helperJob(name) {
  const jobs = {
    "master-handoff": "Prepare compact handoffs for AI agents without losing the source contract.",
    "target-builder": "Create target-specific execution steps only after the target/toolchain is selected or inferred.",
    "taste-director": "Protect the requested taste, pacing, camera, and UI mood.",
    "qa-playtester": "Turn the first-playable contract into evidence checks and blockers.",
    "memory-manager": "Record durable decisions and user corrections.",
    "product-truth": "Block overclaims and keep readiness language honest."
  };
  return jobs[name] ?? "Support the FirstPlayable project brain.";
}
function helperScript(name) {
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
async function mkdirs(fpRoot) {
  for (const dir of ["generated-skills", "generated-agents", "helpers", "checklists", "reports", "snapshots"]) {
    await fs.mkdir(path.join(fpRoot, dir), { recursive: true });
  }
}
async function ensureProjectBrain(fpRoot) {
  try {
    await fs.access(path.join(fpRoot, "master-script.md"));
  } catch {
    throw new Error(`No FirstPlayable project brain found at ${fpRoot}. Run firstplayable init first.`);
  }
}
async function write(filePath, content) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content.endsWith("\n") ? content : `${content}
`, "utf8");
  if (filePath.endsWith(".mjs")) await fs.chmod(filePath, 493);
}
async function listRelativeFiles(root) {
  const files = [];
  async function walk(dir) {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(absolute);
      else files.push(path.relative(root, absolute));
    }
  }
  await walk(root);
  return files.sort();
}
function bullet(label, value) {
  return `- ${label}: ${value?.trim() || "missing"}`;
}

// src/core/intake.ts
var fieldRules = [
  { field: "title", labels: ["title", "game title", "name"], fallback: [/^#\s+(.+)$/im, /\b(?:called|named)\s+["']?([^"'\n.]{3,80})/i] },
  { field: "genre", labels: ["genre", "type"], fallback: [/\b(arcade|survival|platformer|puzzle|racing|combat|shooter|strategy|rpg|sim|simulation|narrative|adventure)\b/i] },
  { field: "targetToolchain", labels: ["target", "platform", "toolchain", "engine", "runtime", "delivery"], fallback: [/\b(unity|godot|web|browser|html5|phaser|three\.?js|unreal|roblox|steam|youtube|mobile|ios|android)\b/i] },
  { field: "playerFantasy", labels: ["player fantasy", "fantasy", "premise", "experience", "theme"], fallback: [/\bplayer fantasy\b[:\-]\s*([^\n]+)/i] },
  { field: "coreLoop", labels: ["core loop", "loop", "game loop", "moment to moment"], fallback: [/\bcore loop\b[:\-]\s*([^\n]+)/i] },
  { field: "controls", labels: ["controls", "input", "player action", "actions"], fallback: [/\b(wasd|arrow keys|mouse|touch|tap|swipe|drag|space|controller|gamepad)\b[^.\n]*/i] },
  { field: "camera", labels: ["camera", "view", "perspective", "framing"], fallback: [/\b(top-down|third-person|first-person|side-view|isometric|fixed camera|follow camera)\b[^.\n]*/i] },
  { field: "mechanics", labels: ["mechanics", "systems", "rules", "features"], fallback: [/\b(mechanics|systems)\b[:\-]\s*([^\n]+)/i] },
  { field: "progression", labels: ["progression", "levels", "level structure", "difficulty", "pacing"], fallback: [/\b(progression|levels|difficulty|pacing)\b[:\-]\s*([^\n]+)/i] },
  { field: "assetsTaste", labels: ["art", "art style", "taste", "visual style", "assets", "mood"], fallback: [/\b(neon|pixel|low poly|stylized|realistic|cute|dark|cinematic|minimal|premium)\b[^.\n]*/i] },
  { field: "uiHud", labels: ["ui", "hud", "interface", "menus"], fallback: [/\b(hud|score|health|timer|stamina|inventory|reticle|minimap)\b[^.\n]*/i] },
  { field: "winFailStates", labels: ["win", "fail", "win fail", "success", "failure", "lose"], fallback: [/\b(win|fail|lose|death|victory|success)\b[^.\n]*/i] },
  { field: "firstPlayableScope", labels: ["first playable", "scope", "prototype scope", "vertical slice", "mvp"], fallback: [/\b(first playable|prototype|vertical slice|mvp)\b[^.\n]*/i] },
  { field: "qaCriteria", labels: ["qa", "test", "acceptance", "success criteria", "playtest"], fallback: [/\b(qa|test|acceptance|playtest|success criteria)\b[^.\n]*/i] },
  { field: "constraints", labels: ["constraints", "limits", "non-goals", "must not", "requirements"], fallback: [/\b(constraints|must not|requirements|non-goals)\b[:\-]\s*([^\n]+)/i] }
];
function extractSpec(source) {
  const text = source.text;
  const spec = {
    title: "Untitled First Playable",
    genre: "",
    targetToolchain: "",
    playerFantasy: "",
    coreLoop: "",
    controls: "",
    camera: "",
    mechanics: "",
    progression: "",
    assetsTaste: "",
    uiHud: "",
    winFailStates: "",
    firstPlayableScope: "",
    qaCriteria: "",
    constraints: "",
    inferredTargets: inferTargets(text),
    conflicts: inferConflicts(text),
    sourceKind: source.kind,
    sourcePath: source.sourcePath ?? "",
    sourceWordCount: wordCount(text)
  };
  for (const rule of fieldRules) {
    const extracted = extractLabeled(text, rule.labels) || extractFallback(text, rule.fallback);
    if (extracted) spec[rule.field] = cleanValue(extracted);
  }
  if (!spec.targetToolchain && spec.inferredTargets.length === 1) spec.targetToolchain = spec.inferredTargets[0];
  if (spec.title === "Untitled First Playable") spec.title = titleFromText(text);
  return spec;
}
function extractLabeled(text, labels) {
  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`(?:^|\\n)\\s*(?:[-*]\\s*)?${escaped}\\s*[:\\-]\\s*(.+?)(?=\\n\\s*(?:[-*]\\s*)?[A-Za-z][A-Za-z\\s/]{1,32}\\s*[:\\-]|\\n\\n|$)`, "is");
    const match = text.match(pattern);
    if (match?.[1]) return match[1];
  }
  return "";
}
function extractFallback(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[2]) return match[2];
    if (match?.[1]) return match[1];
  }
  return "";
}
function inferTargets(text) {
  const lower = text.toLowerCase();
  const targets = /* @__PURE__ */ new Set();
  const candidates = [
    ["Unity", /\bunity\b/],
    ["Godot", /\bgodot\b/],
    ["Web", /\b(web|browser|html5|phaser|three\.?js)\b/],
    ["Unreal", /\bunreal\b/],
    ["Roblox", /\broblox\b/],
    ["Steam", /\bsteam\b/],
    ["YouTube/Creator", /\b(youtube|creator|label|stream)\b/],
    ["Mobile", /\b(mobile|ios|android)\b/]
  ];
  for (const [label, pattern] of candidates) if (pattern.test(lower)) targets.add(label);
  return [...targets];
}
function inferConflicts(text) {
  const lower = text.toLowerCase();
  const exclusiveTargetMatches = lower.split(/\n|[.]/).filter((line) => /\b(?:target|platform|engine|runtime)\b/.test(line) && /\b(?:only|must be|exclusive)\b/.test(line)).flatMap((line) => [...line.matchAll(/\b(unity|godot|web|browser|unreal|roblox|steam|mobile|youtube)\b/g)].map((match) => match[1]));
  const uniqueExclusive = [...new Set(exclusiveTargetMatches)];
  if (uniqueExclusive.length > 1) return [`Conflicting exclusive targets: ${uniqueExclusive.join(", ")}.`];
  if (/no questions/i.test(text) && /ask questions/i.test(text)) return ["Source both requests no questions and asks for questions."];
  return [];
}
function cleanValue(value) {
  return value.replace(/\s+/g, " ").replace(/^["']|["']$/g, "").trim().slice(0, 1400);
}
function titleFromText(text) {
  const firstLine = text.split("\n").map((line) => line.replace(/^#+\s*/, "").trim()).find((line) => line.length >= 3 && line.length <= 80);
  return firstLine || "Untitled First Playable";
}
function wordCount(text) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

// src/core/skill-install.ts
import fs2 from "node:fs/promises";
import os from "node:os";
import path2 from "node:path";
async function installMasterSkill(target, packageRoot) {
  const sourceDir = path2.join(packageRoot, "skills", "firstplayable");
  const sourceSkill = path2.join(sourceDir, "SKILL.md");
  if (target === "cursor") {
    const destination = cursorRulePath();
    await fs2.mkdir(path2.dirname(destination), { recursive: true });
    const content = await fs2.readFile(sourceSkill, "utf8");
    await fs2.writeFile(destination, cursorRule(content), "utf8");
    return { target, installedPath: destination };
  }
  const destinationDir = skillDirectoryFor(target);
  await fs2.mkdir(destinationDir, { recursive: true });
  await fs2.cp(sourceDir, destinationDir, { recursive: true, force: true });
  return { target, installedPath: path2.join(destinationDir, "SKILL.md") };
}
function skillDirectoryFor(target) {
  const home = os.homedir();
  if (target === "codex") return path2.join(process.env.CODEX_HOME || path2.join(home, ".codex"), "skills", "firstplayable");
  return path2.join(home, ".claude", "skills", "firstplayable");
}
function cursorRulePath() {
  return path2.join(os.homedir(), ".cursor", "rules", "firstplayable.mdc");
}
function cursorRule(content) {
  return [`---`, `description: FirstPlayable master skill`, `alwaysApply: false`, `---`, "", content].join("\n");
}

// src/core/source.ts
import fs3 from "node:fs/promises";
import path3 from "node:path";
async function sourceFromIdea(idea, kind = "idea") {
  return {
    kind,
    text: normalizeText(idea),
    sourcePath: ""
  };
}
async function sourceFromFile(filePath) {
  const absolute = path3.resolve(filePath);
  const extension = path3.extname(absolute).toLowerCase();
  const bytes = await fs3.readFile(absolute);
  if (extension === ".pdf") {
    return {
      kind: "pdf",
      text: normalizeText(await extractPdfText(bytes)),
      sourcePath: absolute
    };
  }
  if (extension === ".json") {
    return {
      kind: "json",
      text: normalizeText(jsonToText(bytes.toString("utf8"))),
      sourcePath: absolute
    };
  }
  return {
    kind: extension === ".md" || extension === ".markdown" ? "markdown" : extension === ".txt" ? "text" : "unknown",
    text: normalizeText(bytes.toString("utf8")),
    sourcePath: absolute
  };
}
function normalizeText(value) {
  return value.replace(/\r/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
async function extractPdfText(bytes) {
  try {
    const { getDocument, VerbosityLevel } = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const data = new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const loadingTask = getDocument({
      data,
      disableWorker: true,
      useSystemFonts: true,
      verbosity: VerbosityLevel.ERRORS
    });
    const pdf = await loadingTask.promise;
    const pages = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(content.items.map((item) => "str" in item ? item.str : "").join(" "));
    }
    const text = pages.join("\n").trim();
    if (text) return text;
  } catch {
  }
  return bytes.toString("utf8").replace(/\)\s*Tj\s*[\d.-]+\s+[\d.-]+\s+Td\s*\(/g, "\n").replace(/BT\s+\/F\d+\s+\d+\s+Tf\s+[\d.-]+\s+[\d.-]+\s+Td\s*\(/g, "\n").replace(/\)\s*Tj\s*ET/g, "\n").replace(/\\n/g, "\n").replace(/\\r/g, "\n").replace(/\\t/g, " ").replace(/endstream[\s\S]*$/i, "").replace(/%PDF-[\s\S]*?stream/i, "").replace(/[^ -~\n]/g, " ").replace(/[ \t]+/g, " ").replace(/\n{2,}/g, "\n");
}
function jsonToText(raw) {
  try {
    return flattenJson(JSON.parse(raw)).join("\n");
  } catch {
    return raw;
  }
}
function flattenJson(value, prefix = "") {
  if (value === null || value === void 0) return [];
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return [`${prefix ? `${prefix}: ` : ""}${String(value)}`];
  }
  if (Array.isArray(value)) return value.flatMap((item, index) => flattenJson(item, prefix ? `${prefix}.${index}` : String(index)));
  if (typeof value === "object") {
    return Object.entries(value).flatMap(([key, item]) => flattenJson(item, prefix ? `${prefix}.${key}` : key));
  }
  return [];
}

// src/cli/main.ts
var VERSION = "0.1.0";
async function runCli(argv) {
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
  throw new Error(`Unknown command: ${command}

${helpText()}`);
}
function parseArgv(argv) {
  const flags = /* @__PURE__ */ new Map();
  const positionals = [];
  const command = [];
  const valueFlags = /* @__PURE__ */ new Set(["idea", "source", "cwd"]);
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token.startsWith("--")) {
      const [rawName, inlineValue] = token.slice(2).split(/=(.*)/s).filter((part) => part !== void 0);
      const takesValue = valueFlags.has(rawName);
      const value = inlineValue ?? (takesValue ? argv[++index] : "true");
      if (takesValue && (!value || value.startsWith("--"))) throw new Error(`Missing value for --${rawName}`);
      flags.set(rawName, [...flags.get(rawName) ?? [], value]);
      continue;
    }
    if (command.length < commandArity(command)) command.push(token);
    else positionals.push(token);
  }
  return { command, flags, positionals };
}
async function doctor() {
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
async function setup(parsed) {
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
async function initProject(parsed) {
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
async function intakeProject(parsed) {
  const cwd = firstFlag(parsed, "cwd") || process.cwd();
  const existingSource = path4.join(cwd, ".firstplayable", "extracted-spec.json");
  if (!fs4.existsSync(existingSource)) throw new Error(`No extracted spec found at ${existingSource}. Run firstplayable init first.`);
  const spec = JSON.parse(fs4.readFileSync(existingSource, "utf8"));
  const completeness = classifyCompleteness(spec);
  fs4.writeFileSync(path4.join(cwd, ".firstplayable", "completeness-report.json"), `${JSON.stringify(completeness, null, 2)}
`, "utf8");
  print({ ok: true, status: completeness.status, questionsNeeded: completeness.questionsNeeded, questions: completeness.questions }, hasFlag(parsed, "json"));
}
async function snapshotProject(parsed) {
  const cwd = firstFlag(parsed, "cwd") || process.cwd();
  const snapshotPath = await createSnapshot(cwd);
  print({ ok: true, snapshot: snapshotPath }, hasFlag(parsed, "json"));
}
async function checkProject(parsed) {
  const cwd = firstFlag(parsed, "cwd") || process.cwd();
  const result = await checkProjectBrain(cwd);
  print(result, hasFlag(parsed, "json"));
  if (!result.ok) process.exitCode = 1;
}
async function installSkill(parsed) {
  const targets = [];
  if (hasFlag(parsed, "codex")) targets.push("codex");
  if (hasFlag(parsed, "cursor")) targets.push("cursor");
  if (hasFlag(parsed, "claude")) targets.push("claude");
  if (!targets.length) throw new Error("Usage: firstplayable skills install --codex|--cursor|--claude");
  const packageRoot = findPackageRoot();
  const installed = [];
  for (const target of targets) installed.push(await installMasterSkill(target, packageRoot));
  print({ ok: true, installed }, hasFlag(parsed, "json"));
}
async function resolveSource(parsed) {
  const idea = firstFlag(parsed, "idea");
  const sourcePath = firstFlag(parsed, "source");
  if (idea && sourcePath) throw new Error("Choose either --idea or --source, not both.");
  if (idea) return sourceFromIdea(idea);
  if (sourcePath) return sourceFromFile(sourcePath);
  throw new Error('Usage: firstplayable init <dir> --idea "..." OR --source ./gameplay.pdf');
}
function print(payload, json) {
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
        ...Array.isArray(payload.questions) && payload.questions.length ? [`Questions: ${payload.questions.join(" ")}`] : [],
        `Next: ${payload.next}`
      ].join("\n")
    );
    return;
  }
  console.log(JSON.stringify(payload, null, 2));
}
function firstFlag(parsed, name) {
  return parsed.flags.get(name)?.at(-1);
}
function hasFlag(parsed, name) {
  return parsed.flags.has(name);
}
function setupTargets(parsed) {
  const targets = /* @__PURE__ */ new Set();
  if (hasFlag(parsed, "codex")) targets.add("codex");
  if (hasFlag(parsed, "cursor")) targets.add("cursor");
  if (hasFlag(parsed, "claude")) targets.add("claude");
  if (targets.size === 0) return defaultSkillTargets();
  return [...targets];
}
function defaultSkillTargets() {
  const targets = ["codex", "cursor"];
  if (fs4.existsSync(path4.join(process.env.HOME || "", ".claude"))) targets.push("claude");
  return targets;
}
async function installTargets(targets, packageRoot) {
  const installed = [];
  for (const target of targets) installed.push(await installMasterSkill(target, packageRoot));
  return installed;
}
function commandArity(command) {
  if (command.length === 0) return 1;
  if (command[0] === "skills") return 2;
  return 1;
}
function findPackageRoot() {
  let dir = path4.dirname(fileURLToPath(import.meta.url));
  for (let index = 0; index < 6; index += 1) {
    const candidate = path4.join(dir, "skills", "firstplayable", "SKILL.md");
    if (fs4.existsSync(candidate)) return dir;
    dir = path4.dirname(dir);
  }
  return process.cwd();
}
function helpText() {
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
    process.stderr.write(`FirstPlayable error: ${error instanceof Error ? error.message : String(error)}
`);
    process.exitCode = 1;
  });
}
function isEntrypoint() {
  if (!process.argv[1]) return false;
  try {
    return fs4.realpathSync(fileURLToPath(import.meta.url)) === fs4.realpathSync(process.argv[1]);
  } catch {
    return import.meta.url === `file://${process.argv[1]}`;
  }
}
export {
  parseArgv,
  runCli
};

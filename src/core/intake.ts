import type { ExtractedSpec, SourceInput } from "./schemas";

type FieldRule = {
  field: keyof ExtractedSpec;
  labels: string[];
  fallback: RegExp[];
};

const fieldRules: FieldRule[] = [
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

export function extractSpec(source: SourceInput): ExtractedSpec {
  const text = source.text;
  const spec: ExtractedSpec = {
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
    if (extracted) (spec[rule.field] as string) = cleanValue(extracted);
  }

  if (!spec.targetToolchain && spec.inferredTargets.length === 1) spec.targetToolchain = spec.inferredTargets[0];
  if (spec.title === "Untitled First Playable") spec.title = titleFromText(text);
  return spec;
}

function extractLabeled(text: string, labels: string[]): string {
  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`(?:^|\\n)\\s*(?:[-*]\\s*)?${escaped}\\s*[:\\-]\\s*(.+?)(?=\\n\\s*(?:[-*]\\s*)?[A-Za-z][A-Za-z\\s/]{1,32}\\s*[:\\-]|\\n\\n|$)`, "is");
    const match = text.match(pattern);
    if (match?.[1]) return match[1];
  }
  return "";
}

function extractFallback(text: string, patterns: RegExp[]): string {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[2]) return match[2];
    if (match?.[1]) return match[1];
  }
  return "";
}

function inferTargets(text: string): string[] {
  const lower = text.toLowerCase();
  const targets = new Set<string>();
  const candidates: Array<[string, RegExp]> = [
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

function inferConflicts(text: string): string[] {
  const lower = text.toLowerCase();
  const exclusiveTargetMatches = lower
    .split(/\n|[.]/)
    .filter((line) => /\b(?:target|platform|engine|runtime)\b/.test(line) && /\b(?:only|must be|exclusive)\b/.test(line))
    .flatMap((line) => [...line.matchAll(/\b(unity|godot|web|browser|unreal|roblox|steam|mobile|youtube)\b/g)].map((match) => match[1]));
  const uniqueExclusive = [...new Set(exclusiveTargetMatches)];
  if (uniqueExclusive.length > 1) return [`Conflicting exclusive targets: ${uniqueExclusive.join(", ")}.`];
  if (/no questions/i.test(text) && /ask questions/i.test(text)) return ["Source both requests no questions and asks for questions."];
  return [];
}

function cleanValue(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/^["']|["']$/g, "")
    .trim()
    .slice(0, 1400);
}

function titleFromText(text: string): string {
  const firstLine = text
    .split("\n")
    .map((line) => line.replace(/^#+\s*/, "").trim())
    .find((line) => line.length >= 3 && line.length <= 80);
  return firstLine || "Untitled First Playable";
}

function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

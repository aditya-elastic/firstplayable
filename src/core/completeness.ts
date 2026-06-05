import type { CompletenessReport, ExtractedSpec } from "./schemas";

const requiredFields: Array<keyof ExtractedSpec> = [
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

const fieldLabels: Record<string, string> = {
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

export function classifyCompleteness(spec: ExtractedSpec): CompletenessReport {
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

function hasMeaningfulValue(value: unknown): boolean {
  return typeof value === "string" ? value.trim().length >= 3 : Array.isArray(value) ? value.length > 0 : Boolean(value);
}

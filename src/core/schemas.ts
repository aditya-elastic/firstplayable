export type SourceKind = "idea" | "voice-transcript" | "pdf" | "markdown" | "text" | "json" | "unknown";

export type ExtractedSpec = {
  title: string;
  genre: string;
  targetToolchain: string;
  playerFantasy: string;
  coreLoop: string;
  controls: string;
  camera: string;
  mechanics: string;
  progression: string;
  assetsTaste: string;
  uiHud: string;
  winFailStates: string;
  firstPlayableScope: string;
  qaCriteria: string;
  constraints: string;
  inferredTargets: string[];
  conflicts: string[];
  sourceKind: SourceKind;
  sourcePath: string;
  sourceWordCount: number;
};

export type CompletenessStatus = "COMPLETE" | "PARTIAL" | "CONFLICTED";

export type CompletenessReport = {
  status: CompletenessStatus;
  questionsNeeded: boolean;
  questions: string[];
  missingFields: string[];
  conflicts: string[];
  confidence: number;
  reason: string;
};

export type SourceInput = {
  kind: SourceKind;
  text: string;
  sourcePath?: string;
};

export type ProjectBrain = {
  projectRoot: string;
  firstPlayableRoot: string;
  spec: ExtractedSpec;
  completeness: CompletenessReport;
};

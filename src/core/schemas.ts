import { z } from "zod";

export const sourceKindSchema = z.enum(["idea", "voice-transcript", "pdf", "markdown", "text", "json", "unknown"]);

export const extractedSpecSchema = z.object({
  title: z.string().default("Untitled First Playable"),
  genre: z.string().default(""),
  targetToolchain: z.string().default(""),
  playerFantasy: z.string().default(""),
  coreLoop: z.string().default(""),
  controls: z.string().default(""),
  camera: z.string().default(""),
  mechanics: z.string().default(""),
  progression: z.string().default(""),
  assetsTaste: z.string().default(""),
  uiHud: z.string().default(""),
  winFailStates: z.string().default(""),
  firstPlayableScope: z.string().default(""),
  qaCriteria: z.string().default(""),
  constraints: z.string().default(""),
  inferredTargets: z.array(z.string()).default([]),
  conflicts: z.array(z.string()).default([]),
  sourceKind: sourceKindSchema.default("unknown"),
  sourcePath: z.string().default(""),
  sourceWordCount: z.number().int().nonnegative().default(0)
});

export type ExtractedSpec = z.infer<typeof extractedSpecSchema>;

export const completenessStatusSchema = z.enum(["COMPLETE", "PARTIAL", "CONFLICTED"]);

export const completenessReportSchema = z.object({
  status: completenessStatusSchema,
  questionsNeeded: z.boolean(),
  questions: z.array(z.string()),
  missingFields: z.array(z.string()),
  conflicts: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  reason: z.string()
});

export type CompletenessReport = z.infer<typeof completenessReportSchema>;

export type SourceInput = {
  kind: z.infer<typeof sourceKindSchema>;
  text: string;
  sourcePath?: string;
};

export const projectBrainSchema = z.object({
  projectRoot: z.string(),
  firstPlayableRoot: z.string(),
  spec: extractedSpecSchema,
  completeness: completenessReportSchema
});

export type ProjectBrain = z.infer<typeof projectBrainSchema>;

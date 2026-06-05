import fs from "node:fs/promises";
import path from "node:path";
import type { SourceInput } from "./schemas";

export async function sourceFromIdea(idea: string, kind: SourceInput["kind"] = "idea"): Promise<SourceInput> {
  return {
    kind,
    text: normalizeText(idea),
    sourcePath: ""
  };
}

export async function sourceFromFile(filePath: string): Promise<SourceInput> {
  const absolute = path.resolve(filePath);
  const extension = path.extname(absolute).toLowerCase();
  const bytes = await fs.readFile(absolute);

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

export function normalizeText(value: string): string {
  return value
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function extractPdfText(bytes: Buffer): Promise<string> {
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
    const pages: string[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
    }

    const text = pages.join("\n").trim();
    if (text) return text;
  } catch {
    // Fall through to a lightweight text recovery path. This keeps local intake useful
    // for simple PDF fixtures and malformed creator uploads.
  }

  return bytes
    .toString("utf8")
    .replace(/\)\s*Tj\s*[\d.-]+\s+[\d.-]+\s+Td\s*\(/g, "\n")
    .replace(/BT\s+\/F\d+\s+\d+\s+Tf\s+[\d.-]+\s+[\d.-]+\s+Td\s*\(/g, "\n")
    .replace(/\)\s*Tj\s*ET/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\n")
    .replace(/\\t/g, " ")
    .replace(/endstream[\s\S]*$/i, "")
    .replace(/%PDF-[\s\S]*?stream/i, "")
    .replace(/[^ -~\n]/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n");
}

function jsonToText(raw: string): string {
  try {
    return flattenJson(JSON.parse(raw)).join("\n");
  } catch {
    return raw;
  }
}

function flattenJson(value: unknown, prefix = ""): string[] {
  if (value === null || value === undefined) return [];
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return [`${prefix ? `${prefix}: ` : ""}${String(value)}`];
  }
  if (Array.isArray(value)) return value.flatMap((item, index) => flattenJson(item, prefix ? `${prefix}.${index}` : String(index)));
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, item]) => flattenJson(item, prefix ? `${prefix}.${key}` : key));
  }
  return [];
}

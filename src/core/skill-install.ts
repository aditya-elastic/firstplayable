import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export type SkillTarget = "codex" | "cursor" | "claude";

export async function installMasterSkill(target: SkillTarget, packageRoot: string): Promise<{ target: SkillTarget; installedPath: string }> {
  const source = path.join(packageRoot, "skills", "firstplayable", "SKILL.md");
  const destination = destinationFor(target);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  const content = await fs.readFile(source, "utf8");
  await fs.writeFile(destination, target === "cursor" ? cursorRule(content) : content, "utf8");
  return { target, installedPath: destination };
}

function destinationFor(target: SkillTarget): string {
  const home = os.homedir();
  if (target === "codex") return path.join(process.env.CODEX_HOME || path.join(home, ".codex"), "skills", "firstplayable", "SKILL.md");
  if (target === "claude") return path.join(home, ".claude", "skills", "firstplayable", "SKILL.md");
  return path.join(home, ".cursor", "rules", "firstplayable.mdc");
}

function cursorRule(content: string): string {
  return [`---`, `description: FirstPlayable master skill`, `alwaysApply: false`, `---`, "", content].join("\n");
}

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export type SkillTarget = "codex" | "cursor" | "claude";

export async function installMasterSkill(target: SkillTarget, packageRoot: string): Promise<{ target: SkillTarget; installedPath: string }> {
  const sourceDir = path.join(packageRoot, "skills", "firstplayable");
  const sourceSkill = path.join(sourceDir, "SKILL.md");

  if (target === "cursor") {
    const destination = cursorRulePath();
    await fs.mkdir(path.dirname(destination), { recursive: true });
    const content = await fs.readFile(sourceSkill, "utf8");
    await fs.writeFile(destination, cursorRule(content), "utf8");
    return { target, installedPath: destination };
  }

  const destinationDir = skillDirectoryFor(target);
  await fs.mkdir(destinationDir, { recursive: true });
  await fs.cp(sourceDir, destinationDir, { recursive: true, force: true });
  return { target, installedPath: path.join(destinationDir, "SKILL.md") };
}

function skillDirectoryFor(target: Exclude<SkillTarget, "cursor">): string {
  const home = os.homedir();
  if (target === "codex") return path.join(process.env.CODEX_HOME || path.join(home, ".codex"), "skills", "firstplayable");
  return path.join(home, ".claude", "skills", "firstplayable");
}

function cursorRulePath(): string {
  return path.join(os.homedir(), ".cursor", "rules", "firstplayable.mdc");
}

function cursorRule(content: string): string {
  return [`---`, `description: FirstPlayable master skill`, `alwaysApply: false`, `---`, "", content].join("\n");
}

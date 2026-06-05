import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export type SkillTarget = "codex" | "cursor" | "claude";

export type InstalledSkill = { target: SkillTarget; installedPath: string; installedPaths?: string[] };

export async function installMasterSkill(target: SkillTarget, packageRoot: string, options: { cwd?: string } = {}): Promise<InstalledSkill> {
  const sourceDir = path.join(packageRoot, "skills", "firstplayable");
  const sourceSkill = path.join(sourceDir, "SKILL.md");

  if (target === "cursor") {
    const destination = cursorRulePath(options.cwd);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    const content = await fs.readFile(sourceSkill, "utf8");
    await fs.writeFile(destination, cursorRule(content), "utf8");
    return { target, installedPath: destination };
  }

  const destinationDirs = skillDirectoriesFor(target);
  const installedPaths = [];
  for (const destinationDir of destinationDirs) {
    await fs.mkdir(destinationDir, { recursive: true });
    await fs.cp(sourceDir, destinationDir, { recursive: true, force: true });
    installedPaths.push(path.join(destinationDir, "SKILL.md"));
  }
  return { target, installedPath: installedPaths[0], installedPaths };
}

function skillDirectoriesFor(target: Exclude<SkillTarget, "cursor">): string[] {
  const home = os.homedir();
  if (target === "codex") {
    return uniquePaths([
      path.join(process.env.CODEX_HOME || path.join(home, ".codex"), "skills", "firstplayable"),
      path.join(home, ".agents", "skills", "firstplayable")
    ]);
  }
  return [path.join(home, ".claude", "skills", "firstplayable")];
}

function cursorRulePath(cwd?: string): string {
  const root = cwd ? path.resolve(cwd) : os.homedir();
  return path.join(root, ".cursor", "rules", "firstplayable.mdc");
}

function cursorRule(content: string): string {
  return [`---`, `description: FirstPlayable master skill`, `alwaysApply: false`, `---`, "", content].join("\n");
}

function uniquePaths(paths: string[]): string[] {
  return [...new Set(paths.map((item) => path.resolve(item)))];
}

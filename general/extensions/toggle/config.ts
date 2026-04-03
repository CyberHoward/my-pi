import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";

export interface ToggleConfig {
  disabled: string[];
}

const MY_PI_DIR = join(process.env.HOME!, ".my-pi");

export function getConfigPath(scope: "global" | "project", cwd?: string): string {
  if (scope === "global") return join(MY_PI_DIR, "toggle-config.json");
  return join(cwd!, ".pi", "toggle-config.json");
}

export async function loadConfig(scope: "global" | "project", cwd?: string): Promise<ToggleConfig> {
  const path = getConfigPath(scope, cwd);
  try {
    const raw = await readFile(path, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { disabled: [] };
  }
}

export async function saveConfig(config: ToggleConfig, scope: "global" | "project", cwd?: string): Promise<void> {
  const path = getConfigPath(scope, cwd);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(config, null, 2) + "\n", "utf-8");
}

/** Check if a component path is disabled. Supports group paths (e.g. disabling "engineering" disables all under it) */
export function isDisabled(config: ToggleConfig, relativePath: string): boolean {
  return config.disabled.some(d => relativePath === d || relativePath.startsWith(d + "/"));
}

/** Toggle an item. enabled=true removes it from disabled list, enabled=false adds it. */
export function toggleItem(config: ToggleConfig, relativePath: string, enabled: boolean): ToggleConfig {
  const disabled = new Set(config.disabled);
  if (enabled) {
    disabled.delete(relativePath);
  } else {
    disabled.add(relativePath);
  }
  return { disabled: [...disabled].sort() };
}

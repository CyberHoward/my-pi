import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import type { ComponentItem } from "./discovery.ts";
import type { ToggleConfig } from "./config.ts";

const MANAGED_PREFIX = "-~/.my-pi/";

function getSettingsPath(scope: "global" | "project", cwd?: string): string {
  if (scope === "global") return join(process.env.HOME!, ".pi", "agent", "settings.json");
  return join(cwd!, ".pi", "settings.json");
}

/**
 * Apply toggle config to settings.json by adding/removing exclusion entries.
 * Only manages entries starting with "-~/.my-pi/" — user entries are untouched.
 */
export async function applyToggleConfig(
  config: ToggleConfig,
  allItems: ComponentItem[],
  scope: "global" | "project",
  cwd?: string,
): Promise<void> {
  const settingsPath = getSettingsPath(scope, cwd);
  let settings: Record<string, any>;
  try {
    settings = JSON.parse(await readFile(settingsPath, "utf-8"));
  } catch {
    settings = {};
  }

  // Find all items that are disabled (either directly or via group path)
  const disabledItems = allItems.filter(item =>
    config.disabled.some(d => item.relativePath === d || item.relativePath.startsWith(d + "/"))
  );

  // Build exclusion entries per settings key
  const keyMap: Record<string, string> = {
    skill: "skills",
    extension: "extensions",
    agent: "agents",
  };

  const exclusions: Record<string, Set<string>> = {
    skills: new Set(),
    extensions: new Set(),
    agents: new Set(),
  };

  for (const item of disabledItems) {
    const key = keyMap[item.type];
    exclusions[key].add(`${MANAGED_PREFIX}${item.relativePath}`);
  }

  // Update each array: strip old managed exclusions, add new ones
  for (const key of ["skills", "extensions", "agents"]) {
    if (!settings[key] && exclusions[key].size === 0) continue;
    if (!settings[key]) settings[key] = [];

    const base = (settings[key] as string[]).filter(
      (e: string) => !e.startsWith(MANAGED_PREFIX)
    );
    const sorted = [...exclusions[key]].sort();
    settings[key] = [...base, ...sorted];
  }

  await mkdir(dirname(settingsPath), { recursive: true });
  await writeFile(settingsPath, JSON.stringify(settings, null, 2) + "\n", "utf-8");
}

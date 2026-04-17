import { readFile, writeFile, mkdir } from "fs/promises";
import { homedir } from "os";
import { join, dirname } from "path";
import type { ComponentItem } from "./discovery.ts";
import type { ToggleConfig } from "./config.ts";

/**
 * Managed entries written by this extension all live under the absolute
 * my-pi checkout dir. We tag them so we can safely rewrite them on every
 * apply without clobbering user-authored entries.
 *
 * IMPORTANT: pi-mono's package-manager does NOT expand `~/` for pattern
 * entries (entries starting with `!`, `+`, `-`, or containing `*`/`?`) —
 * only plain entries are run through the path resolver. A pattern like
 * `-~/.my-pi/foo` therefore never matches any real file path and the
 * force-exclude silently fails. We sidestep this by writing absolute paths.
 *
 * Resource-type semantics differ in pi-mono:
 *   skills      — auto-discovery collects SKILL.md files. `-<abs-dir>`
 *                 force-exclude matches via the SKILL.md parent-dir fallback
 *                 in matchesAnyExactPattern.
 *   extensions  — auto-discovery collects index.ts/index.js/file.ts paths.
 *                 There is no parent-dir fallback for non-SKILL files, so a
 *                 bare `-<abs-dir>` pattern never matches. We therefore emit
 *                 glob excludes that cover both `dir/index.ts` and direct
 *                 `dir.ts` extension layouts:
 *                   !<abs>/**     (subdir extensions with index.ts)
 *                   !<abs>.ts     (single-file .ts extensions)
 *                   !<abs>.js     (single-file .js extensions)
 *   agents      — pi-mono itself ignores `settings.agents`. Our subagent
 *                 extension reads that array and has been extended to honor
 *                 `-<abs-path>` entries as agent-level exclusions.
 *
 * Legacy `-~/.my-pi/...` and `!~/.my-pi/...` tokens (from earlier versions
 * of this writer) are still recognized on read so stale entries get rewritten
 * to the absolute-path form on the next apply.
 */
const MY_PI_DIR = join(homedir(), ".my-pi");
const LEGACY_MANAGED_PREFIXES = ["-~/.my-pi/", "!~/.my-pi/"];
const MANAGED_ABS_ROOTS = [`-${MY_PI_DIR}/`, `!${MY_PI_DIR}/`];

function isManagedEntry(entry: string): boolean {
  return (
    LEGACY_MANAGED_PREFIXES.some((p) => entry.startsWith(p)) ||
    MANAGED_ABS_ROOTS.some((p) => entry.startsWith(p))
  );
}

function getSettingsPath(scope: "global" | "project", cwd?: string): string {
  if (scope === "global") return join(homedir(), ".pi", "agent", "settings.json");
  return join(cwd!, ".pi", "settings.json");
}

function exclusionsFor(item: ComponentItem): string[] {
  const abs = `${MY_PI_DIR}/${item.relativePath}`;
  switch (item.type) {
    case "skill":
      // `-<dir>` with exact force-exclude matches via SKILL.md parent-dir fallback.
      return [`-${abs}`];
    case "extension":
      // Cover both layouts: <dir>/index.{ts,js} and <dir>.{ts,js}.
      return [`!${abs}/**`, `!${abs}.ts`, `!${abs}.js`];
    case "agent":
      // Honored by our subagent extension (pi-mono ignores settings.agents).
      return [`-${abs}`];
  }
}

/**
 * Apply toggle config to settings.json by adding/removing exclusion entries.
 * Only touches entries in our managed namespace — user-authored entries are
 * preserved verbatim.
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
  const disabledItems = allItems.filter((item) =>
    config.disabled.some((d) => item.relativePath === d || item.relativePath.startsWith(d + "/")),
  );

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
    for (const entry of exclusionsFor(item)) {
      exclusions[key].add(entry);
    }
  }

  // Update each array: strip old managed exclusions, then append the freshly
  // computed set sorted for stable diffs.
  for (const key of ["skills", "extensions", "agents"]) {
    if (!settings[key] && exclusions[key].size === 0) continue;
    if (!settings[key]) settings[key] = [];

    const base = (settings[key] as string[]).filter((e: string) => !isManagedEntry(e));
    const sorted = [...exclusions[key]].sort();
    settings[key] = [...base, ...sorted];
  }

  await mkdir(dirname(settingsPath), { recursive: true });
  await writeFile(settingsPath, JSON.stringify(settings, null, 2) + "\n", "utf-8");
}

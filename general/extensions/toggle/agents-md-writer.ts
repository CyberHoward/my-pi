import { readFile, writeFile, mkdir } from "fs/promises";
import { homedir } from "os";
import { join, dirname } from "path";
import type { ComponentItem } from "./discovery.ts";
import type { ToggleConfig } from "./config.ts";
import { isDisabled } from "./config.ts";

// ============================================================================
// Constants
// ============================================================================

const MANAGED_START = "<!-- toggle-managed-start -->";
const MANAGED_END = "<!-- toggle-managed-end -->";
const MANAGED_SECTION_RE =
  /\n## Disabled Components[^\n]*\n<!-- toggle-managed-start -->[\s\S]*?<!-- toggle-managed-end -->\n?/;

// ============================================================================
// Helpers
// ============================================================================

function getAgentsMdPath(scope: "global" | "project", cwd?: string): string {
  if (scope === "global") return join(homedir(), ".pi", "agent", "AGENTS.md");
  // Pi walks up from cwd looking for AGENTS.md — write to the project root.
  return join(cwd!, "AGENTS.md");
}

function buildManagedSection(
  disabledItems: ComponentItem[],
  scope: "global" | "project"
): string {
  if (disabledItems.length === 0) return "";

  const byType: Record<string, string[]> = {
    extension: [],
    skill: [],
    agent: [],
  };

  for (const item of disabledItems) {
    byType[item.type].push(item.name);
  }

  const heading =
    scope === "project"
      ? "## Disabled Components (Project Overrides)"
      : "## Disabled Components";

  const lines: string[] = [
    "",
    heading,
    MANAGED_START,
    "The following components are currently disabled via `/toggle` and are **not available** in this session:",
    "",
  ];

  if (byType.extension.length > 0) {
    lines.push(`**Extensions:** ${byType.extension.sort().join(", ")}  `);
  }
  if (byType.skill.length > 0) {
    lines.push(`**Skills:** ${byType.skill.sort().join(", ")}  `);
  }
  if (byType.agent.length > 0) {
    lines.push(`**Agents:** ${byType.agent.sort().join(", ")}  `);
  }

  lines.push("", MANAGED_END);

  return lines.join("\n");
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Update the AGENTS.md file for the given scope to reflect the current toggle
 * config. Maintains a managed section bounded by HTML comment markers so it
 * can be safely rewritten on every apply without touching hand-authored content.
 *
 * - Global scope  → ~/.pi/agent/AGENTS.md
 * - Project scope → {cwd}/AGENTS.md  (pi walks up from cwd to find AGENTS.md)
 *
 * If nothing is disabled the managed section is removed entirely, leaving the
 * file in a clean state.
 */
export async function updateAgentsMd(
  config: ToggleConfig,
  allItems: ComponentItem[],
  scope: "global" | "project",
  cwd?: string
): Promise<void> {
  const agentsMdPath = getAgentsMdPath(scope, cwd);

  // Read existing content (may not exist yet for project scope).
  let existing = "";
  try {
    existing = await readFile(agentsMdPath, "utf-8");
  } catch {
    // File doesn't exist — only proceed for project scope if there are
    // disabled items worth documenting, to avoid creating empty files.
    if (scope === "project") {
      const disabled = allItems.filter((i) => isDisabled(config, i.relativePath));
      if (disabled.length === 0) return;
    }
  }

  // Strip existing managed section (idempotent).
  const stripped = existing.replace(MANAGED_SECTION_RE, "").trimEnd();

  // Compute disabled items for this scope.
  const disabledItems = allItems.filter((i) => isDisabled(config, i.relativePath));

  // Build new section (empty string if nothing disabled).
  const managed = buildManagedSection(disabledItems, scope);

  const newContent = managed ? stripped + "\n" + managed + "\n" : stripped + "\n";

  await mkdir(dirname(agentsMdPath), { recursive: true });
  await writeFile(agentsMdPath, newContent, "utf-8");
}

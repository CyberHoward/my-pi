# Component Toggle Dashboard — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** A `/toggle` command extension with a polished TUI dashboard for enabling/disabling skills, extensions, and agents in `~/.my-pi`.

**Architecture:** A single extension (`~/.my-pi/general/extensions/toggle/index.ts`) that discovers components by scanning `~/.my-pi`, presents them in a categorized `SettingsList` with group toggles, persists disabled items to `toggle-config.json`, and applies changes by managing exclusion entries in `settings.json` + calling `ctx.reload()`.

**Tech Stack:** TypeScript, `@mariozechner/pi-tui` (SettingsList, Container, Text), `@mariozechner/pi-coding-agent` (ExtensionAPI, getSettingsListTheme, DynamicBorder), `node:fs`, `node:path`.

**Reference files:**
- Extension example: `~/.my-pi/general/extensions/todo.ts` (simple extension)
- SettingsList example: see pi docs `examples/extensions/tools.ts`
- Current settings: `~/.pi/agent/settings.json`
- TUI docs: pi docs `docs/tui.md` (SettingsList pattern, theming, key handling)
- Extension docs: pi docs `docs/extensions.md` (registerCommand, ctx.reload, ctx.ui.custom)
- Settings docs: pi docs `docs/settings.md` (exclusion patterns with `-path`)

---

### Task 1: Scaffold the extension directory

**Files:**
- Create: `~/.my-pi/general/extensions/toggle/index.ts`

**Step 1: Create the extension entry point with minimal skeleton**

```typescript
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function toggleExtension(pi: ExtensionAPI) {
  pi.registerCommand("toggle", {
    description: "Toggle skills, extensions, and agents on/off",
    handler: async (args, ctx) => {
      ctx.ui.notify("Toggle dashboard coming soon", "info");
    },
  });
}
```

**Step 2: Verify it loads**

Run: `cd ~ && pi`
Then type: `/toggle`
Expected: Notification "Toggle dashboard coming soon"

**Step 3: Commit**

```bash
cd ~/.my-pi && git add general/extensions/toggle/index.ts
git commit -m "feat: scaffold toggle extension"
```

---

### Task 2: Component discovery

Discover all skills, extensions, and agents under `~/.my-pi`.

**Files:**
- Create: `~/.my-pi/general/extensions/toggle/discovery.ts`

**Step 1: Define types and write discovery functions**

```typescript
import { readdir, readFile, stat } from "node:fs/promises";
import { join, basename, relative } from "node:path";

export interface ComponentItem {
  /** e.g. "engineering/skills/superpowers/brainstorming" */
  relativePath: string;
  /** Human-readable name, e.g. "brainstorming" */
  name: string;
  /** "skill" | "extension" | "agent" */
  type: "skill" | "extension" | "agent";
  /** Top-level category: "engineering" | "general" | "personal" */
  category: string;
  /** Sub-group within category, e.g. "superpowers" for superpowers skills */
  subGroup?: string;
  /** Description from SKILL.md frontmatter (skills only) */
  description?: string;
}

export interface ComponentGroup {
  id: string;
  label: string;
  children: (ComponentGroup | ComponentItem)[];
}

const MY_PI_DIR = join(process.env.HOME!, ".my-pi");

export async function discoverComponents(): Promise<ComponentItem[]> { ... }

export function buildGroupTree(items: ComponentItem[]): ComponentGroup[] { ... }
```

Discovery logic:
- Walk `~/.my-pi/{engineering,general,personal}` looking for:
  - `**/SKILL.md` → skill (parse frontmatter for name + description)
  - `*/extensions/*.ts` or `*/extensions/*/index.ts` → extension
  - `*/agents/*.md` (not `.gitkeep`) → agent
- Skip `node_modules`, `.git`, `pi-remote`
- For skills under `engineering/skills/superpowers/`, set `subGroup: "superpowers"`
- Return flat list of `ComponentItem`

`buildGroupTree()` organizes the flat list into nested `ComponentGroup[]`:
- Top level: engineering, general, personal
- Second level: agents, extensions, skills (and superpowers as sub-group of skills)

**Step 2: Parse SKILL.md frontmatter**

Simple regex extraction — no YAML parser dependency needed:

```typescript
async function parseSkillFrontmatter(skillMdPath: string): Promise<{ name?: string; description?: string }> {
  const content = await readFile(skillMdPath, "utf-8");
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fm = match[1];
  const name = fm.match(/^name:\s*(.+)$/m)?.[1]?.trim().replace(/^["']|["']$/g, "");
  const description = fm.match(/^description:\s*["']?(.*?)["']?\s*$/m)?.[1]?.trim();
  return { name, description };
}
```

**Step 3: Test discovery manually**

Add a temporary test in `index.ts`:

```typescript
import { discoverComponents, buildGroupTree } from "./discovery.ts";

pi.registerCommand("toggle", {
  handler: async (_args, ctx) => {
    const items = await discoverComponents();
    ctx.ui.notify(`Found ${items.length} components`, "info");
    console.log(JSON.stringify(buildGroupTree(items), null, 2));
  },
});
```

Run: `pi` then `/toggle`
Expected: Notification with count ~28 components, tree structure in console.

**Step 4: Commit**

```bash
cd ~/.my-pi && git add general/extensions/toggle/discovery.ts general/extensions/toggle/index.ts
git commit -m "feat(toggle): component discovery with group tree"
```

---

### Task 3: Config file read/write

Manage `toggle-config.json` for both global and per-project scopes.

**Files:**
- Create: `~/.my-pi/general/extensions/toggle/config.ts`

**Step 1: Define config types and I/O functions**

```typescript
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

export function isDisabled(config: ToggleConfig, relativePath: string): boolean {
  return config.disabled.some(d => relativePath === d || relativePath.startsWith(d + "/"));
}

export function toggleItem(config: ToggleConfig, relativePath: string, enabled: boolean): ToggleConfig {
  const disabled = new Set(config.disabled);
  if (enabled) {
    // Remove this path and any parent paths that would disable it
    disabled.delete(relativePath);
  } else {
    disabled.add(relativePath);
  }
  return { disabled: [...disabled].sort() };
}
```

**Step 2: Commit**

```bash
cd ~/.my-pi && git add general/extensions/toggle/config.ts
git commit -m "feat(toggle): config file read/write"
```

---

### Task 4: Settings.json updater

Apply toggle config to `settings.json` by managing `-path` exclusion entries.

**Files:**
- Create: `~/.my-pi/general/extensions/toggle/settings-writer.ts`

**Step 1: Write the settings updater**

Logic:
1. Read current `settings.json` (global or project)
2. For each array key (`skills`, `extensions`, `agents`):
   - Filter out all existing entries starting with `-~/.my-pi/` (toggle-managed exclusions)
   - Add new `-~/.my-pi/<path>` entries for each disabled item of that type
3. Write back

```typescript
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import type { ComponentItem } from "./discovery.ts";
import type { ToggleConfig } from "./config.ts";

const MY_PI_DIR = join(process.env.HOME!, ".my-pi");
const MANAGED_PREFIX = "-~/.my-pi/";

function getSettingsPath(scope: "global" | "project", cwd?: string): string {
  if (scope === "global") return join(process.env.HOME!, ".pi", "agent", "settings.json");
  return join(cwd!, ".pi", "settings.json");
}

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

  // Build exclusion entries per type
  const exclusions: Record<string, string[]> = { skills: [], extensions: [], agents: [] };
  for (const disabledPath of config.disabled) {
    // Find matching items to determine type
    const matchingItems = allItems.filter(
      item => item.relativePath === disabledPath || item.relativePath.startsWith(disabledPath + "/")
    );
    for (const item of matchingItems) {
      const key = item.type === "skill" ? "skills" : item.type === "extension" ? "extensions" : "agents";
      const excl = `${MANAGED_PREFIX}${item.relativePath}`;
      if (!exclusions[key].includes(excl)) exclusions[key].push(excl);
    }
    // If disabledPath matches a group (no direct item), still add exclusion for items under it
    if (matchingItems.length === 0) {
      // Could be a group path like "engineering/skills/superpowers" — items will be found above
      // Or "engineering" — need to add exclusions for all items under it
      for (const item of allItems) {
        if (item.relativePath.startsWith(disabledPath + "/") || item.relativePath === disabledPath) {
          const key = item.type === "skill" ? "skills" : item.type === "extension" ? "extensions" : "agents";
          const excl = `${MANAGED_PREFIX}${item.relativePath}`;
          if (!exclusions[key].includes(excl)) exclusions[key].push(excl);
        }
      }
    }
  }

  // Update each array: strip old managed exclusions, add new ones
  for (const key of ["skills", "extensions", "agents"]) {
    if (!settings[key]) continue;
    const base = (settings[key] as string[]).filter((e: string) => !e.startsWith(MANAGED_PREFIX));
    settings[key] = [...base, ...exclusions[key].sort()];
  }

  await mkdir(dirname(settingsPath), { recursive: true });
  await writeFile(settingsPath, JSON.stringify(settings, null, 2) + "\n", "utf-8");
}
```

**Step 2: Commit**

```bash
cd ~/.my-pi && git add general/extensions/toggle/settings-writer.ts
git commit -m "feat(toggle): settings.json exclusion writer"
```

---

### Task 5: TUI dashboard component

Build the full `/toggle` UI with `SettingsList`, group toggles, scope switching.

**Files:**
- Modify: `~/.my-pi/general/extensions/toggle/index.ts`
- Create: `~/.my-pi/general/extensions/toggle/ui.ts`

**Step 1: Build the SettingsList items from discovery + config**

In `ui.ts`, create a function that converts the group tree + config into a flat `SettingItem[]` list with visual indentation and group items:

```typescript
import type { SettingItem } from "@mariozechner/pi-tui";
import type { ComponentItem, ComponentGroup } from "./discovery.ts";
import type { ToggleConfig } from "./config.ts";

interface ToggleSettingItem extends SettingItem {
  /** The items this group controls (empty for leaf items) */
  childIds?: string[];
}

export function buildSettingItems(
  groups: ComponentGroup[],
  allItems: ComponentItem[],
  config: ToggleConfig,
): ToggleSettingItem[] {
  // Flatten the group tree into SettingItem[] with:
  // - Group items: id = group path, label with "▸" prefix + dots, values = ["enabled", "disabled"]
  //   currentValue derived from children states (all enabled → enabled, all disabled → disabled, mixed → partial)
  // - Leaf items: id = relativePath, label indented with spaces, values = ["enabled", "disabled"]
  //   currentValue from config
  // Groups get childIds array to enable cascading
}
```

Values for groups: `["enabled", "disabled"]` (partial shown read-only but toggling goes to the opposite extreme).

**Step 2: Build the custom UI component**

In `ui.ts`, create the main TUI factory:

```typescript
import { Container, SettingsList, Text } from "@mariozechner/pi-tui";
import { DynamicBorder, getSettingsListTheme } from "@mariozechner/pi-coding-agent";
import { matchesKey } from "@mariozechner/pi-tui";

export function createToggleUI(
  tui: any,
  theme: any,
  done: (result: any) => void,
  options: {
    items: ToggleSettingItem[];
    scope: "global" | "project";
    hasProject: boolean;
    onToggle: (id: string, newValue: string) => void;
    onScopeChange: (scope: "global" | "project") => void;
  },
) {
  const container = new Container();

  // Title bar with scope indicator
  container.addChild(new DynamicBorder((s: string) => theme.fg("accent", s)));
  const scopeLabel = options.scope === "global" ? "global" : "project";
  container.addChild(new Text(
    theme.fg("accent", theme.bold(" Component Toggle")) +
    theme.fg("muted", `  (${scopeLabel})`),
    1, 0,
  ));

  // SettingsList
  const maxVisible = Math.min(options.items.length + 2, 20);
  const settingsList = new SettingsList(
    options.items,
    maxVisible,
    getSettingsListTheme(),
    (id, newValue) => options.onToggle(id, newValue),
    () => done(null),
    { enableSearch: true },
  );
  container.addChild(settingsList);

  // Help text
  const helpParts = ["↑↓ navigate", "←→ toggle", "/ search"];
  if (options.hasProject) helpParts.push("g global", "p project");
  helpParts.push("esc close");
  container.addChild(new Text(theme.fg("dim", " " + helpParts.join(" • ")), 1, 0));
  container.addChild(new DynamicBorder((s: string) => theme.fg("accent", s)));

  return {
    render: (w: number) => container.render(w),
    invalidate: () => container.invalidate(),
    handleInput: (data: string) => {
      // Scope switching: g for global, p for project
      if (options.hasProject && matchesKey(data, "g")) {
        options.onScopeChange("global");
        return;
      }
      if (options.hasProject && matchesKey(data, "p")) {
        options.onScopeChange("project");
        return;
      }
      settingsList.handleInput?.(data);
      tui.requestRender();
    },
  };
}
```

**Step 3: Wire everything together in index.ts**

The `/toggle` command handler:

1. Discover components
2. Load config for current scope
3. Build setting items
4. Show TUI
5. On toggle: update config, rebuild items, apply to settings.json
6. On close: call `ctx.reload()`

```typescript
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { discoverComponents, buildGroupTree } from "./discovery.ts";
import { loadConfig, saveConfig, isDisabled, toggleItem } from "./config.ts";
import { applyToggleConfig } from "./settings-writer.ts";
import { buildSettingItems, createToggleUI } from "./ui.ts";
import { existsSync } from "node:fs";
import { join } from "node:path";

export default function toggleExtension(pi: ExtensionAPI) {
  pi.registerCommand("toggle", {
    description: "Toggle skills, extensions, and agents on/off",
    handler: async (args, ctx) => {
      let scope: "global" | "project" = args?.trim() === "project" ? "project" : "global";
      const hasProject = existsSync(join(ctx.cwd, ".pi"));
      let changed = false;

      const allItems = await discoverComponents();
      const groups = buildGroupTree(allItems);

      async function showUI(currentScope: "global" | "project") {
        scope = currentScope;
        const config = await loadConfig(scope, ctx.cwd);
        const settingItems = buildSettingItems(groups, allItems, config);

        await ctx.ui.custom((tui, theme, _kb, done) => {
          return createToggleUI(tui, theme, done, {
            items: settingItems,
            scope,
            hasProject,
            onToggle: async (id, newValue) => {
              // Find the item or group
              const item = settingItems.find(s => s.id === id);
              if (!item) return;

              let newConfig = await loadConfig(scope, ctx.cwd);
              const enabled = newValue === "enabled";

              if (item.childIds?.length) {
                // Group toggle: cascade to all children
                for (const childId of item.childIds) {
                  newConfig = toggleItem(newConfig, childId, enabled);
                }
              } else {
                newConfig = toggleItem(newConfig, id, enabled);
              }

              await saveConfig(newConfig, scope, ctx.cwd);
              await applyToggleConfig(newConfig, allItems, scope, ctx.cwd);
              changed = true;

              // Rebuild and re-show
              done(null);
            },
            onScopeChange: (newScope) => {
              done({ switchScope: newScope });
            },
          });
        });
      }

      // UI loop: re-show after each toggle or scope change
      let result: any = null;
      do {
        result = await showUI(scope);
        if (result?.switchScope) {
          scope = result.switchScope;
        }
      } while (result !== null);

      // Reload if anything changed
      if (changed) {
        await ctx.reload();
      }
    },
  });
}
```

**Step 4: Commit**

```bash
cd ~/.my-pi && git add general/extensions/toggle/
git commit -m "feat(toggle): TUI dashboard with group toggles and scope switching"
```

---

### Task 6: Polish and edge cases

**Files:**
- Modify: `~/.my-pi/general/extensions/toggle/index.ts`
- Modify: `~/.my-pi/general/extensions/toggle/ui.ts`
- Modify: `~/.my-pi/general/extensions/toggle/settings-writer.ts`

**Step 1: Handle group toggle display states**

When a group has mixed children (some enabled, some disabled), show `[partial]` and make toggling go to the opposite of majority. Add `partial` as a display-only value with distinct styling.

**Step 2: Show descriptions in SettingsList**

Use the `description` field of `SettingItem` to show skill descriptions (truncated) and component types for extensions/agents.

**Step 3: Handle edge case — project scope without existing .pi/settings.json**

If no `.pi/settings.json` exists, create one with minimal content (just the exclusion arrays copied from global).

**Step 4: Handle edge case — toggle extension toggling itself**

Prevent the toggle extension from being disabled (filter it from the list or show it as `[locked]`).

**Step 5: Add autocomplete for `/toggle` args**

```typescript
pi.registerCommand("toggle", {
  description: "Toggle skills, extensions, and agents on/off",
  getArgumentCompletions: (prefix: string) => {
    const items = [
      { value: "project", label: "project", description: "Edit project-level toggles" },
    ];
    return items.filter(i => i.value.startsWith(prefix));
  },
  handler: async (args, ctx) => { ... },
});
```

**Step 6: Test full flow**

1. Run `pi` → `/toggle`
2. Disable a skill (e.g., `writing-skills`)
3. Verify `~/.my-pi/toggle-config.json` has the entry
4. Verify `~/.pi/agent/settings.json` has `-~/.my-pi/engineering/skills/superpowers/writing-skills`
5. Verify the skill no longer appears in system prompt
6. Re-enable it, verify exclusion removed
7. Test group toggle (disable all of engineering)
8. Test project scope: navigate to a project, `/toggle project`

**Step 7: Commit**

```bash
cd ~/.my-pi && git add general/extensions/toggle/
git commit -m "feat(toggle): polish, descriptions, edge cases"
```

---

### Task 7: Add gitignore and README

**Files:**
- Modify: `~/.my-pi/.gitignore`
- Create: `~/.my-pi/general/extensions/toggle/README.md`

**Step 1: Add toggle-config.json to gitignore**

Toggle config is personal preference — don't track in git.

```
toggle-config.json
```

**Step 2: Write README**

```markdown
# Toggle Dashboard

Interactive TUI for enabling/disabling skills, extensions, and agents.

## Usage

- `/toggle` — manage global component toggles
- `/toggle project` — manage project-level overrides

## Config

Disabled items stored in `~/.my-pi/toggle-config.json` (global) or `.pi/toggle-config.json` (project).

## How it works

Manages `-path` exclusion entries in `settings.json`. Your base paths are never modified.
```

**Step 3: Commit**

```bash
cd ~/.my-pi && git add .gitignore general/extensions/toggle/README.md
git commit -m "docs(toggle): README and gitignore"
```

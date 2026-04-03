# Component Toggle Dashboard — Design

## Goal

A polished TUI extension (`/toggle`) that lets users enable/disable skills, extensions, and agents in `~/.my-pi` with group toggles, search, and per-project overrides.

## Architecture

A pi extension at `~/.my-pi/general/extensions/toggle/index.ts` that:
1. **Discovers** all components by scanning `~/.my-pi` for `SKILL.md`, extension entry points, and agent `.md` files
2. **Renders** a categorized `SettingsList` with group headers that act as toggles
3. **Persists** disabled items to a config file (`toggle-config.json`)
4. **Applies** changes by rewriting `settings.json` exclusion entries and calling `ctx.reload()`

## Component Groups

The TUI organizes items into a tree reflected as a flat `SettingsList` with indentation:

```
Component Toggle (global)            [scope: global ↔ project]

▸ Engineering ·························· [enabled]
    ▸ Agents ··························· [enabled]
        planner                          [enabled]
        reviewer                         [enabled]
        scout                            [enabled]
        worker                           [enabled]
        remover                          [enabled]
        tooling-researcher               [enabled]
    ▸ Extensions ······················· [enabled]
        code-ast                         [enabled]
    ▸ Skills ··························· [enabled]
        codebase-coach                   [enabled]
        codebase-comprehension           [enabled]
    ▸ Superpowers ····················· [enabled]
        brainstorming                    [enabled]
        ...14 more skills...
▸ General ····························· [enabled]
    ▸ Extensions ······················ [enabled]
        comprehension-tools              [enabled]
        memory                           [enabled]
        notifications                    [enabled]
        subagent                         [enabled]
        todo                             [enabled]
    ▸ Skills ·························· [enabled]
        brave-search                     [enabled]
        browser-tools                    [enabled]
▸ Personal ···························· [enabled]
    ▸ Extensions ······················ [enabled]
        ticktick                         [enabled]
    ▸ Skills ·························· [enabled]
        ticktick                         [enabled]

↑↓ navigate • ←→ toggle • / search • g/p scope • esc close
```

### Group Toggle Behavior

- Toggling a group item (e.g., `Engineering`) cascades to all children
- A group shows `[enabled]` if all children enabled, `[disabled]` if all disabled, `[partial]` if mixed
- Groups: top-level categories, type sub-groups (Agents/Extensions/Skills), and `Superpowers` as a special sub-group

## Config File

`~/.my-pi/toggle-config.json` (global):

```json
{
  "disabled": [
    "engineering/skills/superpowers/writing-skills",
    "engineering/agents/remover",
    "personal/extensions/ticktick"
  ]
}
```

Per-project: `.pi/toggle-config.json`:

```json
{
  "disabled": [
    "personal/skills/ticktick",
    "personal/extensions/ticktick",
    "engineering/skills/superpowers"
  ]
}
```

Paths are relative to `~/.my-pi/` — simple, grep-friendly, human-editable.

## Settings.json Modification

The extension manages exclusion entries in `settings.json` without touching base paths.

**Before (user's base config):**
```json
{
  "skills": [
    "~/.my-pi/engineering/skills",
    "~/.my-pi/general/skills",
    "~/.my-pi/personal/skills"
  ]
}
```

**After disabling `brainstorming` and `ticktick` skill:**
```json
{
  "skills": [
    "~/.my-pi/engineering/skills",
    "~/.my-pi/general/skills",
    "~/.my-pi/personal/skills",
    "-~/.my-pi/engineering/skills/superpowers/brainstorming",
    "-~/.my-pi/personal/skills/ticktick"
  ]
}
```

The extension:
1. Reads current `settings.json`
2. Strips any existing `-~/.my-pi/` exclusion entries (ones it manages)
3. Adds new `-path` entries for each disabled item
4. Writes back and calls `ctx.reload()`

A `"_toggleManaged": true` marker comment in the exclusion entries isn't possible in JSON, so instead the extension only manages entries matching the pattern `-~/.my-pi/...` — user exclusions using other patterns are left alone.

## Scope: Global vs Project

- `/toggle` defaults to global (`~/.pi/agent/settings.json` + `~/.my-pi/toggle-config.json`)
- `/toggle project` targets current project (`.pi/settings.json` + `.pi/toggle-config.json`)
- A `g`/`p` keybinding switches scope in the TUI
- Project scope shows items as `[global]` / `[project: enabled]` / `[project: disabled]` to indicate inheritance

## Discovery

Scan `~/.my-pi` for:
- **Skills**: directories containing `SKILL.md` (recursive, skip `node_modules/.git`)
- **Extensions**: `*.ts` files or `*/index.ts` in `*/extensions/` directories
- **Agents**: `*.md` files in `*/agents/` directories (skip `.gitkeep`)

Extract names from:
- Skills: frontmatter `name` field from `SKILL.md`
- Extensions: directory name or filename (minus `.ts`)
- Agents: filename (minus `.md`)

## Tech Stack

- `@mariozechner/pi-tui`: `SettingsList`, `Container`, `Text`, `matchesKey`
- `@mariozechner/pi-coding-agent`: `ExtensionAPI`, `getSettingsListTheme`, `DynamicBorder`
- `node:fs/promises` for config/settings file I/O
- `node:path` for path resolution

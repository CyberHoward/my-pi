# Toggle Dashboard

Interactive TUI for enabling/disabling skills, extensions, and agents in `~/.my-pi`.

## Usage

```
/toggle           # Manage global component toggles
/toggle project   # Manage project-level overrides (when in a project with .pi/)
```

### Controls

| Key | Action |
|-----|--------|
| ↑↓ | Navigate |
| ←→ / Enter | Toggle enabled/disabled |
| / | Search/filter |
| Tab | Switch between global and project scope |
| Esc | Close (applies changes via reload) |

### Group Toggles

Top-level categories (Engineering, General, Personal) and sub-groups (Agents, Extensions, Skills, Superpowers) act as group toggles — toggling them cascades to all children.

Mixed groups show the count of enabled items (e.g., "3/5 enabled").

## Config

Disabled items are stored in:
- **Global:** `~/.my-pi/toggle-config.json`
- **Project:** `.pi/toggle-config.json`

Example:
```json
{
  "disabled": [
    "engineering/agents/remover",
    "engineering/skills/superpowers/writing-skills"
  ]
}
```

## How It Works

Two things happen on every toggle:

### 1. Exclusion entries in `settings.json`

The extension manages `-path` exclusion entries in `settings.json` (global or project). Your base paths are never modified — only exclusion lines are added/removed. This is what actually prevents disabled components from loading.

### 2. Project `AGENTS.md` assembly (project scope only)

Each component in `~/.my-pi` can ship a `SNIPPET.md` that documents it for the agent ("you have tool X, use it when Y"). When you run `/toggle project`, the extension:

1. Collects `SNIPPET.md` from every **enabled** extension and skill
2. Synthesizes a one-liner per **enabled** agent from its `.md` frontmatter (`description` + `model`)
3. Writes a managed block to `{cwd}/AGENTS.md` bounded by `<!-- toggle-managed-start -->` / `<!-- toggle-managed-end -->` markers

Pi walks up from `cwd` looking for `AGENTS.md`, so the assembled file gets picked up automatically at next reload. Content outside the managed markers is preserved verbatim — edit freely above or below. If every component with a snippet is disabled, the managed block is removed entirely.

**Global scope does not write any AGENTS.md.** Tool documentation is project-specific by design — outside a project, the agent relies on pi's auto-registered tool descriptions and `SKILL.md` frontmatter alone.

### Snippet conventions

| Component layout | Snippet location |
|---|---|
| `<name>/` (directory) | `<name>/SNIPPET.md` |
| `<name>.ts` (single file extension) | `<name>.SNIPPET.md` (sibling) |
| `<name>.md` (agent) | None — synthesized from frontmatter |

Snippets should use `###` for their heading and be written in imperative voice addressing the agent (e.g. "Use this when…").

Changes are applied immediately via `ctx.reload()` when you close the dashboard.

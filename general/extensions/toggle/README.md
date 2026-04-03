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

The extension manages `-path` exclusion entries in `settings.json` (global or project). Your base paths are never modified — only exclusion lines are added/removed.

Changes are applied immediately via `ctx.reload()` when you close the dashboard.

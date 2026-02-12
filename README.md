# my-pi

Custom [pi](https://github.com/badlogic/pi-mono) extensions and skills.

## Structure

```
extensions/    # Pi extensions (auto-loaded via settings)
skills/        # Pi skills (auto-loaded via settings)
```

## Setup

Copy the example settings to your pi config:

```bash
cp ~/.my-pi/settings.example.json ~/.pi/agent/settings.json
```

Or merge into your existing `~/.pi/agent/settings.json`.

### Superpowers Skills

We use [superpowers](https://github.com/obra/superpowers) skills heavily. To set them up:

1. Install superpowers in Claude Code via the plugin marketplace:
   ```bash
   /plugin marketplace add obra/superpowers-marketplace
   /plugin install superpowers@superpowers-marketplace
   ```
2. Find your installed version:
   ```bash
   ls ~/.claude/plugins/cache/claude-plugins-official/superpowers/
   ```
3. Add the skills path to your `~/.pi/agent/settings.json`:
   ```json
   {
     "skills": [
       "~/.claude/plugins/cache/claude-plugins-official/superpowers/<VERSION>/skills"
     ]
   }
   ```
   Replace `<VERSION>` with your installed version (e.g. `4.2.0`).

See the [superpowers README](https://github.com/obra/superpowers) for full setup docs and workflow details.

## Extensions

### todo.ts

Markdown-based todo tracking with dependency support.

**Tools:** `todo_list`, `todo_add`, `todo_toggle`, `todo_remove`
**Command:** `/todos`

Features:
- Items can declare dependencies on other items by index
- Cannot complete an item until its dependencies are done
- Removing items automatically rewrites dependency indices
- State persists across session branches/forks
- Interactive TUI view via `/todos`

### subagent/

Delegate tasks to specialized subagents with isolated context windows. From pi's [built-in example](https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent/examples/extensions/subagent).

**Tool:** `subagent` (single, parallel, or chained execution)
**Prompts:** `/implement`, `/scout-and-plan`, `/implement-and-review`

Agents are defined as markdown files in `~/.pi/agent/agents/` (copy from `agents/` in this repo):

```bash
cp ~/.my-pi/agents/*.md ~/.pi/agent/agents/
```

| Agent | Purpose | Model |
|-------|---------|-------|
| `scout` | Fast codebase recon | Haiku 4.5 |
| `planner` | Implementation plans | Opus 4.6 |
| `reviewer` | Code review | Opus 4.6 |
| `worker` | General-purpose | Opus 4.6 |

Features:
- Each subagent runs in an isolated `pi` process (no context pollution)
- Parallel execution (up to 8 tasks, 4 concurrent)
- Chaining with `{previous}` placeholder for sequential pipelines
- Streaming output with live progress
- Works with superpowers' subagent-driven-development skill

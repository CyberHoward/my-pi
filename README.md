# my-pi

Custom [pi](https://github.com/badlogic/pi-mono) extensions, skills, and agents.

## Structure

```
AGENTS.md      # Global workflow preferences (copy to ~/.pi/agent/AGENTS.md)
SETUP.md       # Step-by-step setup instructions for pi to follow
extensions/    # Pi extensions (auto-loaded via settings)
skills/        # Pi skills (auto-loaded via settings)
agents/        # Subagent definitions (copy to ~/.pi/agent/agents/)
```

## Setup

### Quick Bootstrap

```bash
git clone https://github.com/noahsaso/my-pi ~/.my-pi
cd ~/.my-pi && pi "follow SETUP.md to setup"
```

### Manual Setup

#### 1. Settings

Copy the example settings to your pi config:

```bash
cp ~/.my-pi/settings.example.json ~/.pi/agent/settings.json
```

Or merge into your existing `~/.pi/agent/settings.json`.

#### 3. Agents

Copy agent definitions for the subagent extension:

```bash
mkdir -p ~/.pi/agent/agents
cp ~/.my-pi/agents/*.md ~/.pi/agent/agents/
```

#### 4. Pi Skills (web search + browser)

Install [pi-skills](https://github.com/badlogic/pi-skills) for web search and browser automation:

```bash
git clone https://github.com/badlogic/pi-skills ~/.pi/agent/skills/pi-skills
cd ~/.pi/agent/skills/pi-skills/brave-search && npm install
cd ~/.pi/agent/skills/pi-skills/browser-tools && npm install
```

Remove any skills you don't need (we only keep `brave-search` and `browser-tools`):

```bash
rm -rf ~/.pi/agent/skills/pi-skills/{gccli,gdcli,gmcli,transcribe,vscode,youtube-transcript}
```

#### 5. Environment Variables

Add to your shell profile (`~/.profile`, `~/.bashrc`, or `~/.zshrc`):

```bash
export BRAVE_API_KEY="your-brave-api-key"
```

Get a free Brave Search API key at https://api-dashboard.search.brave.com/register (requires a "Free AI" subscription).

#### 6. Superpowers Skills

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

## Skills (via pi-skills)

Installed from [badlogic/pi-skills](https://github.com/badlogic/pi-skills) into `~/.pi/agent/skills/pi-skills/`.

| Skill | Description | Requires |
|-------|-------------|----------|
| **brave-search** | Web search + page content extraction | `BRAVE_API_KEY` |
| **browser-tools** | Browser automation via Chrome DevTools Protocol | Chrome |

Usage: `/skill:brave-search "query"` or just ask naturally.

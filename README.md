# my-pi

Personal [pi](https://github.com/badlogic/pi-mono) dotfiles — extensions, skills, and agent configuration.

## Structure

```
AGENTS.md      # Global workflow preferences (copy to ~/.pi/agent/AGENTS.md)
SETUP.md       # Step-by-step setup instructions for pi to follow
extensions/    # Pi extensions (auto-loaded via settings)
skills/        # Pi skills (auto-loaded via settings)
agents/        # Subagent definitions (copy to ~/.pi/agent/agents/)
```

## Quick Start

```bash
git clone git@github.com:CyberHoward/my-pi.git ~/.my-pi
cd ~/.my-pi && pi "Read SETUP.md and walk me through setup."
```

## Extensions

### subagent/

Delegate tasks to specialized subagents with isolated context windows.

**Tool:** `subagent` (single, parallel, or chained execution)
**Prompts:** `/implement`, `/scout-and-plan`, `/implement-and-review`

| Agent | Purpose | Model |
|-------|---------|-------|
| `scout` | Fast codebase recon | Sonnet 4.6 |
| `planner` | Implementation plans | Opus 4.6 |
| `reviewer` | Code review | Opus 4.6 |
| `worker` | General-purpose | Opus 4.6 |

### code-ast/

TypeScript-aware code intelligence: find references, rename symbols, list declarations.

**Tools:** `ast_references`, `ast_rename`, `ast_symbols`

### notifications/

System notifications with a custom chime sound. Cross-platform (macOS + Linux).

**Tools:** `notify`, `ask_user`  
**Command:** `/ping`

### memory.ts

Persistent memory across sessions.

**Tools:** `memory_save`, `memory_search`, `memory_list`, `memory_remove`

## Skills

| Skill | Description | Requires |
|-------|-------------|----------|
| **brave-search** | Web search + page content extraction | `BRAVE_API_KEY` |
| **browser-tools** | Browser automation via Chrome DevTools Protocol | Chrome |

Superpowers skills (brainstorming, TDD, debugging, etc.) are loaded separately via the [superpowers](https://github.com/obra/superpowers) claude plugin.

## Environment Variables

```bash
export BRAVE_API_KEY="your-brave-api-key"
```

Get a free key at https://api-dashboard.search.brave.com/register

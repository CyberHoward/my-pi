# Pi Global Instructions

## Custom Extensions

You have these custom tools available via extensions (loaded from `~/.my-pi/extensions/`):

### Todo Tracking (`todo_list`, `todo_add`, `todo_toggle`, `todo_remove`)

Use these tools to track work items during complex tasks. They support dependencies between items.

- `todo_add` — Add items with optional `depends` array (one-based indices). Items can't be completed until deps are done.
- `todo_list` — Show all items with status and blocked info.
- `todo_toggle` — Mark items complete/incomplete (enforces dependency order).
- `todo_remove` — Remove items (dependency indices auto-adjust).
- `/todos` — Interactive TUI view.

Use todos proactively when working on multi-step tasks, implementation plans, or any work with natural ordering.

### Subagents (`subagent`)

Delegate tasks to specialized subagents with isolated context windows.

**Available agents:**
- `scout` (Haiku 4.5) — Fast codebase recon, returns structured findings for handoff
- `planner` (Opus 4.6) — Creates implementation plans from context
- `reviewer` (Opus 4.6) — Code review for quality and security
- `worker` (Opus 4.6) — General-purpose implementation with full tool access

**Modes:**
- Single: `{ agent: "scout", task: "find all auth code" }`
- Parallel: `{ tasks: [{ agent: "scout", task: "..." }, ...] }` (up to 8 tasks, 4 concurrent)
- Chain: `{ chain: [{ agent: "scout", task: "..." }, { agent: "planner", task: "Based on: {previous}" }] }`

**Workflow prompts:** `/implement`, `/scout-and-plan`, `/implement-and-review`

Use subagents for:
- Scouting unfamiliar codebases before planning
- Delegating independent implementation tasks
- Code review after completing work
- Parallel investigation of unrelated problems

## Skills

### Web Search (`/skill:brave-search`)

Search the web and extract page content. Use when you need current information, documentation, or facts.

```bash
# These scripts are in the skill directory — read the skill for full usage
search.js "query"                    # Basic search
search.js "query" --content          # Include page content
content.js https://example.com       # Extract page content
```

### Browser Automation (`/skill:browser-tools`)

Full browser automation via Chrome DevTools Protocol. Use for interacting with web pages, testing UIs, or scraping dynamic content. Read the skill for setup and usage.

## Prompt Templates

- `/bootstrap` — Set up a fresh pi instance with all custom extensions, skills, agents, and settings from `~/.my-pi`

## Workflow Preferences

- Use **superpowers skills** when available (brainstorming, writing-plans, subagent-driven-development, test-driven-development, etc.)
- Track multi-step work with **todo tools** — create todos at the start of complex tasks
- Use **subagents** for delegation — scout first, then plan, then implement
- Search the web with **brave-search** when you need current docs or information

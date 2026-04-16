# Pi Global Instructions

## Custom Extensions

You have these custom tools available via extensions (loaded from `~/.my-pi/extensions/`):

### Subagents (`subagent`)

Delegate tasks to specialized subagents with isolated context windows.

**Available agents:**
- `scout` (Sonnet 4.6) — Fast codebase recon, returns structured findings for handoff
- `planner` (Opus 4.6) — Creates implementation plans from context
- `reviewer` (Opus 4.6) — Code review for quality and security
- `worker` (Opus 4.6) — General-purpose implementation with full tool access
- `tooling-researcher` (Sonnet 4.5) — Deep-dives into tools/libraries, researches both official docs (via brave-search) and local codebase usage to produce teaching material

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

### Code AST (`ast_references`, `ast_rename`, `ast_symbols`)

TypeScript-aware code intelligence. Falls back to ripgrep for non-TS/JS files.

- `ast_references` — Find all references to a symbol
- `ast_rename` — Rename a symbol across the codebase (applies edits)
- `ast_symbols` — List all symbols in a file (functions, classes, types, etc.)

### Notifications (`notify`, `ask_user`)

System notifications with a custom chime sound. Cross-platform (macOS + Linux).

- `notify` — Send a system notification with optional chime sound
- `ask_user` — Play chime + notification + prompt user for input. **Use this when you need the user's attention.**
- `/ping` — Test the chime sound

### TickTick (`ticktick`)

Personal task management via TickTick. Use this for the user's personal tasks, todos, and project planning — **not** for agentic or coding task tracking.

- Actions: `list_projects`, `list_tasks`, `get_task`, `create_task`, `update_task`, `complete_task`, `uncomplete_task`, `delete_task`, `create_project`
- Supports natural language dates (`"tomorrow"`, `"next friday"`, `"in 3 days"`)
- Priority levels: `none`, `low`, `medium`, `high`
- If auth fails, tell the user to run `tickrs init` and see `~/.my-pi/extensions/ticktick/setup.md`

### Persistent Memory (`memory_save`, `memory_search`, `memory_list`, `memory_remove`)

Persistent memory across sessions. Memories are auto-injected into the system prompt.

- `memory_save` — Save a memory (project-scoped or global). Use `source: "correction"` when learning from mistakes.
- `memory_search` — Fuzzy search across memories
- `memory_list` — List all memories
- `memory_remove` — Remove a memory by ID

**When the user corrects you, proactively save the lesson using `memory_save` with `source: "correction"`.**

## Skills

### Web Search (`/skill:brave-search`)

Search the web and extract page content. Use when you need current information, documentation, or facts.

### Browser Automation (`/skill:browser-tools`)

Full browser automation via Chrome DevTools Protocol. Use for interacting with web pages, testing UIs, or scraping dynamic content.

### Context Management (`/skill:context-management`)

Git-like context management for long sessions. Use `/context` to view token usage dashboard.

## Workflow Preferences

- Use **superpowers skills** when available (brainstorming, writing-plans, subagent-driven-development, test-driven-development, etc.)
- Use **subagents** for delegation — scout first, then plan, then implement
- Search the web with **brave-search** when you need current docs or information

## Prompting Notes (Claude Opus 4.7)

Opus 4.7 interprets instructions literally and calibrates behavior per task rather than following fixed scaffolding. Adjust accordingly:

- **Be explicit about delegation.** 4.7 spawns fewer subagents by default. When a skill or workflow requires a subagent, state it as a requirement ("dispatch X"), not a suggestion ("consider using X").
- **Be explicit about tool use.** 4.7 reasons more and uses tools less. When a task needs tool calls (scout a codebase, run a verification command, search the web), say so directly.
- **Don't rely on inferred intent.** If you want a specific behavior, write it. 4.7 will not silently generalize from one item to another or infer requests you didn't make.
- **Skip progress scaffolding.** Don't add instructions like "summarize progress every N tool calls" — 4.7 produces user-facing progress updates natively in long agentic traces. If the update style is wrong, describe the desired style explicitly with examples.
- **Prefer positive examples over negative rules.** "Respond in 2-3 sentences with the file path" beats "Don't be verbose, don't add preamble, don't explain." Show the shape you want.
- **Raise effort for complex work.** At low/medium effort, 4.7 scopes tightly to what was asked. For genuinely complex reasoning, either raise effort or add "think carefully through this before responding" to the prompt.

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
- `scout` (Sonnet 4.6) — Fast codebase recon, returns structured findings for handoff
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

### Clipboard (`clipboard_read`, `clipboard_write`)

Read and write the system clipboard. Cross-platform (macOS + Linux). Not registered on unsupported platforms.

- `clipboard_read` — Read current clipboard contents
- `clipboard_write` — Write text to clipboard

### Notifications (`notify`, `ask_user`)

System notifications with a custom chime sound. Cross-platform (macOS + Linux).

- `notify` — Send a system notification with optional chime sound
- `ask_user` — Play chime + notification + prompt user for input. **Use this when you need the user's attention.**
- `/ping` — Test the chime sound

### File Watcher (`watch_start`, `watch_stop`, `watch_list`, `watch_events`)

Watch files and directories for changes. Changes are debounced and batched.

- `watch_start` — Start watching a path (supports recursive, glob patterns)
- `watch_stop` — Stop a watcher by ID
- `watch_list` — List active watchers
- `watch_events` — Get accumulated change events from a watcher

### Code AST (`ast_references`, `ast_rename`, `ast_symbols`)

TypeScript-aware code intelligence. Falls back to ripgrep for non-TS/JS files.

- `ast_references` — Find all references to a symbol
- `ast_rename` — Rename a symbol across the codebase (applies edits)
- `ast_symbols` — List all symbols in a file (functions, classes, types, etc.)

### Image Generation (`generate_image`)

Generate images via Google Antigravity (gemini-3-pro-image). Requires `/login` for google-antigravity.

### Persistent Memory (`memory_save`, `memory_search`, `memory_list`, `memory_remove`)

Persistent memory across sessions. Memories are auto-injected into the system prompt.

- `memory_save` — Save a memory (project-scoped or global). Use `source: "correction"` when learning from mistakes.
- `memory_search` — Fuzzy search across memories
- `memory_list` — List all memories
- `memory_remove` — Remove a memory by ID

**When the user corrects you, proactively save the lesson using `memory_save` with `source: "correction"`.**

Use memory for:
- Saving lessons learned from corrections/mistakes
- Remembering project conventions and preferences
- Storing decisions made during sessions

### Context Management (`/skill:context-management`)

Git-like context management for long sessions. Use `/context` to view token usage dashboard.

- `context_tag` — Create named milestones in conversation history
- `context_log` — Visualize conversation history and token usage
- `context_checkout` — Move HEAD to any tag/commit, compress completed tasks into summaries

Use context management for:
- Structuring long sessions with milestones
- Monitoring token usage
- Compressing completed work to free context space

## Workflow Preferences

- Use **superpowers skills** when available (brainstorming, writing-plans, subagent-driven-development, test-driven-development, etc.)
- Track multi-step work with **todo tools** — create todos at the start of complex tasks
- Use **subagents** for delegation — scout first, then plan, then implement
- Search the web with **brave-search** when you need current docs or information

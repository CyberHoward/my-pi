# Pi Global Instructions

## Workflow Preferences

- Use **superpowers skills** when available (brainstorming, writing-plans, subagent-driven-development, test-driven-development, etc.)
- Use **subagents** for delegation — scout first, then plan, then implement
- Search the web with **brave-search** when you need current docs or information; pair with **defuddle** to extract clean full-page content from result URLs
- **When the user corrects you, proactively save the lesson** using `memory_save` with `source: "correction"`.

## Tool Configuration

Tool, extension, and subagent availability is **project-specific** and assembled from per-component `SNIPPET.md` files.

- If you don't see an **Available Tools** section somewhere in your context files, the current project hasn't been configured yet (or you're not in a project). Tell the user they can run `/toggle project` in the project directory to pick which extensions, skills, and agents should be enabled there — this updates `.pi/settings.json` *and* writes a managed block into `{cwd}/AGENTS.md` with per-tool usage guidance.
- Extensions' tools and skills' `SKILL.md` frontmatter are still auto-registered by pi even without project configuration, so you can call them — but the rich "when to prefer X over Y" guidance only lives in the assembled project AGENTS.md.
- Do **not** hand-edit the `<!-- toggle-managed-start -->` … `<!-- toggle-managed-end -->` block in any AGENTS.md. Changes there get overwritten the next time `/toggle` runs.

## Prompting Notes (Claude Opus 4.7)

Opus 4.7 interprets instructions literally and calibrates behavior per task rather than following fixed scaffolding. Adjust accordingly:

- **Be explicit about delegation.** 4.7 spawns fewer subagents by default. When a skill or workflow requires a subagent, state it as a requirement ("dispatch X"), not a suggestion ("consider using X").
- **Be explicit about tool use.** 4.7 reasons more and uses tools less. When a task needs tool calls (scout a codebase, run a verification command, search the web), say so directly.
- **Don't rely on inferred intent.** If you want a specific behavior, write it. 4.7 will not silently generalize from one item to another or infer requests you didn't make.
- **Skip progress scaffolding.** Don't add instructions like "summarize progress every N tool calls" — 4.7 produces user-facing progress updates natively in long agentic traces. If the update style is wrong, describe the desired style explicitly with examples.
- **Prefer positive examples over negative rules.** "Respond in 2-3 sentences with the file path" beats "Don't be verbose, don't add preamble, don't explain." Show the shape you want.
- **Raise effort for complex work.** At low/medium effort, 4.7 scopes tightly to what was asked. For genuinely complex reasoning, either raise effort or add "think carefully through this before responding" to the prompt.

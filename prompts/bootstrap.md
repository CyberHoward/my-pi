---
description: Bootstrap a new pi instance with all custom extensions, skills, agents, and settings
---
Set up this pi instance with my custom configuration from ~/.my-pi.

Read ~/.my-pi/README.md and follow ALL setup steps:

1. Copy AGENTS.md to ~/.pi/agent/AGENTS.md
2. Copy settings.example.json to ~/.pi/agent/settings.json (merge if it already exists — preserve lastChangelogVersion and any existing keys, add the extensions/skills paths)
3. Copy agents/*.md to ~/.pi/agent/agents/
4. Copy workflow prompts from ~/.pi/agent/prompts/ (if not already present — check if the subagent extension's prompts dir exists)
5. Install pi-skills (git clone + npm install for brave-search and browser-tools, remove unwanted skills)
6. Install superpowers (show the Claude Code plugin commands and ask for the installed version to set the skills path)
7. Check if BRAVE_API_KEY is set in the environment — if not, ask for it and add to ~/.profile

After setup, run `pi --list-models 2>&1 | head -5` and list the loaded tools to verify everything works.

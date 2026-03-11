# Setup

Follow these steps to set up pi with this configuration.

## 1. Settings

Copy settings and global prompt:

```bash
mkdir -p ~/.pi/agent
cp ~/.my-pi/settings.example.json ~/.pi/agent/settings.json
cp ~/.my-pi/AGENTS.md ~/.pi/agent/AGENTS.md
```

If `~/.pi/agent/settings.json` already exists, merge in the `extensions` and `skills` arrays rather than overwriting.

## 2. Agents

Copy subagent definitions:

```bash
mkdir -p ~/.pi/agent/agents
cp ~/.my-pi/engineering/agents/*.md ~/.pi/agent/agents/
```

## 3. Skills

Install dependencies for the bundled skills:

```bash
cd ~/.my-pi/general/skills/brave-search && npm install
cd ~/.my-pi/general/skills/browser-tools && npm install
```

## 4. Extension Dependencies

Install npm dependencies for the code-ast extension:

```bash
cd ~/.my-pi/engineering/extensions/code-ast && npm install
```

## 5. Environment Variables

Check if `BRAVE_API_KEY` is set:

```bash
echo $BRAVE_API_KEY
```

If not set, ask the user for their key and add it to `~/.profile`:

```bash
export BRAVE_API_KEY="<key>"
```

Get a free Brave Search API key at https://api-dashboard.search.brave.com/register

## 6. Packages

Install npm packages listed in settings.json:

```bash
pi install npm:pi-context
```

## 7. Verify

Run `pi -p "list all available tools"` to confirm everything loaded.

## Directory Structure

```
~/.my-pi/
├── general/          # General-purpose tools (any context)
│   ├── agents/
│   ├── extensions/   # subagent, notifications, memory
│   └── skills/       # brave-search, browser-tools
├── engineering/      # Software engineering tools
│   ├── agents/       # scout, planner, reviewer, worker, remover
│   ├── extensions/   # code-ast
│   └── skills/       # superpowers
└── personal/         # Personal tools
    ├── agents/
    ├── extensions/
    └── skills/
```

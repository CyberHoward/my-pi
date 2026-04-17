# Setup

Follow these steps to set up pi with this configuration.

## 1. Settings

Copy settings once, then symlink the global prompt so edits in the repo flow through automatically:

```bash
mkdir -p ~/.pi/agent
cp ~/.my-pi/settings.example.json ~/.pi/agent/settings.json   # real copy — edit to taste
ln -sf ~/.my-pi/AGENTS.md ~/.pi/agent/AGENTS.md               # symlink — no drift
```

If `~/.pi/agent/settings.json` already exists, merge in the `extensions` and `skills` arrays rather than overwriting.

## 2. Agents

Symlink the whole agents directory so adding a new agent to the repo makes it immediately available to pi:

```bash
# Back up any existing copy first if you have one:
[ -d ~/.pi/agent/agents ] && [ ! -L ~/.pi/agent/agents ] && mv ~/.pi/agent/agents ~/.pi/agent/agents.bak
ln -sfn ~/.my-pi/engineering/agents ~/.pi/agent/agents
```

## 3. Skills

Install dependencies for the bundled skills:

```bash
cd ~/.my-pi/general/skills/brave-search && npm install
cd ~/.my-pi/general/skills/browser-tools && npm install
```

Install global CLIs used by skills:

```bash
# defuddle — clean web page extraction (general/skills/defuddle)
npm install -g defuddle

# obsidian CLI — required by personal/skills/obsidian-cli (optional if not using Obsidian)
npm install -g obsidian-cli
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

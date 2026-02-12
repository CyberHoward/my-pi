# Setup

Follow these steps to set up this pi instance.

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
cp ~/.my-pi/agents/*.md ~/.pi/agent/agents/
```

## 3. Pi Skills

Install web search and browser automation:

```bash
git clone https://github.com/badlogic/pi-skills ~/.pi/agent/skills/pi-skills
cd ~/.pi/agent/skills/pi-skills/brave-search && npm install
cd ~/.pi/agent/skills/pi-skills/browser-tools && npm install
rm -rf ~/.pi/agent/skills/pi-skills/{gccli,gdcli,gmcli,transcribe,vscode,youtube-transcript}
```

## 4. Environment Variables

Check if `BRAVE_API_KEY` is set:

```bash
echo $BRAVE_API_KEY
```

If not set, ask the user for their key and add it to `~/.profile`:

```bash
export BRAVE_API_KEY="<key>"
```

## 5. Superpowers

Show the user these Claude Code commands to install superpowers:

```
/plugin marketplace add obra/superpowers-marketplace
/plugin install superpowers@superpowers-marketplace
```

Then find the installed version:

```bash
ls ~/.claude/plugins/cache/claude-plugins-official/superpowers/
```

Add the skills path to `~/.pi/agent/settings.json`:

```json
{
  "skills": [
    "~/.claude/plugins/cache/claude-plugins-official/superpowers/<VERSION>/skills"
  ]
}
```

## 6. Verify

Run `pi -p "list all available tools"` to confirm everything loaded.

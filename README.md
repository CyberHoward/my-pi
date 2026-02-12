# my-pi

Custom [pi](https://github.com/badlogic/pi-mono) extensions and skills.

## Structure

```
extensions/    # Pi extensions (auto-loaded via settings)
skills/        # Pi skills (auto-loaded via settings)
```

## Setup

Copy the example settings to your pi config:

```bash
cp ~/.my-pi/settings.example.json ~/.pi/agent/settings.json
```

Or merge into your existing `~/.pi/agent/settings.json`.

### Superpowers Skills

We use [superpowers](https://github.com/obra/superpowers) skills heavily. To set them up:

1. Install superpowers in Claude Code (it caches to `~/.claude/plugins/cache/`)
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

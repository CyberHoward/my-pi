# my-pi

Custom [pi](https://github.com/badlogic/pi-mono) extensions and skills.

## Structure

```
extensions/    # Pi extensions (auto-loaded via settings)
skills/        # Pi skills (auto-loaded via settings)
```

## Setup

Add to `~/.pi/agent/settings.json`:

```json
{
  "extensions": ["~/.my-pi/extensions"],
  "skills": ["~/.my-pi/skills"]
}
```

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

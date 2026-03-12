# TickTick Skill + Config Tool Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a `ticktick_config` tool to the extension and create a workflow skill for inbox processing, weekly review, and quick capture.

**Architecture:** Extension gets one new tool (`ticktick_config`) that fetches Config project notes. New skill (`ticktick/SKILL.md`) contains all workflow instructions. Extension `promptGuidelines` are slimmed down.

**Tech Stack:** TypeScript (extension), Markdown (skill)

---

### Task 1: Add `ticktick_config` tool to extension

**Files:**
- Modify: `~/.my-pi/personal/extensions/ticktick/index.ts`

**Step 1: Add the `ticktick_config` action to the schema**

Add `"load_config"` to the `action` StringEnum array in `TickTickParams`.

**Step 2: Add the config case to `buildArgs`**

```typescript
case "load_config":
    args.push("task", "list", "--project-name", "Config");
    break;
```

**Step 3: Add config formatting to `formatResult`**

```typescript
case "load_config": {
    const tasks = Array.isArray(data?.tasks) ? data.tasks : Array.isArray(data) ? data : [];
    const notes = tasks.map((t: any) => ({
        title: t.title,
        content: t.content || "(empty)",
    }));
    return JSON.stringify(notes, null, 2);
}
```

**Step 4: Update the tool description**

Add `load_config` to the description string and `promptSnippet` so the LLM knows it exists.

**Step 5: Slim down `promptGuidelines`**

Replace current guidelines with:
```typescript
promptGuidelines: [
    "Use this tool for the user's personal task management — NOT for agentic/coding task tracking.",
    "Always provide the `project` parameter for task operations unless the user has set a default project.",
    "If authentication fails, tell the user to run `tickrs init` in their terminal and refer them to ~/.my-pi/extensions/ticktick/setup.md.",
],
```

(These are actually already the same — just confirm they match and no workflow guidance crept in.)

**Step 6: Test manually**

Run in pi: ask "load my ticktick config" and verify it returns all 5 Config notes with their content.

**Step 7: Commit**

```bash
cd ~/.my-pi && git add -A && git commit -m "feat(ticktick): add load_config action to fetch Config project notes"
```

---

### Task 2: Create the ticktick skill

**Files:**
- Create: `~/.my-pi/personal/skills/ticktick/SKILL.md`

**Step 1: Create the skill directory and SKILL.md**

Write the full SKILL.md with:
- Frontmatter (name, description)
- Config loading instructions
- Three workflow sections (inbox processing, weekly review, quick capture)
- Batch proposal format
- Ambiguity detection rules
- Priority assignment rules (Eisenhower via flags)
- Project move limitation note
- Tool usage reference

The full content:

```markdown
---
name: ticktick
description: "Personal task management workflows for TickTick. Use when the user wants to process their inbox, do a weekly review, capture tasks, triage, categorize, tag, or manage their task system. Also use when they mention tasks, todos, inbox, or weekly review."
---

# TickTick Task Management

## First Step — Always

Before ANY workflow, call the `ticktick` tool with `action: "load_config"` to fetch the full system configuration. This returns:
- **Tags** — prefixed tag taxonomy (area:, action:, energy:, loc:)
- **Projects Guide** — what each project is for and routing rules
- **Review Checklist** — weekly review protocol
- **Current Priorities** — user's top life themes
- **Inbox Processing Rules** — decision tree for triaging tasks

Parse and internalize this config before proceeding.

## Detecting Workflow

Based on what the user says, pick one:
- **Inbox processing** — "process inbox", "triage", "categorize tasks", "clean up inbox"
- **Weekly review** — "weekly review", "review my tasks", "go through my system"
- **Quick capture** — "add a task", "remind me to", "I need to", or any task creation request

If ambiguous, ask which workflow they want.

## Workflow 1: Inbox Processing

### Step 1: Fetch inbox
Call `ticktick` with `action: "list_tasks"`, `project: "Inbox"`.

### Step 2: Analyze and batch propose
For each task, propose:
- **Project** — where it should live (per Projects Guide)
- **Tags** — area: + optional action:, energy:, loc: tags (per Tag taxonomy)
- **Priority** — Eisenhower via priority flags (per priority mapping below)
- **Date** — if applicable

Format each proposal as:
```
Task: "[title]"
  → Project: [emoji] [name]
  → Tags: [tag1], [tag2]
  → Priority: [emoji] [level] ([reasoning])
  → Date: [date or "none"]
```

### Step 3: Flag ambiguous tasks
Separate tasks that are ambiguous. A task is ambiguous when:
- It could fit multiple projects equally well
- It's a question or reflection that might be actionable OR just a thought
- It has no clear action verb or deliverable
- Its content needs interpretation for categorization

### Step 4: Present to user
Show the batch proposal with a summary:
"**X tasks categorized, Y flagged for discussion.** Review the batch above — tell me to apply all, or point out specific tasks to adjust."

### Step 5: Apply
On approval, update each task via `ticktick update_task` with the agreed tags and priority.

**Important:** The `tickrs` CLI cannot move tasks between projects. After applying tags/priority, list all tasks that need to be moved manually:
"**Manual moves needed** (TickTick app):"
- "[task title]" → [project name]

### Step 6: Handle ambiguous tasks
Walk through flagged tasks one at a time. Present options, get user input, then apply.

## Workflow 2: Weekly Review

Follow the Review Checklist from Config, step by step:

1. **Process Inbox → Zero** — trigger Inbox Processing workflow
2. **Set Priority Flags** — review unflagged tasks across projects, suggest priorities
3. **Review ⏳Waiting For** — fetch waiting tasks, ask about follow-ups
4. **Review 🔴 High Priority** — fetch high-priority tasks, confirm still urgent + important, identify top 3 for the week
5. **Check 🟡 Medium Priority Backlog** — pick 2-3 to advance, suggest dates
6. **Align with Current Priorities** — compare this week's tasks against Current Priorities note
7. **Clean Up** — identify completed tasks, duplicates, stale items

Present each step, get confirmation before moving to the next.

## Workflow 3: Quick Capture

1. User describes a task naturally
2. Based on Config (Projects Guide + Tags), auto-suggest:
   - Title (clean up user's phrasing if needed)
   - Project
   - Tags
   - Priority
   - Date (if mentioned or implied)
3. Present the proposal in one line:
   "**[title]** → [project] | [tags] | [priority] | [date]"
4. On confirmation, create via `ticktick create_task`

## Priority Assignment (Eisenhower Matrix)

Use TickTick's built-in priority flags:
- 🔴 **High** — Urgent + Important: deadlines, people waiting, time-sensitive obligations
- 🟡 **Medium** — Not Urgent + Important: growth, planning, relationship building, health
- 🔵 **Low** — Urgent + Not Important: nice to have, could delegate or automate
- ⚪ **None** — Not Urgent + Not Important: someday/maybe, tag with action:someday

## Limitations

- **Cannot move tasks between projects** via the CLI. Flag these for manual move in the TickTick app.
- **Cannot list tags** — tag taxonomy lives in the Config project.
- **Cannot create subtasks** independently — use the `items` parameter when creating/updating tasks.
```

**Step 2: Verify skill name matches directory**

Directory: `ticktick/` → frontmatter name: `ticktick` ✓

**Step 3: Test manually**

Reload pi (`/reload`), then test each workflow:
- "Process my inbox" → should load skill, call load_config, fetch inbox, propose batch
- "Let's do a weekly review" → should load skill, call load_config, start review steps
- "Add a task: buy groceries tomorrow" → should load skill, call load_config, propose and create

**Step 4: Commit**

```bash
cd ~/.my-pi && git add -A && git commit -m "feat(ticktick): add task management skill with inbox, review, capture workflows"
```

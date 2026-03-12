# TickTick Skill + Extension Redesign

**Date:** 2026-03-12
**Status:** Approved

## Problem

The TickTick extension provides raw CRUD tools but no workflow intelligence. Every task management session requires manually loading Config notes from TickTick to understand the tag taxonomy, project routing rules, and review processes. There's no guided workflow for inbox processing, weekly reviews, or quick capture.

## Solution: Approach 3 — Skill with Config-Loading Tool

Clean separation: extension = tools, skill = workflow brain.

### Extension Changes

**New tool: `ticktick_config`**
- Fetches all tasks from the Config project in one `tickrs` call
- Returns formatted structured context (tag taxonomy, project guide, review checklist, priorities, processing rules)
- Single API call, parsed and returned

**Slimmed `promptGuidelines`** — keep only:
- "Use ticktick for personal task management, not agentic task tracking"
- "Always provide `project` parameter unless default is set"
- "If auth fails, run `tickrs init`"

No other extension changes. All existing CRUD actions stay as-is.

### New Skill: `ticktick`

**Location:** `~/.my-pi/personal/skills/ticktick/SKILL.md`

**Description:** "Personal task management workflows for TickTick. Use when the user wants to process their inbox, do a weekly review, capture tasks, triage, categorize, tag, or manage their task system. Also use when they mention tasks, todos, inbox, or weekly review."

**Every invocation starts with:**
1. Call `ticktick_config` to load full Config context
2. Detect which workflow the user wants
3. Execute that workflow

### Workflows

#### Inbox Processing
1. Load config + fetch all inbox tasks
2. Analyze all tasks, propose batch categorizations (project, tags, priority, date)
3. Flag ambiguous tasks separately
4. Present batch proposal to user for review
5. On approval, apply updates via `ticktick update_task`
6. Walk through flagged ambiguous tasks one at a time

#### Weekly Review
1. Load config + fetch Review Checklist note
2. Follow 7 steps sequentially
3. Step 1 triggers inbox processing workflow
4. Other steps: fetch relevant tasks, present status, suggest actions

#### Quick Capture
1. Load config (for tag/project suggestions)
2. User describes task naturally
3. Auto-suggest project, tags, priority based on content + config rules
4. Create with one confirmation

### Batch Proposal Format

```
Task: "Fiscaliteit expert contacteren"
  → Project: 📈Finance
  → Tags: area:finance, action:research
  → Priority: 🟡 Medium
  → Date: (none)
```

Summary: "X tasks categorized, Y flagged for discussion. Apply all?"

### Ambiguity Detection

Flag when:
- Could fit multiple projects equally well
- Question/reflection that might be actionable or just a thought
- No clear action verb or deliverable
- Content needs interpretation for categorization

### Priority Assignment (Eisenhower via Flags)
- 🔴 High = time-sensitive + important (deadlines, people waiting)
- 🟡 Medium = important but no deadline (growth, planning)
- 🔵 Low = nice to have, could delegate
- ⚪ None = someday/maybe

### Tool Usage Notes
- `ticktick update_task` for categorizing (tags, priority)
- `tickrs` CLI cannot move tasks between projects — flag for manual move, list at end
- `ticktick create_task` for quick capture
- `ticktick complete_task` / `ticktick delete_task` for cleanup

## Out of Scope
- No `input` event hook for auto-triggering
- No local config caching — always fetch fresh
- No project moving (CLI limitation)
- No recurring review reminders
- No changes to existing CRUD tool behavior

## Implementation

Two deliverables:
1. Add `ticktick_config` tool to `~/.my-pi/personal/extensions/ticktick/index.ts`
2. Create `~/.my-pi/personal/skills/ticktick/SKILL.md`

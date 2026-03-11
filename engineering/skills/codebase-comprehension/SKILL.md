---
name: codebase-comprehension
description: Use when building, tracking, or validating understanding of a codebase. Modes — setup (scaffold), guide (review files), coverage (report), update (detect changes). Use for onboarding, after major refactors, or to assess codebase familiarity.
---

# Codebase Comprehension

Track and validate your mental model of a codebase through structured markdown documentation.

## Modes

Invoke with: `/skill:codebase-comprehension <mode>`

### setup

Scaffold `.comprehension/` directory mirroring the source tree.

1. Check if `.comprehension/config.json` exists. If not, create with defaults.
2. List git-tracked source files: `git ls-files`
3. Filter by `include`/`exclude` globs from config. Then apply the **default-ignore list** below (always excluded regardless of config). The user can override by explicitly adding patterns to `include`.
4. For each file, create `.comprehension/<path>.md` with frontmatter:
   ```yaml
   ---
   source: <relative-path>
   comprehension: none
   last-reviewed: null
   last-source-commit: null
   component: <derived-from-first-directory-segment>
   ---
   ```
5. Set `lastCheckCommit` in config to current `git rev-parse HEAD`.
6. Report summary: files scaffolded, components detected.

### guide

Walk through files needing review and validate understanding.

1. **Run `update` logic first** to detect stale files.
2. Call `comprehension_coverage` tool.
3. Select next file to review. Priority: `none` > `stale: true` > `surface`.
4. Show the user which file to review. Tell them to read the source file and write their understanding in the corresponding `.md` file.
5. **Open both files in the editor.** Detect the editor CLI: try `cursor` first, then `code`. Use the found binary to open both the source file and the `.comprehension/*.md` file (e.g., `cursor -g <source-file>` and `cursor -g <comprehension-md-file>`). If neither CLI is found, skip and tell the user to open the files manually.
6. Wait for user to confirm they've written their description.
7. Read BOTH the source file AND the user's `.md` description.
8. Evaluate accuracy and completeness:
   - Identify what's correct
   - Identify gaps or misconceptions
   - Assign comprehension level: `none` | `surface` | `partial` | `solid` | `expert`
9. Update the `.md` frontmatter: set `comprehension`, `last-reviewed` (today's date), `last-source-commit` (current HEAD), remove `stale` if present.
10. Share feedback with user, then ask if they want to continue to the next file.

**Comprehension levels:**
| Level | Score | Meaning |
|-------|-------|---------|
| none | 0 | Not reviewed |
| surface | 2.5 | Knows what it does at a high level |
| partial | 5 | Understands main logic, some gaps |
| solid | 7.5 | Good understanding of all functionality |
| expert | 10 | Could rewrite from memory |

### coverage

Report comprehension coverage by architectural component.

1. **Run `update` logic first.**
2. Call `comprehension_coverage` tool.
3. Present formatted report:
   - Per-component: name, file count, average score (0-10), list of weak files
   - Overall: total files, average score, covered/uncovered/stale counts
   - Highlight components below 5.0 as needing attention
   - Highlight stale files

### update

Detect source changes and smart-downgrade comprehension levels.

1. Call `git_changes` tool (uses `lastCheckCommit` from config → HEAD). Pass the `cwd` parameter pointing to the project root (where `.comprehension/` lives) if it differs from pi's process cwd. If no `lastCheckCommit`, inform user to run `setup` first.
2. For each changed file that has a `.comprehension/*.md` counterpart:
   - Call `git_changes` with `includeDiffs: true` for that file
   - Read the diff and classify:
     - **Structural** (new logic, refactored API, changed behavior): downgrade comprehension one level (expert→solid, solid→partial, etc.), set `stale: true`
     - **Cosmetic** (formatting, comments, renames, imports): update `last-source-commit` only
3. For **added** files: create `.md` stub with `comprehension: none`
4. For **deleted** files: set `archived: true` in the `.md` frontmatter
5. Update `lastCheckCommit` in config to current HEAD.
6. Report summary: files updated, downgraded, added, archived.

## Config

`.comprehension/config.json`:
```json
{
  "include": ["**/*"],
  "exclude": ["**/*.test.*", "**/*.spec.*", "**/__tests__/**", "..."],
  "lastCheckCommit": "abc123f",
  "components": { "src/api/**": "api", "src/db/**": "database" }
}
```

Component derivation: first directory segment under project root. Override via `components` map in config or `component` field in individual `.md` frontmatter.

## Default-Ignore List

These file types are **always excluded** during `setup` and `update` (added files), regardless of config `include`/`exclude`. They are non-source files that don't benefit from comprehension tracking.

| Category | Patterns |
|----------|----------|
| **Images** | `*.png`, `*.jpg`, `*.jpeg`, `*.gif`, `*.svg`, `*.ico`, `*.webp`, `*.bmp` |
| **Fonts** | `*.woff`, `*.woff2`, `*.ttf`, `*.eot` |
| **Binaries** | `*.pdf`, `*.zip`, `*.tar`, `*.gz`, `*.bin`, `*.exe`, `*.dll`, `*.so`, `*.dylib` |
| **Lockfiles** | `package-lock.json`, `Cargo.lock`, `devbox.lock`, `*.lockb`, `yarn.lock`, `pnpm-lock.yaml`, `bun.lockb` |
| **Documentation** | `*.md` |
| **Dotfiles/config** | `.gitignore`, `.claude/**`, `.pi/**`, `.comprehension/**` |
| **Tests** (from config defaults) | `*.test.*`, `*.spec.*`, `__tests__/**` |

To include a normally-ignored pattern, add it explicitly to `include` in config (e.g., `["**/*.md"]` to track markdown files).

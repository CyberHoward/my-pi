import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { truncateHead, DEFAULT_MAX_BYTES, DEFAULT_MAX_LINES, formatSize } from "@mariozechner/pi-coding-agent";
import * as fs from "node:fs";
import * as path from "node:path";
import { readConfig } from "./config";
import { parseFrontmatter, COMPREHENSION_SCORES } from "./frontmatter";

export default function comprehensionTools(pi: ExtensionAPI) {
  // ─── git_changes tool ───────────────────────────────────────────────

  pi.registerTool({
    name: "git_changes",
    label: "Git Changes",
    description:
      "Get files changed between two git commits. Defaults to changes since last comprehension check. Returns file paths, statuses (added/modified/deleted/renamed), and optionally diffs.",
    parameters: Type.Object({
      fromCommit: Type.Optional(
        Type.String({
          description: "Start commit (defaults to lastCheckCommit from .comprehension/config.json)",
        }),
      ),
      toCommit: Type.Optional(Type.String({ description: "End commit (defaults to HEAD)" })),
      includeDiffs: Type.Optional(
        Type.Boolean({ description: "Include file diffs in output (default: false)" }),
      ),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const cwd = ctx.cwd;
      const config = readConfig(cwd);

      const from = params.fromCommit || config.lastCheckCommit;
      const to = params.toCommit || "HEAD";

      if (!from) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Error: No fromCommit specified and no lastCheckCommit in config. Run setup first.",
            },
          ],
          details: { error: true },
        };
      }

      // Get changed files
      const nameStatus = await pi.exec("git", ["diff", "--name-status", from, to], {
        signal,
        cwd,
      });
      if (nameStatus.code !== 0) {
        return {
          content: [
            { type: "text" as const, text: `Error running git diff: ${nameStatus.stderr}` },
          ],
          details: { error: true },
        };
      }

      const files: Array<{ path: string; status: string; diff?: string }> = [];
      for (const line of nameStatus.stdout.split("\n").filter(Boolean)) {
        const parts = line.split("\t");
        const statusCode = parts[0];
        // For renames, git outputs "RXXX\told\tnew" — use the new path
        const filePath = parts.length >= 3 ? parts[2] : parts[1];
        let status = "modified";
        if (statusCode.startsWith("A")) status = "added";
        else if (statusCode.startsWith("D")) status = "deleted";
        else if (statusCode.startsWith("R")) status = "renamed";

        const entry: { path: string; status: string; diff?: string } = { path: filePath, status };

        if (params.includeDiffs && status !== "deleted") {
          const diffResult = await pi.exec("git", ["diff", from, to, "--", filePath], {
            signal,
            cwd,
          });
          if (diffResult.code === 0 && diffResult.stdout) {
            const truncation = truncateHead(diffResult.stdout, {
              maxLines: 200,
              maxBytes: 10000,
            });
            entry.diff = truncation.content;
            if (truncation.truncated) {
              entry.diff += `\n[Diff truncated: ${truncation.outputLines}/${truncation.totalLines} lines]`;
            }
          }
        }

        files.push(entry);
      }

      const result = {
        files,
        fromCommit: from,
        toCommit: to,
        totalChanged: files.length,
      };

      const text = JSON.stringify(result, null, 2);
      const truncation = truncateHead(text, {
        maxLines: DEFAULT_MAX_LINES,
        maxBytes: DEFAULT_MAX_BYTES,
      });

      return {
        content: [{ type: "text" as const, text: truncation.content }],
        details: result,
      };
    },
  });

  // ─── comprehension_coverage tool ────────────────────────────────────

  pi.registerTool({
    name: "comprehension_coverage",
    label: "Comprehension Coverage",
    description:
      "Analyze comprehension coverage across the codebase. Reads all .md files in .comprehension/, parses frontmatter, and returns per-component and overall scores on a 0-10 scale.",
    parameters: Type.Object({
      basePath: Type.Optional(
        Type.String({
          description: "Path to .comprehension directory (defaults to .comprehension/ in cwd)",
        }),
      ),
      componentFilter: Type.Optional(
        Type.String({ description: "Filter to a specific component name" }),
      ),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const compDir = params.basePath
        ? path.resolve(ctx.cwd, params.basePath)
        : path.join(ctx.cwd, ".comprehension");

      if (!fs.existsSync(compDir)) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Error: .comprehension directory not found. Run setup first.",
            },
          ],
          details: { error: true },
        };
      }

      // Recursively find all .md files
      const mdFiles: string[] = [];
      function walkDir(dir: string) {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          if (entry.isDirectory()) {
            walkDir(path.join(dir, entry.name));
          } else if (entry.name.endsWith(".md")) {
            mdFiles.push(path.join(dir, entry.name));
          }
        }
      }
      walkDir(compDir);

      // Parse all frontmatter and aggregate
      const componentMap: Map<
        string,
        Array<{
          source: string;
          comprehension: string;
          score: number;
          stale: boolean;
        }>
      > = new Map();

      let totalScore = 0;
      let totalFiles = 0;
      let coveredCount = 0;
      let uncoveredCount = 0;
      let staleCount = 0;

      for (const mdFile of mdFiles) {
        try {
          const content = fs.readFileSync(mdFile, "utf-8");
          const { frontmatter } = parseFrontmatter(content);

          if (frontmatter.archived) continue;
          if (params.componentFilter && frontmatter.component !== params.componentFilter) continue;

          const score = COMPREHENSION_SCORES[frontmatter.comprehension] ?? 0;
          const isStale = frontmatter.stale === true;
          const component = frontmatter.component || "uncategorized";

          if (!componentMap.has(component)) componentMap.set(component, []);
          componentMap.get(component)!.push({
            source: frontmatter.source,
            comprehension: frontmatter.comprehension,
            score,
            stale: isStale,
          });

          totalScore += score;
          totalFiles++;
          if (frontmatter.comprehension !== "none") coveredCount++;
          else uncoveredCount++;
          if (isStale) staleCount++;
        } catch {
          // Skip files with parse errors
        }
      }

      // Build component summaries sorted by score (weakest first)
      const components = Array.from(componentMap.entries())
        .map(([name, files]) => {
          const avgScore =
            files.length > 0
              ? Math.round((files.reduce((sum, f) => sum + f.score, 0) / files.length) * 10) / 10
              : 0;
          return {
            name,
            fileCount: files.length,
            averageScore: avgScore,
            files: files.sort((a, b) => a.score - b.score),
          };
        })
        .sort((a, b) => a.averageScore - b.averageScore);

      const overall = {
        fileCount: totalFiles,
        averageScore:
          totalFiles > 0 ? Math.round((totalScore / totalFiles) * 10) / 10 : 0,
        coveredCount,
        uncoveredCount,
        staleCount,
      };

      const result = { components, overall };
      const text = JSON.stringify(result, null, 2);

      return {
        content: [{ type: "text" as const, text }],
        details: result,
      };
    },
  });
}

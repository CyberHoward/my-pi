/**
 * TickTick Extension — Manage personal tasks via the tickrs CLI.
 *
 * Wraps `tickrs` (https://crates.io/crates/ticktickrs) with structured
 * tool calls. Results are parsed and trimmed to keep context usage low.
 *
 * Setup: see setup.md in the skill directory, or run `tickrs init`.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { truncateHead, formatSize, DEFAULT_MAX_BYTES, DEFAULT_MAX_LINES } from "@mariozechner/pi-coding-agent";
import { StringEnum } from "@mariozechner/pi-ai";
import { Type, type Static } from "@sinclair/typebox";
import { Text } from "@mariozechner/pi-tui";

// ── Schema ──────────────────────────────────────────────────────────

const TickTickParams = Type.Object({
	action: StringEnum([
		"list_projects",
		"list_tasks",
		"get_task",
		"create_task",
		"update_task",
		"complete_task",
		"uncomplete_task",
		"delete_task",
		"create_project",
	] as const),
	project: Type.Optional(Type.String({ description: "Project name (required for task operations unless a default is set)" })),
	task_id: Type.Optional(Type.String({ description: "Task ID (for get/update/complete/delete)" })),
	title: Type.Optional(Type.String({ description: "Task or project title (for create/update)" })),
	content: Type.Optional(Type.String({ description: "Task description (for create/update)" })),
	priority: Type.Optional(StringEnum(["none", "low", "medium", "high"] as const)),
	date: Type.Optional(Type.String({ description: "Natural language date like 'tomorrow', 'next friday', 'in 3 days'" })),
	tags: Type.Optional(Type.String({ description: "Comma-separated tags" })),
	items: Type.Optional(Type.String({ description: "Comma-separated subtask/checklist items" })),
});

type TickTickInput = Static<typeof TickTickParams>;

// ── Helpers ─────────────────────────────────────────────────────────

function buildArgs(input: TickTickInput): string[] {
	const args: string[] = [];

	switch (input.action) {
		case "list_projects":
			args.push("project", "list");
			break;

		case "create_project":
			args.push("project", "create");
			if (input.title) args.push("--name", input.title);
			break;

		case "list_tasks":
			args.push("task", "list");
			if (input.project) args.push("--project-name", input.project);
			break;

		case "get_task":
			args.push("task", "show", input.task_id!);
			if (input.project) args.push("--project-name", input.project);
			break;

		case "create_task":
			args.push("task", "create");
			if (input.title) args.push("--title", input.title);
			if (input.project) args.push("--project-name", input.project);
			if (input.content) args.push("--content", input.content);
			if (input.priority) args.push("--priority", input.priority);
			if (input.date) args.push("--date", input.date);
			if (input.tags) args.push("--tags", input.tags);
			if (input.items) args.push("--items", input.items);
			break;

		case "update_task":
			args.push("task", "update", input.task_id!);
			if (input.project) args.push("--project-name", input.project);
			if (input.title) args.push("--title", input.title);
			if (input.content) args.push("--content", input.content);
			if (input.priority) args.push("--priority", input.priority);
			if (input.date) args.push("--date", input.date);
			if (input.tags) args.push("--tags", input.tags);
			if (input.items) args.push("--items", input.items);
			break;

		case "complete_task":
			args.push("task", "complete", input.task_id!);
			if (input.project) args.push("--project-name", input.project);
			break;

		case "uncomplete_task":
			args.push("task", "uncomplete", input.task_id!);
			if (input.project) args.push("--project-name", input.project);
			break;

		case "delete_task":
			args.push("task", "delete", input.task_id!, "--force");
			if (input.project) args.push("--project-name", input.project);
			break;
	}

	args.push("--json");
	return args;
}

/** Slim down a task object to the fields the LLM actually needs. */
function summarizeTask(t: any): any {
	if (!t) return t;
	const out: any = { id: t.id, title: t.title };
	if (t.content) out.content = t.content;
	if (t.priority !== undefined && t.priority !== 0) out.priority = t.priority;
	if (t.status !== undefined) out.status = t.status;
	if (t.dueDate) out.due = t.dueDate;
	if (t.startDate) out.start = t.startDate;
	if (t.tags?.length) out.tags = t.tags;
	if (t.items?.length) out.items = t.items.map((i: any) => ({ title: i.title, status: i.status }));
	if (t.projectId) out.projectId = t.projectId;
	return out;
}

function summarizeProject(p: any): any {
	if (!p) return p;
	return { id: p.id, name: p.name, ...(p.color ? { color: p.color } : {}) };
}

function formatResult(action: string, raw: any): string {
	if (!raw?.success && raw?.error) {
		return `Error: ${raw.error.message || JSON.stringify(raw.error)}`;
	}

	const data = raw?.data;

	switch (action) {
		case "list_projects": {
			const projects = Array.isArray(data) ? data.map(summarizeProject) : data;
			return JSON.stringify(projects, null, 2);
		}
		case "list_tasks": {
			const tasks = Array.isArray(data) ? data.map(summarizeTask) : data;
			return JSON.stringify(tasks, null, 2);
		}
		case "get_task":
			return JSON.stringify(summarizeTask(data), null, 2);
		case "create_task":
		case "update_task":
			return JSON.stringify(summarizeTask(data), null, 2);
		case "complete_task":
			return `Task completed.`;
		case "uncomplete_task":
			return `Task marked incomplete.`;
		case "delete_task":
			return `Task deleted.`;
		case "create_project":
			return JSON.stringify(summarizeProject(data), null, 2);
		default:
			return JSON.stringify(data, null, 2);
	}
}

// ── Extension ───────────────────────────────────────────────────────

export default function (pi: ExtensionAPI) {
	pi.registerTool({
		name: "ticktick",
		label: "TickTick",
		description:
			"Manage the user's personal TickTick tasks and projects. " +
			"Actions: list_projects, list_tasks, get_task, create_task, update_task, complete_task, uncomplete_task, delete_task, create_project. " +
			"Supports natural language dates (e.g. 'tomorrow', 'next friday'). " +
			"Priority levels: none, low, medium, high.",
		promptSnippet: "Manage TickTick tasks and projects (list, create, update, complete, delete)",
		promptGuidelines: [
			"Use this tool for the user's personal task management — NOT for agentic/coding task tracking.",
			"Always provide the `project` parameter for task operations unless the user has set a default project.",
			"If authentication fails, tell the user to run `tickrs init` in their terminal and refer them to ~/.my-pi/extensions/ticktick/setup.md.",
		],
		parameters: TickTickParams,

		async execute(_toolCallId, params, signal, _onUpdate, _ctx) {
			const args = buildArgs(params);

			const result = await pi.exec("tickrs", args, { signal, timeout: 15000 });

			if (result.killed) {
				throw new Error("tickrs command timed out");
			}

			const output = (result.stdout + result.stderr).trim();

			if (result.code !== 0) {
				// Check for common errors
				if (output.includes("Authentication required") || output.includes("AUTH_REQUIRED")) {
					throw new Error("TickTick authentication required. Run `tickrs init` in your terminal. See ~/.my-pi/extensions/ticktick/setup.md for setup instructions.");
				}
				throw new Error(output || `tickrs exited with code ${result.code}`);
			}

			// Try to parse JSON and format a slim response
			let text: string;
			try {
				const parsed = JSON.parse(output);
				text = formatResult(params.action, parsed);
			} catch {
				// If not JSON, return raw output
				text = output;
			}

			// Truncate if the formatted result is still too large
			const truncation = truncateHead(text, {
				maxLines: DEFAULT_MAX_LINES,
				maxBytes: DEFAULT_MAX_BYTES,
			});

			if (truncation.truncated) {
				text = truncation.content;
				text += `\n\n[Output truncated: ${truncation.outputLines} of ${truncation.totalLines} lines`;
				text += ` (${formatSize(truncation.outputBytes)} of ${formatSize(truncation.totalBytes)})]`;
			}

			return {
				content: [{ type: "text", text }],
				details: { action: params.action },
			};
		},

		renderCall(args, theme) {
			let text = theme.fg("toolTitle", theme.bold("ticktick "));
			text += theme.fg("muted", args.action);
			if (args.title) text += " " + theme.fg("dim", `"${args.title}"`);
			if (args.project) text += " " + theme.fg("accent", `[${args.project}]`);
			if (args.task_id) text += " " + theme.fg("accent", `#${args.task_id.slice(0, 8)}`);
			if (args.date) text += " " + theme.fg("warning", `📅 ${args.date}`);
			if (args.priority && args.priority !== "none") text += " " + theme.fg("error", `!${args.priority}`);
			return new Text(text, 0, 0);
		},

		renderResult(result, _options, theme) {
			const text = result.content[0];
			const content = text?.type === "text" ? text.text : "";
			const action = (result.details as any)?.action;

			if (result.isError) {
				return new Text(theme.fg("error", content), 0, 0);
			}

			// Short confirmations
			if (["complete_task", "uncomplete_task", "delete_task"].includes(action)) {
				return new Text(theme.fg("success", "✓ ") + theme.fg("muted", content), 0, 0);
			}

			// For lists/details, show trimmed content
			const lines = content.split("\n");
			const display = lines.length > 20 ? lines.slice(0, 20).join("\n") + `\n... ${lines.length - 20} more lines` : content;
			return new Text(theme.fg("muted", display), 0, 0);
		},
	});
}

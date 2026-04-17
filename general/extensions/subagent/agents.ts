/**
 * Agent discovery and configuration
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { parseFrontmatter } from "@mariozechner/pi-coding-agent";

export type AgentScope = "user" | "project" | "both";

export interface AgentConfig {
	name: string;
	description: string;
	tools?: string[];
	model?: string;
	systemPrompt: string;
	source: "user" | "project";
	filePath: string;
}

export interface AgentDiscoveryResult {
	agents: AgentConfig[];
	projectAgentsDir: string | null;
}

function loadAgentsFromDir(dir: string, source: "user" | "project"): AgentConfig[] {
	const agents: AgentConfig[] = [];

	if (!fs.existsSync(dir)) {
		return agents;
	}

	let entries: fs.Dirent[];
	try {
		entries = fs.readdirSync(dir, { withFileTypes: true });
	} catch {
		return agents;
	}

	for (const entry of entries) {
		if (!entry.name.endsWith(".md")) continue;
		if (!entry.isFile() && !entry.isSymbolicLink()) continue;

		const filePath = path.join(dir, entry.name);
		let content: string;
		try {
			content = fs.readFileSync(filePath, "utf-8");
		} catch {
			continue;
		}

		const { frontmatter, body } = parseFrontmatter<Record<string, string>>(content);

		if (!frontmatter.name || !frontmatter.description) {
			continue;
		}

		const tools = frontmatter.tools
			?.split(",")
			.map((t: string) => t.trim())
			.filter(Boolean);

		agents.push({
			name: frontmatter.name,
			description: frontmatter.description,
			tools: tools && tools.length > 0 ? tools : undefined,
			model: frontmatter.model,
			systemPrompt: body,
			source,
			filePath,
		});
	}

	return agents;
}

function isDirectory(p: string): boolean {
	try {
		return fs.statSync(p).isDirectory();
	} catch {
		return false;
	}
}

function findNearestProjectAgentsDir(cwd: string): string | null {
	let currentDir = cwd;
	while (true) {
		const candidate = path.join(currentDir, ".pi", "agents");
		if (isDirectory(candidate)) return candidate;

		const parentDir = path.dirname(currentDir);
		if (parentDir === currentDir) return null;
		currentDir = parentDir;
	}
}

interface AgentSettingsEntries {
	/** Directory paths that contribute agents (plain entries). */
	includeDirs: string[];
	/**
	 * Exclusion targets. An excluded entry may be:
	 *  - an absolute file path (e.g. `.../agents/foo.md`),
	 *  - an absolute path without extension (e.g. `.../agents/foo`), or
	 *  - an absolute directory (excludes every agent under it).
	 * All three forms are supported to match the toggle extension's output and
	 * hand-written entries.
	 */
	excludes: string[];
}

function expandSettingsPath(raw: string, baseDir: string): string {
	const expanded = raw.startsWith("~") ? path.join(os.homedir(), raw.slice(1)) : raw;
	return path.isAbsolute(expanded) ? expanded : path.resolve(baseDir, expanded);
}

/**
 * Read an `agents` array from a settings.json file and return both the
 * include directories (plain entries) and exclusion targets (entries
 * starting with `-` or `!`). Paths are resolved relative to the settings
 * file's directory and `~/` is expanded.
 */
function loadAgentPathsFromSettings(settingsPath: string): AgentSettingsEntries {
	try {
		const raw = fs.readFileSync(settingsPath, "utf-8");
		const settings = JSON.parse(raw);
		const agentPaths: unknown[] = settings.agents;
		if (!Array.isArray(agentPaths)) return { includeDirs: [], excludes: [] };

		const baseDir = path.dirname(settingsPath);
		const includeDirs: string[] = [];
		const excludes: string[] = [];
		for (const p of agentPaths) {
			if (typeof p !== "string") continue;
			const trimmed = p.trim();
			if (!trimmed) continue;
			if (trimmed.startsWith("-") || trimmed.startsWith("!")) {
				excludes.push(expandSettingsPath(trimmed.slice(1), baseDir));
			} else if (trimmed.startsWith("+")) {
				// `+` force-include is treated as a plain include at the agent layer.
				includeDirs.push(expandSettingsPath(trimmed.slice(1), baseDir));
			} else {
				includeDirs.push(expandSettingsPath(trimmed, baseDir));
			}
		}
		return { includeDirs, excludes };
	} catch {
		return { includeDirs: [], excludes: [] };
	}
}

function isAgentExcluded(agent: AgentConfig, excludes: string[]): boolean {
	if (excludes.length === 0) return false;
	const filePath = agent.filePath;
	const withoutExt = filePath.endsWith(".md") ? filePath.slice(0, -3) : filePath;
	const parentDir = path.dirname(filePath);
	for (const target of excludes) {
		if (target === filePath) return true;
		if (target === withoutExt) return true;
		// Directory-form exclusion: anything under (or equal to) target.
		if (target === parentDir) return true;
		const prefix = target.endsWith(path.sep) ? target : target + path.sep;
		if (filePath.startsWith(prefix)) return true;
	}
	return false;
}

export function discoverAgents(cwd: string, scope: AgentScope): AgentDiscoveryResult {
	const userDir = path.join(os.homedir(), ".pi", "agent", "agents");
	const projectAgentsDir = findNearestProjectAgentsDir(cwd);

	// Load agents from default directories
	const userAgents = scope === "project" ? [] : loadAgentsFromDir(userDir, "user");
	const projectAgents = scope === "user" || !projectAgentsDir ? [] : loadAgentsFromDir(projectAgentsDir, "project");

	// Load additional agents from settings.json `agents` paths
	const globalSettingsPath = path.join(os.homedir(), ".pi", "agent", "settings.json");
	const settingsUserAgents: AgentConfig[] = [];
	const settingsProjectAgents: AgentConfig[] = [];

	const userExcludes: string[] = [];
	const projectExcludes: string[] = [];

	if (scope !== "project") {
		const { includeDirs, excludes } = loadAgentPathsFromSettings(globalSettingsPath);
		userExcludes.push(...excludes);
		for (const dir of includeDirs) {
			settingsUserAgents.push(...loadAgentsFromDir(dir, "user"));
		}
	}

	if (scope !== "user") {
		// Walk up to find nearest .pi/settings.json
		let dir = cwd;
		while (true) {
			const candidate = path.join(dir, ".pi", "settings.json");
			if (fs.existsSync(candidate)) {
				const { includeDirs, excludes } = loadAgentPathsFromSettings(candidate);
				projectExcludes.push(...excludes);
				for (const agentDir of includeDirs) {
					settingsProjectAgents.push(...loadAgentsFromDir(agentDir, "project"));
				}
				break;
			}
			const parent = path.dirname(dir);
			if (parent === dir) break;
			dir = parent;
		}
	}

	// Apply exclusions to all loaded agents (both default-dir and settings-dir).
	const allExcludes = [...userExcludes, ...projectExcludes];
	if (allExcludes.length > 0) {
		const filter = (list: AgentConfig[]) => list.filter((a) => !isAgentExcluded(a, allExcludes));
		for (const bucket of [userAgents, settingsUserAgents, projectAgents, settingsProjectAgents]) {
			// Mutate in place
			const filtered = filter(bucket);
			bucket.length = 0;
			bucket.push(...filtered);
		}
	}

	const agentMap = new Map<string, AgentConfig>();

	if (scope === "both") {
		for (const agent of userAgents) agentMap.set(agent.name, agent);
		for (const agent of settingsUserAgents) agentMap.set(agent.name, agent);
		for (const agent of projectAgents) agentMap.set(agent.name, agent);
		for (const agent of settingsProjectAgents) agentMap.set(agent.name, agent);
	} else if (scope === "user") {
		for (const agent of userAgents) agentMap.set(agent.name, agent);
		for (const agent of settingsUserAgents) agentMap.set(agent.name, agent);
	} else {
		for (const agent of projectAgents) agentMap.set(agent.name, agent);
		for (const agent of settingsProjectAgents) agentMap.set(agent.name, agent);
	}

	return { agents: Array.from(agentMap.values()), projectAgentsDir };
}

export function formatAgentList(agents: AgentConfig[], maxItems: number): { text: string; remaining: number } {
	if (agents.length === 0) return { text: "none", remaining: 0 };
	const listed = agents.slice(0, maxItems);
	const remaining = agents.length - listed.length;
	return {
		text: listed.map((a) => `${a.name} (${a.source}): ${a.description}`).join("; "),
		remaining,
	};
}

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

/**
 * Read an `agents` array from a settings.json file and resolve paths relative to its directory.
 * Returns resolved directory paths.
 */
function loadAgentPathsFromSettings(settingsPath: string): string[] {
	try {
		const raw = fs.readFileSync(settingsPath, "utf-8");
		const settings = JSON.parse(raw);
		const agentPaths: unknown[] = settings.agents;
		if (!Array.isArray(agentPaths)) return [];

		const baseDir = path.dirname(settingsPath);
		const resolved: string[] = [];
		for (const p of agentPaths) {
			if (typeof p !== "string") continue;
			const expanded = p.startsWith("~") ? path.join(os.homedir(), p.slice(1)) : p;
			const abs = path.isAbsolute(expanded) ? expanded : path.resolve(baseDir, expanded);
			resolved.push(abs);
		}
		return resolved;
	} catch {
		return [];
	}
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

	if (scope !== "project") {
		for (const dir of loadAgentPathsFromSettings(globalSettingsPath)) {
			settingsUserAgents.push(...loadAgentsFromDir(dir, "user"));
		}
	}

	if (scope !== "user") {
		// Walk up to find nearest .pi/settings.json
		let dir = cwd;
		while (true) {
			const candidate = path.join(dir, ".pi", "settings.json");
			if (fs.existsSync(candidate)) {
				for (const agentDir of loadAgentPathsFromSettings(candidate)) {
					settingsProjectAgents.push(...loadAgentsFromDir(agentDir, "project"));
				}
				break;
			}
			const parent = path.dirname(dir);
			if (parent === dir) break;
			dir = parent;
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

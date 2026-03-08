import * as fs from "node:fs";
import * as path from "node:path";
import { minimatch } from "minimatch";

export interface ComprehensionConfig {
  include: string[];
  exclude: string[];
  lastCheckCommit: string | null;
  components: Record<string, string>;
}

const DEFAULT_CONFIG: ComprehensionConfig = {
  include: ["**/*"],
  exclude: [
    "**/*.test.*",
    "**/*.spec.*",
    "**/__tests__/**",
    "**/__mocks__/**",
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**",
    "**/.git/**",
    "**/package-lock.json",
    "**/yarn.lock",
    "**/pnpm-lock.yaml",
    "**/*.min.*",
    "**/*.map",
    "**/*.d.ts",
    "**/.*",
  ],
  lastCheckCommit: null,
  components: {},
};

export function getConfigPath(cwd: string): string {
  return path.join(cwd, ".comprehension", "config.json");
}

export function readConfig(cwd: string): ComprehensionConfig {
  const configPath = getConfigPath(cwd);
  if (!fs.existsSync(configPath)) {
    return { ...DEFAULT_CONFIG };
  }
  const raw = fs.readFileSync(configPath, "utf-8");
  return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
}

export function writeConfig(cwd: string, config: ComprehensionConfig): void {
  const configPath = getConfigPath(cwd);
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
}

export function shouldIncludeFile(filePath: string, config: ComprehensionConfig): boolean {
  // Check exclude patterns first
  for (const pattern of config.exclude) {
    if (minimatch(filePath, pattern)) return false;
  }
  // Check include patterns
  for (const pattern of config.include) {
    if (minimatch(filePath, pattern)) return true;
  }
  return false;
}

export function deriveComponent(filePath: string, config: ComprehensionConfig): string {
  // Check config component overrides first
  for (const [pattern, component] of Object.entries(config.components)) {
    if (minimatch(filePath, pattern)) return component;
  }
  // Default: first directory segment
  const parts = filePath.split("/");
  return parts.length > 1 ? parts[0] : "root";
}

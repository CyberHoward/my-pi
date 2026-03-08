export interface ComprehensionFrontmatter {
  source: string;
  comprehension: "none" | "surface" | "partial" | "solid" | "expert";
  "last-reviewed": string | null;
  "last-source-commit": string | null;
  component: string;
  stale?: boolean;
  archived?: boolean;
}

export const COMPREHENSION_SCORES: Record<string, number> = {
  none: 0,
  surface: 2.5,
  partial: 5,
  solid: 7.5,
  expert: 10,
};

export function parseFrontmatter(content: string): { frontmatter: ComprehensionFrontmatter; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    throw new Error("No YAML frontmatter found");
  }

  const yamlBlock = match[1];
  const body = match[2];

  const fm: Record<string, any> = {};
  for (const line of yamlBlock.split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    let value: any = line.slice(colonIdx + 1).trim();
    if (value === "null") value = null;
    else if (value === "true") value = true;
    else if (value === "false") value = false;
    fm[key] = value;
  }

  return { frontmatter: fm as ComprehensionFrontmatter, body };
}

export function serializeFrontmatter(fm: ComprehensionFrontmatter, body: string): string {
  const lines: string[] = ["---"];
  lines.push(`source: ${fm.source}`);
  lines.push(`comprehension: ${fm.comprehension}`);
  lines.push(`last-reviewed: ${fm["last-reviewed"] ?? "null"}`);
  lines.push(`last-source-commit: ${fm["last-source-commit"] ?? "null"}`);
  lines.push(`component: ${fm.component}`);
  if (fm.stale) lines.push(`stale: true`);
  if (fm.archived) lines.push(`archived: true`);
  lines.push("---");
  lines.push("");
  if (body.trim()) {
    lines.push(body.trim());
    lines.push("");
  }
  return lines.join("\n");
}

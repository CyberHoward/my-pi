import { DynamicBorder, getSettingsListTheme } from "@mariozechner/pi-coding-agent";
import { Container, SettingsList, Text, matchesKey } from "@mariozechner/pi-tui";
import type { SettingItem, TUI, Theme } from "@mariozechner/pi-tui";
import type { ComponentGroup, ComponentItem } from "./discovery.ts";
import type { ToggleConfig } from "./config.ts";
import { isDisabled } from "./config.ts";

// ============================================================================
// Types
// ============================================================================

export interface ToggleSettingItem extends SettingItem {
  /** For group items: all leaf descendant relativePaths */
  childIds?: string[];
}

export interface ToggleUIOptions {
  items: ToggleSettingItem[];
  scope: "global" | "project";
  hasProject: boolean;
  onToggle: (id: string, newValue: string) => void;
  onScopeChange: (scope: "global" | "project") => void;
}

// ============================================================================
// Build Setting Items
// ============================================================================

/**
 * Convert the group tree + config into a flat SettingItem[] with visual indentation.
 */
export function buildSettingItems(
  groups: ComponentGroup[],
  allItems: ComponentItem[],
  config: ToggleConfig
): ToggleSettingItem[] {
  const result: ToggleSettingItem[] = [];
  
  function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function truncateDesc(desc: string | undefined, maxLen: number = 60): string {
    if (!desc) return "";
    if (desc.length <= maxLen) return desc;
    return desc.slice(0, maxLen - 3) + "...";
  }

  /**
   * Collect all leaf ComponentItems under a group (recursively)
   */
  function collectLeaves(children: (ComponentGroup | ComponentItem)[]): ComponentItem[] {
    const leaves: ComponentItem[] = [];
    for (const child of children) {
      if ("relativePath" in child) {
        // It's a ComponentItem (leaf)
        leaves.push(child);
      } else {
        // It's a ComponentGroup, recurse
        leaves.push(...collectLeaves(child.children));
      }
    }
    return leaves;
  }

  /**
   * Determine the group's effective value based on all leaf descendants.
   */
  function getGroupValue(leaves: ComponentItem[]): "enabled" | "disabled" | "partial" {
    if (leaves.length === 0) return "enabled";
    
    let enabledCount = 0;
    let disabledCount = 0;
    
    for (const leaf of leaves) {
      if (isDisabled(config, leaf.relativePath)) {
        disabledCount++;
      } else {
        enabledCount++;
      }
    }
    
    if (disabledCount === 0) return "enabled";
    if (enabledCount === 0) return "disabled";
    return "partial";
  }

  /**
   * Process a group or item recursively
   */
  function processNode(
    node: ComponentGroup | ComponentItem,
    depth: number
  ): void {
    const indent = "    ".repeat(depth);
    
    if ("relativePath" in node) {
      // It's a leaf item (ComponentItem)
      const item = node as ComponentItem;
      const disabled = isDisabled(config, item.relativePath);
      const description = item.description
        ? truncateDesc(item.description)
        : item.type; // "skill", "extension", or "agent"
      
      result.push({
        id: item.relativePath,
        label: `${indent}${item.name}`,
        currentValue: disabled ? "disabled" : "enabled",
        values: ["enabled", "disabled"],
        description,
      });
    } else {
      // It's a group (ComponentGroup)
      const group = node as ComponentGroup;
      const leaves = collectLeaves(group.children);
      const groupValue = getGroupValue(leaves);
      const childIds = leaves.map(l => l.relativePath);
      
      result.push({
        id: group.id,
        label: `${indent}▸ ${capitalize(group.label)}`,
        currentValue: groupValue,
        values: ["enabled", "disabled"],
        childIds,
      });
      
      // Process children
      for (const child of group.children) {
        processNode(child, depth + 1);
      }
    }
  }

  // Process all top-level groups
  for (const group of groups) {
    processNode(group, 0);
  }

  return result;
}

// ============================================================================
// TUI Component Factory
// ============================================================================

/**
 * Create the toggle UI component.
 */
export function createToggleUI(
  tui: TUI,
  theme: Theme,
  done: (result: { switchScope: "global" | "project" } | null | undefined) => void,
  options: ToggleUIOptions
): { render: (w: number) => string[]; invalidate: () => void; handleInput: (data: string) => void } {
  const { items, scope, hasProject, onToggle, onScopeChange } = options;

  const container = new Container();

  // Top border
  container.addChild(new DynamicBorder((s: string) => theme.fg("accent", s)));

  // Title line
  const scopeLabel = scope === "global" ? "(global)" : "(project)";
  const titleText = `${theme.fg("accent", theme.bold("Component Toggle"))} ${theme.fg("muted", scopeLabel)}`;
  container.addChild(new Text(titleText, 1, 0));

  // SettingsList
  const settingsList = new SettingsList(
    items,
    Math.min(items.length + 2, 20),
    getSettingsListTheme(),
    (id, newValue) => {
      onToggle(id, newValue);
    },
    () => {
      // On escape/close
      done(undefined);
    },
    { enableSearch: true }
  );
  container.addChild(settingsList);

  // Help text
  const helpParts: string[] = ["↑↓ navigate", "enter toggle", "/ search", "esc close"];
  if (hasProject) {
    helpParts.push("g global", "p project");
  }
  const helpText = theme.fg("dim", helpParts.join(" • "));
  container.addChild(new Text(helpText, 1, 0));

  // Bottom border
  container.addChild(new DynamicBorder((s: string) => theme.fg("accent", s)));

  return {
    render(width: number): string[] {
      return container.render(width);
    },
    invalidate(): void {
      container.invalidate();
    },
    handleInput(data: string): void {
      // Handle scope switching keys
      if (hasProject) {
        if (matchesKey(data, "g")) {
          if (scope !== "global") {
            onScopeChange("global");
          }
          return;
        }
        if (matchesKey(data, "p")) {
          if (scope !== "project") {
            onScopeChange("project");
          }
          return;
        }
      }
      
      // Delegate everything else to SettingsList
      settingsList.handleInput?.(data);
      tui.requestRender();
    },
  };
}

import { DynamicBorder, getSettingsListTheme } from "@mariozechner/pi-coding-agent";
import { Container, SettingsList, Text } from "@mariozechner/pi-tui";
import type { SettingItem } from "@mariozechner/pi-tui";
import type { ComponentGroup, ComponentItem } from "./discovery.ts";
import type { ToggleConfig } from "./config.ts";
import { isDisabled } from "./config.ts";

// Value display constants
export const ENABLED_VALUE = "✓";
export const DISABLED_VALUE = "✗";

// ============================================================================
// Types
// ============================================================================

export interface ToggleSettingItem extends SettingItem {
  /** For group items: all leaf descendant relativePaths */
  childIds?: string[];
}

export interface ToggleUIOptions {
  items: ToggleSettingItem[];
  onToggle: (id: string, enabled: boolean) => void;
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
   * Returns "enabled" if any child is enabled (for proper toggle cycling),
   * plus a partial flag when mixed.
   */
  function getGroupValue(leaves: ComponentItem[]): { value: "enabled" | "disabled"; partial: boolean; enabledCount: number } {
    if (leaves.length === 0) return { value: "enabled", partial: false, enabledCount: 0 };
    
    let enabledCount = 0;
    
    for (const leaf of leaves) {
      if (!isDisabled(config, leaf.relativePath)) {
        enabledCount++;
      }
    }
    
    const disabledCount = leaves.length - enabledCount;
    
    if (disabledCount === 0) return { value: "enabled", partial: false, enabledCount };
    if (enabledCount === 0) return { value: "disabled", partial: false, enabledCount };
    // Partial: show as "enabled" so toggling goes to "disabled" (turn all off)
    return { value: "enabled", partial: true, enabledCount };
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
        currentValue: disabled ? DISABLED_VALUE : ENABLED_VALUE,
        values: [ENABLED_VALUE, DISABLED_VALUE],
        description,
      });
    } else {
      // It's a group (ComponentGroup)
      const group = node as ComponentGroup;
      const leaves = collectLeaves(group.children);
      const groupResult = getGroupValue(leaves);
      const childIds = leaves.map(l => l.relativePath);
      
      // Show partial state in description (e.g., "3/5 enabled")
      const description = groupResult.partial 
        ? `${groupResult.enabledCount}/${leaves.length} enabled` 
        : undefined;
      
      result.push({
        id: group.id,
        label: `${indent}▸ ${capitalize(group.label)}`,
        currentValue: groupResult.value === "enabled" ? ENABLED_VALUE : DISABLED_VALUE,
        values: [ENABLED_VALUE, DISABLED_VALUE],
        description,
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
  tui: any,
  theme: any,
  done: (result: null | undefined) => void,
  options: ToggleUIOptions
): { render: (w: number) => string[]; invalidate: () => void; handleInput: (data: string) => void } {
  const { items, onToggle } = options;

  // Build lookup structures for in-place updates
  const itemMap = new Map<string, ToggleSettingItem>();
  const childToGroups = new Map<string, ToggleSettingItem[]>();
  for (const item of items) {
    itemMap.set(item.id, item);
  }
  for (const item of items) {
    if (item.childIds) {
      for (const childId of item.childIds) {
        const groups = childToGroups.get(childId) || [];
        groups.push(item);
        childToGroups.set(childId, groups);
      }
    }
  }

  function recalcGroup(groupItem: ToggleSettingItem): void {
    if (!groupItem.childIds) return;
    let enabledCount = 0;
    for (const childId of groupItem.childIds) {
      const child = itemMap.get(childId);
      if (child && child.currentValue === ENABLED_VALUE) enabledCount++;
    }
    const total = groupItem.childIds.length;
    if (enabledCount === total) {
      groupItem.currentValue = ENABLED_VALUE;
      groupItem.description = undefined;
    } else if (enabledCount === 0) {
      groupItem.currentValue = DISABLED_VALUE;
      groupItem.description = undefined;
    } else {
      groupItem.currentValue = ENABLED_VALUE;
      groupItem.description = `${enabledCount}/${total} enabled`;
    }
  }

  const container = new Container();

  // Top border
  container.addChild(new DynamicBorder((s: string) => theme.fg("accent", s)));

  // Title line
  const titleText = `${theme.fg("accent", theme.bold("Component Toggle"))} ${theme.fg("muted", "(project)")}`;
  container.addChild(new Text(titleText, 1, 0));

  // SettingsList
  const settingsList = new SettingsList(
    items,
    Math.min(items.length + 2, 20),
    getSettingsListTheme(),
    (id, newValue) => {
      const item = itemMap.get(id);
      if (!item) return;
      const enabled = newValue === ENABLED_VALUE;

      if (item.childIds && item.childIds.length > 0) {
        // Group toggle: update all children to match
        for (const childId of item.childIds) {
          settingsList.updateValue(childId, newValue);
        }
        // Clear group description (no longer partial)
        item.description = undefined;
        // Update any ancestor groups that contain these children
        const visited = new Set<string>([id]);
        for (const childId of item.childIds) {
          const parentGroups = childToGroups.get(childId) || [];
          for (const pg of parentGroups) {
            if (!visited.has(pg.id)) {
              visited.add(pg.id);
              recalcGroup(pg);
            }
          }
        }
      } else {
        // Single item toggle: update parent groups
        const parentGroups = childToGroups.get(id) || [];
        for (const pg of parentGroups) {
          recalcGroup(pg);
        }
      }

      onToggle(id, enabled);
      tui.requestRender();
    },
    () => {
      // On escape/close
      done(undefined);
    },
    { enableSearch: true }
  );
  container.addChild(settingsList);

  // Help text
  const helpText = theme.fg("dim", ["↑↓ navigate", "enter toggle", "/ search", "esc close"].join(" • "));
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
      settingsList.handleInput?.(data);
      tui.requestRender();
    },
  };
}

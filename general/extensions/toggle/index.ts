import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { stat } from "fs/promises";
import { join } from "path";
import { discoverComponents, buildGroupTree } from "./discovery.ts";
import { loadConfig, saveConfig, toggleItem } from "./config.ts";
import { applyToggleConfig } from "./settings-writer.ts";
import { buildSettingItems, createToggleUI } from "./ui.ts";
import type { ToggleSettingItem } from "./ui.ts";

// ============================================================================
// Helpers
// ============================================================================

async function hasProjectDir(cwd: string): Promise<boolean> {
  try {
    const piDir = join(cwd, ".pi");
    const s = await stat(piDir);
    return s.isDirectory();
  } catch {
    return false;
  }
}

// ============================================================================
// Extension
// ============================================================================

export default function toggleExtension(pi: ExtensionAPI) {
  pi.registerCommand("toggle", {
    description: "Toggle skills, extensions, and agents on/off",
    getArgumentCompletions: (prefix: string) => {
      const items = [
        { value: "project", label: "project", description: "Edit project-level toggles" },
      ];
      const filtered = items.filter(i => i.value.startsWith(prefix));
      return filtered.length > 0 ? filtered : null;
    },
    handler: async (args, ctx) => {
      const cwd = ctx.cwd;
      const hasProject = await hasProjectDir(cwd);
      
      // Parse args to determine initial scope
      let currentScope: "global" | "project" = args?.trim() === "project" && hasProject 
        ? "project" 
        : "global";
      
      // Discover all components once
      const allItems = await discoverComponents();
      const groups = buildGroupTree(allItems);
      
      if (allItems.length === 0) {
        ctx.ui.notify("No components found in ~/.my-pi", "warning");
        return;
      }
      
      let changed = false;
      let running = true;
      
      // UI loop - rebuilds on each toggle or scope change
      while (running) {
        // Load config for current scope
        const config = await loadConfig(currentScope, cwd);
        
        // Build setting items
        const items = buildSettingItems(groups, allItems, config);
        
        // Show UI
        const result = await ctx.ui.custom<{ switchScope: "global" | "project" } | null | undefined>(
          (tui, theme, _kb, done) => {
            return createToggleUI(tui, theme, done, {
              items,
              scope: currentScope,
              hasProject,
              onToggle: async (id, newValue) => {
                // Find the item
                const item = items.find(i => i.id === id) as ToggleSettingItem | undefined;
                if (!item) return;
                
                const enabled = newValue === "enabled";
                let updatedConfig = config;
                
                if (item.childIds && item.childIds.length > 0) {
                  // Group toggle: apply to all children
                  for (const childId of item.childIds) {
                    updatedConfig = toggleItem(updatedConfig, childId, enabled);
                  }
                } else {
                  // Single item toggle
                  updatedConfig = toggleItem(updatedConfig, id, enabled);
                }
                
                // Save config
                await saveConfig(updatedConfig, currentScope, cwd);
                
                // Apply to settings.json
                await applyToggleConfig(updatedConfig, allItems, currentScope, cwd);
                
                changed = true;
                
                // Close UI so loop rebuilds with fresh state
                done(null);
              },
              onScopeChange: (newScope) => {
                done({ switchScope: newScope });
              },
            });
          }
        );
        
        if (result === undefined) {
          // User pressed escape - exit loop
          running = false;
        } else if (result && "switchScope" in result) {
          // Scope change requested
          currentScope = result.switchScope;
          // Loop continues with new scope
        }
        // If result is null (toggle happened), loop continues to refresh UI
      }
      
      // Reload if anything changed
      if (changed) {
        await ctx.reload();
        return;
      }
    },
  });
}

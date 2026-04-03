import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function toggleExtension(pi: ExtensionAPI) {
  pi.registerCommand("toggle", {
    description: "Toggle skills, extensions, and agents on/off",
    handler: async (args, ctx) => {
      ctx.ui.notify("Toggle dashboard coming soon", "info");
    },
  });
}

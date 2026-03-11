# TickTick Setup

## Prerequisites

If `tickrs` is not installed: `cargo install ticktickrs`

## Authentication

1. **Create a TickTick Developer App:**
   - Go to https://developer.ticktick.com/manage
   - Create a new app with redirect URL: `http://localhost:8080`
   - Note the Client ID and Client Secret

2. **Set environment variables** (e.g. in `~/.zshrc` or `~/.bashrc`):
   ```bash
   export TICKTICK_CLIENT_ID="your_client_id"
   export TICKTICK_CLIENT_SECRET="your_client_secret"
   ```

3. **Run `tickrs init`** — this opens a browser for OAuth authorization.
   The token is stored at `~/.local/share/tickrs/token`.

## Troubleshooting

- If commands fail with auth errors, run `tickrs init` again.
- Ensure environment variables are set in the current shell session.
- The redirect URL in your developer app must be exactly `http://localhost:8080`.

# pixida-marketplace

Pixida's public **Claude Code plugin marketplace**. This repo is the single,
PR-reviewed source of truth for approved Claude Code customizations (hooks, agents,
skills, MCP servers) across our managed org environments.

## Why this exists

Our managed settings lock hook/agent customization to plugins from approved
marketplaces (`strictPluginOnlyCustomization`). That means individual users and
cloned repos **cannot** inject their own hooks — a deliberate guard against
repo-supplied hook RCE. Approved customizations flow through *this* marketplace
instead, where every change goes through a pull request and review.

## Layout

```
.claude-plugin/
  marketplace.json          # marketplace catalog (lists plugins below)
plugins/
  notify-sound/             # opt-in completion sound (Stop hook)
    .claude-plugin/plugin.json
    hooks/hooks.json
    README.md
  notify-attention/         # opt-in attention sound (Notification hook)
    .claude-plugin/plugin.json
    hooks/hooks.json
    README.md
ci/
  validate-marketplace.mjs  # offline validator run by CI
```

Add new approved plugins under `plugins/<name>/` and register them in
`.claude-plugin/marketplace.json`.

## How the orgs consume it

Each org's `managed-settings.json` does two things:

1. **Allowlists** this host so it's an accepted marketplace source:

   ```json
   "strictKnownMarketplaces": [
       { "source": "github", "repo": "Pixida/claude-code-marketplace" }
   ]
   ```

2. **Auto-registers** the marketplace so users don't run `/plugin marketplace add`:

   ```json
   "extraKnownMarketplaces": {
       "pixida-marketplace": {
           "source": {
               "source": "github",
               "repo": "Pixida/claude-code-marketplace"
           }
       }
   }
   ```

`strictKnownMarketplaces` only *permits*; `extraKnownMarketplaces` is what actually
makes it appear. Both are needed.

Plugins remain **opt-in**: users enable what they want with `/plugin install
<name>@pixida-marketplace`. To push a plugin to everyone in an org instead, add it to
that org's `enabledPlugins` in managed settings.

## Access / authentication

This is a **public** GitHub repo, so no authentication is needed to clone it — no SSH
keys, no tokens, nothing to distribute.

GitHub domains are already in the sandbox network allowlist for **Management** and
**Dev-Full**, so it works there out of the box. **Dev-Restricted** deliberately does
*not* allow GitHub (its sandbox is locked to internal hosts), so this marketplace is
**not** wired into that environment; it would be provisioned there via a local seed
instead.

## Validate before pushing

```
claude plugin validate .
```

## Editing hook plugins (CLAUDE_PLUGIN_ROOT workaround)

Plugins whose hook runs a Node script (e.g. `notify-sound`, `notify-attention`) keep
that script readable at `scripts/<name>.js` — but it's a **reference copy only**, not
what actually executes. `hooks.json`'s `command` embeds a minified, triple-escaped
(JSON → shell → JS) copy of the same code, because `${CLAUDE_PLUGIN_ROOT}` — the
documented way for a plugin to reference its own bundled files from a hook command —
does not reliably resolve inside `hooks.json`, including for plugins installed from a
registered marketplace (not just local/dev installs). See
[anthropics/claude-code#9354](https://github.com/anthropics/claude-code/issues/9354).

To change a hook's behavior: edit its `scripts/<name>.js`, test directly with `node
scripts/<name>.js`, then hand-transcribe the result into the `command` string in that
plugin's `hooks/hooks.json` and re-test end-to-end. Once `${CLAUDE_PLUGIN_ROOT}` is
fixed upstream, every plugin's `hooks.json` can switch to `node
"${CLAUDE_PLUGIN_ROOT}/scripts/<name>.js"` and this duplication goes away for good.

## Current plugins

| Plugin | Purpose | Default |
| ------ | ------- | ------- |
| [`notify-sound`](plugins/notify-sound/README.md) | Cross-platform completion sound on `Stop` | Opt-in |
| [`notify-attention`](plugins/notify-attention/README.md) | Cross-platform attention sound on `Notification` | Opt-in |

See each plugin's README for setup and sound customization.

### notify-sound vs notify-attention

- **notify-attention** — only when Claude is blocked on you (permission prompt, idle,
  waiting for input). Good for running Claude in the background.
- **notify-sound** — on every completed turn. Good if you want a beat on each response.

They can be installed together (different sounds) or independently.

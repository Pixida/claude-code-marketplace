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

## Current plugins

| Plugin | Purpose | Default |
| ------ | ------- | ------- |
| `notify-sound` | Cross-platform completion sound on `Stop` | Opt-in |
| `notify-attention` | Cross-platform attention sound on `Notification` | Opt-in |

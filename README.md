# pixida-marketplace

Pixida's internal **Claude Code plugin marketplace**. This repo is the single,
MR-reviewed source of truth for approved Claude Code customizations (hooks, agents,
skills, MCP servers) across our three org environments.

## Why this exists

Our managed settings lock hook/agent customization to plugins from approved
marketplaces (`strictPluginOnlyCustomization`). That means individual users and
cloned repos **cannot** inject their own hooks — a deliberate guard against
repo-supplied hook RCE. Approved customizations flow through *this* marketplace
instead, where every change goes through a merge request and review.

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
       { "source": "hostPattern", "hostPattern": "^gitlab\\.pixida\\.com$" }
   ]
   ```

2. **Auto-registers** the marketplace so users don't run `/plugin marketplace add`:

   ```json
   "extraKnownMarketplaces": {
       "pixida-marketplace": {
           "source": {
               "source": "url",
               "url": "https://gitlab.pixida.com/majesticmint/marketplace.git"
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

Because this is a private repo, Claude Code needs to clone it. `url` sources clone
over **SSH by default**, which uses each developer's existing GitLab SSH key — no
token to distribute. To clone over HTTPS instead, set
`CLAUDE_CODE_PLUGIN_PREFER_HTTPS=1` and configure a git credential helper, or use a
read-only deploy token. Do **not** embed a token in the URL inside managed settings.

`gitlab.pixida.com` is already in the sandbox network allowlist for all three orgs.

## Validate before pushing

```
claude plugin validate .
```

## Current plugins

| Plugin | Purpose | Default |
| ------ | ------- | ------- |
| `notify-sound` | Cross-platform completion sound on `Stop` | Opt-in |
| `notify-attention` | Cross-platform attention sound on `Notification` | Opt-in |

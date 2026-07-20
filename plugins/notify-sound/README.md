# notify-sound

Plays a short sound when Claude Code finishes a turn (the `Stop` hook). Opt-in.

## What it does

On every `Stop` event, it runs a small cross-platform Node one-liner that plays a
system sound:

- **macOS** — `afplay /System/Library/Sounds/Glass.aiff`
- **Windows** — PowerShell `[System.Media.SystemSounds]::Asterisk.Play()`
- **Linux** — `paplay /usr/share/sounds/freedesktop/stereo/complete.oga`
- **Fallback** — terminal bell (``) if none of the above are available

The command relies only on Node, which Claude Code already requires, so the exact
same hook works on all three platforms. It spawns the player detached and returns
immediately, so it never blocks Claude.

## Opt out

Set an environment variable in your shell profile:

```bash
export CLAUDE_HOOK_SOUND=off
```

The hook checks this on every run and no-ops when set.

## Enable / disable the plugin

This plugin is opt-in — it does nothing until enabled.

```
/plugin marketplace add Pixida/claude-code-marketplace
/plugin install notify-sound@pixida-marketplace
```

On fleets where the marketplace is auto-registered via `extraKnownMarketplaces`
(see the repo README), skip the first line and just run the install.

## Notes / caveats

- **Windows** should get one real test — the PowerShell path can't be verified on
  macOS/Linux.
- **Linux** assumes PulseAudio/PipeWire (`paplay`). Headless boxes without an audio
  server fall back to the terminal bell.
- Fires on **every** turn completion. If that's too chatty, the `Notification` hook
  (fires only when Claude needs attention) is a quieter alternative — swap the event
  name in `hooks/hooks.json`.

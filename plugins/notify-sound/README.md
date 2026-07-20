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

## Pick your own sound

Set `CLAUDE_HOOK_SOUND_STOP` to the path of a sound file to override the default:

```bash
export CLAUDE_HOOK_SOUND_STOP=/System/Library/Sounds/Funk.aiff   # macOS
export CLAUDE_HOOK_SOUND_STOP=/usr/share/sounds/freedesktop/stereo/bell.oga   # Linux
export CLAUDE_HOOK_SOUND_STOP=C:\Windows\Media\notify.wav   # Windows / WSL (Windows-side path)
```

The path is handed straight to the platform's native player (`afplay`, `paplay`/`aplay`,
or PowerShell's `SoundPlayer`) — no shell interpolation involved, so it's safe even if
the path contains spaces or special characters. If the path is wrong or unplayable, the
hook fails silently (no fallback bell) rather than crashing — verify the sound plays
once after setting it. On WSL, this must be a path reachable from the Linux side
(`paplay`/`aplay`), since the Windows PowerShell fallback branch keeps using the
default system sound.

## Enable / disable the plugin

This plugin is opt-in — it does nothing until enabled.

```
/plugin marketplace add Pixida/claude-code-marketplace
/plugin install notify-sound@pixida-marketplace
```

On fleets where the marketplace is auto-registered via `extraKnownMarketplaces`
(see the repo README), skip the first line and just run the install.

## Editing this hook

The logic also lives readably at `scripts/play.js` — but that file is a **reference
copy only**, not what actually runs. `hooks.json`'s `command` embeds a minified,
triple-escaped (JSON → shell → JS) copy of the same code, because
`${CLAUDE_PLUGIN_ROOT}` — the documented way for a plugin to reference its own
bundled files from a hook command — does not reliably resolve inside `hooks.json`,
including for plugins installed from a registered marketplace (not just local/dev
installs). See [anthropics/claude-code#9354](https://github.com/anthropics/claude-code/issues/9354).

To change the behavior: edit `scripts/play.js`, test it directly with `node
scripts/play.js` (set `CLAUDE_HOOK_SOUND_STOP`/`CLAUDE_HOOK_SOUND=off` as needed),
then hand-transcribe the result into the `command` string in `hooks/hooks.json` and
re-test the actual hook end-to-end. Once `${CLAUDE_PLUGIN_ROOT}` is fixed upstream,
`hooks.json` can switch to `node "${CLAUDE_PLUGIN_ROOT}/scripts/play.js"` and this
duplication goes away.

## Notes / caveats

- **Windows** should get one real test — the PowerShell path can't be verified on
  macOS/Linux.
- **Linux** assumes PulseAudio/PipeWire (`paplay`). Headless boxes without an audio
  server fall back to the terminal bell.
- Fires on **every** turn completion. If that's too chatty, the `Notification` hook
  (fires only when Claude needs attention) is a quieter alternative — swap the event
  name in `hooks/hooks.json`.

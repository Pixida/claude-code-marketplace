# notify-attention

Plays a sound when Claude Code **needs you** — the `Notification` hook. This fires on
events like a permission prompt, an idle prompt, or when Claude is waiting for input.
Unlike `notify-sound` (which chimes on every turn completion), this only sounds when
your attention is actually required. Opt-in.

## What it does

On a `Notification` event, it plays a distinct "attention" sound so it's audibly
different from the completion chime:

- **macOS** — `afplay /System/Library/Sounds/Ping.aiff`
- **Windows** — PowerShell `[System.Media.SystemSounds]::Exclamation.Play()`
- **Linux** — `paplay /usr/share/sounds/freedesktop/stereo/dialog-information.oga`
- **Fallback** — terminal bell (``) if none are available

Same design as `notify-sound`: pure Node one-liner (identical on all platforms),
spawned detached so it never blocks Claude.

The command relies only on Node, which Claude Code already requires, so the exact
same hook works on all three platforms. It spawns the player detached and returns
immediately, so it never blocks Claude.

> ⚠️ **WSL users: install PulseAudio first, or you'll get no sound at all.**
> This plugin runs inside the Linux side of WSL, so it uses `paplay`/`aplay`, not the
> Windows sound system. Most WSL distros don't ship with an audio player. Install one:
> ```bash
> sudo apt install pulseaudio-utils   # provides paplay
> ```
> Without this, the hook will silently fail — no error, but just use the default sound of windows and not your configured custom sound.

## Opt out

```bash
export CLAUDE_HOOK_SOUND=off
```

The same variable silences both `notify-attention` and `notify-sound`.

## Pick your own sound

Set `CLAUDE_HOOK_SOUND_ATTENTION` to the path of a sound file to override the default:

```bash
export CLAUDE_HOOK_SOUND_ATTENTION=/System/Library/Sounds/Sosumi.aiff   # macOS
export CLAUDE_HOOK_SOUND_ATTENTION=/usr/share/sounds/freedesktop/stereo/bell.oga   # Linux
export CLAUDE_HOOK_SOUND_ATTENTION=C:\Windows\Media\notify.wav   # Windows / WSL (Windows-side path)
```

The path is handed straight to the platform's native player (`afplay`, `paplay`/`aplay`,
or PowerShell's `SoundPlayer`) — no shell interpolation involved, so it's safe even if
the path contains spaces or special characters. If the path is wrong or unplayable, the
hook fails silently (no fallback bell) rather than crashing — verify the sound plays
once after setting it. On WSL, this must be a path reachable from the Linux side
(`paplay`/`aplay`), since the Windows PowerShell fallback branch keeps using the
default system sound.

## Enable

```
/plugin install notify-attention@pixida-marketplace
```

## Which one should I use?

- **notify-attention** — quieter: only sounds when Claude is blocked on you. Good for
  running Claude in the background.
- **notify-sound** — sounds on every completed turn. Good if you want a beat on each
  response.

They can be installed together (different sounds) or independently.

## Editing this hook

The logic also lives readably at `scripts/play.js` — but that file is a **reference
copy only**, not what actually runs. `hooks.json`'s `command` embeds a minified,
triple-escaped (JSON → shell → JS) copy of the same code, because
`${CLAUDE_PLUGIN_ROOT}` — the documented way for a plugin to reference its own
bundled files from a hook command — does not reliably resolve inside `hooks.json`,
including for plugins installed from a registered marketplace (not just local/dev
installs). See [anthropics/claude-code#9354](https://github.com/anthropics/claude-code/issues/9354).

To change the behavior: edit `scripts/play.js`, test it directly with `node
scripts/play.js` (set `CLAUDE_HOOK_SOUND_ATTENTION`/`CLAUDE_HOOK_SOUND=off` as
needed), then hand-transcribe the result into the `command` string in
`hooks/hooks.json` and re-test the actual hook end-to-end. Once
`${CLAUDE_PLUGIN_ROOT}` is fixed upstream, `hooks.json` can switch to `node
"${CLAUDE_PLUGIN_ROOT}/scripts/play.js"` and this duplication goes away.

## Caveats

- **Windows** should get one real test — the PowerShell path can't be verified on
  macOS/Linux.
- **Linux** assumes PulseAudio/PipeWire (`paplay`); headless boxes fall back to the bell.

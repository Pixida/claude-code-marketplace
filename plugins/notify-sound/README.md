# notify-sound
Plays a short sound when Claude Code finishes a turn (the `Stop` hook). Opt-in.

## What it does
On every `Stop` event, it runs a small cross-platform Node one-liner that plays a
system sound:
- **macOS** — `afplay /System/Library/Sounds/Glass.aiff`
- **Windows** — PowerShell `[System.Media.SystemSounds]::Asterisk.Play()`
- **Linux** — `paplay /usr/share/sounds/freedesktop/stereo/complete.oga`
- **Fallback** — terminal bell (``) if none of the above are available

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
export CLAUDE_HOOK_SOUND_STOP=C:\Windows\Media\notify.wav   # Windows
export CLAUDE_HOOK_SOUND_STOP=/mnt/c/Windows/Media/notify.wav   # WSL (same file, Linux mount path)
```
The path is handed straight to the platform's native player (`afplay`, `paplay`/`aplay`,
or PowerShell's `SoundPlayer`) — no shell interpolation involved, so it's safe even if
the path contains spaces or special characters. If the path is wrong or unplayable, the
hook fails silently (no fallback bell) rather than crashing — verify the sound plays
once after setting it.

**WSL:** the path is played via `paplay`/`aplay` (see the PulseAudio requirement above),
not the Windows PowerShell branch, so it must be a path those Linux tools can open — a
raw Windows-syntax path like `C:\Windows\Media\notify.wav` will **not** work. A
Windows-side file still works if you reference it through its WSL mount, e.g.
`/mnt/c/Windows/Media/notify.wav`.

## Enable / disable the plugin
This plugin is opt-in — it does nothing until enabled.

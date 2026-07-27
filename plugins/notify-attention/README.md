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
export CLAUDE_HOOK_SOUND_ATTENTION=C:\Windows\Media\notify.wav   # Windows
export CLAUDE_HOOK_SOUND_ATTENTION=/mnt/c/Windows/Media/notify.wav   # WSL (same file, Linux mount path)
```

The path is handed straight to the platform's native player (`afplay`, `paplay`/`aplay`,
or PowerShell's `SoundPlayer`) — no shell interpolation involved, so it's safe even if
the path contains spaces or special characters. If the path is wrong or unplayable, the
hook fails silently (no fallback bell) rather than crashing — verify the sound plays
once after setting it. On WSL, the path is played via `paplay`/`aplay`, not the Windows
PowerShell branch, so it must be a path those Linux tools can open — a raw Windows-syntax
path like `C:\Windows\Media\notify.wav` will **not** work. A Windows-side file still works
if you reference it through its WSL mount, e.g. `/mnt/c/Windows/Media/notify.wav`.

## Enable

```
/plugin install notify-attention@pixida-marketplace
```

## Caveats

- **Windows** should get one real test — the PowerShell path can't be verified on
  macOS/Linux.
- **Linux** assumes PulseAudio/PipeWire (`paplay`); headless boxes fall back to the bell.

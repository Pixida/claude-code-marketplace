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

## Opt out

```bash
export CLAUDE_HOOK_SOUND=off
```

The same variable silences both `notify-attention` and `notify-sound`.

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

## Caveats

- **Windows** should get one real test — the PowerShell path can't be verified on
  macOS/Linux.
- **Linux** assumes PulseAudio/PipeWire (`paplay`); headless boxes fall back to the bell.

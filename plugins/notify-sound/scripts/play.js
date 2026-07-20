// Reference copy only — NOT executed directly. ${CLAUDE_PLUGIN_ROOT} does not
// reliably resolve inside hooks.json commands (anthropics/claude-code#9354), so
// hooks.json embeds a minified copy of this exact logic instead of requiring
// this file. Edit here for readability, then hand-transcribe into hooks.json
// and re-test (see README "Editing this hook" section).

const os = require('os');
const cp = require('child_process');
const fs = require('fs');

if (process.env.CLAUDE_HOOK_SOUND === 'off') process.exit(0);

const custom = process.env.CLAUDE_HOOK_SOUND_STOP;
const p = os.platform();

function isWSL() {
  try {
    return /microsoft/i.test(fs.readFileSync('/proc/version', 'utf8'));
  } catch (e) {
    return false;
  }
}

function bell() {
  process.stdout.write('');
}

function tryRun(cmds, i) {
  if (i >= cmds.length) {
    bell();
    return;
  }
  const c = cmds[i];
  try {
    const ch = cp.spawn(c[0], c[1], { stdio: 'ignore', detached: true });
    ch.on('error', () => tryRun(cmds, i + 1));
    ch.unref();
  } catch (e) {
    tryRun(cmds, i + 1);
  }
}

let cmds;
if (p === 'darwin') {
  cmds = [['afplay', [custom || '/System/Library/Sounds/Glass.aiff']]];
} else if (p === 'win32') {
  cmds = custom
    ? [['powershell', ['-NoProfile', '-c', '(New-Object Media.SoundPlayer $env:CLAUDE_HOOK_SOUND_STOP).PlaySync()']]]
    : [['powershell', ['-NoProfile', '-c', '[System.Media.SystemSounds]::Asterisk.Play()']]];
} else if (isWSL()) {
  cmds = custom
    ? [
        ['paplay', [custom]],
        ['aplay', [custom]],
        ['powershell.exe', ['-NoProfile', '-c', '[System.Media.SystemSounds]::Asterisk.Play()']],
      ]
    : [
        ['powershell.exe', ['-NoProfile', '-c', '[System.Media.SystemSounds]::Asterisk.Play()']],
        ['paplay', ['/usr/share/sounds/freedesktop/stereo/complete.oga']],
        ['aplay', ['/usr/share/sounds/freedesktop/stereo/complete.oga']],
      ];
} else {
  cmds = [
    ['paplay', [custom || '/usr/share/sounds/freedesktop/stereo/complete.oga']],
    ['aplay', [custom || '/usr/share/sounds/freedesktop/stereo/complete.oga']],
  ];
}

tryRun(cmds, 0);

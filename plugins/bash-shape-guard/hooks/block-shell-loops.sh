#!/usr/bin/env bash
# PreToolUse guard (Claude Code hook).
# Blocks Bash commands that wrap work in shell control flow (for/while/until/if/case/select)
# or that reference `$?` -- both are AST shapes the permission analyser can never auto-allow.
# Exit 2 blocks the tool call and feeds stderr back to the model, which then retries.
# Records one line in .claude/hooks.log either way (see _log.sh).
#
# Why this is a hook and not just a CLAUDE.md rule: the offending commands come from the
# Explore SUBagent, which never receives CLAUDE.md (built-in Explore/Plan omit it by design).
# Hooks fire for every agent's tool calls, so this is the only deterministic lever.
#
# The permission analyser parses each command with tree-sitter-bash and refuses any AST node
# in its rejection set -- for_statement, while_statement, if_statement, case_statement,
# simple_expansion ($f, $?), expansion (${f}), command_substitution, subshell, heredocs and
# more. It then reports e.g. "Contains simple_expansion" and asks the user to approve. A loop
# over files can NEVER be auto-allowed, and approving it stores an exact one-off string that
# never matches again.
#
# Deliberately narrow: it does NOT police `$VAR` / `$(...)` in general, because those appear
# legitimately inside quoted grep/sed patterns and a textual test would produce false
# positives. `$?` is the exception: a literal `$?` inside a regex pattern would mean
# "optional empty string" -- nonsense nobody writes -- so a fixed-string check for it is
# near-zero-risk and catches the `; echo "--- exit $? ---"` banner pattern.
# Everything else stays guidance in CLAUDE.md ("Bash command shape").
#
# Shell notes:
#   - No `set -e` and no `pipefail`: the script must fail OPEN (a broken hook must not
#     block all Bash calls), and `pipefail` + `grep -q` is a latent bug anyway -- grep -q
#     exits on first match, printf can then die of SIGPIPE (141), and the pipeline "fails"
#     despite having matched. We avoid the whole class by using herestrings, not pipes.
set -u

# Logging is best-effort: define a no-op fallback first so a missing/broken _log.sh
# degrades to "no logs" instead of spamming "command not found" into the model's stderr.
hook_log() { :; }
# shellcheck source=./_log.sh
source "$(dirname "${BASH_SOURCE[0]}")/_log.sh" 2>/dev/null || true

input=$(cat)

# Extract .tool_input.command. Prefer jq; fall back to python3 so a missing jq doesn't
# silently disable the guard. If neither works, fail open (empty cmd).
if command -v jq >/dev/null 2>&1; then
    cmd=$(jq -r '.tool_input.command // empty' <<<"$input" 2>/dev/null) || cmd=""
else
    cmd=$(python3 -c '
import json, sys
try:
    print(json.load(sys.stdin).get("tool_input", {}).get("command", ""), end="")
except Exception:
    pass
' <<<"$input" 2>/dev/null) || cmd=""
fi

if [ -z "$cmd" ]; then
    hook_log block-shell-loops "skipped=no-command"
    exit 0
fi

# Three detectors. The first two are anchored so they cannot fire on a command that merely
# *contains* the word -- `grep -n "if x" file`, or even an unquoted `grep -rn then <file>`:
#   1. a line STARTS with a control-flow keyword (grep -E works per line, so this also
#      catches newline-separated loops);
#   2. a body opener follows a `;`, `&`, `|` or start-of-line, which is the only place real
#      shell syntax puts `do` / `then`. Requiring that separator rather than plain
#      whitespace is what keeps `grep -rn then <file>` allowed.
#   3. a literal `$?` anywhere (fixed-string match, see rationale above).
reason=""
if grep -qE '^[[:space:]]*(for|while|until|if|case|select)[[:space:]]' <<<"$cmd"; then
    reason="starts with a shell control-flow keyword"
elif grep -qE '(^|[;&|])[[:space:]]*(do|then)([[:space:]]|$)' <<<"$cmd"; then
    reason="contains a loop/conditional body"
elif grep -qF '$?' <<<"$cmd"; then
    reason='uses $? (simple_expansion -- can never be auto-allowed)'
fi

if [ -n "$reason" ]; then
    hook_log block-shell-loops "action=BLOCKED reason=$reason"
    cat >&2 <<'MSG'
Refusing this Bash call: it uses shell control flow or `$?`, which can never be auto-allowed
and always triggers a permission prompt (the analyser rejects for_statement / if_statement /
simple_expansion nodes outright).

Rewrite it as one plain command, or use a tool:

  - Reading several files? Pass them all to ONE command instead of looping:
        tail -n +1 <path> <path> <path>
    That prints a "==> path <==" header per file. Note: `head -v` is GNU-only and fails on
    macOS. Better still, make parallel Read calls -- they have no permission surface at all.
  - Need per-file line numbers? `grep -n "" <path> <path>` prefixes every line with path:lineno.
  - Do NOT echo exit-status banners (`echo "--- exit $? ---"`): the Bash tool already
    reports each command's exit code -- just run the command bare.
  - Genuinely need logic? Put it in a Python script and run `uv run python <script>`.

See the "Bash command shape (avoiding permission prompts)" section of CLAUDE.md.
MSG
    exit 2
fi

hook_log block-shell-loops "action=allowed"
exit 0

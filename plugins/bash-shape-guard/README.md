# bash-shape-guard
Blocks Bash commands whose *shape* can never be auto-allowed by Claude Code's permission
analyser, and asks Claude to rewrite them. Opt-in, block-only — it grants no new permissions.

## What it does
On every `PreToolUse` Bash call, it inspects `tool_input.command` for:
- shell control-flow (`for` / `while` / `until` / `if` / `case` / `select`)
- a loop or conditional body opener (`do` / `then`)
- a literal `$?`

These are AST shapes (`for_statement`, `if_statement`, `simple_expansion`, ...) that the
permission analyser rejects outright, so the command always triggers a permission prompt —
and approving it only stores an exact one-off string that never matches again. When the guard
detects one of these shapes it exits 2, blocking the call and returning guidance on stderr so
Claude rewrites the command as a plain, auto-allowable one (or reaches for a tool instead of a
loop). Every other command passes through untouched — the hook never grants or expands any
permission.

## Why a hook and not just a CLAUDE.md rule
Built-in subagents like Explore and Plan never receive CLAUDE.md, so a plain instruction there
would not reach them. Hooks fire for every agent's tool calls regardless of which agent issued
them, which makes this the only deterministic lever for this class of Bash command.

## Enable it
```
/plugin install bash-shape-guard@pixida-marketplace
```
It is opt-in — installing the marketplace does not enable it automatically.

## Fails open
The hook has no `set -e`/`pipefail`, and `_log.sh` is sourced best-effort with a no-op
fallback. If the script or its logger is missing, broken, or errors out, it exits 0 and never
blocks Bash calls — a failure in the guard degrades to "no guard", not "no Bash".

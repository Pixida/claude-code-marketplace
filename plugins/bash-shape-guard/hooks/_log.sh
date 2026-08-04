#!/usr/bin/env bash
# Minimal best-effort logger sourced by the hook. Appends one line to .claude/hooks.log.
# Must never fail the hook: all errors are swallowed.
hook_log() {
    local dir="${CLAUDE_PROJECT_DIR:-.}/.claude"
    mkdir -p "$dir" 2>/dev/null || return 0
    printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" >> "$dir/hooks.log" 2>/dev/null || true
}

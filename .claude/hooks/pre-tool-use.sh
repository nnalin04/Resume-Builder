#!/usr/bin/env bash
# ============================================================
# Claude Code — PreToolUse Hook
#
# Runs before every tool call. Provides:
#   1. Safety: adds -i flag to bare `rm` commands (interactive confirm)
#   2. Aliases: ll → ls -lah, la → ls -la
#   3. Path guard: warns on destructive ops in /opt, /etc, /usr
#
# Input:  JSON on stdin  { tool_name, tool_input: { command, ... } }
# Output: JSON on stdout (modified or pass-through)
# ============================================================

INPUT=$(cat)
TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty')

# Only intercept Bash tool calls
if [[ "$TOOL" != "Bash" ]]; then
  echo "$INPUT"
  exit 0
fi

COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if [[ -z "$COMMAND" ]]; then
  echo "$INPUT"
  exit 0
fi

MODIFIED="$COMMAND"
NOTE=""

# ── 1. Safety: add -i to bare rm (not already flagged, not rm -rf) ─────────
if echo "$MODIFIED" | grep -qE '^rm\s' && \
   ! echo "$MODIFIED" | grep -qE 'rm\s.*-[a-zA-Z]*[iI]' && \
   ! echo "$MODIFIED" | grep -qE 'rm\s.*-rf'; then
  MODIFIED=$(echo "$MODIFIED" | sed 's/^rm /rm -i /')
  NOTE="[hook: added -i for interactive confirm]"
fi

# ── 2. Aliases ──────────────────────────────────────────────────────────────
case "$MODIFIED" in
  "ll"|"ll "*)  MODIFIED=$(echo "$MODIFIED" | sed 's/^ll/ls -lah/') ;;
  "la"|"la "*)  MODIFIED=$(echo "$MODIFIED" | sed 's/^la/ls -la/')  ;;
esac

# ── 3. Path guard: warn on write to system dirs ─────────────────────────────
if echo "$MODIFIED" | grep -qE '(/etc/|/usr/|/opt/|/System/)' && \
   echo "$MODIFIED" | grep -qE '^(rm|mv|cp|chmod|chown|sed -i|awk.*>)'; then
  NOTE="$NOTE [hook: ⚠ writing to system path — confirm this is intentional]"
fi

# Output (pass-through if no changes)
if [[ "$MODIFIED" == "$COMMAND" && -z "$NOTE" ]]; then
  echo "$INPUT"
else
  echo "$INPUT" | jq \
    --arg cmd "$MODIFIED" \
    --arg note "$NOTE" \
    '.tool_input.command = $cmd | if $note != "" then .tool_input.description = ((.tool_input.description // "") + " " + $note) else . end'
fi

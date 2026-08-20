#!/usr/bin/env bash
# Local tests for scripts/sync-docs.sh. Runs entirely in a temporary directory
# and never touches the real repositories or their .git history.
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SYNC="$SCRIPT_DIR/sync-docs.sh"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

PUBLIC="$TMP/public"
PRIVATE="$TMP/private"

mkdir -p "$PUBLIC/docs/cn"
cat > "$PUBLIC/docs/index.md" <<'EOF'
# Home
EOF
cat > "$PUBLIC/docs/guide.md" <<'EOF'
# Guide
EOF
cat > "$PUBLIC/docs/cn/index.md" <<'EOF'
# 首页
EOF
cat > "$PUBLIC/docs/README.md" <<'EOF'
# Contribution guide (must not be synced)
EOF

mkdir -p "$PRIVATE/docs/.vitepress" "$PRIVATE/docs/src/pro"
echo '{}' > "$PRIVATE/package.json"
echo 'export default {}' > "$PRIVATE/docs/.vitepress/config.ts"
echo 'SECRET' > "$PRIVATE/docs/src/pro/secret.md"
echo 'OLD CONTENT' > "$PRIVATE/docs/src/guide.md"

pass=0
fail=0

ok() { pass=$((pass + 1)); echo "ok   - $1"; }
bad() { fail=$((fail + 1)); echo "FAIL - $1"; }

assert_eq() {
  if [ "$2" = "$3" ]; then ok "$1"; else bad "$1 (expected '$2', got '$3')"; fi
}
assert_exists() {
  if [ -f "$2" ]; then ok "$1"; else bad "$1 (missing file $2)"; fi
}
assert_absent() {
  if [ ! -e "$2" ]; then ok "$1"; else bad "$1 (file should not exist: $2)"; fi
}

SRC="$PUBLIC/docs"
DEST="$PRIVATE/docs/src"

echo "== initial sync (add) =="
"$SYNC" "$SRC" "$PRIVATE" >/dev/null
assert_exists "add: index.md synced" "$DEST/index.md"
assert_exists "add: cn/index.md synced" "$DEST/cn/index.md"
assert_eq "add: guide.md content replaced" "# Guide" "$(cat "$DEST/guide.md")"
assert_absent "exclude: README.md is not synced" "$DEST/README.md"

echo "== modify =="
printf '# Guide updated\n' > "$PUBLIC/docs/guide.md"
"$SYNC" "$SRC" "$PRIVATE" >/dev/null
assert_eq "modify: guide.md content updated" "# Guide updated" "$(cat "$DEST/guide.md")"

echo "== delete =="
rm -f "$PUBLIC/docs/guide.md"
"$SYNC" "$SRC" "$PRIVATE" >/dev/null
assert_absent "delete: guide.md removed from target" "$DEST/guide.md"

echo "== protected pro/ and .vitepress =="
assert_eq "protect: pro/secret.md unchanged" "SECRET" "$(cat "$DEST/pro/secret.md")"
assert_eq "protect: .vitepress/config.ts unchanged" "export default {}" "$(cat "$PRIVATE/docs/.vitepress/config.ts")"

echo "== filename with spaces =="
printf '# Space page\n' > "$PUBLIC/docs/my page.md"
"$SYNC" "$SRC" "$PRIVATE" >/dev/null
assert_exists "space: 'my page.md' synced" "$DEST/my page.md"
assert_eq "space: content matches" "# Space page" "$(cat "$DEST/my page.md")"

echo "== no-op sync =="
OUT="$("$SYNC" "$SRC" "$PRIVATE")"
case "$OUT" in
  "No changes to sync.") ok "no-op: reported no changes" ;;
  *) bad "no-op: unexpected output: $OUT" ;;
esac

echo "== safe failures (target must not be deleted) =="
# Empty source directory (no index.md).
EMPTY="$TMP/empty"
mkdir -p "$EMPTY"
if "$SYNC" "$EMPTY" "$PRIVATE" >/dev/null 2>&1; then
  bad "safe-fail: empty source should fail"
else
  ok "safe-fail: empty source fails"
fi
assert_exists "safe-fail: target index.md still present" "$DEST/index.md"

# Wrong target (missing package.json and .vitepress/config.ts).
BADTARGET="$TMP/badtarget"
mkdir -p "$BADTARGET"
if "$SYNC" "$SRC" "$BADTARGET" >/dev/null 2>&1; then
  bad "safe-fail: wrong target should fail"
else
  ok "safe-fail: wrong target fails"
fi

# Source missing index.md.
NOINDEX="$TMP/noindex"
mkdir -p "$NOINDEX"
echo 'x' > "$NOINDEX/other.md"
if "$SYNC" "$NOINDEX" "$PRIVATE" >/dev/null 2>&1; then
  bad "safe-fail: missing index.md should fail"
else
  ok "safe-fail: missing index.md fails"
fi
assert_exists "safe-fail: target index.md still present after failures" "$DEST/index.md"

echo "== target without a pro/ directory (matches a fresh website checkout) =="
NOPRO="$TMP/nopro"
mkdir -p "$NOPRO/docs/.vitepress" "$NOPRO/docs/src"
echo '{}' > "$NOPRO/package.json"
echo 'export default {}' > "$NOPRO/docs/.vitepress/config.ts"
if "$SYNC" "$SRC" "$NOPRO" >/dev/null 2>&1; then
  ok "no-pro: sync succeeds when target has no pro/ dir"
else
  bad "no-pro: sync failed on target without pro/ dir"
fi
assert_exists "no-pro: index.md synced" "$NOPRO/docs/src/index.md"

echo ""
echo "pass=$pass fail=$fail"
[ "$fail" -eq 0 ]

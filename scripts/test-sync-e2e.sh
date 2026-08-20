#!/usr/bin/env bash
# Local end-to-end sandbox test for scripts/sync-docs.sh.
#
# Builds a public fixture from the real moe-icons/docs tree and a private
# fixture from the real website docs skeleton (without .git or secrets), then
# exercises add/modify/delete/protection/idempotency/safe-failure scenarios.
# Nothing here touches the real repositories or any remote.
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SYNC="$SCRIPT_DIR/sync-docs.sh"

# Locate the website checkout (sibling in the local workspace, overridable).
WEBSITE="${WEBSITE:-$REPO_ROOT/../moe-icons-website}"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

PUBLIC="$TMP/public"
PRIVATE="$TMP/private"

echo "== preparing fixtures =="
mkdir -p "$PUBLIC"
cp -R "$REPO_ROOT/docs" "$PUBLIC/docs"

mkdir -p "$PRIVATE"
# Copy only the docs skeleton (VitePress config + content), never .git or secrets.
mkdir -p "$PRIVATE/docs/.vitepress"
cp "$WEBSITE/docs/.vitepress/config.ts" "$PRIVATE/docs/.vitepress/config.ts"
mkdir -p "$PRIVATE/docs/src"
cp -R "$WEBSITE/docs/src/." "$PRIVATE/docs/src/"
# A stub package.json satisfies the checkout guard without copying real secrets.
echo '{ "name": "website-fixture", "private": true }' > "$PRIVATE/package.json"

# Private-only protected content.
mkdir -p "$PRIVATE/docs/src/pro"
echo 'PRIVATE ONLY' > "$PRIVATE/docs/src/pro/private-only.md"

SRC="$PUBLIC/docs"
DEST="$PRIVATE/docs/src"
CONFIG="$PRIVATE/docs/.vitepress/config.ts"

pass=0
fail=0
ok() { pass=$((pass + 1)); echo "ok   - $1"; }
bad() { fail=$((fail + 1)); echo "FAIL - $1"; }
assert_eq() { if [ "$2" = "$3" ]; then ok "$1"; else bad "$1 (expected '$2', got '$3')"; fi; }
assert_exists() { if [ -f "$2" ]; then ok "$1"; else bad "$1 (missing $2)"; fi; }
assert_absent() { if [ ! -e "$2" ]; then ok "$1"; else bad "$1 (should not exist: $2)"; fi; }

CONFIG_HASH_BEFORE="$(shasum -a 256 "$CONFIG" | awk '{print $1}')"
PRO_HASH_BEFORE="$(find "$DEST/pro" -type f | sort | while IFS= read -r f; do shasum -a 256 "$f"; done)"

echo ""
echo "== 1. first full sync =="
"$SYNC" "$SRC" "$PRIVATE"
assert_absent "exclude: README.md is not synced" "$DEST/README.md"

echo ""
echo "== 2. add =="
printf '# New page\n' > "$SRC/new-page.md"
"$SYNC" "$SRC" "$PRIVATE"
assert_exists "add: new-page.md appears" "$DEST/new-page.md"

echo ""
echo "== 3. modify =="
printf '# Home updated\n' > "$SRC/index.md"
"$SYNC" "$SRC" "$PRIVATE"
assert_eq "modify: index.md matches source" "$(cat "$SRC/index.md")" "$(cat "$DEST/index.md")"

echo ""
echo "== 4. delete =="
rm -f "$SRC/new-page.md"
"$SYNC" "$SRC" "$PRIVATE"
assert_absent "delete: new-page.md removed" "$DEST/new-page.md"

echo ""
echo "== 5. idempotency (second identical sync must be a no-op) =="
OUT="$("$SYNC" "$SRC" "$PRIVATE")"
case "$OUT" in
  "No changes to sync.") ok "idempotent: second sync reports no changes" ;;
  *) bad "idempotent: unexpected output: $OUT" ;;
esac

echo ""
echo "== 6. protection after all syncs =="
assert_eq "protect: config.ts unchanged" "$CONFIG_HASH_BEFORE" "$(shasum -a 256 "$CONFIG" | awk '{print $1}')"
assert_eq "protect: pro/ unchanged" "$PRO_HASH_BEFORE" "$(find "$DEST/pro" -type f | sort | while IFS= read -r f; do shasum -a 256 "$f"; done)"
assert_eq "protect: pro/private-only.md content" "PRIVATE ONLY" "$(cat "$DEST/pro/private-only.md")"

echo ""
echo "== 7. safe failure on missing index.md =="
mv "$SRC/index.md" "$SRC/index.md.bak"
if "$SYNC" "$SRC" "$PRIVATE" >/dev/null 2>&1; then
  bad "safe-fail: missing index.md should fail"
else
  ok "safe-fail: missing index.md fails"
fi
mv "$SRC/index.md.bak" "$SRC/index.md"
assert_exists "safe-fail: target index.md still present" "$DEST/index.md"

echo ""
echo "pass=$pass fail=$fail"
[ "$fail" -eq 0 ]

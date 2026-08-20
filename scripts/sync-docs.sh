#!/usr/bin/env bash
# Sync public Free docs from the moe-icons repository into a website checkout's
# docs/src directory.
#
# This script only mirrors files. It never commits, pushes, or reads secrets.
# Callers (GitHub Actions) are responsible for any git operations.
set -euo pipefail

usage() {
  echo "Usage: $0 <public-docs-dir> <website-checkout-dir>" >&2
  exit 2
}

SRC_ARG="${1:-}"
CHECKOUT_ARG="${2:-}"
[ -n "$SRC_ARG" ] || usage
[ -n "$CHECKOUT_ARG" ] || usage

# Validate that both directories exist before resolving absolute paths, so a
# missing path produces a clear error instead of a shell `cd` failure.
if [ ! -d "$SRC_ARG" ]; then
  echo "error: source docs dir does not exist: $SRC_ARG" >&2
  exit 1
fi
if [ ! -d "$CHECKOUT_ARG" ]; then
  echo "error: target checkout dir does not exist: $CHECKOUT_ARG" >&2
  exit 1
fi

SRC="$(cd "$SRC_ARG" && pwd)"
CHECKOUT="$(cd "$CHECKOUT_ARG" && pwd)"

# Refuse dangerous source roots before any file is removed.
case "$SRC" in
  /)
    echo "error: source dir must not be the filesystem root" >&2
    exit 1
    ;;
  "$HOME")
    echo "error: source dir must not be the home directory" >&2
    exit 1
    ;;
esac
if [ -e "$SRC/.git" ]; then
  echo "error: source dir must not be a git repository root: $SRC" >&2
  exit 1
fi

# Source must contain index.md.
if [ ! -f "$SRC/index.md" ]; then
  echo "error: source docs dir is missing index.md: $SRC" >&2
  exit 1
fi

# Target must be a website checkout.
if [ ! -f "$CHECKOUT/package.json" ]; then
  echo "error: target is not a website checkout (missing package.json): $CHECKOUT" >&2
  exit 1
fi
if [ ! -f "$CHECKOUT/docs/.vitepress/config.ts" ]; then
  echo "error: target is not a website checkout (missing docs/.vitepress/config.ts): $CHECKOUT" >&2
  exit 1
fi

# The Free docs live in docs/src of the website checkout.
DEST="$CHECKOUT/docs/src"
mkdir -p "$DEST"

# Portable SHA-256 checksum (present on both Linux runners and macOS).
sha256() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
  else
    shasum -a 256 "$1" | awk '{print $1}'
  fi
}

# Record protected state before syncing.
vitepress_checksum() {
  sha256 "$CHECKOUT/docs/.vitepress/config.ts"
}
pro_checksum() {
  # Tolerate a missing pro/ directory: emit nothing and succeed instead of
  # failing the caller under `set -e`.
  if [ -d "$DEST/pro" ]; then
    find "$DEST/pro" -type f | sort | while IFS= read -r f; do
      sha256 "$f"
    done
  fi
}

VITEPRESS_BEFORE="$(vitepress_checksum)"
PRO_BEFORE="$(pro_checksum)"

# Mirror Free docs. Trailing slashes copy the contents of docs/ into docs/src/
# without nesting an extra directory. Exclusions protect the private pro/
# directory and VitePress/theme/secret-like files.
CHANGES="$(rsync --archive --delete --itemize-changes \
  --exclude '/pro/' \
  --exclude 'README.md' \
  --exclude '.DS_Store' \
  --exclude '.vitepress/' \
  --exclude 'cache/' \
  --exclude '.env*' \
  --exclude '*.pem' \
  --exclude '*.key' \
  --exclude 'id_rsa*' \
  --exclude 'id_ed25519*' \
  "$SRC/" "$DEST/")"

# Verify protected state after syncing.
VITEPRESS_AFTER="$(vitepress_checksum)"
PRO_AFTER="$(pro_checksum)"

if [ "$VITEPRESS_BEFORE" != "$VITEPRESS_AFTER" ]; then
  echo "error: docs/.vitepress/config.ts changed unexpectedly during sync" >&2
  exit 1
fi
if [ "$PRO_BEFORE" != "$PRO_AFTER" ]; then
  echo "error: docs/src/pro/ changed unexpectedly during sync" >&2
  exit 1
fi

if [ -z "$CHANGES" ]; then
  echo "No changes to sync."
else
  echo "Synced changes:"
  printf '%s\n' "$CHANGES"
fi

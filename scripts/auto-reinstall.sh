#!/bin/sh
# Runs daily from a LaunchAgent (see docs/AUTO-REINSTALL.md). Reinstalls Finance over the existing
# app when the free signing is 2 days or less from expiring, after backing up the phone's data.
# DRY_RUN=1 checks the phone and makes the backup without building.
set -u

export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8
ROOT=$(cd "$(dirname "$0")/.." && pwd)
STATE="$HOME/Library/Application Support/FinanceReinstall"
BACKUPS="$HOME/Documents/Finance backups"
BUNDLE_ID=com.juandavidbotero.personalfinance
RENEW_DAYS=2
MIN_FREE_GB=3
mkdir -p "$STATE"
LOG="$STATE/reinstall.log"

log() { echo "$(date '+%Y-%m-%d %H:%M') $*" >>"$LOG"; }
notify() { osascript -e "display notification \"$1\" with title \"Finance\"" >/dev/null 2>&1; }
fail() {
  log "FAILED: $1"
  notify "$1"
  exit 1
}

[ -n "${DEVICE:-}" ] || fail "Set DEVICE to the iPhone's id in the LaunchAgent."

# The expiry is saved after each install; without it, the next run renews right away.
if [ -f "$STATE/expires" ] && [ -z "${DRY_RUN:-}" ]; then
  expires=$(date -j -u -f '%Y-%m-%dT%H:%M:%SZ' "$(cat "$STATE/expires")" +%s 2>/dev/null || echo 0)
  days_left=$(((expires - $(date +%s)) / 86400))
  if [ "$days_left" -gt "$RENEW_DAYS" ]; then
    log "Not due: $days_left days left."
    exit 0
  fi
fi

xcrun devicectl list devices 2>/dev/null | grep "$DEVICE" | grep -q available ||
  fail "Couldn't find the iPhone. Connect it to the same Wi-Fi as the Mac; it will try again tomorrow."

free_gb=$(df -g "$ROOT" | awk 'NR==2 {print $4}')
[ "$free_gb" -ge "$MIN_FREE_GB" ] || fail "Only ${free_gb} GB free on the Mac. The reinstall needs ${MIN_FREE_GB} GB."

# The backup comes first, so a failed install can never cost data.
backup="$BACKUPS/$(date +%Y-%m-%d)"
mkdir -p "$backup"
copied=no
for attempt in 1 2 3; do
  if xcrun devicectl device copy from --device "$DEVICE" --domain-type appDataContainer \
    --domain-identifier "$BUNDLE_ID" --source Documents/SQLite --destination "$backup" >/dev/null 2>&1 &&
    [ -f "$backup/finance.db" ]; then
    copied=yes
    break
  fi
  sleep 10
done
[ "$copied" = yes ] || fail "Couldn't back up the phone's data, so nothing was installed."
log "Backed up to $backup"

if [ -n "${DRY_RUN:-}" ]; then
  log "Dry run finished."
  notify "Dry run OK: the iPhone is reachable and its data was backed up."
  exit 0
fi

if ! NO_LAUNCH=1 DEVICE="$DEVICE" "$ROOT/scripts/install-iphone.sh" >>"$LOG" 2>&1; then
  fail "The reinstall failed. Details are in $LOG"
fi

profile="$ROOT/ios/build/Build/Products/Release-iphoneos/Finance.app/embedded.mobileprovision"
expires=$(security cms -D -i "$profile" 2>/dev/null | plutil -extract ExpirationDate raw - 2>/dev/null)
[ -n "$expires" ] && echo "$expires" >"$STATE/expires"

# Build output is large and rebuilt every time; the generated code must stay for the next build.
for dir in Build Intermediates.noindex CompilationCache.noindex ModuleCache.noindex Logs \
  SDKExplicitPrecompiledModules SDKStatCaches.noindex; do
  rm -rf "${ROOT:?}/ios/build/$dir"
done

log "Reinstalled. Signed until $expires."
notify "Reinstalled. Finance works until $(date -j -u -f '%Y-%m-%dT%H:%M:%SZ' "$expires" '+%b %-d' 2>/dev/null)."

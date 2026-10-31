#!/bin/sh
# Builds Release and installs over the existing app, keeping its data.
# Expo's run command can't renew the free 7-day signing profile, so this calls xcodebuild directly.
set -eu

export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8

DEVICE=$(xcrun devicectl list devices | grep physical | grep -oE '[0-9A-F]{8}-[0-9A-F]{16}' | head -1)
[ -n "$DEVICE" ] || { echo "Connect your iPhone first."; exit 1; }
BUNDLE_ID=com.juandavidbotero.personalfinance
ROOT=$(cd "$(dirname "$0")/.." && pwd)

[ -d "$ROOT/ios" ] || (cd "$ROOT" && npx expo prebuild --platform ios)

cd "$ROOT/ios"
xcodebuild \
  -workspace Finance.xcworkspace \
  -scheme Finance \
  -configuration Release \
  -destination "id=$DEVICE" \
  -derivedDataPath build \
  -allowProvisioningUpdates \
  -allowProvisioningDeviceRegistration \
  -quiet

xcrun devicectl device install app --device "$DEVICE" build/Build/Products/Release-iphoneos/Finance.app
xcrun devicectl device process launch --device "$DEVICE" "$BUNDLE_ID"

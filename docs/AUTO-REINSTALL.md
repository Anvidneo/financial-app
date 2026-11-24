# Automatic reinstall

A free Apple ID signs the app for 7 days. A daily task on the Mac renews it before it expires, so Finance never stops opening.

## What it does

Every day at 9 p.m., `scripts/auto-reinstall.sh`:

1. Reads when the current signature expires. With more than 2 days left, it stops there.
2. Finds the iPhone over Wi-Fi or USB, and checks the Mac has at least 3 GB free.
3. Backs up the app's database to `~/Documents/Finance backups/<date>`.
4. Reinstalls over the existing app with `scripts/install-iphone.sh`, so no data is lost.
5. Saves the new expiry date, deletes the build output and shows a notification with the result.

If any step fails, nothing is installed and a notification says why. It tries again the next day.

The Mac must be on and the iPhone on the same Wi-Fi. Renewing before the expiry also avoids trusting the developer profile again on the phone.

## Set it up

1. Give **Full Disk Access** to `/bin/sh` in System Settings > Privacy & Security. macOS blocks background tasks from reading `~/Documents`, where the project lives. This lets any `sh` script run in the background read the whole disk.
2. Find the iPhone's id:

   ```bash
   xcrun devicectl list devices
   ```

3. Save this as `~/Library/LaunchAgents/com.juandavidbotero.finance-reinstall.plist`, with your paths and device id:

   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
   <plist version="1.0">
   <dict>
     <key>Label</key><string>com.juandavidbotero.finance-reinstall</string>
     <key>ProgramArguments</key>
     <array><string>/bin/sh</string><string>/path/to/financial-app/scripts/auto-reinstall.sh</string></array>
     <key>EnvironmentVariables</key>
     <dict>
       <key>PATH</key><string>/path/to/node/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
       <key>DEVICE</key><string>YOUR-IPHONE-ID</string>
     </dict>
     <key>StartCalendarInterval</key><dict><key>Hour</key><integer>21</integer><key>Minute</key><integer>0</integer></dict>
     <key>StandardOutPath</key><string>/Users/you/Library/Application Support/FinanceReinstall/launchd.log</string>
     <key>StandardErrorPath</key><string>/Users/you/Library/Application Support/FinanceReinstall/launchd.log</string>
   </dict>
   </plist>
   ```

4. Load it:

   ```bash
   launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.juandavidbotero.finance-reinstall.plist
   ```

## Check it

- **Log:** `~/Library/Application Support/FinanceReinstall/reinstall.log`.
- **Expiry it will renew from:** the `expires` file in the same folder.
- **Test without installing:** this finds the phone and makes a backup.

  ```bash
  DRY_RUN=1 DEVICE=YOUR-IPHONE-ID scripts/auto-reinstall.sh
  ```

## Turn it off

```bash
launchctl bootout gui/$(id -u)/com.juandavidbotero.finance-reinstall
```

Then delete the plist, and remove `sh` from Full Disk Access if nothing else needs it.

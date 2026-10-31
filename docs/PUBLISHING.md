# Publishing Finance to the stores

Finance is ready for personal use, not yet for the stores. The App Store is the realistic first target. Google Play needs an Android version first.

Checked on 2026-10-31. Store rules change, so confirm fees and dates on the official pages before paying or submitting. Fees and policy items marked *(confirm)* come from general knowledge, not a page checked for this guide.

## Roadmap

| Step | App Store | Google Play |
| --- | --- | --- |
| 1. Prepare the app | Fix the blockers below | Build the Android version first |
| 2. Create the account | Apple Developer Program, about $99 per year *(confirm)* | Google Play Console, about $25 once *(confirm)* |
| 3. Build | Release build with Xcode 26 or later | Android App Bundle |
| 4. Test | TestFlight | Closed test: 12 testers for 14 days on a new personal account |
| 5. Prepare the listing | Screenshots, description, privacy details | Screenshots, description, data safety form |
| 6. Submit | App Review | Apply for production access, then review |

## Blockers in this app

| Blocker | Why it matters | Fix |
| --- | --- | --- |
| No privacy policy | Both stores ask for a public link | Publish a short page: data stays on the device and nothing is collected |
| No Spanish version | The app is in English, while its audience and pesos are Colombian | Add Spanish, or set Colombia as the only market with an English listing |
| Colombian pesos only | Other countries can't use it properly | Limit the release to Colombia, or add currencies |
| Bank message parsing is untested | It uses a sample message, not a real one | Tune it with real messages, or leave it out of the listing |
| No Android version | The project only targets iOS | See the Android section |
| The reinstall warning is for free installs | Store builds don't expire every 7 days | It stays hidden, because store builds have no signing profile to read. Test this in TestFlight |
| Interest is an estimate | Statements can differ from the bank's | Say so in the app and the listing |
| Backups are manual | Deleting the app deletes the data | Explain this during first run |

## App Store

### 1. Join the Apple Developer Program

Enroll at [developer.apple.com/programs](https://developer.apple.com/programs/). An individual account shows your legal name as the seller. Publishing under a brand name needs an organization account.

Keep the app described as a personal expense tracker. It doesn't connect to banks or move money, which matters because App Review applies stricter rules to apps offering banking services *(confirm in the [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/))*.

### 2. Protect your own data first

The paid account changes the signing team. iOS will likely refuse to install over the current app, and deleting it erases your data.

1. In Finance, open Settings and tap **Back up everything**.
2. Save the file to Files or iCloud Drive.
3. After installing the new version, tap **Restore from backup**.

### 3. Update the project

In `app.json`:

- Set `ios.appleTeamId` to the paid team ID.
- Keep `ios.bundleIdentifier` for good. It can't change after the first release.
- Set `version`, and raise `ios.buildNumber` on every upload.
- Add this, because the app uses no custom encryption:

```json
"infoPlist": { "ITSAppUsesNonExemptEncryption": false }
```

### 4. Build

Apps uploaded since April 28, 2026 must be built with [Xcode 26 or later and an iOS 26 SDK](https://developer.apple.com/news/upcoming-requirements/). This Mac has Xcode 27.1.

Pick one way to build. [EAS Build and Submit](https://docs.expo.dev/submit/introduction/) is the simplest:

```bash
npx eas-cli build --platform ios --profile production
```

```bash
npx eas-cli submit --platform ios
```

You can also archive from Xcode with Product > Archive, then upload through the Organizer. This costs nothing extra and needs at least 15 GB free on the Mac.

### 5. Test in TestFlight

Install the build through TestFlight and check:

- Fresh install: Welcome, adding an account, card and recurring charge.
- Upgrade: restoring a backup from the old install.
- Reminders arrive on time.
- The Apple Pay Shortcut still works. It should, because the link format doesn't change.
- No reinstall warning appears.

### 6. Prepare the listing

Create the app in [App Store Connect](https://appstoreconnect.apple.com/) and fill in:

| Item | Content |
| --- | --- |
| Name and subtitle | Finance may be taken, so have alternatives ready |
| Category | Finance |
| Age rating | Answer the questionnaire |
| Screenshots | Current required iPhone size, using sample data and not your real finances |
| Description | Expenses, recurring charges, credit cards, installments and reminders, all on the device |
| Support URL | A simple page or the GitHub repo |
| Privacy policy URL | Required |
| App privacy | Data not collected, as long as this stays true |
| Price | Free, or set a price and complete the paid apps agreement |

### 7. Submit

Add notes for the reviewer: no login is needed, the data stays on the device, and the Apple Pay Shortcut is optional. Include the steps to try the `financeapp://add` link.

## Google Play

### 1. Build the Android version

Android was removed from this project, so this is real work:

| Area | Work needed |
| --- | --- |
| Project | Add the `android` section to `app.json` and generate the native project |
| Icons | Replace SF Symbols, which are Apple-only |
| Minimum payment | `Alert.prompt` is iOS-only, so it needs its own screen |
| Share and file picking | Test backup and restore on Android |
| Notifications | Add an Android channel and request permission |
| Apple Pay automation | Remove it, because Shortcuts and Apple Pay don't exist there |
| Install expiry | Skip it, because it doesn't apply |
| Testing | Test on a real Android phone |

### 2. Create the account

Register in the [Play Console](https://play.google.com/console/). Google verifies your identity, and personal accounts may show your address details in some cases *(confirm)*.

### 3. Run the closed test

New personal accounts must run [a closed test with at least 12 opted-in testers for 14 days](https://support.google.com/googleplay/android-developer/answer/14151465) before applying for production access. Organization accounts are reported to be exempt *(confirm)*. Start recruiting early, because finishing the 14 days doesn't unlock production automatically: Google reviews your application.

### 4. Build and upload

```bash
npx eas-cli build --platform android --profile production
```

Automated uploads need a Google Service Account key. The first release can go through [EAS Submit](https://docs.expo.dev/submit/android/), or be uploaded [by hand in the Play Console](https://docs.expo.dev/submit/android-manual/).

### 5. Complete the forms

Fill in the store listing, content rating, data safety and privacy policy. Also complete any financial features declaration the console asks for *(confirm)*.

## Before each release

- [ ] All tests pass with `npm test`, and `npm run typecheck` is clean.
- [ ] The database upgrade was tested from the previous version.
- [ ] Migrations were only added, never edited.
- [ ] Restoring a backup from the previous version works.
- [ ] Version and build number were raised.
- [ ] No private data, keys or real finances are in the repo or screenshots.

## Never commit

Signing keys, Apple `.p8` and `.p12` files, the Google Service Account key, real backups, and exported CSV files. This repo is public, and `.gitignore` covers the key file types but not backups or exports.

## Sources

- [Apple: SDK minimum requirements](https://developer.apple.com/news/upcoming-requirements/)
- [Apple: App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google: App testing requirements for new personal developer accounts](https://support.google.com/googleplay/android-developer/answer/14151465)
- [Expo: EAS Submit](https://docs.expo.dev/submit/introduction/)
- [Expo: Submit to Google Play](https://docs.expo.dev/submit/android/)

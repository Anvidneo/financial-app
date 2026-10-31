# Personal Finance App

Native iPhone app for tracking my own expenses, recurring bills and credit cards. Personal use only, never published.

## Constraints
- iPhone only, installed from Xcode with a free Apple ID (no App Store, no $99/year account).
- The free install expires every 7 days: reinstall over the existing app from Xcode. NEVER uninstall first, or local data is lost.
- No backend. All data lives on the phone in local SQLite.
- Native app, not a web app/PWA.
- All code, file names, variables and identifiers in English.
- Keep answers and docs clear and concise.

## Tech stack
| Need | Choice |
| --- | --- |
| Framework | React Native + TypeScript (Expo dev build or bare RN) |
| Local DB | SQLite (expo-sqlite or op-sqlite) |
| Notifications | Local notifications (expo-notifications or Notifee) |
| Animations | React Native Reanimated |
| Charts | Plain native views (Victory Native was not needed) |
| CSV export | expo-file-system + React Native Share (expo-sharing refused cache files) |
| Shortcuts link | Deep link (URL scheme) first; App Intents later if needed |

## Features
1. **Recurring expenses**: subscriptions and services (electricity, water, internet) with amount, billing day, payment method.
2. **Categories**: every expense has a category; totals and history per category.
3. **Reminders**: local notifications a few days before each automatic charge (to cancel it or fund the account).
4. **Credit cards**: movements with date, installments (cuotas), cut-off date, payment date, minimum payment, credit limit/used.
5. **Automatic registration**: iOS apps can't read SMS, and the Apple Pay transactions API needs the paid account. Instead, an iOS Shortcuts automation runs on each Apple Pay payment (optionally on bank messages) and opens a deep link that registers amount + merchant in the app.
6. **CSV export**: export movements via the share sheet; also serves as a backup.

Currency: Colombian pesos (COP), format like $1.420.300.

## Design
Reference: clean white cards on a light gray background, big numbers, colored icon tiles per category, colored status labels, floating bottom tab bar with rounded square buttons (active = black).
- **Home**: wallet animation — account/card cards peeking out of a dark green pocket (#1F3A33) showing total balance; lime accent (#A6E36B). Below: "Spent this month", "Card due", upcoming charges.
- **Expenses**: month total, bar chart by month/category, category filter chips, movement list (icon, name, category · source, amount, date). Tags: "Apple Pay", "Recurring".
- **Credit card**: statement balance, minimum payment, cut-off and due dates, credit used bar, movements with "Installment 3 of 12".
- Drop from the reference: approve/decline buttons and approval timelines (company-app features).
- Mockups (3 screens): https://claude.ai/artifact/FEqSis5FjPRD9WfRKF1uWY
- Plan doc: https://claude.ai/artifact/RAuVRrHHjQzcGEpR6wSa9d

## Roadmap
1. **Base**: create RN project, run on iPhone from Xcode; SQLite schema (categories, expenses); add/list expenses manually.
2. **Recurring + reminders**: subscriptions/services with billing day; local notifications before each charge.
3. **Credit cards**: cards with cut-off/payment dates; movements with installments; statement summary with minimum payment. (Most complex data model — design carefully.)
4. **Home + charts**: wallet animation home screen; spending overview by category.
5. **Automation + export**: deep link to register an expense; Shortcuts automation for Apple Pay (and bank messages); CSV export.

Status: Phases 1-5 done. Remaining from the designs: Reminders list and the reinstall warning. Install on the iPhone with `npm run ios:device`.

## Skills installed (.claude/skills)
- Emil Kowalski (16): emil-design-eng, animate-expo (use for the wallet animation), review-animations, improve-animations, animation-performance, mobile-native, apple-design, etc.
- Taste: design-taste-frontend.
- Impeccable: installed from its GitHub copy without hooks (the installer couldn't download). For the full version run `npx impeccable install` here.
- Not installed yet: addyosmani/agent-skills (`npx skills add addyosmani/agent-skills`).
